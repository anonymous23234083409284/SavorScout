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

app.use(express.json({ limit: "16kb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

for (const key of ["OPENAI_API_KEY", "SERPER_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"]) {
  if (!process.env[key]) console.warn(`⚠️  ${key} is missing from .env`);
}
if (!process.env.EXA_API_KEY) {
  console.warn("⚠️  EXA_API_KEY is missing — deep research skipped, ranking falls back to stage-1 signals only");
}

// --- Tunables --------------------------------------------------------------

const CANDIDATE_POOL_SIZE = 15;
const MAX_PAGES = 2;
const STAGE1_FINALIST_COUNT = 5;
const DAILY_SEARCH_LIMIT = 5;
const EARTH_RADIUS_MILES = 3958.8;
const PROXIMITY_DECAY_MILES = 4;
const MAX_QUERY_CHARS = 300;

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_TIMEOUT_MS = 9000;
const EXA_CACHE_TTL_DAYS = 14;

const SERPER_TIMEOUT_MS = 8000;
const NOMINATIM_TIMEOUT_MS = 6000;
const NOMINATIM_UA = "SavorScout/1.0 (your-email@example.com)";

// Competitive weights — decide WHO WINS. Operate on min-max normalized
// features, so they answer "who is best relative to this pool".
const STAGE1_WEIGHTS = { rating: 0.35, relevance: 0.3, proximity: 0.15, budget: 0.1, trust: 0.1 };
const STAGE2_WEIGHTS = { base: 0.45, evidence: 0.25, conceptual: 0.3 };

// Display weights — decide WHAT NUMBER THE USER SEES. Operate on absolute
// 0-1 signals, so a mediocre winner in a weak pool reads as a mediocre
// match instead of a guaranteed 100%.
const DISPLAY_WEIGHTS = {
  quality: 0.3, relevance: 0.25, proximity: 0.15, evidence: 0.15, budget: 0.08, trust: 0.07,
};

// --- Geocoding -------------------------------------------------------------

async function reverseGeocodeToLocationName(lat, lng) {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { format: "json", lat, lon: lng, zoom: 12 },
      headers: { "User-Agent": NOMINATIM_UA },
      timeout: NOMINATIM_TIMEOUT_MS,
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

// FIX: when the user names a place ("ramen in New Brunswick, NJ"), that place
// — not the device's GPS fix — has to become the distance anchor. Otherwise
// every candidate scores ~0 on proximity and the card reports a 38-mile walk.
async function geocodeLocationName(name) {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { format: "json", limit: 1, countrycodes: "us", q: name },
      headers: { "User-Agent": NOMINATIM_UA },
      timeout: NOMINATIM_TIMEOUT_MS,
    });
    const hit = Array.isArray(response.data) ? response.data[0] : null;
    if (!hit) return null;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch (err) {
    console.error("Forward geocoding error:", err.response?.data || err.message);
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

// --- Candidate discovery ---------------------------------------------------

async function fetchCandidatePool({ textQuery, locationName }) {
  const fetchPage = async (page) => {
    const body = { q: textQuery, gl: "us", num: CANDIDATE_POOL_SIZE };
    if (locationName) body.location = locationName;
    if (page > 1) body.page = page;

    const response = await axios.post("https://google.serper.dev/places", body, {
      headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" },
      timeout: SERPER_TIMEOUT_MS,
    });
    return response.data.places || [];
  };

  const seen = new Map();
  let page = 1;
  let pagesFetched = 0;
  let lastBatchSize = 0;

  while (page <= MAX_PAGES && seen.size < CANDIDATE_POOL_SIZE) {
    const batch = await fetchPage(page);
    pagesFetched += 1;
    lastBatchSize = batch.length;
    if (batch.length === 0) break;

    for (const place of batch) {
      const key = place.placeId || place.cid || `${place.title}-${place.latitude}-${place.longitude}`;
      if (!seen.has(key)) seen.set(key, place);
    }

    if (batch.length < CANDIDATE_POOL_SIZE) break; // thin area — more paging won't help
    page += 1;
  }

  return {
    places: Array.from(seen.values()).slice(0, CANDIDATE_POOL_SIZE),
    pagesFetched,
    lastBatchSize,
  };
}

// --- Scoring primitives ----------------------------------------------------

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function minMaxNormalize(values) {
  const finite = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return values.map(() => 1); // everyone tied — don't penalize anyone
  return values.map((v) => (typeof v === "number" && Number.isFinite(v) ? (v - min) / (max - min) : 0));
}

function computeRelevance(place, dishKeyword, cuisineKeyword) {
  if (!dishKeyword && !cuisineKeyword) return 0.5;

  const haystack = buildHaystack(place);

  if (dishKeyword) {
    if (haystack.includes(dishKeyword)) return 1;
    const dishWords = dishKeyword.split(/\s+/).filter((w) => w.length > 3);
    if (dishWords.some((w) => haystack.includes(w))) return 0.6;
  }

  if (cuisineKeyword && haystack.includes(cuisineKeyword)) return 0.5;

  return 0;
}

function buildHaystack(place) {
  return `${place.title || ""} ${place.type || ""} ${(place.types || []).join(" ")} ${place.description || ""}`.toLowerCase();
}

function budgetTextToLevel(budgetStr) {
  if (!budgetStr) return null;
  const s = budgetStr.toLowerCase();
  if (/\${4,}/.test(budgetStr) || /(very expensive|fine dining|upscale|splurge)/.test(s)) return 4;
  if (/\${3}/.test(budgetStr) || /(expensive|pricey|high[- ]end)/.test(s)) return 3;
  if (/\${2}/.test(budgetStr) || /(moderate|mid[- ]range)/.test(s)) return 2;
  if (/\$/.test(budgetStr) || /(cheap|budget|affordable|inexpensive)/.test(s)) return 1;
  return null;
}

function derivePlacePriceLevel(place) {
  const raw = place.priceLevel ?? place.price_level ?? place.price;
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const dollarMatch = raw.match(/\${1,4}/);
    if (dollarMatch) return dollarMatch[0].length;
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

// Neutral 0.5 when either side is unknown — never guessed.
function computeBudgetMatch(userLevel, placeLevel) {
  if (userLevel == null || placeLevel == null) return 0.5;
  return Math.max(0, 1 - Math.abs(userLevel - placeLevel) / 3);
}

// Dampens the composite for candidates with thin, hard-to-verify data.
function confidenceMultiplier(reviewCount, dataTrust) {
  const reviewConfidence = Math.min(1, reviewCount / 25);
  return Math.min(1, 0.7 + 0.3 * ((reviewConfidence + dataTrust) / 2));
}

// --- Exa research + cache --------------------------------------------------

function cacheKeyFor(place) {
  return place.website || `place:${place.placeId || place.cid}`;
}

// FIX (perf): one query for all finalists instead of five sequential
// round-trips to Supabase on the hot path.
async function fetchCachedResearchBatch(cacheKeys) {
  const result = new Map();
  if (cacheKeys.length === 0) return result;

  const { data, error } = await supabaseAdmin
    .from("restaurant_research")
    .select("cache_key, source_type, source_url, highlights, fetched_at")
    .in("cache_key", cacheKeys);

  if (error) {
    console.error("restaurant_research read error:", error);
    return result;
  }

  const cutoff = Date.now() - EXA_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  for (const row of data || []) {
    if (new Date(row.fetched_at).getTime() < cutoff) continue;
    result.set(row.cache_key, {
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      highlights: row.highlights || [],
    });
  }
  return result;
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

async function researchCandidate(candidate, evidenceQuery, cachedRecord) {
  if (cachedRecord) return cachedRecord;
  if (!EXA_API_KEY) return null;

  const website = candidate.place.website;
  const cacheKey = cacheKeyFor(candidate.place);

  try {
    if (website) {
      const response = await axios.post(
        "https://api.exa.ai/contents",
        {
          urls: [website],
          highlights: { query: evidenceQuery, maxCharacters: 300 },
          subpages: 2,
          subpageTarget: ["menu", "food"],
        },
        {
          headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
          timeout: EXA_TIMEOUT_MS,
        }
      );

      const status = response.data?.statuses?.[0];
      const result = response.data?.results?.[0];

      if (status?.status === "success" && result) {
        const record = {
          sourceType: "official_site",
          sourceUrl: result.url,
          highlights: result.highlights || [],
        };
        await storeResearch(cacheKey, candidate.place.placeId, record);
        return record;
      }
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
      {
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        timeout: EXA_TIMEOUT_MS,
      }
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

function computeEvidenceScore(research) {
  if (!research) return 0;
  const hasHighlights = Array.isArray(research.highlights) && research.highlights.length > 0;
  if (research.sourceType === "official_site") return hasHighlights ? 1 : 0.5;
  if (research.sourceType === "secondary") return hasHighlights ? 0.6 : 0.3;
  return 0;
}

// How much of what the user asked for shows up in the REAL text we have.
function computeConceptualRelevance(combinedText, terms) {
  const meaningful = terms.filter(Boolean).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  if (meaningful.length === 0) return { score: 0.5, matched: [] };
  const text = combinedText.toLowerCase();
  const matched = meaningful.filter((t) => text.includes(t));
  return { score: matched.length / meaningful.length, matched };
}

// --- Serper image search (winner only) -------------------------------------

async function fetchWinnerImage(name, address) {
  try {
    const response = await axios.post(
      "https://google.serper.dev/images",
      { q: `${name} ${address || ""} restaurant`.trim(), gl: "us", num: 3 },
      {
        headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" },
        timeout: SERPER_TIMEOUT_MS,
      }
    );
    const hit = (response.data.images || [])[0];
    if (!hit?.imageUrl) return null;
    return { imageUrl: hit.imageUrl, imageSourceUrl: hit.link || null };
  } catch (err) {
    console.error("Serper image search failed:", err.response?.data || err.message);
    return null;
  }
}

// --- Routes ----------------------------------------------------------------

app.get("/", (req, res) => {
  res.send("Restaurant AI Backend is alive!");
});

// NOTE: this is an unauthenticated email-enumeration oracle. Anyone can probe
// whether an address has an account. Consider dropping it and relying on the
// `identities.length === 0` signal Supabase already returns from signUp, or
// gate it behind a per-IP rate limiter.
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
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing auth token — please sign in." });
    }

    const token = authHeader.slice("Bearer ".length).trim();

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired session — please sign in again." });
    }

    const userId = userData.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("search_counts")
      .select("search_date, count")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("search_counts fetch error:", fetchError);
      return res.status(500).json({ error: "Failed to check search limit" });
    }

    // Rolls over automatically on a new day; no pre-insert needed, since the
    // post-search write is an upsert.
    const currentCount = existing && existing.search_date === today ? existing.count : 0;

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
  } catch (err) {
    console.error("requireAuthAndLimit error:", err.message);
    return res.status(500).json({ error: "Failed to verify your session" });
  }
}

async function recordSearch(userId, searchDate, newCount) {
  const { error } = await supabaseAdmin
    .from("search_counts")
    .upsert({ user_id: userId, search_date: searchDate, count: newCount }, { onConflict: "user_id" });
  if (error) console.error("Failed to update search count:", error);
}

app.post("/search", requireAuthAndLimit, async (req, res) => {
  try {
    const userRequest = req.body.query;
    const userLat = req.body.lat;
    const userLng = req.body.lng;

    if (!userRequest || typeof userRequest !== "string" || !userRequest.trim()) {
      return res.status(400).json({ error: "Missing or empty 'query' in request body" });
    }
    if (userRequest.length > MAX_QUERY_CHARS) {
      return res.status(400).json({ error: `Query is too long (max ${MAX_QUERY_CHARS} characters)` });
    }
    if (typeof userLat !== "number" || typeof userLng !== "number" ||
        !Number.isFinite(userLat) || !Number.isFinite(userLng) ||
        Math.abs(userLat) > 90 || Math.abs(userLng) > 180) {
      return res.status(400).json({ error: "Missing or invalid 'lat'/'lng' — location is required for radius search" });
    }

    console.log("User said:", userRequest, "at", userLat, userLng);

    // Three independent I/O calls, all kicked off before any await. The
    // reverse geocode is speculative — we discard it if OpenAI turns out to
    // have found a named location in the query.
    // FIX: Promise.resolve() wrapper — supabase-js query builders are
    // PromiseLike (they implement `then`, not `catch`), so calling .catch()
    // directly on one throws a TypeError.
    const profilePromise = Promise.resolve(
      supabaseAdmin
        .from("profiles")
        .select("allergies, dietary_preferences")
        .eq("id", req.userId)
        .maybeSingle()
    ).catch((err) => {
      console.error("profile fetch error:", err.message);
      return { data: null };
    });

    const deviceLocationPromise = reverseGeocodeToLocationName(userLat, userLng);

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
              "Leave it as an empty string if the user did not name a specific place. " +
              "'dietaryRestrictions' is an array of dietary needs mentioned (e.g. 'vegetarian', 'gluten-free'). " +
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

    const { data: profile } = await profilePromise;

    // Allergies stay separate from general preferences: the UI attaches a
    // stronger safety caveat to them, even though both feed the same
    // evidence query and conceptual-match scoring.
    const allergyTerms = profile?.allergies
      ? profile.allergies.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const dietaryPreferenceTerms = Array.from(
      new Set([
        ...(Array.isArray(preferences.dietaryRestrictions) ? preferences.dietaryRestrictions : []),
        ...(profile?.dietary_preferences
          ? profile.dietary_preferences.split(",").map((s) => s.trim()).filter(Boolean)
          : []),
      ])
    );
    const allDietaryTerms = Array.from(new Set([...allergyTerms, ...dietaryPreferenceTerms]));

    // --- Resolve the search area and the distance anchor ---------------------
    const namedLocation = preferences.location?.trim();
    let locationName;
    let anchor = { lat: userLat, lng: userLng };
    let anchorSource = "device";

    if (namedLocation) {
      locationName = namedLocation;
      const geocoded = await geocodeLocationName(namedLocation);
      if (geocoded) {
        anchor = geocoded;
        anchorSource = "named";
      }
      deviceLocationPromise.catch(() => null); // discard, keep the handler attached
    } else {
      locationName = await deviceLocationPromise;
    }

    let candidates;
    try {
      const textQuery =
        [preferences.dish, preferences.cuisine, "restaurants"].filter(Boolean).join(" ").trim() || "restaurants";

      const { places, pagesFetched, lastBatchSize } = await fetchCandidatePool({ textQuery, locationName });
      candidates = places;

      console.log(
        `Got ${candidates.length} unique candidates from Serper Places ` +
          `(location: ${locationName || "none"}, anchor: ${anchorSource}, pages: ${pagesFetched}, last page: ${lastBatchSize})`
      );
    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error("Serper Places search error:", detail);
      return res.status(500).json({ error: "Failed to search Serper Places", detail });
    }

    const emptyResult = () => {
      const newCount = req.currentSearchCount + 1;
      return { newCount };
    };

    if (candidates.length === 0) {
      const { newCount } = emptyResult();
      await recordSearch(req.userId, req.searchDate, newCount);
      return res.json({
        preferences,
        locationName,
        restaurants: [],
        searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
      });
    }

    const GLOBAL_AVERAGE = 4.2;
    const CONFIDENCE_WEIGHT = 10;

    const dishKeyword = preferences.dish?.trim().toLowerCase();
    const cuisineKeyword = preferences.cuisine?.trim().toLowerCase();
    const userBudgetLevel = budgetTextToLevel(preferences.budget);

    // ============================ STAGE 1 ==================================
    // Layer 1: raw per-candidate features across the full Serper pool.
    const withFeatures = candidates
      .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
      .map((p) => {
        const rating = typeof p.rating === "number" ? p.rating : null;
        const reviewCount = p.ratingCount || 0;

        const bayesianRating =
          rating !== null
            ? (CONFIDENCE_WEIGHT * GLOBAL_AVERAGE + reviewCount * rating) / (CONFIDENCE_WEIGHT + reviewCount)
            : GLOBAL_AVERAGE * 0.85;

        const distance = distanceInMiles(anchor.lat, anchor.lng, p.latitude, p.longitude);
        const proximity = Math.exp(-distance / PROXIMITY_DECAY_MILES);

        const relevance = computeRelevance(p, dishKeyword, cuisineKeyword);
        const dataTrust = (p.website ? 0.5 : 0) + (p.phoneNumber ? 0.5 : 0);
        const placePriceLevel = derivePlacePriceLevel(p);
        const budgetMatch = computeBudgetMatch(userBudgetLevel, placePriceLevel);

        const haystack = buildHaystack(p);
        const matchedDish = dishKeyword && haystack.includes(dishKeyword) ? preferences.dish.trim() : null;
        const matchedCuisine =
          !matchedDish && cuisineKeyword && haystack.includes(cuisineKeyword) ? preferences.cuisine.trim() : null;

        return {
          place: p, rating, reviewCount, bayesianRating, distance, proximity,
          relevance, dataTrust, budgetMatch, matchedDish, matchedCuisine,
        };
      });

    // FIX: previously, a pool with no usable coordinates produced an
    // undefined `winner` and crashed on `winner.composite`.
    if (withFeatures.length === 0) {
      const { newCount } = emptyResult();
      await recordSearch(req.userId, req.searchDate, newCount);
      return res.json({
        preferences,
        locationName,
        restaurants: [],
        searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
      });
    }

    // Layer 2: hard relevance gate.
    const wantsSomethingSpecific = Boolean(dishKeyword || cuisineKeyword);
    const relevantOnly = withFeatures.filter((c) => c.relevance > 0);
    const pool = wantsSomethingSpecific && relevantOnly.length >= 2 ? relevantOnly : withFeatures;

    // Layer 3: normalize each feature across the gated pool.
    // FIX: normalized values are attached to each candidate object rather than
    // held in parallel arrays. The old code looked them up with
    // `stage1Ranked.indexOf(c)` against objects that had been recreated by a
    // spread — indexOf compared by reference, always returned -1, and every
    // scoreBreakdown field silently fell through to 0.
    const ratingNorm = minMaxNormalize(pool.map((c) => c.bayesianRating));
    const relevanceNorm = minMaxNormalize(pool.map((c) => c.relevance));
    const proximityNorm = minMaxNormalize(pool.map((c) => c.proximity));
    const trustNorm = minMaxNormalize(pool.map((c) => c.dataTrust));
    const budgetNorm = minMaxNormalize(pool.map((c) => c.budgetMatch));

    // Layers 4 + 5: weighted composite, then confidence dampening.
    const stage1Ranked = pool
      .map((c, i) => {
        const norm = {
          rating: ratingNorm[i],
          relevance: relevanceNorm[i],
          proximity: proximityNorm[i],
          trust: trustNorm[i],
          budget: budgetNorm[i],
        };
        const composite =
          STAGE1_WEIGHTS.rating * norm.rating +
          STAGE1_WEIGHTS.relevance * norm.relevance +
          STAGE1_WEIGHTS.proximity * norm.proximity +
          STAGE1_WEIGHTS.budget * norm.budget +
          STAGE1_WEIGHTS.trust * norm.trust;
        return { ...c, norm, stage1Composite: composite * confidenceMultiplier(c.reviewCount, c.dataTrust) };
      })
      .sort((a, b) => b.stage1Composite - a.stage1Composite);

    // ============================ STAGE 2 ==================================
    const finalists = stage1Ranked.slice(0, STAGE1_FINALIST_COUNT);

    const evidenceQueryParts = [preferences.dish, preferences.cuisine, ...allDietaryTerms].filter(Boolean);
    const evidenceQuery =
      evidenceQueryParts.length > 0
        ? `${evidenceQueryParts.join(" ")} menu specialties price`
        : "menu specialties price";

    const cacheMap = await fetchCachedResearchBatch(finalists.map((c) => cacheKeyFor(c.place)));

    const researchResults = await Promise.allSettled(
      finalists.map((c) => researchCandidate(c, evidenceQuery, cacheMap.get(cacheKeyFor(c.place))))
    );

    const conceptualTerms = [
      preferences.dish,
      preferences.cuisine,
      ...(Array.isArray(preferences.importantFactors) ? preferences.importantFactors : []),
    ].filter(Boolean);

    const finalistsWithResearch = finalists.map((c, i) => {
      const research = researchResults[i].status === "fulfilled" ? researchResults[i].value : null;
      const evidenceScore = computeEvidenceScore(research);

      const combinedText =
        `${c.place.title} ${c.place.type || ""} ${(c.place.types || []).join(" ")} ` +
        `${c.place.description || ""} ${(research?.highlights || []).join(" ")}`;

      const conceptual = computeConceptualRelevance(combinedText, conceptualTerms);
      const dietaryMatch = computeConceptualRelevance(combinedText, dietaryPreferenceTerms);
      const allergyMatch = computeConceptualRelevance(combinedText, allergyTerms);

      return {
        ...c,
        research,
        evidenceScore,
        conceptualScore: conceptual.score,
        matchedDietaryTerms: dietaryPreferenceTerms.length > 0 ? dietaryMatch.matched : [],
        matchedAllergyTerms: allergyTerms.length > 0 ? allergyMatch.matched : [],
      };
    });

    // Re-normalize base + new signals across just the finalists.
    const baseNorm2 = minMaxNormalize(finalistsWithResearch.map((c) => c.stage1Composite));
    const evidenceNorm2 = minMaxNormalize(finalistsWithResearch.map((c) => c.evidenceScore));
    const conceptualNorm2 = minMaxNormalize(finalistsWithResearch.map((c) => c.conceptualScore));

    const ranked = finalistsWithResearch
      .map((c, i) => {
        // Absolute 0-1 signals — independent of who else is in the pool.
        // These are what the user sees.
        const absolute = {
          quality: clamp01((c.bayesianRating - 3) / 2), // 3.0★ → 0, 5.0★ → 1
          relevance: c.conceptualScore,
          proximity: c.proximity,
          trust: c.dataTrust,
          budget: c.budgetMatch,
          evidence: c.evidenceScore,
        };

        const displayScore =
          DISPLAY_WEIGHTS.quality * absolute.quality +
          DISPLAY_WEIGHTS.relevance * absolute.relevance +
          DISPLAY_WEIGHTS.proximity * absolute.proximity +
          DISPLAY_WEIGHTS.trust * absolute.trust +
          DISPLAY_WEIGHTS.budget * absolute.budget +
          DISPLAY_WEIGHTS.evidence * absolute.evidence;

        return {
          ...c,
          absolute,
          matchScore: Math.round(clamp01(displayScore) * 100),
          // Competitive score — decides the winner only, never displayed.
          composite:
            STAGE2_WEIGHTS.base * baseNorm2[i] +
            STAGE2_WEIGHTS.evidence * evidenceNorm2[i] +
            STAGE2_WEIGHTS.conceptual * conceptualNorm2[i],
        };
      })
      .sort((a, b) => b.composite - a.composite);

    const winner = ranked[0];
    const others = ranked.slice(1);

    // Dominance now compares the honest absolute scores, so "37% better than
    // the alternatives" means something a user could verify.
    const othersAvgScore =
      others.length > 0 ? others.reduce((sum, c) => sum + c.matchScore, 0) / others.length : null;
    const dominancePercent =
      othersAvgScore && othersAvgScore > 0
        ? Math.round(((winner.matchScore - othersAvgScore) / othersAvgScore) * 100)
        : null;

    const runnerUps = others.slice(0, 3).map((c) => ({
      name: c.place.title,
      matchScore: c.matchScore,
    }));

    const winnerImage = await fetchWinnerImage(winner.place.title, winner.place.address);

    const finalPicks = [
      {
        id: winner.place.placeId || winner.place.cid,
        name: winner.place.title,
        rating: winner.rating,
        reviewCount: winner.reviewCount,
        address: winner.place.address || "",
        category: winner.place.type || (winner.place.types && winner.place.types[0]) || null,
        website: winner.place.website || null,
        phone: winner.place.phoneNumber || null,
        lat: winner.place.latitude,
        lng: winner.place.longitude,
        distanceMiles: Math.round(winner.distance * 10) / 10,
        distanceFrom: anchorSource === "named" ? locationName : "you",
        matchedDish: winner.matchedDish,
        matchedCuisine: winner.matchedCuisine,
        matchScore: winner.matchScore,
        scoreBreakdown: {
          quality: Math.round(winner.absolute.quality * 100),
          relevance: Math.round(winner.absolute.relevance * 100),
          proximity: Math.round(winner.absolute.proximity * 100),
          trust: Math.round(winner.absolute.trust * 100),
          evidence: Math.round(winner.absolute.evidence * 100),
          budget: userBudgetLevel != null ? Math.round(winner.absolute.budget * 100) : null,
        },
        evidence: winner.research
          ? {
              sourceType: winner.research.sourceType,
              sourceUrl: winner.research.sourceUrl,
              highlights: winner.research.highlights,
            }
          : null,
        matchedDietaryTerms: winner.matchedDietaryTerms.length > 0 ? winner.matchedDietaryTerms : null,
        matchedAllergyTerms: winner.matchedAllergyTerms.length > 0 ? winner.matchedAllergyTerms : null,
        beatCount: Math.max(0, pool.length - 1),
        poolSize: candidates.length,
        dominancePercent,
        runnerUps,
        imageUrl: winnerImage?.imageUrl || null,
        imageSourceUrl: winnerImage?.imageSourceUrl || null,
      },
    ];

    const newCount = req.currentSearchCount + 1;
    await recordSearch(req.userId, req.searchDate, newCount);

    console.log(
      `FINAL: stage1 pool ${pool.length}, researched ${finalists.length}, winner "${winner.place.title}" ` +
        `(${winner.matchScore}%, dominance ${dominancePercent}%)`
    );

    return res.json({
      preferences,
      locationName,
      restaurants: finalPicks,
      searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
    });
  } catch (err) {
    console.error("Unhandled /search error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Something went wrong on our end. Please try again." });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});