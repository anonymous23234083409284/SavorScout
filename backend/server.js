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

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

console.log("CORS CONFIG LOADED");

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!process.env.OPENAI_API_KEY) console.warn("⚠️  OPENAI_API_KEY is missing from .env");
if (!process.env.SERPER_API_KEY) console.warn("⚠️  SERPER_API_KEY is missing from .env");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is missing from .env");
if (!process.env.SUPABASE_URL) console.warn("⚠️  SUPABASE_URL is missing from .env");
if (!process.env.EXA_API_KEY) {
  console.warn("⚠️  EXA_API_KEY is missing from .env — deep restaurant research will be skipped, ranking falls back to Serper-only signals");
}

const CANDIDATE_POOL_SIZE = 35;
const MAX_PAGES = 2;
const FINAL_RESULT_COUNT = 1;
const DAILY_SEARCH_LIMIT = 5;
const EARTH_RADIUS_MILES = 3958.8;
const PROXIMITY_DECAY_MILES = 4;

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_RESEARCH_COUNT = 8;       // only deep-research the strongest preliminary candidates
const EXA_TIMEOUT_MS = 9000;
const EXA_CACHE_TTL_DAYS = 14;      // menus/descriptions don't change often — reuse research for 2 weeks

// --- Geocoding helpers (unchanged) ---------------------------------------

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

function distanceInMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchCandidatePool({ textQuery, locationName }) {
  const fetchPage = async (page) => {
    const body = { q: textQuery, gl: "us", num: CANDIDATE_POOL_SIZE };
    if (locationName) body.location = locationName;
    if (page > 1) body.page = page;

    const response = await axios.post("https://google.serper.dev/places", body, {
      headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" },
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

    if (batch.length < 10) break;
    page += 1;
  }

  return { places: Array.from(seen.values()), pagesFetched: page > MAX_PAGES ? MAX_PAGES : page, lastBatchSize };
}

function minMaxNormalize(values) {
  const finite = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (typeof v === "number" && Number.isFinite(v) ? (v - min) / (max - min) : 0));
}

function computeRelevance(place, dishKeyword, cuisineKeyword) {
  if (!dishKeyword && !cuisineKeyword) return 0.5;

  const haystack = `${place.title || ""} ${place.type || ""} ${(place.types || []).join(" ")} ${place.description || ""}`.toLowerCase();

  if (dishKeyword) {
    if (haystack.includes(dishKeyword)) return 1;
    const dishWords = dishKeyword.split(/\s+/).filter((w) => w.length > 3);
    if (dishWords.some((w) => haystack.includes(w))) return 0.6;
  }

  if (cuisineKeyword && haystack.includes(cuisineKeyword)) return 0.5;

  return 0;
}

// --- Exa research + cache ------------------------------------------------

async function fetchCachedResearch(cacheKey) {
  const { data, error } = await supabaseAdmin
    .from("restaurant_research")
    .select("*")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error) {
    console.error("restaurant_research read error:", error);
    return null;
  }
  if (!data) return null;

  const ageMs = Date.now() - new Date(data.fetched_at).getTime();
  if (ageMs > EXA_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null; // stale — re-research

  return { sourceType: data.source_type, sourceUrl: data.source_url, highlights: data.highlights || [] };
}

async function storeResearch(cacheKey, placeId, record) {
  const { error } = await supabaseAdmin.from("restaurant_research").upsert(
    {
      cache_key: cacheKey,
      place_id: placeId || null,
      source_type: record.sourceType,
      source_url: record.sourceUrl,
      highlights: record.highlights,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" }
  );
  if (error) console.error("restaurant_research write error:", error);
}

// Fetches real evidence for one finalist: official website first, a
// secondary web search if there's no website or the site fails to crawl.
// Returns null (never fabricated content) on any failure.
async function researchCandidate(candidate, evidenceQuery) {
  const website = candidate.place.website;
  const cacheKey = website || `place:${candidate.place.placeId || candidate.place.cid}`;

  const cached = await fetchCachedResearch(cacheKey);
  if (cached) return cached;

  if (!EXA_API_KEY) return null;

  try {
    if (website) {
      const response = await axios.post(
        "https://api.exa.ai/contents",
        {
          urls: [website],
          highlights: { query: evidenceQuery, maxCharacters: 300 },
          subpageTarget: ["menu", "food"],
        },
        { headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" }, timeout: EXA_TIMEOUT_MS }
      );

      const status = response.data?.statuses?.[0];
      const result = response.data?.results?.[0];

      if (status?.status === "success" && result) {
        const record = { sourceType: "official_site", sourceUrl: result.url, highlights: result.highlights || [] };
        await storeResearch(cacheKey, candidate.place.placeId, record);
        return record;
      }
      // official site failed to crawl (timeout, 404, etc.) — fall through to secondary search
    }

    const searchQuery = `${candidate.place.title} ${candidate.place.address || ""} menu`.trim();
    const searchResponse = await axios.post(
      "https://api.exa.ai/search",
      {
        query: searchQuery,
        type: "auto",
        numResults: 1,
        contents: { highlights: { query: evidenceQuery, maxCharacters: 300 } },
      },
      { headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" }, timeout: EXA_TIMEOUT_MS }
    );

    const hit = searchResponse.data?.results?.[0];
    if (!hit) return null;

    const record = { sourceType: "secondary", sourceUrl: hit.url, highlights: hit.highlights || [] };
    await storeResearch(cacheKey, candidate.place.placeId, record);
    return record;
  } catch (err) {
    console.error(`Exa research failed for ${candidate.place.title}:`, err.response?.data || err.message);
    return null;
  }
}

// 0-1 evidence strength — never guessed, purely a function of what came back.
function computeEvidenceScore(research) {
  if (!research) return 0;
  const hasHighlights = Array.isArray(research.highlights) && research.highlights.length > 0;
  if (research.sourceType === "official_site" && hasHighlights) return 1;
  if (research.sourceType === "official_site") return 0.5; // site found & crawled, nothing matched the query
  if (research.sourceType === "secondary" && hasHighlights) return 0.6;
  if (research.sourceType === "secondary") return 0.3;
  return 0;
}

app.get("/", (req, res) => {
  res.send("Restaurant AI Backend is alive!");
});

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

  // Onboarding dietary info was being collected but never actually used —
  // pull it in parallel with the OpenAI call so it can feed both intent
  // parsing and the Exa evidence query below.
  const onboardingPromise = supabaseAdmin
    .from("user_preferences")
    .select("allergies, dietary_preferences")
    .eq("user_id", req.userId)
    .maybeSingle();

  let preferences;
  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract structured restaurant search intent from the user's request. " +
            "Return a JSON object with keys: dish, cuisine, budget, location, dietaryRestrictions, importantFactors. " +
            "'location' is any specific place the user names to search in or near " +
            "(a city, neighborhood, landmark, or address — e.g. 'New Brunswick, NJ'). " +
            "Leave it as an empty string if the user did not name a specific place, " +
            "since in that case we should search near their current location instead. " +
            "'dietaryRestrictions' is an array of dietary needs mentioned (e.g. 'vegetarian', 'gluten-free', 'nut-free'). " +
            "'importantFactors' is an array of qualities the user cares about (e.g. 'crispy', 'quiet', 'good for groups'). " +
            "Use empty strings/arrays for anything not mentioned. Do not include any other keys.",
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

  const { data: onboarding } = await onboardingPromise.catch(() => ({ data: null }));
  const onboardingDietaryTerms = onboarding?.dietary_preferences
    ? onboarding.dietary_preferences.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const dietaryTerms = Array.from(
    new Set([...(Array.isArray(preferences.dietaryRestrictions) ? preferences.dietaryRestrictions : []), ...onboardingDietaryTerms])
  );

  let candidates;
  let locationName;
  try {
    const namedLocation = preferences.location?.trim();
    locationName = namedLocation || (await reverseGeocodeToLocationName(userLat, userLng));

    const textQuery =
      [preferences.dish, preferences.cuisine, "restaurants"].filter(Boolean).join(" ").trim() || "restaurants";

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

  // --- Stage 1: raw per-candidate features across the full pool ----------
  const withFeatures = candidates
    .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
    .map((p) => {
      const rating = typeof p.rating === "number" ? p.rating : null;
      const reviewCount = p.ratingCount || 0;

      const bayesianRating =
        rating !== null
          ? (CONFIDENCE_WEIGHT * GLOBAL_AVERAGE + reviewCount * rating) / (CONFIDENCE_WEIGHT + reviewCount)
          : GLOBAL_AVERAGE * 0.85;

      const distance = distanceInMiles(userLat, userLng, p.latitude, p.longitude);
      const proximity = Math.exp(-distance / PROXIMITY_DECAY_MILES);

      const relevance = computeRelevance(p, dishKeyword, cuisineKeyword);
      const dataTrust = (p.website ? 0.5 : 0) + (p.phoneNumber ? 0.5 : 0);

      const haystack = `${p.title} ${p.type || ""} ${(p.types || []).join(" ")} ${p.description || ""}`.toLowerCase();
      const matchedDish = dishKeyword && haystack.includes(dishKeyword) ? preferences.dish.trim() : null;
      const matchedCuisine =
        !matchedDish && cuisineKeyword && haystack.includes(cuisineKeyword) ? preferences.cuisine.trim() : null;

      return { place: p, rating, reviewCount, bayesianRating, distance, proximity, relevance, dataTrust, matchedDish, matchedCuisine };
    });

  const wantsSomethingSpecific = Boolean(dishKeyword || cuisineKeyword);
  const relevantOnly = withFeatures.filter((c) => c.relevance > 0);
  const pool = wantsSomethingSpecific && relevantOnly.length >= 2 ? relevantOnly : withFeatures;

  const prelimRatingNorm = minMaxNormalize(pool.map((c) => c.bayesianRating));
  const prelimRelevanceNorm = minMaxNormalize(pool.map((c) => c.relevance));
  const prelimProximityNorm = minMaxNormalize(pool.map((c) => c.proximity));
  const prelimTrustNorm = minMaxNormalize(pool.map((c) => c.dataTrust));

  const PRELIM_WEIGHTS = { rating: 0.4, relevance: 0.35, proximity: 0.18, trust: 0.07 };

  const prelimRanked = pool
    .map((c, i) => ({
      ...c,
      prelimComposite:
        PRELIM_WEIGHTS.rating * prelimRatingNorm[i] +
        PRELIM_WEIGHTS.relevance * prelimRelevanceNorm[i] +
        PRELIM_WEIGHTS.proximity * prelimProximityNorm[i] +
        PRELIM_WEIGHTS.trust * prelimTrustNorm[i],
    }))
    .sort((a, b) => b.prelimComposite - a.prelimComposite);

  // --- Stage 2: deep-research only the strongest finalists ----------------
  const finalists = prelimRanked.slice(0, EXA_RESEARCH_COUNT);

  const evidenceQueryParts = [preferences.dish, preferences.cuisine, ...dietaryTerms].filter(Boolean);
  const evidenceQuery =
    evidenceQueryParts.length > 0 ? `${evidenceQueryParts.join(" ")} menu specialties price` : "menu specialties price";

  const researchResults = await Promise.allSettled(
    finalists.map((c) => researchCandidate(c, evidenceQuery))
  );

  const finalistsWithResearch = finalists.map((c, i) => {
    const research = researchResults[i].status === "fulfilled" ? researchResults[i].value : null;
    const evidenceScore = computeEvidenceScore(research);

    const highlightText = (research?.highlights || []).join(" ").toLowerCase();
    const matchedDietaryTerms = dietaryTerms.filter((term) => highlightText.includes(term.toLowerCase()));

    return { ...c, research, evidenceScore, matchedDietaryTerms };
  });

  // --- Stage 3: re-normalize across finalists only, blend in evidence -----
  const ratingNorm = minMaxNormalize(finalistsWithResearch.map((c) => c.bayesianRating));
  const relevanceNorm = minMaxNormalize(finalistsWithResearch.map((c) => c.relevance));
  const proximityNorm = minMaxNormalize(finalistsWithResearch.map((c) => c.proximity));
  const trustNorm = minMaxNormalize(finalistsWithResearch.map((c) => c.dataTrust));
  const evidenceNorm = minMaxNormalize(finalistsWithResearch.map((c) => c.evidenceScore));

  const FINAL_WEIGHTS = { rating: 0.3, relevance: 0.28, proximity: 0.12, trust: 0.05, evidence: 0.25 };

  const ranked = finalistsWithResearch
    .map((c, i) => ({
      ...c,
      scoreBreakdown: {
        quality: ratingNorm[i],
        relevance: relevanceNorm[i],
        proximity: proximityNorm[i],
        trust: trustNorm[i],
        evidence: evidenceNorm[i],
      },
      composite:
        FINAL_WEIGHTS.rating * ratingNorm[i] +
        FINAL_WEIGHTS.relevance * relevanceNorm[i] +
        FINAL_WEIGHTS.proximity * proximityNorm[i] +
        FINAL_WEIGHTS.trust * trustNorm[i] +
        FINAL_WEIGHTS.evidence * evidenceNorm[i],
    }))
    .sort((a, b) => b.composite - a.composite);

  const compositeNorm = minMaxNormalize(ranked.map((c) => c.composite));

  const winner = ranked[0];
  const finalPicks = [winner].filter(Boolean).slice(0, FINAL_RESULT_COUNT);

  // Real comparison data only — names and scores of the other researched
  // finalists, nothing invented about them.
  const runnerUps = ranked.slice(1, 4).map((c, i) => ({
    name: c.place.title,
    matchScore: Math.round(compositeNorm[i + 1] * 100),
  }));

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
      scoreBreakdown: {
        quality: Math.round(c.scoreBreakdown.quality * 100),
        relevance: Math.round(c.scoreBreakdown.relevance * 100),
        proximity: Math.round(c.scoreBreakdown.proximity * 100),
        trust: Math.round(c.scoreBreakdown.trust * 100),
        evidence: Math.round(c.scoreBreakdown.evidence * 100),
      },
      evidence: c.research
        ? {
            sourceType: c.research.sourceType, // 'official_site' | 'secondary'
            sourceUrl: c.research.sourceUrl,
            highlights: c.research.highlights,
          }
        : null,
      matchedDietaryTerms: c.matchedDietaryTerms.length > 0 ? c.matchedDietaryTerms : null,
      beatCount: pool.length - 1,
      poolSize: candidates.length,
      runnerUps,
    };
  });

  const newCount = req.currentSearchCount + 1;
  const { error: updateError } = await supabaseAdmin
    .from("search_counts")
    .update({ count: newCount, search_date: req.searchDate })
    .eq("user_id", req.userId);

  if (updateError) console.error("Failed to update search count:", updateError);

  console.log(
    `FINAL RETURN: researched ${finalists.length} finalists of ${pool.length} eligible ` +
      `(of ${candidates.length} total candidates), returning`,
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