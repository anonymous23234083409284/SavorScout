require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(cors());
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
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.warn("⚠️  GOOGLE_PLACES_API_KEY is missing from .env");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is missing from .env");
}

const MILES_TO_METERS = 1609.34;
const SEARCH_RADIUS_MILES = 30;
const CANDIDATE_POOL_SIZE = 20;
const DETAILS_FETCH_COUNT = 3;
const FINAL_RESULT_COUNT = 2;
const DAILY_SEARCH_LIMIT = 5;

// Turns a named place ("New Brunswick, NJ") into real coordinates, so we
// can explicitly bias toward it. Without this, Google's Text Search API
// can fall back to biasing on the server's own IP address even when a
// location is named in the query text — which was the actual bug.
async function geocodeLocation(locationText) {
  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        address: locationText,
        key: process.env.GOOGLE_PLACES_API_KEY,
      },
    });

    const result = response.data.results?.[0];
    if (!result) {
      console.warn(`Geocoding found no match for "${locationText}"`);
      return null;
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  } catch (err) {
    console.error("Geocoding error:", err.response?.data || err.message);
    return null;
  }
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
  try {
    const namedLocation = preferences.location?.trim();

    const textQuery =
      [preferences.dish, preferences.cuisine, namedLocation, "restaurants"]
        .filter(Boolean)
        .join(" ")
        .trim() || "restaurants";

    const requestBody = {
      textQuery,
      maxResultCount: CANDIDATE_POOL_SIZE,
    };

    if (namedLocation) {
      // Explicitly geocode the named place and bias toward it — this
      // overrides Google's own implicit IP-based fallback bias, which was
      // pulling results back toward the server's actual location even when
      // a different place was clearly named in the query.
      const geocoded = await geocodeLocation(namedLocation);
      if (geocoded) {
        requestBody.locationBias = {
          circle: {
            center: { latitude: geocoded.lat, longitude: geocoded.lng },
            radius: SEARCH_RADIUS_MILES * MILES_TO_METERS,
          },
        };
      }
      // If geocoding fails, we still have the location name inside
      // textQuery itself, so the search can still work — just without our
      // explicit override.
    } else {
      requestBody.locationBias = {
        circle: {
          center: { latitude: userLat, longitude: userLng },
          radius: SEARCH_RADIUS_MILES * MILES_TO_METERS,
        },
      };
    }

    const placesResponse = await axios.post(
      "https://places.googleapis.com/v1/places:searchText",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.priceLevel,places.location",
        },
      }
    );

    candidates = placesResponse.data.places || [];
    console.log(`Got ${candidates.length} candidates from Places search`);
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error("Google Places search error:", detail);
    return res.status(500).json({ error: "Failed to search Google Places", detail });
  }

  if (candidates.length === 0) {
    return res.json({ preferences, restaurants: [], searchesRemaining: DAILY_SEARCH_LIMIT - req.currentSearchCount - 1 });
  }

  const GLOBAL_AVERAGE = 4.2;
  const CONFIDENCE_WEIGHT = 10;

  const scored = candidates
    .filter((p) => typeof p.rating === "number")
    .map((p) => {
      const reviewCount = p.userRatingCount || 0;
      const bayesianScore =
        (CONFIDENCE_WEIGHT * GLOBAL_AVERAGE + reviewCount * p.rating) / (CONFIDENCE_WEIGHT + reviewCount);
      return { ...p, _score: bayesianScore };
    })
    .sort((a, b) => b._score - a._score);

  const topCandidates = scored.slice(0, DETAILS_FETCH_COUNT);

  let detailed;
  try {
    detailed = await Promise.all(
      topCandidates.map(async (place) => {
        try {
          const detailsResponse = await axios.get(`https://places.googleapis.com/v1/places/${place.id}`, {
            headers: {
              "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
              "X-Goog-FieldMask": "photos,reviews",
            },
          });

          const photoName = detailsResponse.data.photos?.[0]?.name;
          const photoUrl = photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${process.env.GOOGLE_PLACES_API_KEY}`
            : null;

          const reviews = detailsResponse.data.reviews || [];
          const bestReview =
            reviews.find((r) => r.rating === 5 && r.text?.text) ||
            reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] ||
            null;

          return {
            id: place.id,
            name: place.displayName?.text || "Unknown",
            rating: place.rating ?? "N/A",
            reviewCount: place.userRatingCount || 0,
            address: place.formattedAddress || "",
            priceLevel: place.priceLevel || null,
            lat: place.location?.latitude,
            lng: place.location?.longitude,
            photoUrl,
            review: bestReview
              ? {
                  authorName: bestReview.authorAttribution?.displayName || "Anonymous",
                  rating: bestReview.rating,
                  text: bestReview.text?.text || "",
                }
              : null,
          };
        } catch (err) {
          console.error(`Details fetch failed for ${place.id}:`, err.response?.data || err.message);
          return {
            id: place.id,
            name: place.displayName?.text || "Unknown",
            rating: place.rating ?? "N/A",
            reviewCount: place.userRatingCount || 0,
            address: place.formattedAddress || "",
            priceLevel: place.priceLevel || null,
            lat: place.location?.latitude,
            lng: place.location?.longitude,
            photoUrl: null,
            review: null,
          };
        }
      })
    );
  } catch (error) {
    console.error("Details batch error:", error.message);
    return res.status(500).json({ error: "Failed to fetch restaurant details", detail: error.message });
  }

  const topTwo = detailed.slice(0, FINAL_RESULT_COUNT);

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
    restaurants: topTwo,
    searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});