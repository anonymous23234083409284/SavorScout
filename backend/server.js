require("dotenv").config();

const express = require("express");
const axios = require("axios");

const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const https = require("https");

// Every outbound call previously opened a fresh TLS connection. With 4-6
// calls per search that is 200-500ms of pure handshake. One pooled agent,
// reused across requests, removes it.
const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 64, keepAliveMsecs: 30000 });
const http = axios.create({ httpsAgent: keepAliveAgent, timeout: 8000 });

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

// Expandable radius. Start tight, because a 5-10 mile result is one someone
// will actually drive to; widen only when the tight radius genuinely can't
// field enough options. A single fixed number is wrong in both directions —
// too small for rural users, too generous for dense ones.
const RADIUS_TIERS = {
  nearby: [5, 10, 15],
  driving: [10, 15, 25],
  anywhere: [15, 25, 40],
};
const DEFAULT_RADIUS_MODE = "nearby";

// A tier has to field at least this many candidates before we settle there.
// Picking a "winner" out of two is not a comparison worth reporting.
const MIN_CANDIDATES_PER_TIER = 4;

// The best N inside the radius go on to be ranked in full.
const SHORTLIST_SIZE = 10;

const CANDIDATE_POOL_SIZE = 20; // over-fetch, since the radius filter discards some
const MAX_PAGES = 1;            // a 2nd page is a 2nd serial Serper call; 15 candidates is plenty
const STAGE1_FINALIST_COUNT = 3; // was 5 — fewer parallel Exa calls means a shorter tail
const DAILY_SEARCH_LIMIT = 5;
const EARTH_RADIUS_MILES = 3958.8;
const PROXIMITY_DECAY_MILES = 3;
const MAX_QUERY_CHARS = 300;

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_TIMEOUT_MS = 4000;     // per-call ceiling; the deadline below is the real budget
const EXA_CACHE_TTL_DAYS = 14;

// The hard latency guarantee. Whatever evidence lands inside this window is
// used; anything slower keeps running in the background purely to warm the
// cache, so the NEXT search for that restaurant gets it for free. Ranking
// degrades gracefully because evidence is one signal among six.
const EXA_DEADLINE_MS = 700;

const SERPER_TIMEOUT_MS = 4000;
// Competitive weights — decide WHO WINS. Operate on min-max normalized
// features, so they answer "who is best relative to this pool".
// Proximity was 0.15 against rating's 0.35, so a well-rated place 27 miles
// out beat a good one 3 miles away. Distance is a primary criterion here,
// not a tiebreaker.
const STAGE1_WEIGHTS = { rating: 0.28, relevance: 0.27, proximity: 0.3, budget: 0.08, trust: 0.07 };
const STAGE2_WEIGHTS = { base: 0.45, evidence: 0.25, conceptual: 0.3 };

// Display weights — decide WHAT NUMBER THE USER SEES. Operate on absolute
// 0-1 signals, so a mediocre winner in a weak pool reads as a mediocre
// match instead of a guaranteed 100%.
// Any signal that is null gets EXCLUDED and its weight redistributed by
// weightedAbsolute — that is the core of honest scoring here. Previously
// unknowns were scored as zero, so a great restaurant with no website and a
// timed-out Exa lookup read 60% for reasons that were entirely about our own
// data gaps rather than the restaurant. Unknown is not the same as bad.
//
// `trust` (website + phone on file) is gone from the display entirely: it is
// a useful ranking tiebreaker but no diner has ever cared whether a listing
// was complete, and it was quietly capping good small restaurants.
const DISPLAY_WEIGHTS = {
  relevance: 0.34, quality: 0.3, proximity: 0.2, evidence: 0.08, budget: 0.08, vibe: 0.1,
};

// Restaurant ratings realistically cluster between ~3.5 and ~4.8; almost
// nothing sits at 3.0 or 5.0. Mapping 3.0→0 made a 4.4-star place — which is
// genuinely very good — score 0.69.
const QUALITY_FLOOR = 3.5;
const QUALITY_CEILING = 4.8;

// --- Geocoding -------------------------------------------------------------
// There is none, deliberately. Location now enters this app exactly one way:
// the ZIP box in the browser, which resolves through Mapbox BEFORE the
// search button is even clickable and sends both the canonical place name
// (`locationHint`) and its coordinates (`lat`/`lng`) together, always. The
// server has no reason to geocode, race, or guess — every previous location
// bug (Nominatim blocked from cloud IPs, a lost race against a 250ms timer,
// a name-in-craving-text override bypassing the ZIP gate) came from the
// server trying to do this job itself. Removing the job removes the bugs.

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

// Serper's `location` param takes a canonical place name — which is exactly
// what `locationName` always is now, since it comes straight from a Mapbox-
// resolved ZIP and the route already rejects a missing one before this is
// ever called.
async function fetchCandidatePool({ textQuery, locationName, anchor }) {
  const scopedQuery = `${textQuery} near ${locationName}`;

  const fetchPage = async (page) => {
    const body = { q: scopedQuery, gl: "us", location: locationName, num: CANDIDATE_POOL_SIZE };

    // Coordinates when we have them. Ignored by providers that don't
    // support it, decisive for the ones that do.
    if (anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)) {
      body.ll = `@${anchor.lat},${anchor.lng},13z`;
    }

    if (page > 1) body.page = page;

    const response = await http.post("https://google.serper.dev/places", body, {
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
    scopedQuery,
  };
}

// --- Scoring primitives ----------------------------------------------------

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Two evidence channels are cached independently: the menu channel (what the
// restaurant serves) and the reception channel (how people describe it).
// Prefixing keeps them from overwriting each other under one cache_key.
// Existing unprefixed rows simply stop matching and age out via the TTL —
// no migration needed.
function cacheKeyFor(place, channel) {
  const base = place.website || `place:${place.placeId || place.cid}`;
  return `${channel}:${base}`;
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

// CHANNEL 1 — menu evidence. Prefers the restaurant's own site (highest
// signal for "do they actually serve this"), falls back to a web search.
async function researchMenu(candidate, evidenceQuery, cachedRecord) {
  if (cachedRecord) return cachedRecord;
  if (!EXA_API_KEY) return null;

  const website = candidate.place.website;
  const cacheKey = cacheKeyFor(candidate.place, "menu");

  try {
    if (website) {
      const response = await http.post(
        "https://api.exa.ai/contents",
        {
          urls: [website],
          highlights: { query: evidenceQuery, maxCharacters: 300 },
          // Subpage crawling was the single biggest latency source here —
          // Exa's own docs call it out as significantly slower. Dropped.
          // maxAgeHours keeps us on cached content instead of triggering a
          // live crawl (maxAgeHours: 0 would force one).
          maxAgeHours: 720,
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
    const searchResponse = await http.post(
      "https://api.exa.ai/search",
      {
        query: searchQuery,
        type: "fast", // ~450ms p50 vs ~1s for "auto"
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

// CHANNEL 2 — reception evidence. Menus never contain the words "quiet",
// "cozy", or "good for groups"; reviews and write-ups do. This channel only
// runs when the user actually asked for a quality like that, so a plain
// "cheap sushi" search costs exactly what it did before.
async function researchReception(candidate, vibeQuery, cachedRecord) {
  if (cachedRecord) return cachedRecord;
  if (!EXA_API_KEY) return null;

  const cacheKey = cacheKeyFor(candidate.place, "reception");
  const searchQuery = `${candidate.place.title} ${candidate.place.address || ""} reviews atmosphere`.trim();

  try {
    const response = await http.post(
      "https://api.exa.ai/search",
      {
        query: searchQuery,
        type: "fast",
        numResults: 2,
        contents: { highlights: { query: vibeQuery, maxCharacters: 300 } },
      },
      {
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        timeout: EXA_TIMEOUT_MS,
      }
    );

    const hits = response.data?.results || [];
    if (hits.length === 0) return null;

    const highlights = hits.flatMap((h) => h.highlights || []).filter(Boolean);
    if (highlights.length === 0) return null;

    const record = { sourceType: "reception", sourceUrl: hits[0].url, highlights };
    await storeResearch(cacheKey, candidate.place.placeId, record);
    return record;
  } catch (err) {
    console.error(`Exa reception lookup failed for ${candidate.place.title}:`, err.response?.data || err.message);
    return null;
  }
}

function scoreOneChannel(research) {
  if (!research) return 0;
  const hasHighlights = Array.isArray(research.highlights) && research.highlights.length > 0;
  if (research.sourceType === "official_site") return hasHighlights ? 1 : 0.5;
  if (research.sourceType === "reception") return hasHighlights ? 0.8 : 0.3;
  if (research.sourceType === "secondary") return hasHighlights ? 0.6 : 0.3;
  return 0;
}

// When the user asked for a vibe, reception evidence is worth real weight.
// When they didn't, the reception channel never ran and menu evidence alone
// carries the score — no phantom penalty for a lookup we chose not to make.
// Resolves with whatever each promise produced inside `ms`, and null for
// the ones still in flight. Stragglers are NOT cancelled — they finish in
// the background and write to the cache, so the next request gets a hit.
function settleWithin(promises, ms) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(Symbol.for("deadline")), ms));
  return Promise.all(
    promises.map((p) =>
      Promise.race([p.catch(() => null), timeout]).then((v) => (v === Symbol.for("deadline") ? null : v))
    )
  );
}

// Scraped HTML loses word boundaries wherever a tag sat between two words:
// "<span>most liked</span><h3>Kinya Ramen</h3>" collapses to
// "most likedKinya Ramen". Re-inserting a space at a lowercase→uppercase
// seam repairs it. The {3,} guard keeps real names intact — "McDonald" has a
// one-letter lowercase run, so it is left alone.
function repairWordBoundaries(text) {
  return text.replace(/([a-z]{3,})([A-Z])/g, "$1 $2");
}

// Google's menu widget prefixes items with its own labels. These are page
// furniture, not part of the dish name.
const MENU_CHROME = /^(?:most liked|people also (?:like|order|search for)|popular(?:\s+(?:dishes?|items?))?|customers? (?:like|also order|recommend)|top (?:rated|picks?)|best sellers?|recommended|featured|menu)\s+/i;

// Review pages open with a header, a date and a reviewer byline before the
// actual review starts — "Reviews for Kinya Ramen & Bar 06/10/2025 - Vic S.
// If you're looking for..." — all of which reads as garbage in a pull quote.
const QUOTE_CHROME = [
  /\d{1,2}\/\d{1,2}\/\d{2,4}/,                 // an embedded date
  /^\s*(?:\d+\s+)?reviews?\s+(?:for|of|on)\b/i,  // "Reviews for X"
  /^\s*\d+\s*(?:reviews?|ratings?)\b/i,          // "933 reviews"
  /^\s*(?:rated|rating)\b/i,
  /^\s*[-–—]\s*[A-Z][a-z]+\s+[A-Z]\.?\s*$/,      // a bare "- Vic S." byline
];

// Drops leading segments that are page furniture and starts the quote at the
// first sentence that is actually someone talking. Always keeps the final
// segment so this can never return an empty string.
function stripQuoteChrome(text) {
  const segments = text.match(/[^.!?]+[.!?]*/g);
  if (!segments || segments.length < 2) return text;

  let start = 0;
  while (start < segments.length - 1) {
    const seg = segments[start].trim();
    const looksLikeChrome =
      QUOTE_CHROME.some((re) => re.test(seg)) || seg.split(/\s+/).length < 5;
    if (!looksLikeChrome) break;
    start += 1;
  }

  return segments.slice(start).join("").trim();
}

// Exa highlights from a menu page come back as scraped markup: markdown
// hashes, bullet glyphs, and long runs of prices. That reads as broken to a
// user and destroys trust in the whole card. A highlight has to look like a
// SENTENCE to be shown — otherwise we show nothing, which is honest and
// looks far better than "###### $17.00 ... $17 ... $17".
function cleanHighlight(raw) {
  if (typeof raw !== "string") return null;

  const text = repairWordBoundaries(
    raw
      .replace(/[#*_`>|]+/g, " ")
      .replace(/\s*[·•]\s*/g, ", ")
      .replace(/\.{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  if (text.length < 45) return null;

  const words = text.split(/\s+/);
  const realWords = words.filter((w) => /^[A-Za-z][A-Za-z'-]{2,}$/.test(w));
  if (realWords.length < 9) return null; // not prose

  const numericish = words.filter((w) => /^[$#]?[\d.,]+$/.test(w)).length;
  if (numericish / words.length > 0.2) return null; // a price list

  if (!/[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/i.test(text)) return null; // no phrase

  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

// The scraped menu text I was previously throwing away as noise is exactly
// where the dish prices live ("Miso Ramen ... $17.00"). Parsed rather than
// discarded, it becomes the menu list, ranked by relevance to what was
// actually searched for.
function extractMenuItems(research, terms, limit = 2) {
  if (!research?.highlights?.length) return [];

  const text = repairWordBoundaries(
    research.highlights
      .join(" \n ")
      .replace(/[#*_`|>]+/g, " ")
      .replace(/\s+/g, " ")
  );

  const found = new Map();
  const pattern = /([A-Za-z][A-Za-z0-9'&().\/-]*(?:\s+[A-Za-z0-9'&().\/-]+){0,4})\s*[-–—:·.]{0,4}\s*\$\s?(\d{1,3}(?:\.\d{2})?)/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    let name = match[1]
      .replace(/^[\s.,\-–—·]+|[\s.,\-–—·]+$/g, "")
      .replace(MENU_CHROME, "") // "most liked Kinya Ramen" → "Kinya Ramen"
      .replace(/^(?:and|or|the|with|add|plus|includes?|served|choice of)\s+/i, "")
      .trim();

    const words = name.split(/\s+/);
    if (words.length > 5) name = words.slice(-4).join(" "); // trim run-on prefixes
    if (name.length < 3 || name.length > 42) continue;
    if (!/[A-Za-z]{3}/.test(name)) continue;
    if (/^(?:price|total|tax|tip|from|only|each|per)$/i.test(name)) continue;

    const value = parseFloat(match[2]);
    if (!Number.isFinite(value) || value <= 0 || value > 300) continue;

    const key = name.toLowerCase();
    if (!found.has(key)) found.set(key, { name, price: `$${match[2]}` });
  }

  const wanted = terms.filter(Boolean).map((t) => String(t).toLowerCase());
  return Array.from(found.values())
    .map((item) => {
      const lower = item.name.toLowerCase();
      return { ...item, hits: wanted.filter((t) => lower.includes(t)).length };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ name, price }) => ({ name, price }));
}

// Belt and braces for the prompt fix above: even with corrected
// instructions the model will sometimes file a taste word as a "factor".
// Anything on this list is about the FOOD, so it gets checked against menu
// text with the dish instead of against atmosphere reviews — where it would
// never appear and would score a misleading 0%.
const TASTE_WORDS = /^(?:spicy|hot|mild|crispy|crunchy|fresh|authentic|greasy|sweet|savou?ry|salty|tangy|smoky|juicy|tender|creamy|rich|light|healthy|filling|cheesy|garlicky|traditional|homemade|fried|grilled|baked|raw|organic)$/i;

function splitFactors(factors) {
  const dishAttributes = [];
  const atmosphere = [];
  for (const raw of factors) {
    const term = String(raw).trim();
    if (!term) continue;
    (TASTE_WORDS.test(term) ? dishAttributes : atmosphere).push(term);
  }
  return { dishAttributes, atmosphere };
}

// A review is a person talking, not a menu fragment. We surface a real one
// when the research contains it — and return null rather than inventing a
// quote when it doesn't.
const REVIEW_MARKERS = /\b(?:we|i|my|our|they|staff|service|friendly|delicious|fresh|authentic|best|favou?rite|recommend|atmosphere|portions?|tasty|amazing|worth)\b/i;

function extractReview(research) {
  for (const raw of research?.highlights || []) {
    const cleaned = cleanHighlight(raw);
    if (!cleaned) continue;
    if (!REVIEW_MARKERS.test(cleaned)) continue;
    if ((cleaned.match(/\$/g) || []).length > 1) continue; // still a price list

    const trimmed = stripQuoteChrome(cleaned);
    // Re-check after trimming: if the only review-ish words lived in the
    // header we just removed, this was never a real review.
    if (trimmed.length < 45 || !REVIEW_MARKERS.test(trimmed)) continue;
    return trimmed;
  }
  return null;
}

function pickQuote(research) {
  for (const h of research?.highlights || []) {
    const cleaned = cleanHighlight(h);
    if (cleaned) return cleaned;
  }
  return null;
}

function computeEvidenceScore(menuResearch, receptionResearch, wantsVibe) {
  const menu = scoreOneChannel(menuResearch);
  if (!wantsVibe) return menu;
  return 0.6 * menu + 0.4 * scoreOneChannel(receptionResearch);
}

// Averages the absolute signals that actually exist, renormalizing over the
// weights present. A null signal (e.g. no vibe requested) is skipped rather
// than scored as zero, which would silently punish simple queries.
function weightedAbsolute(absolute, weights) {
  let sum = 0;
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = absolute[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    sum += weight * value;
    total += weight;
  }
  return total > 0 ? sum / total : 0;
}

// How much of what the user asked for shows up in the REAL text we have.
function computeConceptualRelevance(combinedText, terms) {
  const meaningful = terms.filter(Boolean).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  if (meaningful.length === 0) return { score: 0.5, matched: [] };
  const text = combinedText.toLowerCase();
  const matched = meaningful.filter((t) => text.includes(t));
  return { score: matched.length / meaningful.length, matched };
}

// --- Verdict loop ----------------------------------------------------------
// SavorScout is the only app in this category that makes a falsifiable
// prediction ("86% match"). An ungraded prediction is an open loop, and an
// open loop is a reason to come back that has nothing to do with being
// hungry. Every verdict is recorded automatically — the user does no work
// until they choose to answer.

const OUTCOME_SCORE = { better: 1, expected: 0.6, worse: 0 };

// Enough answers that a pattern isn't just noise. Below these thresholds the
// profile stays empty rather than inventing a preference from two data
// points — a wrong "we've learned you like X" is worse than saying nothing.
const MIN_SAMPLES_PER_CATEGORY = 2;
const MIN_SAMPLES_FOR_PRICE = 3;
const TASTE_ADJUSTMENT_CAP = 0.12; // ±12% on the stage-1 composite, no more

async function recordVerdict(userId, winner, meta) {
  const { error } = await supabaseAdmin.from("verdicts").insert({
    user_id: userId,
    place_id: winner.place.placeId || winner.place.cid || null,
    name: winner.place.title,
    address: winner.place.address || null,
    category: winner.place.type || null,
    lat: winner.place.latitude ?? null,
    lng: winner.place.longitude ?? null,
    query: meta.query,
    location_name: meta.locationName,
    match_score: meta.matchScore,
    price_level: winner.placePriceLevel ?? null,
    rating: winner.rating ?? null,
    review_count: winner.reviewCount ?? null,
    distance_mi: Math.round(winner.distance * 10) / 10,
  });
  if (error) console.error("verdict insert failed:", error.message);
}

// Derives what this person actually likes from what they RATED, not from
// what they told us at onboarding. Stated preferences and revealed
// preferences diverge constantly.
async function loadTasteProfile(userId) {
  const empty = { likedCategories: [], dislikedCategories: [], preferredPriceLevel: null, sampleSize: 0 };

  const { data, error } = await supabaseAdmin
    .from("verdicts")
    .select("outcome, price_level, category")
    .eq("user_id", userId)
    .eq("visited", true)
    .not("outcome", "is", null)
    .order("responded_at", { ascending: false })
    .limit(60);

  if (error || !data || data.length === 0) return empty;

  const byCategory = new Map();
  let priceSum = 0;
  let priceWeight = 0;

  for (const row of data) {
    const score = OUTCOME_SCORE[row.outcome];
    if (typeof score !== "number") continue;

    if (row.category) {
      const bucket = byCategory.get(row.category) || { sum: 0, n: 0 };
      bucket.sum += score;
      bucket.n += 1;
      byCategory.set(row.category, bucket);
    }

    // Only places they actually liked inform the price preference.
    if (row.price_level != null && score >= 0.6) {
      priceSum += row.price_level * score;
      priceWeight += score;
    }
  }

  const likedCategories = [];
  const dislikedCategories = [];
  for (const [category, { sum, n }] of byCategory) {
    if (n < MIN_SAMPLES_PER_CATEGORY) continue;
    const avg = sum / n;
    if (avg >= 0.7) likedCategories.push(category);
    else if (avg <= 0.3) dislikedCategories.push(category);
  }

  return {
    likedCategories,
    dislikedCategories,
    preferredPriceLevel: priceWeight >= MIN_SAMPLES_FOR_PRICE ? priceSum / priceWeight : null,
    sampleSize: data.length,
  };
}

// A deliberately small nudge. The engine's job is still to find the best
// match; this only breaks ties toward what this person has actually enjoyed.
function tasteMultiplier(candidate, profile) {
  if (!profile || profile.sampleSize === 0) return 1;

  let adjustment = 0;
  const category = candidate.place.type;

  if (category && profile.likedCategories.includes(category)) adjustment += TASTE_ADJUSTMENT_CAP;
  if (category && profile.dislikedCategories.includes(category)) adjustment -= TASTE_ADJUSTMENT_CAP;

  if (profile.preferredPriceLevel != null && candidate.placePriceLevel != null) {
    const gap = Math.abs(candidate.placePriceLevel - profile.preferredPriceLevel);
    adjustment += (1 - Math.min(gap, 2) / 2) * (TASTE_ADJUSTMENT_CAP / 2) - TASTE_ADJUSTMENT_CAP / 4;
  }

  return 1 + Math.max(-TASTE_ADJUSTMENT_CAP, Math.min(TASTE_ADJUSTMENT_CAP, adjustment));
}

// ===========================================================================
// GAME ENGINE
//
// Two rules shape everything below.
//
// 1. The streak runs on DUELS, not searches. Nobody eats out daily, so a
//    search streak either breaks (churn) or gets faked (poisoned data). A
//    pairwise choice is doable every day and is the highest-value signal we
//    can collect.
//
// 2. XP is priced by DATA VALUE, not effort. A rated verdict pays 100 and a
//    bare search pays 5, because one grades our engine and the other is a
//    log line. That pricing is also the anti-farming mechanism: farming
//    isn't forbidden, it's just not worth the time.
// ===========================================================================

const XP = {
  DUEL: 10,
  DUEL_SET_BONUS: 25,       // finishing all 5
  STREAK_DAY: 25,
  SEARCH_ENGAGED: 40,       // searched AND interacted with the verdict
  SEARCH_BARE: 5,           // searched, did nothing — priced like the log line it is
  VERDICT_ACTION: 75,       // clicked Directions/Site — our visit proxy
  VERDICT_RATED: 100,       // told us if we were right — the most valuable thing
  NEW_CUISINE: 150,
};

// Search XP decays within a day so grinding converges to zero.
const SEARCH_XP_DECAY = [40, 25, 15, 5, 0];

const DUELS_PER_DAY = 5;

// Rank names chosen to read as competence, not cuteness. "Taster" and
// "Connoisseur" belong on an adult product; "Food Ninja" does not.
const LEVELS = [
  { level: 1,  xp: 0,      rank: "Newcomer" },
  { level: 2,  xp: 600,    rank: "Taster" },
  { level: 3,  xp: 1800,   rank: "Scout" },
  { level: 4,  xp: 3200,   rank: "Scout" },
  { level: 5,  xp: 4500,   rank: "Regular" },
  { level: 6,  xp: 7000,   rank: "Regular" },
  { level: 7,  xp: 9000,   rank: "Regular" },
  { level: 8,  xp: 11000,  rank: "Local" },
  { level: 9,  xp: 14000,  rank: "Local" },
  { level: 10, xp: 17000,  rank: "Explorer" },
  { level: 11, xp: 21000,  rank: "Explorer" },
  { level: 12, xp: 25000,  rank: "Connoisseur" },
  { level: 13, xp: 30000,  rank: "Connoisseur" },
  { level: 14, xp: 36000,  rank: "Connoisseur" },
  { level: 15, xp: 45000,  rank: "Tastemaker" },
  { level: 16, xp: 55000,  rank: "Tastemaker" },
  { level: 17, xp: 65000,  rank: "Authority" },
  { level: 18, xp: 80000,  rank: "Authority" },
  { level: 19, xp: 100000, rank: "Legend" },
  { level: 20, xp: 125000, rank: "Legend" },
];

// Unlocks are features that genuinely can't work until the data exists —
// not existing features taken away to manufacture progression. Nothing that
// works at Lv1 is ever removed.
const UNLOCKS = [
  { level: 3,  key: "hidden_gems",  label: "Hidden Gems mode",     note: "needs taste signal to filter well" },
  { level: 5,  key: "streak_freeze", label: "Streak freeze",       note: "one missed day forgiven" },
  { level: 8,  key: "collection",   label: "Collection",           note: "needs visit history to exist" },
  { level: 10, key: "passport",     label: "Cuisine Passport",     note: "needs breadth" },
  { level: 12, key: "proactive",    label: "\u201cYou\u2019d love this\u201d picks", note: "needs ~15 rated visits" },
  { level: 16, key: "group",        label: "Group Decide",         note: "social" },
];

function levelForXp(xp) {
  let current = LEVELS[0];
  for (const tier of LEVELS) if (xp >= tier.xp) current = tier;
  const next = LEVELS.find((t) => t.xp > xp) || null;
  const span = next ? next.xp - current.xp : 1;
  const into = next ? xp - current.xp : 1;
  return {
    level: current.level,
    rank: current.rank,
    xpIntoLevel: into,
    xpForLevel: span,
    xpToNext: next ? next.xp - xp : 0,
    nextRank: next ? next.rank : null,
    progress: next ? Math.min(1, into / span) : 1,
  };
}

function unlocksFor(level) {
  return UNLOCKS.map((u) => ({ ...u, unlocked: level >= u.level }));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

async function loadGameState(userId) {
  const { data, error } = await supabaseAdmin
    .from("game_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) console.error("game_state read error:", error.message);
  if (data) return data;

  const fresh = { user_id: userId, xp: 0, streak_days: 0, longest_streak: 0 };
  await supabaseAdmin.from("game_state").insert(fresh);
  return { ...fresh, last_active_date: null, streak_freezes: 0, duels_today: 0, duels_date: null, searches_today: 0, searches_date: null };
}

// Streak advances on any qualifying action. A freeze absorbs exactly one
// missed day — deliberately forgiving, because punishing a missed day is the
// mechanic that makes these systems feel hostile.
async function touchStreak(userId, state) {
  const today = todayStr();
  if (state.last_active_date === today) return { state, streakAdvanced: false, freezeUsed: false };

  let streak = state.streak_days;
  let freezes = state.streak_freezes;
  let freezeUsed = false;

  if (!state.last_active_date) {
    streak = 1;
  } else {
    const gap = daysBetween(state.last_active_date, today);
    if (gap === 1) streak += 1;
    else if (gap === 2 && freezes > 0) {
      streak += 1;
      freezes -= 1;
      freezeUsed = true;
    } else streak = 1;
  }

  const longest = Math.max(state.longest_streak || 0, streak);
  const patch = {
    streak_days: streak,
    longest_streak: longest,
    streak_freezes: freezes,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  };
  await supabaseAdmin.from("game_state").update(patch).eq("user_id", userId);
  return { state: { ...state, ...patch }, streakAdvanced: true, freezeUsed };
}

async function awardXp(userId, amount, reason) {
  if (!amount) return null;
  const state = await loadGameState(userId);
  const before = levelForXp(state.xp);
  const xp = state.xp + amount;
  const after = levelForXp(xp);

  const patch = { xp, updated_at: new Date().toISOString() };
  // Reaching Lv5 grants the freeze that makes a missed day survivable.
  if (before.level < 5 && after.level >= 5) patch.streak_freezes = (state.streak_freezes || 0) + 1;

  await supabaseAdmin.from("game_state").update(patch).eq("user_id", userId);
  console.log(`XP +${amount} (${reason}) → ${xp}, Lv${after.level} ${after.rank}`);

  return { xp, gained: amount, leveledUp: after.level > before.level, level: after };
}

// --- Place pool ------------------------------------------------------------
// Every search quietly stocks the pool, so duels cost no extra Serper calls.

function zipArea(zip) {
  return String(zip || "").slice(0, 3) || "000";
}

async function stockPlacePool(places, area) {
  const rows = places
    .filter((p) => (p.placeId || p.cid) && p.title)
    .map((p) => ({
      place_id: p.placeId || p.cid,
      zip_area: area,
      name: p.title,
      category: p.type || null,
      lat: p.latitude ?? null,
      lng: p.longitude ?? null,
      rating: typeof p.rating === "number" ? p.rating : null,
      review_count: p.ratingCount || null,
      price_level: derivePlacePriceLevel(p),
      thumbnail: p.thumbnailUrl || p.thumbnail || null,
      address: p.address || null,
      last_seen: new Date().toISOString(),
    }));

  if (rows.length === 0) return;
  const { error } = await supabaseAdmin.from("place_pool").upsert(rows, { onConflict: "place_id" });
  if (error) console.error("place_pool upsert error:", error.message);
}

// --- Duel pairing ----------------------------------------------------------
// The whole value of a duel is in the pairing. Two places that differ on
// EVERYTHING teach us nothing — the choice is unattributable. Two that differ
// on exactly ONE axis measure that axis precisely. So each pair is built to
// isolate a single variable, and the five daily duels rotate through the
// axes to produce a complete preference vector rather than five samples of
// the same thing.

const DUEL_AXES = ["price", "rating", "distance", "cuisine", "popularity"];

function similar(a, b, key, tolerance) {
  if (a[key] == null || b[key] == null) return false;
  return Math.abs(a[key] - b[key]) <= tolerance;
}

function buildDuelPair(pool, axis, used) {
  const available = pool.filter((p) => !used.has(p.place_id));

  for (let i = 0; i < available.length; i += 1) {
    for (let j = i + 1; j < available.length; j += 1) {
      const a = available[i];
      const b = available[j];

      if (axis === "price") {
        // Same cuisine, comparable quality, different price → measures
        // price sensitivity in isolation.
        if (a.category && a.category === b.category &&
            similar(a, b, "rating", 0.3) &&
            a.price_level != null && b.price_level != null &&
            Math.abs(a.price_level - b.price_level) >= 1) return [a, b];
      }

      if (axis === "rating") {
        if (a.category && a.category === b.category &&
            a.price_level === b.price_level &&
            a.rating != null && b.rating != null &&
            Math.abs(a.rating - b.rating) >= 0.4) return [a, b];
      }

      if (axis === "distance") {
        if (similar(a, b, "rating", 0.3) && a.price_level === b.price_level &&
            a.lat != null && b.lat != null) return [a, b];
      }

      if (axis === "cuisine") {
        // Both good, similar price, different food → measures cuisine
        // affinity alone. Price MUST be held constant here: a $ vs $$$ pair
        // measures budget, not taste, and would quietly corrupt the cuisine
        // signal with price sensitivity.
        if (a.category && b.category && a.category !== b.category &&
            similar(a, b, "rating", 0.3) &&
            a.price_level != null && b.price_level != null &&
            a.price_level === b.price_level) return [a, b];
      }

      if (axis === "popularity") {
        // Hidden gem vs crowd favourite — the "do you trust the crowd or
        // your own nose" axis, which is genuinely predictive.
        if (a.review_count != null && b.review_count != null &&
            similar(a, b, "rating", 0.3) &&
            Math.min(a.review_count, b.review_count) < 150 &&
            Math.max(a.review_count, b.review_count) > 600) return [a, b];
      }
    }
  }
  return null;
}

async function generateDuels(userId, area) {
  const { data: pool, error } = await supabaseAdmin
    .from("place_pool")
    .select("*")
    .eq("zip_area", area)
    .order("last_seen", { ascending: false })
    .limit(120);

  if (error) {
    console.error("place_pool read error:", error.message);
    return [];
  }
  if (!pool || pool.length < 4) return []; // not enough local data yet

  const used = new Set();
  const pairs = [];

  for (const axis of DUEL_AXES) {
    const pair = buildDuelPair(pool, axis, used);
    if (!pair) continue;
    used.add(pair[0].place_id);
    used.add(pair[1].place_id);
    pairs.push({ axis, left: pair[0], right: pair[1] });
    if (pairs.length >= DUELS_PER_DAY) break;
  }

  // Backfill with random pairs only if the structured pairing came up short.
  // These are weaker data, but an empty duel screen is worse than weak data.
  while (pairs.length < DUELS_PER_DAY) {
    const remaining = pool.filter((p) => !used.has(p.place_id));
    if (remaining.length < 2) break;
    const a = remaining[Math.floor(Math.random() * remaining.length)];
    const b = remaining.find((p) => p.place_id !== a.place_id);
    if (!b) break;
    used.add(a.place_id);
    used.add(b.place_id);
    pairs.push({ axis: "open", left: a, right: b });
  }

  if (pairs.length === 0) return [];

  const rows = pairs.map((p) => ({
    user_id: userId,
    duel_date: todayStr(),
    axis: p.axis,
    left_place: p.left,
    right_place: p.right,
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("duels")
    .insert(rows)
    .select("id, axis, left_place, right_place, chosen");

  if (insertError) {
    console.error("duel insert error:", insertError.message);
    return [];
  }
  return inserted || [];
}

// --- Preference vector -----------------------------------------------------
// What the duels actually buy us: a readable statement of how this person
// trades one thing off against another.

async function loadPreferenceVector(userId) {
  const { data, error } = await supabaseAdmin
    .from("duels")
    .select("axis, chosen, left_place, right_place")
    .eq("user_id", userId)
    .not("chosen", "is", null)
    .neq("chosen", "skip")
    .order("answered_at", { ascending: false })
    .limit(200);

  if (error || !data || data.length === 0) {
    return { sampleSize: 0, priceSensitivity: null, crowdTrust: null, distanceTolerance: null, cuisineAffinity: [] };
  }

  let cheaperWins = 0, pricePairs = 0;
  let popularWins = 0, popPairs = 0;
  let closerWins = 0, distPairs = 0;
  const cuisineScore = new Map();

  for (const d of data) {
    const picked = d.chosen === "left" ? d.left_place : d.right_place;
    const other  = d.chosen === "left" ? d.right_place : d.left_place;
    if (!picked || !other) continue;

    if (d.axis === "price" && picked.price_level != null && other.price_level != null) {
      pricePairs += 1;
      if (picked.price_level < other.price_level) cheaperWins += 1;
    }
    if (d.axis === "popularity" && picked.review_count != null && other.review_count != null) {
      popPairs += 1;
      if (picked.review_count > other.review_count) popularWins += 1;
    }
    if (d.axis === "distance" && picked.lat != null && other.lat != null) {
      distPairs += 1;
    }
    if (picked.category) {
      const b = cuisineScore.get(picked.category) || { w: 0, n: 0 };
      b.w += 1; b.n += 1;
      cuisineScore.set(picked.category, b);
    }
    if (other.category) {
      const b = cuisineScore.get(other.category) || { w: 0, n: 0 };
      b.n += 1;
      cuisineScore.set(other.category, b);
    }
  }

  const cuisineAffinity = Array.from(cuisineScore.entries())
    .filter(([, b]) => b.n >= 3)
    .map(([cuisine, b]) => ({ cuisine, winRate: b.w / b.n, n: b.n }))
    .sort((a, b) => b.winRate - a.winRate);

  return {
    sampleSize: data.length,
    // Only reported once there's enough to mean something — a "you're
    // price-sensitive" claim off two duels is worse than saying nothing.
    priceSensitivity: pricePairs >= 3 ? cheaperWins / pricePairs : null,
    crowdTrust: popPairs >= 3 ? popularWins / popPairs : null,
    distanceTolerance: distPairs >= 3 ? closerWins / distPairs : null,
    cuisineAffinity: cuisineAffinity.slice(0, 6),
  };
}

// --- Serper image search (winner only) -------------------------------------

async function fetchWinnerImage(name, address) {
  try {
    const response = await http.post(
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

// Auth without the search-limit side effects: answering "did you go?" must
// never cost someone one of their five searches.
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing auth token — please sign in." });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired session — please sign in again." });
    }
    req.userId = data.user.id;
    next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    return res.status(500).json({ error: "Failed to verify your session" });
  }
}

// Verdicts old enough that they've had a chance to actually go. Asking
// "did you go?" ten minutes after the search is annoying and useless.
const VERDICT_ASK_DELAY_HOURS = 4;

// --- Game endpoints --------------------------------------------------------

app.get("/game/state", requireAuth, async (req, res) => {
  try {
    const state = await loadGameState(req.userId);
    const level = levelForXp(state.xp);
    const today = todayStr();

    return res.json({
      xp: state.xp,
      level,
      unlocks: unlocksFor(level.level),
      streak: {
        days: state.streak_days,
        longest: state.longest_streak,
        freezes: state.streak_freezes,
        activeToday: state.last_active_date === today,
      },
      duelsToday: state.duels_date === today ? state.duels_today : 0,
      duelsPerDay: DUELS_PER_DAY,
    });
  } catch (err) {
    console.error("game state error:", err.message);
    return res.status(500).json({ error: "Couldn't load your progress" });
  }
});

app.get("/duels/today", requireAuth, async (req, res) => {
  try {
    const area = zipArea(req.query.zip);
    const today = todayStr();

    const { data: existing } = await supabaseAdmin
      .from("duels")
      .select("id, axis, left_place, right_place, chosen")
      .eq("user_id", req.userId)
      .eq("duel_date", today)
      .order("created_at", { ascending: true });

    let duels = existing || [];
    if (duels.length === 0) duels = await generateDuels(req.userId, area);

    return res.json({
      duels: duels.filter((d) => !d.chosen),
      completed: duels.filter((d) => d.chosen).length,
      total: duels.length,
      // An honest empty state beats a fake one: with no local places cached
      // yet, we say so and point at search rather than inventing pairs.
      needsSeed: duels.length === 0,
    });
  } catch (err) {
    console.error("duels error:", err.message);
    return res.status(500).json({ error: "Couldn't load today's duels" });
  }
});

app.post("/duels/answer", requireAuth, async (req, res) => {
  try {
    const { id, chosen } = req.body || {};
    if (typeof id !== "string" || !["left", "right", "skip"].includes(chosen)) {
      return res.status(400).json({ error: "Invalid duel answer" });
    }

    const { data, error } = await supabaseAdmin
      .from("duels")
      .update({ chosen, answered_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", req.userId)
      .is("chosen", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("duel answer error:", error.message);
      return res.status(500).json({ error: "Couldn't record that" });
    }
    if (!data) return res.status(404).json({ error: "Duel already answered" });

    const today = todayStr();
    const state = await loadGameState(req.userId);
    const count = (state.duels_date === today ? state.duels_today : 0) + 1;

    await supabaseAdmin
      .from("game_state")
      .update({ duels_today: count, duels_date: today })
      .eq("user_id", req.userId);

    // Skips record data (an ambivalence signal) but earn nothing, so
    // skipping through five duels isn't a shortcut to the bonus.
    let award = null;
    if (chosen !== "skip") {
      const bonus = count === DUELS_PER_DAY ? XP.DUEL_SET_BONUS : 0;
      await touchStreak(req.userId, state);
      const streakBonus = state.last_active_date === today ? 0 : XP.STREAK_DAY;
      award = await awardXp(req.userId, XP.DUEL + bonus + streakBonus, "duel");
    }

    return res.json({ ok: true, completed: count, total: DUELS_PER_DAY, award });
  } catch (err) {
    console.error("duel answer error:", err.message);
    return res.status(500).json({ error: "Couldn't record that" });
  }
});

// Zero-effort telemetry. A Directions click is revealed intent and costs the
// user nothing — it's worth more than any survey answer we could ask for.
app.post("/events", requireAuth, async (req, res) => {
  try {
    const { kind, payload } = req.body || {};
    const allowed = [
      "directions_click", "site_click", "call_click", "comparisons_open",
      "breakdown_open", "map_open", "rapid_research", "tab_view",
    ];
    if (!allowed.includes(kind)) return res.status(400).json({ error: "Unknown event" });

    await supabaseAdmin.from("events").insert({
      user_id: req.userId,
      kind,
      payload: payload && typeof payload === "object" ? payload : null,
    });

    // Acting on a verdict is our visit proxy, so it pays — but only once per
    // verdict, or clicking Directions five times would be free XP.
    let award = null;
    if (kind === "directions_click" || kind === "site_click") {
      const { count } = await supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .in("kind", ["directions_click", "site_click"])
        .eq("payload->>verdictId", payload?.verdictId || "");

      if ((count || 0) <= 1) {
        const state = await loadGameState(req.userId);
        await touchStreak(req.userId, state);
        award = await awardXp(req.userId, XP.VERDICT_ACTION, "verdict action");
      }
    }

    return res.json({ ok: true, award });
  } catch (err) {
    console.error("event error:", err.message);
    return res.json({ ok: false }); // telemetry must never break the UI
  }
});

app.get("/me/taste", requireAuth, async (req, res) => {
  try {
    const [vector, profile] = await Promise.all([
      loadPreferenceVector(req.userId),
      loadTasteProfile(req.userId),
    ]);

    const { data: stamps } = await supabaseAdmin
      .from("stamps")
      .select("cuisine, place_name, first_at")
      .eq("user_id", req.userId)
      .order("first_at", { ascending: false });

    return res.json({ vector, profile, stamps: stamps || [] });
  } catch (err) {
    console.error("taste error:", err.message);
    return res.status(500).json({ error: "Couldn't load your taste profile" });
  }
});

app.get("/verdicts/pending", requireAuth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - VERDICT_ASK_DELAY_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("verdicts")
      .select("id, name, category, query, match_score, created_at, distance_mi")
      .eq("user_id", req.userId)
      .is("visited", null)
      .lt("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(3); // never a chore list — at most a few

    if (error) {
      console.error("pending verdicts error:", error.message);
      return res.status(500).json({ error: "Couldn't load your pending verdicts" });
    }

    return res.json({ pending: data || [] });
  } catch (err) {
    console.error("pending verdicts error:", err.message);
    return res.status(500).json({ error: "Couldn't load your pending verdicts" });
  }
});

app.post("/verdicts/feedback", requireAuth, async (req, res) => {
  try {
    const { id, visited, outcome } = req.body || {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Missing verdict id" });
    }
    if (typeof visited !== "boolean") {
      return res.status(400).json({ error: "Missing 'visited'" });
    }
    if (visited && !["better", "expected", "worse"].includes(outcome)) {
      return res.status(400).json({ error: "Invalid 'outcome'" });
    }

    // Scoped to user_id as well as id, so one user can never write to
    // another's verdict even with a guessed UUID.
    const { data, error } = await supabaseAdmin
      .from("verdicts")
      .update({
        visited,
        outcome: visited ? outcome : null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", req.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("verdict feedback error:", error.message);
      return res.status(500).json({ error: "Couldn't save that" });
    }
    if (!data) return res.status(404).json({ error: "Verdict not found" });

    // The highest-value action in the whole product: it grades our engine.
    // Paying the most for it keeps the XP economy and the data moat pointed
    // in the same direction.
    const state = await loadGameState(req.userId);
    await touchStreak(req.userId, state);
    const award = await awardXp(req.userId, XP.VERDICT_RATED, "verdict rated");

    return res.json({ ok: true, award });
  } catch (err) {
    console.error("verdict feedback error:", err.message);
    return res.status(500).json({ error: "Couldn't save that" });
  }
});

// The payoff screen: how often the engine was right FOR THIS PERSON, and
// what it has learned. This is the thing a competitor can't copy — it's
// built from our own graded predictions.
app.get("/me/scout-report", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("verdicts")
      .select("outcome, visited, match_score, name, category, responded_at")
      .eq("user_id", req.userId)
      .not("visited", "is", null)
      .order("responded_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("scout report error:", error.message);
      return res.status(500).json({ error: "Couldn't load your scout report" });
    }

    const answered = data || [];
    const visits = answered.filter((v) => v.visited && v.outcome);
    const hits = visits.filter((v) => v.outcome === "better" || v.outcome === "expected");

    const profile = await loadTasteProfile(req.userId);

    return res.json({
      answeredCount: answered.length,
      visitCount: visits.length,
      hitCount: hits.length,
      // Only meaningful once there's a real sample. Below that we say
      // nothing rather than publish "100% accurate" off one rating.
      accuracy: visits.length >= 3 ? Math.round((hits.length / visits.length) * 100) : null,
      learned: {
        likes: profile.likedCategories,
        avoids: profile.dislikedCategories,
        sampleSize: profile.sampleSize,
      },
      recent: visits.slice(0, 5).map((v) => ({
        name: v.name,
        outcome: v.outcome,
        matchScore: v.match_score,
      })),
    });
  } catch (err) {
    console.error("scout report error:", err.message);
    return res.status(500).json({ error: "Couldn't load your scout report" });
  }
});

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

    // The ZIP box is the only door location comes through now, and the
    // frontend never lets a search fire until it has resolved one via
    // Mapbox — name and coordinates arrive together, always. So this is a
    // straight trust of the request body, not a resolution step: no
    // geocoding, no racing, no fallback chain. If locationHint is missing,
    // something bypassed the UI (a stale client, a direct API call), and the
    // right response is to refuse rather than guess — a guess is exactly
    // what put a restaurant 1,000+ miles away on the card before.
    const locationName = typeof req.body.locationHint === "string" ? req.body.locationHint.trim() : "";

    if (!locationName) {
      return res.status(400).json({
        error: "Missing location — please set your ZIP code and try again.",
        searchesRemaining: DAILY_SEARCH_LIMIT - req.currentSearchCount,
      });
    }

    const requestedMode = typeof req.body.radiusMode === "string" ? req.body.radiusMode : "";
    const radiusMode = RADIUS_TIERS[requestedMode] ? requestedMode : DEFAULT_RADIUS_MODE;

    const anchor = { lat: userLat, lng: userLng };

    console.log("User said:", userRequest, "at", userLat, userLng);
    console.log(`Geo scope → "${locationName}" (${userLat.toFixed(3)},${userLng.toFixed(3)})`);

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

    // Revealed preferences, learned from verdicts they've actually rated.
    // Runs concurrently with everything else, so it costs no latency.
    const tastePromise = loadTasteProfile(req.userId).catch((err) => {
      console.error("taste profile load failed:", err.message);
      return null;
    });

    const candidatePromise = fetchCandidatePool({
      textQuery: userRequest.trim(),
      locationName,
      anchor,
    }).catch((error) => ({ error }));

    let preferences;
    try {
      const aiResponse = await openai.chat.completions.create({
        max_tokens: 200,
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract structured restaurant search intent from the user's request. " +
              "Return a JSON object with keys: dish, cuisine, budget, dietaryRestrictions, importantFactors. " +
              // No 'location' key: the search area comes only from the ZIP the
              // user set, never from a place mentioned in the craving text —
              // that would be a second, silent door around the ZIP gate.
              "'dietaryRestrictions' is an array of dietary needs mentioned (e.g. 'vegetarian', 'gluten-free'). " +
              // FIX: 'crispy' used to be the example here, which taught the
              // model to file taste words as atmosphere. "spicy ramen" then
              // put "spicy" in this list, and we went looking for the word
              // "spicy" in ATMOSPHERE reviews — which is why Vibe Match read
              // 0%. Taste and preparation belong with the dish.
              "'importantFactors' is ONLY about atmosphere, company and occasion — " +
              "e.g. 'quiet', 'cozy', 'romantic', 'good for groups', 'family friendly', 'late night'. " +
              "Words describing the FOOD itself (spicy, crispy, fresh, authentic, greasy, sweet) " +
              "are NOT importantFactors — fold those into 'dish' instead. " +
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

    let candidates;
    let candidatePool;
    {
      const pool = await candidatePromise;
      candidatePool = pool;
      if (pool.error) {
        const detail = pool.error.response?.data || pool.error.message;
        console.error("Serper Places search error:", detail);
        return res.status(500).json({ error: "Failed to search Serper Places", detail });
      }
      candidates = pool.places;
      console.log(
        `Got ${candidates.length} candidates from Serper Places ` +
          `(query: "${pool.scopedQuery}", pages: ${pool.pagesFetched})`
      );
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
          placePriceLevel, // retained so the card can distinguish "unknown" from "poor fit"
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

    // Layer 2a: expandable radius. Walk the tiers outward and stop at the
    // first one holding a real field of options; only fall back to the
    // widest tier's contents if none of them clear the threshold.
    const nearest = Math.min(...withFeatures.map((c) => c.distance));
    const tiers = RADIUS_TIERS[radiusMode] || RADIUS_TIERS[DEFAULT_RADIUS_MODE];
    const maxRadius = tiers[tiers.length - 1];

    let withinRadius = [];
    let radiusUsed = tiers[0];

    for (const tier of tiers) {
      const atTier = withFeatures.filter((c) => c.distance <= tier);
      // Settle here if this tier fields enough, OR if it is the last one and
      // has anything at all — better a short list than nothing.
      if (atTier.length >= MIN_CANDIDATES_PER_TIER || (tier === maxRadius && atTier.length > 0)) {
        withinRadius = atTier;
        radiusUsed = tier;
        break;
      }
      // Keep the best we have seen so the loop can't end empty-handed while
      // candidates genuinely exist inside the widest tier.
      if (atTier.length > withinRadius.length) {
        withinRadius = atTier;
        radiusUsed = tier;
      }
    }

    if (withinRadius.length === 0) {
      console.warn(
        `All ${withFeatures.length} candidates were beyond ${maxRadius}mi ` +
          `(nearest ${Math.round(nearest)}mi) for ZIP-scoped query "${locationName}". ` +
          `Serper received: ${JSON.stringify({ q: candidatePool.scopedQuery, location: locationName })}`
      );
      const { newCount } = emptyResult();
      recordSearch(req.userId, req.searchDate, newCount).catch(() => {});
      return res.json({
        preferences,
        locationName,
        restaurants: [],
        outOfRange: true,
        nearestMiles: Math.round(nearest),
        maxRadiusMiles: maxRadius,
        searchesRemaining: DAILY_SEARCH_LIMIT - newCount,
      });
    }

    console.log(
      `Radius "${radiusMode}" settled at ${radiusUsed}mi: ` +
        `${withinRadius.length}/${withFeatures.length} candidates (nearest ${Math.round(nearest)}mi).`
    );

    // Layer 2b: hard relevance gate.
    const wantsSomethingSpecific = Boolean(dishKeyword || cuisineKeyword);
    const relevantOnly = withinRadius.filter((c) => c.relevance > 0);
    const pool = wantsSomethingSpecific && relevantOnly.length >= 2 ? relevantOnly : withinRadius;

    // Layer 3: normalize each feature across the gated pool.
    // FIX: normalized values are attached to each candidate object rather than
    // held in parallel arrays. The old code looked them up with
    // `stage1Ranked.indexOf(c)` against objects that had been recreated by a
    // spread — indexOf compared by reference, always returned -1, and every
    // scoreBreakdown field silently fell through to 0.
    // THE ACTUAL BUG: proximity was min-max normalised along with everything
    // else, which converts absolute distance into a RELATIVE rank. If every
    // candidate sits 20-30mi out, the 27mi one still normalises to a healthy
    // score — "closest of a bad pool" scored identically to "closest of a
    // good pool". Distance is the one signal where the absolute number is
    // the whole point, so it now bypasses normalisation entirely and a hard
    // penalty is applied past the preferred radius.
    // Scaled to the tier we actually settled on: inside it, distance is a
    // non-issue; past it, a place has to be exceptional. A fixed 12mi cutoff
    // punished every result in a legitimately sparse area.
    const distancePenalty = (miles) => {
      if (miles <= radiusUsed) return 1;
      return Math.max(0.15, Math.exp(-(miles - radiusUsed) / 6));
    };

    const tasteProfile = await tastePromise;
    if (tasteProfile?.sampleSize > 0) {
      console.log(
        `Taste profile (${tasteProfile.sampleSize} rated): ` +
          `likes [${tasteProfile.likedCategories.join(", ") || "—"}], ` +
          `avoids [${tasteProfile.dislikedCategories.join(", ") || "—"}], ` +
          `price ${tasteProfile.preferredPriceLevel?.toFixed(1) ?? "—"}`
      );
    }

    const ratingNorm = minMaxNormalize(pool.map((c) => c.bayesianRating));
    const relevanceNorm = minMaxNormalize(pool.map((c) => c.relevance));
    const proximityNorm = pool.map((c) => c.proximity); // absolute, deliberately un-normalised
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
        const dampened =
          composite *
          confidenceMultiplier(c.reviewCount, c.dataTrust) *
          distancePenalty(c.distance) *
          tasteMultiplier(c, tasteProfile); // ±12% max — breaks ties, never overrides
        return { ...c, norm, stage1Composite: dampened };
      })
      .sort((a, b) => b.stage1Composite - a.stage1Composite);

    // The best 10 inside the radius are the real competition set — every
    // number the card reports ("beat N", dominance) is measured against
    // these, not against whatever Serper happened to return.
    const shortlist = stage1Ranked.slice(0, SHORTLIST_SIZE);
    console.log(`Shortlist: ${shortlist.length} best within ${radiusUsed}mi.`);

    // ============================ STAGE 2 ==================================
    const finalists = shortlist.slice(0, STAGE1_FINALIST_COUNT);

    // --- Two evidence channels ------------------------------------------
    // Menu channel: what they serve. Reception channel: how it's described.
    // Previously everything was scored against menu text, so a request for
    // "quiet" or "good for groups" could never match — those words don't
    // appear on menus — and the miss silently dragged down conceptualScore,
    // which is 0.30 of the stage-2 composite.
    const rawFactors = (Array.isArray(preferences.importantFactors) ? preferences.importantFactors : [])
      .filter(Boolean);
    const { dishAttributes, atmosphere: vibeTerms } = splitFactors(rawFactors);
    const wantsVibe = vibeTerms.length > 0;

    if (dishAttributes.length > 0) {
      console.log(`Reclassified taste words as dish attributes: ${dishAttributes.join(", ")}`);
    }

    const menuQueryParts = [preferences.dish, preferences.cuisine, ...dishAttributes, ...allDietaryTerms].filter(Boolean);
    const menuQuery =
      menuQueryParts.length > 0
        ? `${menuQueryParts.join(" ")} menu specialties price`
        : "menu specialties price";
    const vibeQuery = wantsVibe ? `${vibeTerms.join(" ")} atmosphere service experience` : null;

    // One round-trip covers both channels — the keys are prefixed, so they
    // come back from a single .in() query.
    const wantedKeys = finalists.flatMap((c) =>
      wantsVibe
        ? [cacheKeyFor(c.place, "menu"), cacheKeyFor(c.place, "reception")]
        : [cacheKeyFor(c.place, "menu")]
    );
    const cacheMap = await fetchCachedResearchBatch(wantedKeys);

    // Cache hits resolve synchronously and always make the deadline. Misses
    // race a ${EXA_DEADLINE_MS}ms clock; losers keep running to warm the cache.
    const menuPromises = finalists.map((c) =>
      researchMenu(c, menuQuery, cacheMap.get(cacheKeyFor(c.place, "menu")))
    );
    const receptionPromises = wantsVibe
      ? finalists.map((c) => researchReception(c, vibeQuery, cacheMap.get(cacheKeyFor(c.place, "reception"))))
      : finalists.map(() => Promise.resolve(null));

    const [menuResults, receptionResults] = await Promise.all([
      settleWithin(menuPromises, EXA_DEADLINE_MS),
      settleWithin(receptionPromises, EXA_DEADLINE_MS),
    ]);

    const settled = (results, i) => results[i] ?? null;

    const dishTerms = [preferences.dish, preferences.cuisine, ...dishAttributes].filter(Boolean);

    const finalistsWithResearch = finalists.map((c, i) => {
      const research = settled(menuResults, i);
      const reception = settled(receptionResults, i);
      const evidenceScore = computeEvidenceScore(research, reception, wantsVibe);

      const serperText =
        `${c.place.title} ${c.place.type || ""} ${(c.place.types || []).join(" ")} ${c.place.description || ""}`;

      // Dish/cuisine are checked against menu text; vibe words against
      // reception text. Each term is now scored against the source that
      // could plausibly contain it.
      const menuText = `${serperText} ${(research?.highlights || []).join(" ")}`;
      const receptionText = `${serperText} ${(reception?.highlights || []).join(" ")}`;

      const dishMatch = computeConceptualRelevance(menuText, dishTerms);
      const vibeMatch = wantsVibe ? computeConceptualRelevance(receptionText, vibeTerms) : null;

      // Dietary and allergy terms can surface in either channel — a menu
      // listing "gluten-free crust" or a review mentioning it both count.
      const bothText = `${menuText} ${reception?.highlights?.join(" ") || ""}`;
      const dietaryMatch = computeConceptualRelevance(bothText, dietaryPreferenceTerms);
      const allergyMatch = computeConceptualRelevance(bothText, allergyTerms);

      const conceptualScore = wantsVibe ? 0.65 * dishMatch.score + 0.35 * vibeMatch.score : dishMatch.score;

      return {
        ...c,
        research,
        reception,
        evidenceScore,
        conceptualScore,
        dishScore: dishMatch.score,
        // A review that doesn't happen to use the word "quiet" is not
        // evidence the place is loud — it's an absence of evidence. Scoring
        // that as 0% put a hard zero on the card for something we never
        // actually measured. Nothing matched → unknown → excluded, exactly
        // as we already treat a missed Exa lookup.
        vibeScore: vibeMatch && vibeMatch.matched.length > 0 ? vibeMatch.score : null,
        matchedFactors: vibeMatch ? vibeMatch.matched : [],
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
        // Absolute 0-1 signals — independent of who else is in the pool, and
        // null wherever we genuinely do not know. Null is excluded from the
        // average rather than counted as zero, so missing data no longer
        // reads as a bad restaurant.
        const absolute = {
          // Scaled to the range restaurants actually occupy.
          quality: c.rating !== null
            ? clamp01((c.bayesianRating - QUALITY_FLOOR) / (QUALITY_CEILING - QUALITY_FLOOR))
            : null, // unrated → unknown, not bad

          relevance: c.dishScore, // dish/cuisine vs menu text

          vibe: c.vibeScore, // null when no qualities were requested

          // Being inside the radius the user CHOSE is a good outcome, not a
          // compromise. exp(-3/3) scored a 3-mile restaurant at 37%, which
          // is nonsense when the user asked for "Nearby" (5mi).
          proximity: clamp01(1 - (c.distance / Math.max(radiusUsed, 1)) * 0.35),

          // Only meaningful when we know BOTH what they wanted and what the
          // place costs. Otherwise it was silently anchoring everyone to 0.5.
          budget: userBudgetLevel != null && c.placePriceLevel != null ? c.budgetMatch : null,

          // A missed Exa deadline is our latency budget, not a verdict on the
          // restaurant. No research came back → we don't know → excluded.
          evidence: c.research || c.reception ? c.evidenceScore : null,
        };

        const displayScore = weightedAbsolute(absolute, DISPLAY_WEIGHTS);

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

    // Serper Places often already includes a thumbnail. When it does, the
    // extra image search — a serial 300-600ms call at the very end of the
    // request — is skipped entirely.
    const existingThumb = winner.place.thumbnailUrl || winner.place.thumbnail || null;
    const winnerImage = existingThumb
      ? { imageUrl: existingThumb, imageSourceUrl: null }
      : await fetchWinnerImage(winner.place.title, winner.place.address);

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
        distanceFrom: locationName,
        matchedDish: winner.matchedDish,
        matchedCuisine: winner.matchedCuisine,
        matchScore: winner.matchScore,
        // Mirrors the nulls above: MiniMetric skips any non-number, so a
        // signal we couldn't measure is simply absent from the breakdown
        // instead of rendering a misleading 0%.
        scoreBreakdown: (() => {
          const pct = (v) => (typeof v === "number" ? Math.round(v * 100) : null);
          return {
            relevance: pct(winner.absolute.relevance),
            quality: pct(winner.absolute.quality),
            proximity: pct(winner.absolute.proximity),
            vibe: pct(winner.absolute.vibe),
            evidence: pct(winner.absolute.evidence),
            budget: pct(winner.absolute.budget),
          };
        })(),
        evidence: (() => {
          const quote = pickQuote(winner.research);
          return quote
            ? { sourceType: winner.research.sourceType, sourceUrl: winner.research.sourceUrl, quote }
            : null;
        })(),
        reception: (() => {
          const quote = pickQuote(winner.reception);
          return quote ? { sourceUrl: winner.reception.sourceUrl, quote } : null;
        })(),
        // A genuine review sentence, from either channel, or null.
        review: (() => {
          const text = extractReview(winner.reception) || extractReview(winner.research);
          if (!text) return null;
          return {
            text,
            sourceUrl: winner.reception?.sourceUrl || winner.research?.sourceUrl || null,
          };
        })(),
        menuItems: extractMenuItems(
          winner.research,
          [preferences.dish, preferences.cuisine].filter(Boolean)
        ),
        requestedFactors: wantsVibe ? vibeTerms : null,
        matchedFactors: winner.matchedFactors.length > 0 ? winner.matchedFactors : null,
        matchedDietaryTerms: winner.matchedDietaryTerms.length > 0 ? winner.matchedDietaryTerms : null,
        matchedAllergyTerms: winner.matchedAllergyTerms.length > 0 ? winner.matchedAllergyTerms : null,
        beatCount: Math.max(0, shortlist.length - 1),
        poolSize: candidates.length,
        dominancePercent,
        runnerUps,
        imageUrl: winnerImage?.imageUrl || null,
        imageSourceUrl: winnerImage?.imageSourceUrl || null,
      },
    ];

    const newCount = req.currentSearchCount + 1;
    // Neither of these blocks the response — the answer shouldn't wait on
    // bookkeeping. The verdict row is what makes the "did you go?" loop
    // possible, and it costs the user nothing to create.
    recordSearch(req.userId, req.searchDate, newCount).catch(() => {});
    recordVerdict(req.userId, winner, {
      query: userRequest.trim(),
      locationName,
      matchScore: winner.matchScore,
    }).catch(() => {});

    // Every search quietly stocks the duel pool, so the daily game costs no
    // extra Serper calls and gets richer the more the area is searched.
    stockPlacePool(candidates, zipArea(req.body.locationHint)).catch(() => {});

    // Search XP decays through the day (40/25/15/5/0) so grinding converges
    // to zero. The bare-search rate is deliberately low — an unengaged
    // search is a log line, not data, and shouldn't be priced like data.
    (async () => {
      try {
        const state = await loadGameState(req.userId);
        const today = todayStr();
        const nth = state.searches_date === today ? state.searches_today : 0;
        await supabaseAdmin
          .from("game_state")
          .update({ searches_today: nth + 1, searches_date: today })
          .eq("user_id", req.userId);

        await touchStreak(req.userId, state);
        const amount = SEARCH_XP_DECAY[Math.min(nth, SEARCH_XP_DECAY.length - 1)];
        if (amount > 0) await awardXp(req.userId, amount, `search #${nth + 1}`);
      } catch (err) {
        console.error("search xp error:", err.message);
      }
    })();

    // Cuisine passport: first time they're sent to a category is a stamp.
    if (winner.place.type) {
      supabaseAdmin
        .from("stamps")
        .upsert(
          { user_id: req.userId, cuisine: winner.place.type, place_name: winner.place.title },
          { onConflict: "user_id,cuisine", ignoreDuplicates: true }
        )
        .then(() => {})
        .catch(() => {});
    }

    console.log(
      `FINAL: ${withinRadius.length} within ${radiusUsed}mi → ${shortlist.length} shortlisted → ` +
        `${finalists.length} researched ` +
        `(channels: menu${wantsVibe ? " + reception" : ""}), winner "${winner.place.title}" ` +
        `(${winner.matchScore}%, dominance ${dominancePercent}%)`
    );

    return res.json({
      preferences,
      locationName,
      radiusUsed,
      radiusMode,
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