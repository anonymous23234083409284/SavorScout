require("dotenv").config();

const express = require("express");
const axios = require("axios");

const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://savor-scout-ugbv-two.vercel.app",
];

// CORS must come before any routes. The `cors` package automatically
// handles OPTIONS preflight requests for you — you do NOT need a manual
// app.options(...) handler.
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

console.log("CORS CONFIG LOADED");

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Service role client — server-side only, NEVER expose this key to the frontend.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY is missing from .env");
}
if (!process.env.SERPER_API_KEY) {
  console.warn("⚠️  SERPER_API_KEY is missing from .env");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is missing from .env");
}
if (!process.env.SUPABASE_URL) {
  console.warn("⚠️  SUPABASE_URL is missing from .env");
}

const CANDIDATE_POOL_SIZE = 20;
const FINAL_RESULT_COUNT = 2;
const DAILY_SEARCH_LIMIT = 5;
const EARTH_RADIUS_MILES = 3958.8;

// --- Serper.dev integration ---------------------------------------------
//
// Serper's Places endpoint (https://google.serper.dev/places) takes a
// free-text `location` (a city/neighborhood name), not raw coordinates —
// so when the user hasn't named a specific place, we reverse-geocode their
// lat/lng into a location string first. This reuses the same free
// Nominatim service the frontend already uses for forward-geocoding, so no
// extra API key is needed.
async function reverseGeocodeToLocationName(lat, lng) {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { format: "json", lat, lon: lng, zoom: 12 },
      headers: { "User-Agent": "SavorScout/1.0 (your-email@example.com)" },
    });

    const address = response.data?.address;
    if (!address) return null;

    const place = address.city || address.town || address.village || address.suburb || address.county;
    if (!place) return null;

    return address.state ? `${place}, ${address.state}` : place;
  } catch (err) {
    console.error("Reverse geocoding error:", err.response?.data || err.message);
    return null;
  }
}

// Straight-line distance in miles between two coordinates (haversine).
// Serper's Places results don't come back with a distance field, but they
// do give us lat/lng per place, so we compute it ourselves — this also
// powers the "X mi away" chip on the hero card.
function distanceInMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get("/", (req, res) => {
  res.send("Restaurant AI Backend is alive!");
});

// --- Check if an email already has an account (used before signup) ---
app.post("/auth/check-email", async (req, res) => {
  const email = req.body.email;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Missing email" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email.trim())
      .maybeSingle();

    if (error) {
      console.error("check-email error:", error);
      return res.status(500).json({ error: "Failed to check email" });
    }

    return res.json({ exists: !!data });
  } catch (err) {
    console.error("check-email error:", err.message);
    return res.status(500).json({ error: "Failed to check email" });
  }
});

// --- Auth + rate limit middleware ---
async function requireAuthAndLimit(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token — please sign in." });
  }

  const token = authHeader.split(" ")[1];

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: "Invalid or expired session — please sign in again." });
  }

  const userId = userData.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("search_counts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("search_counts fetch error:", fetchError);
    return res.status(500).json({ error: "Failed to check search limit" });
  }

  let currentCount = 0;

  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from("search_counts")
      .insert({ user_id: userId, search_date: today, count: 0 });
    if (insertError) {
      console.error("search_counts insert error:", insertError);
      return res.status(500).json({ error: "Failed to initialize search limit" });
    }
  } else if (existing.search_date !== today) {
    currentCount = 0;
  } else {
    currentCount = existing.count;
  }

  if (currentCount >= DAILY_SEARCH_LIMIT) {
    return res.status(429).json({
      error: `You've hit your ${DAILY_SEARCH_LIMIT} searches for today — come back tomorrow!`,
      searchesRemaining: 0,
    });
  }

  req.userId = userId;
  req.currentSearchCount = currentCount;
  req.searchDate = today;

  next();
}

app.post("/search", requireAuthAndLimit, async (req, res) => {
  const userRequest = req.body.query;
  const userLat = req.body.lat;
  const userLng = req.body.lng;

  if (!userRequest || typeof userRequest !== "string" || !userRequest.trim()) {
    return res.status(400).json({ error: "Missing or empty 'query' in request body" });
  }
  if (typeof userLat !== "number" || typeof userLng !== "number") {
    return res.status(400).json({ error: "Missing 'lat'/'lng' — location is required for radius search" });
  }

  console.log("User said:", userRequest, "at", userLat, userLng);

  let preferences;
  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract restaurant search terms from the user's request. " +
            "Return a JSON object with keys: dish, cuisine, budget, location. " +
            "'location' is any specific place the user names to search in or near " +
            "(a city, neighborhood, landmark, or address — e.g. 'New Brunswick, NJ'). " +
            "Leave it as an empty string if the user did not name a specific place, " +
            "since in that case we should search near their current location instead. " +
            "Use empty strings for anything not mentioned. Do not include any other keys.",
        },
        { role: "user", content: userRequest },
      ],
      response_format: { type: "json_object" },
    });

    preferences = JSON.parse(aiResponse.choices[0].message.content);
    console.log("Preferences:", preferences);
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error("OpenAI error:", detail);
    return res.status(500).json({ error: "Failed to parse your request with OpenAI", detail });
  }

  let candidates;
  let locationName;
  try {
    const namedLocation = preferences.location?.trim();
    locationName = namedLocation || (await reverseGeocodeToLocationName(userLat, userLng));

    const textQuery =
      [preferences.dish, preferences.cuisine, "restaurants"].filter(Boolean).join(" ").trim() ||
      "restaurants";

    const serperBody = {
      q: textQuery,
      gl: "us",
      num: CANDIDATE_POOL_SIZE,
    };
    if (locationName) serperBody.location = locationName;

    const serperResponse = await axios.post("https://google.serper.dev/places", serperBody, {
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
    });

    candidates = serperResponse.data.places || [];
    console.log(`Got ${candidates.length} candidates from Serper Places search (location: ${locationName || "none"})`);
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error("Serper Places search error:", detail);
    return res.status(500).json({ error: "Failed to search Serper Places", detail });
  }

  if (candidates.length === 0) {
    return res.json({
      preferences,
      locationName,
      restaurants: [],
      searchesRemaining: DAILY_SEARCH_LIMIT - req.currentSearchCount - 1,
    });
  }

  const GLOBAL_AVERAGE = 4.2;
  const CONFIDENCE_WEIGHT = 10;

  const dishKeyword = preferences.dish?.trim().toLowerCase();
  const cuisineKeyword = preferences.cuisine?.trim().toLowerCase();

  const scored = candidates
    .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
    .map((p) => {
      const rating = typeof p.rating === "number" ? p.rating : null;
      const reviewCount = p.ratingCount || 0;

      // Same Bayesian-average approach as before: a 5.0 with 2 reviews
      // shouldn't outrank a 4.6 with 800 reviews. Places with no rating at
      // all get a mild penalty rather than being thrown out entirely.
      const bayesianScore =
        rating !== null
          ? (CONFIDENCE_WEIGHT * GLOBAL_AVERAGE + reviewCount * rating) / (CONFIDENCE_WEIGHT + reviewCount)
          : GLOBAL_AVERAGE * 0.85;

      const distance = distanceInMiles(userLat, userLng, p.latitude, p.longitude);

      const haystack = `${p.title} ${p.type || ""} ${(p.types || []).join(" ")} ${p.description || ""}`.toLowerCase();
      const matchedDish = dishKeyword && haystack.includes(dishKeyword) ? preferences.dish.trim() : null;
      const matchedCuisine =
        !matchedDish && cuisineKeyword && haystack.includes(cuisineKeyword) ? preferences.cuisine.trim() : null;

      // 0-100 "match score" that powers the hero badge: rating quality
      // (0-55) + how well it matches what was actually asked for (0-30) +
      // how close it is (0-15).
      const ratingComponent = (bayesianScore / 5) * 55;
      const keywordComponent = matchedDish ? 30 : matchedCuisine ? 18 : 0;
      const proximityComponent = Math.max(0, 15 - distance * 2.5);
      const matchScore = Math.round(Math.min(100, ratingComponent + keywordComponent + proximityComponent));

      return {
        id: p.placeId || p.cid,
        name: p.title,
        rating,
        reviewCount,
        address: p.address || "",
        category: p.type || (p.types && p.types[0]) || null,
        website: p.website || null,
        phone: p.phoneNumber || null,
        lat: p.latitude,
        lng: p.longitude,
        distanceMiles: Math.round(distance * 10) / 10,
        matchedDish,
        matchedCuisine,
        matchScore,
        _rank: bayesianScore + keywordComponent / 10,
      };
    })
    .sort((a, b) => b._rank - a._rank);

  const topTwo = scored.slice(0, FINAL_RESULT_COUNT).map(({ _rank, ...rest }) => rest);

  const newCount = req.currentSearchCount + 1;
  const { error: updateError } = await supabaseAdmin
    .from("search_counts")
    .update({ count: newCount, search_date: req.searchDate })
    .eq("user_id", req.userId);

  if (updateError) {
    console.error("Failed to update search count:", updateError);
  }

  console.log("FINAL RETURN:", topTwo.length, topTwo.map((r) => r.name));

  return res.json({
    preferences,
    locationName,
    restaurants: topTwo,
    searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});