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

// Aim for a pool this big before ranking. Google's local pack won't always
// have this many legitimate results in a given area — see fetchCandidatePool
// below — but a bigger honest pool means the ranking algorithm has more to
// actually choose between.
const CANDIDATE_POOL_SIZE = 35;
const MAX_PAGES = 2; // cap extra API calls spent chasing the pool size
const FINAL_RESULT_COUNT = 1;
const DAILY_SEARCH_LIMIT = 5;
const EARTH_RADIUS_MILES = 3958.8;
const PROXIMITY_DECAY_MILES = 4; // distance at which the proximity score has decayed to ~37%

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
// do give us lat/lng per place, so we compute it ourselves.
function distanceInMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pulls up to CANDIDATE_POOL_SIZE unique places from Serper, paging for more
// if the first page looks like it might not be the whole story. Stops early
// once a page comes back thin — that's a signal the area is just out of
// results, and a second page would burn an API credit for nothing.
async function fetchCandidatePool({ textQuery, locationName }) {
  const fetchPage = async (page) => {
    const body = {
      q: textQuery,
      gl: "us",
      num: CANDIDATE_POOL_SIZE,
    };
    if (locationName) body.location = locationName;
    if (page > 1) body.page = page;

    const response = await axios.post("https://google.serper.dev/places", body, {
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
    });
    return response.data.places || [];
  };

  const seen = new Map();
  let page = 1;
  let lastBatchSize = 0;

  while (page <= MAX_PAGES && seen.size < CANDIDATE_POOL_SIZE) {
    const batch = await fetchPage(page);
    lastBatchSize = batch.length;
    if (batch.length === 0) break;

    for (const place of batch) {
      const key = place.placeId || place.cid || `${place.title}-${place.latitude}-${place.longitude}`;
      if (!seen.has(key)) seen.set(key, place);
    }

    if (batch.length < 10) break; // thin page — more paging won't help
    page += 1;
  }

  return { places: Array.from(seen.values()), pagesFetched: page > MAX_PAGES ? MAX_PAGES : page, lastBatchSize };
}

// Normalizes a list of raw numeric feature values to 0-1 via min-max scaling,
// so each signal is judged relative to the actual pool pulled for THIS
// search, not against an arbitrary fixed scale.
function minMaxNormalize(values) {
  const finite = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return values.map(() => 1); // everyone's tied — don't penalize anyone
  return values.map((v) => (typeof v === "number" && Number.isFinite(v) ? (v - min) / (max - min) : 0));
}

// How well a candidate matches what the user actually asked for, on a 0-1
// scale. This is the gate — see the ranking pipeline below — so a mediocre
// place that serves the right dish should still be able to beat a great
// place that doesn't serve it at all.
function computeRelevance(place, dishKeyword, cuisineKeyword) {
  if (!dishKeyword && !cuisineKeyword) return 0.5; // no specific ask — neutral, let quality/proximity decide

  const haystack = `${place.title || ""} ${place.type || ""} ${(place.types || []).join(" ")} ${place.description || ""}`.toLowerCase();

  if (dishKeyword) {
    if (haystack.includes(dishKeyword)) return 1;
    // Multi-word dish ("pork belly tacos") — partial credit for hitting any
    // one significant word ("tacos") even without the exact full phrase.
    const dishWords = dishKeyword.split(/\s+/).filter((w) => w.length > 3);
    if (dishWords.some((w) => haystack.includes(w))) return 0.6;
  }

  if (cuisineKeyword && haystack.includes(cuisineKeyword)) return 0.5;

  return 0;
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

    const { places, pagesFetched, lastBatchSize } = await fetchCandidatePool({ textQuery, locationName });
    candidates = places;

    console.log(
      `Got ${candidates.length} unique candidates from Serper Places ` +
        `(location: ${locationName || "none"}, pages fetched: ${pagesFetched}, last page size: ${lastBatchSize})`
    );
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

  // --- Stage 1: raw per-candidate features -------------------------------
  const withFeatures = candidates
    .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
    .map((p) => {
      const rating = typeof p.rating === "number" ? p.rating : null;
      const reviewCount = p.ratingCount || 0;

      // Bayesian average: a 5.0 with 2 reviews shouldn't outrank a 4.6 with
      // 800 reviews. Unrated places get a mild penalty instead of being
      // thrown out entirely — being new isn't the same as being bad.
      const bayesianRating =
        rating !== null
          ? (CONFIDENCE_WEIGHT * GLOBAL_AVERAGE + reviewCount * rating) / (CONFIDENCE_WEIGHT + reviewCount)
          : GLOBAL_AVERAGE * 0.85;

      const distance = distanceInMiles(userLat, userLng, p.latitude, p.longitude);
      const proximity = Math.exp(-distance / PROXIMITY_DECAY_MILES); // smooth 0-1 decay, no hard cliff

      const relevance = computeRelevance(p, dishKeyword, cuisineKeyword);
      const dataTrust = (p.website ? 0.5 : 0) + (p.phoneNumber ? 0.5 : 0); // a findable, contactable business

      const haystack = `${p.title} ${p.type || ""} ${(p.types || []).join(" ")} ${p.description || ""}`.toLowerCase();
      const matchedDish = dishKeyword && haystack.includes(dishKeyword) ? preferences.dish.trim() : null;
      const matchedCuisine =
        !matchedDish && cuisineKeyword && haystack.includes(cuisineKeyword) ? preferences.cuisine.trim() : null;

      return { place: p, rating, reviewCount, bayesianRating, distance, proximity, relevance, dataTrust, matchedDish, matchedCuisine };
    });

  // --- Stage 2: relevance gate --------------------------------------------
  // If the user asked for something specific, only candidates that actually
  // match it are allowed to compete for the win. Falls back to the full
  // pool if that gate would leave fewer than 2 places to compare (better to
  // show an imperfect match than nothing).
  const wantsSomethingSpecific = Boolean(dishKeyword || cuisineKeyword);
  const relevantOnly = withFeatures.filter((c) => c.relevance > 0);
  const pool = wantsSomethingSpecific && relevantOnly.length >= 2 ? relevantOnly : withFeatures;

  // --- Stage 3: normalize each feature across this pool, then combine ----
  // Normalizing per-search (not against a fixed 0-5 or 0-100 scale) is what
  // makes this comparative: a score reflects how a place stacks up against
  // everything else actually found for this exact search.
  const ratingNorm = minMaxNormalize(pool.map((c) => c.bayesianRating));
  const relevanceNorm = minMaxNormalize(pool.map((c) => c.relevance));
  const proximityNorm = minMaxNormalize(pool.map((c) => c.proximity));
  const trustNorm = minMaxNormalize(pool.map((c) => c.dataTrust));

  const WEIGHTS = { rating: 0.4, relevance: 0.35, proximity: 0.18, trust: 0.07 };

  const ranked = pool
    .map((c, i) => ({
      ...c,
      composite:
        WEIGHTS.rating * ratingNorm[i] +
        WEIGHTS.relevance * relevanceNorm[i] +
        WEIGHTS.proximity * proximityNorm[i] +
        WEIGHTS.trust * trustNorm[i],
    }))
    .sort((a, b) => b.composite - a.composite);

  const compositeNorm = minMaxNormalize(ranked.map((c) => c.composite));

  // --- Stage 4: the winner is whichever candidate has the best composite --
  const winner = ranked[0];
  const finalPicks = [winner].filter(Boolean).slice(0, FINAL_RESULT_COUNT);

  const topPicks = finalPicks.map((c) => {
    const i = ranked.indexOf(c);
    return {
      id: c.place.placeId || c.place.cid,
      name: c.place.title,
      rating: c.rating,
      reviewCount: c.reviewCount,
      address: c.place.address || "",
      category: c.place.type || (c.place.types && c.place.types[0]) || null,
      website: c.place.website || null,
      phone: c.place.phoneNumber || null,
      lat: c.place.latitude,
      lng: c.place.longitude,
      distanceMiles: Math.round(c.distance * 10) / 10,
      matchedDish: c.matchedDish,
      matchedCuisine: c.matchedCuisine,
      matchScore: Math.round(compositeNorm[i] * 100),
    };
  });

  const newCount = req.currentSearchCount + 1;
  const { error: updateError } = await supabaseAdmin
    .from("search_counts")
    .update({ count: newCount, search_date: req.searchDate })
    .eq("user_id", req.userId);

  if (updateError) {
    console.error("Failed to update search count:", updateError);
  }

  console.log(
    `FINAL RETURN: ranked ${ranked.length} of ${candidates.length} candidates ` +
      `(gate applied: ${pool !== withFeatures}), returning`,
    topPicks.map((r) => `${r.name} (${r.matchScore}%)`)
  );

  return res.json({
    preferences,
    locationName,
    restaurants: topPicks,
    searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});