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
  "https://savorscout.net",
  "https://www.savorscout.net",
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
  /* Group rooms search a fixed 35mi. A board of five has to be findable
     wherever the host happens to be, and a tight radius in a thin area is the
     fastest way to end up with two options and a dead round. Closer places are
     still preferred — that is the comfort radius doing its job, not the pool. */
  group: [15, 25, 35],
};
const DEFAULT_RADIUS_MODE = "nearby";

// (MIN_CANDIDATES_PER_TIER removed: the tier ladder it gated is gone. Modes are
// now nested maxima rather than escalating fallbacks — see Layer 2a.)

// The best N inside the radius go on to be ranked in full.
/* How many places go on the group-vote board. Declared up here because
   /search builds the candidate list long before the room code runs, and a
   constant used above its own declaration only works by accident. */
const ROOM_MAX_CARDS = 5;
/* Vetoing stops once this many options remain. Any card is fair game above the
   floor; at the floor the bombs go quiet and the winner is decided purely by
   votes, so the group never gets to bomb its way to a single forced answer. */
const ROOM_VETO_FLOOR = 2;

const SHORTLIST_SIZE = 10;

const CANDIDATE_POOL_SIZE = 20; // over-fetch, since the radius filter discards some
const MAX_PAGES = 1;            // a 2nd page is a 2nd serial Serper call; 15 candidates is plenty
const STAGE1_FINALIST_COUNT = 3; // was 5 — fewer parallel Exa calls means a shorter tail
const DAILY_SEARCH_LIMIT = 5;

// One search before signing up. The point is to let someone feel the product
// work once — after that the wall is real, and it is a SERVER wall. Doing this
// in the browser would be theatre: clearing storage or opening a private
// window would reset it.
/* Three, not one. One free search meant opening a single group room spent the
   entire allowance, so the next attempt — or one shuffle you actually wanted —
   died on an auth error that read like a search failure. Three is enough to
   find a location, try a craving, and still open a room for the group. */
const FREE_TRIAL_SEARCHES = 3;
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

/* Names only the part of the craving we can actually stand behind. A search
   for "chicken wings" that only hits "wings" returns "wings", not the full
   phrase — the card says "Strong wings match", which is true, instead of
   claiming a chicken match we never verified. */
function matchDishLabel(haystack, dishKeyword, dishRaw) {
  if (!dishKeyword || !dishRaw) return null;
  if (haystack.includes(dishKeyword)) return dishRaw.trim();
  const words = dishKeyword.split(/\s+/).filter((w) => w.length > 3);
  if (words.length < 2) return null;
  const hits = words.filter((w) => haystack.includes(w));
  if (hits.length === 0) return null;
  return hits.length === words.length ? dishRaw.trim() : hits.join(" ");
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
/* Dish relevance, and ONLY dish relevance.

   computeConceptualRelevance below demands the literal phrase. For vibe,
   dietary and allergy terms that strictness is the whole point — loosening
   "tree nut" into "tree" would turn an allergy disclosure into a false
   positive, and that is the one mistake on this card nobody can afford.

   For a craving it was quietly breaking the product. Searching "chicken
   wings" in Bethpage returned a menu reading "Bone in Wings / Bone Out Wings
   / Chicken Sandwiches" and scored it a flat ZERO, because those exact two
   words never sit adjacent. Every wing shop in town tied at zero, relevance
   contributed nothing to the ranking, and the pick was decided by rating and
   distance alone — while the card claimed we matched what you asked for.

   So: full credit for a phrase hit, partial credit for the share of a term's
   own words that appear, capped below a true phrase match so an exact hit
   always outranks a scattered one. */
function computeDishRelevance(combinedText, terms) {
  const meaningful = terms.filter(Boolean).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  if (meaningful.length === 0) return { score: 0.5, matched: [] };
  const text = combinedText.toLowerCase();

  let total = 0;
  const matched = [];
  for (const term of meaningful) {
    if (text.includes(term)) {
      total += 1;
      matched.push(term);
      continue;
    }
    // Short words ("of", "and", "hot") carry no signal and match everywhere.
    const words = term.split(/\s+/).filter((w) => w.length > 3);
    if (words.length < 2) continue;
    const hits = words.filter((w) => text.includes(w));
    if (hits.length === 0) continue;
    total += 0.8 * (hits.length / words.length);
    matched.push(hits.join(" "));
  }
  return { score: total / meaningful.length, matched };
}

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
  SEAL_OPEN: 50,            // paid for showing up the next day, which is the point
  SEARCH_ENGAGED: 40,       // searched AND interacted with the verdict
  SEARCH_BARE: 5,           // searched, did nothing — priced like the log line it is
  VERDICT_ACTION: 75,       // clicked Directions/Site — our visit proxy
  VERDICT_RATED: 100,       // told us if we were right — the most valuable thing
  NEW_CUISINE: 150,
};

// Search XP decays within a day so grinding converges to zero.
const SEARCH_XP_DECAY = [40, 25, 15, 5, 0];


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
  const milestone = milestoneFor(streak);
  if (milestone) freezes += milestone.freezes;

  const patch = {
    streak_days: streak,
    longest_streak: longest,
    streak_freezes: freezes,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  };

  // Milestone XP is applied in the same write rather than through awardXp,
  // so a milestone can't race the caller's own XP award and lose one of them.
  if (milestone) {
    patch.xp = (state.xp || 0) + milestone.xp;
    console.log(`Milestone: ${milestone.label} (${streak} days) → +${milestone.xp} XP, +${milestone.freezes} freeze`);
  }

  await supabaseAdmin.from("game_state").update(patch).eq("user_id", userId);
  return { state: { ...state, ...patch }, streakAdvanced: true, freezeUsed, milestone };
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

// --- Streak milestones -----------------------------------------------------
// Rewards at intervals long enough to mean something. Each grants a freeze,
// so the longer the streak the more forgiving the system becomes — the
// opposite of the usual design, where a long streak makes one bad day
// catastrophic and drives people to quit outright.

const MILESTONES = [
  { days: 3,   label: "Three days",   xp: 100,  freezes: 0 },
  { days: 7,   label: "One week",     xp: 300,  freezes: 1 },
  { days: 14,  label: "Two weeks",    xp: 600,  freezes: 1 },
  { days: 30,  label: "One month",    xp: 1500, freezes: 2 },
  { days: 60,  label: "Two months",   xp: 3000, freezes: 2 },
  { days: 100, label: "One hundred",  xp: 6000, freezes: 3 },
];

function milestoneFor(days) {
  return MILESTONES.find((m) => m.days === days) || null;
}

function nextMilestone(days) {
  return MILESTONES.find((m) => m.days > days) || null;
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

// ===========================================================================
// CALIBRATION + TASTE MAP
//
// The reframe that matters: duels don't plateau because they're binary —
// Tinder is binary and Wordle is basically binary, and both are extremely
// sticky. Duels plateau because NOTHING VISIBLY CHANGES when you answer one.
// You tap, you get +10 XP, the world looks identical.
//
// So the fix isn't replacing duels. It's giving them a consequence surface.
// The map is that surface: every answer moves a node, raises a confidence
// number, or reveals a trait. Duels are the verb; the map is the noun. A verb
// with no noun is a chore; a noun with no verb is a dashboard. Together
// they're a loop.
// ===========================================================================

// Pairwise duels are gone; the daily loop is PREDICTIONS_PER_DAY single-item
// calls, defined with the prediction engine further down.

// Staleness. A preference we measured four months ago is not a preference we
// currently know — people change, and a map that renders a stale reading at
// full strength is quietly lying about its own freshness.
//
// This is presentation only. Nothing stored is ever reduced: wins and
// appearances are untouched, and the moment a card reappears it renders at
// full strength again. Fading what we display is honest; deleting what
// someone earned is the move that turns loss aversion from a reason to
// return into a reason to quit.
const STALE_GRACE_DAYS = 14;
const STALE_FULL_DAYS = 45;

function nodeStaleness(lastSeen) {
  if (!lastSeen) return 0;
  const days = (Date.now() - new Date(lastSeen).getTime()) / 86400000;
  if (!Number.isFinite(days) || days <= STALE_GRACE_DAYS) return 0;
  return Math.min(1, (days - STALE_GRACE_DAYS) / (STALE_FULL_DAYS - STALE_GRACE_DAYS));
}

// Fog of war: a node is only shown once actually encountered. Confidence
// climbs with evidence and is reported honestly, including when it's low.
function nodeConfidence(appearances) {
  if (!appearances) return 0;
  return Math.min(1, appearances / 6);
}

function nodeAffinity(wins, appearances) {
  if (!appearances) return null;
  return wins / appearances;
}

// PostgREST caps an unbounded select at 1000 rows and reports no error, so
// this quietly returned 1000 of 1446 cards — 446 were invisible to the whole
// product: never shown in a prediction, never mappable, never counted in a
// region total. Paginating is not an optimisation here, it is the difference
// between the deck existing and a third of it not.
const DECK_PAGE = 1000;

async function loadDeck() {
  const all = [];
  for (let from = 0; ; from += DECK_PAGE) {
    const { data, error } = await supabaseAdmin
      .from("taste_cards")
      .select("id, name, kind, family, rarity")
      .order("id", { ascending: true })
      .range(from, from + DECK_PAGE - 1);

    if (error) {
      console.error("deck load error:", error.message);
      return all;
    }
    all.push(...(data || []));
    if (!data || data.length < DECK_PAGE) break;
  }
  console.log(`deck loaded: ${all.length} cards`);
  return all;
}

let DECK_CACHE = null;
let DECK_CACHE_AT = 0;
async function deck() {
  if (DECK_CACHE && Date.now() - DECK_CACHE_AT < 10 * 60 * 1000) return DECK_CACHE;
  DECK_CACHE = await loadDeck();
  DECK_CACHE_AT = Date.now();
  return DECK_CACHE;
}

// Paginated for the same reason as the deck: a user who has rated more than
// 1000 cards would otherwise have the rest silently dropped from their own
// map and axes. Unreachable at 1446 cards, entirely reachable at 5000.
async function loadNodes(userId) {
  const out = new Map();
  for (let from = 0; ; from += DECK_PAGE) {
    const { data, error } = await supabaseAdmin
      .from("taste_nodes")
      .select("card_id, wins, appearances, last_seen")
      .eq("user_id", userId)
      .order("card_id", { ascending: true })
      .range(from, from + DECK_PAGE - 1);

    if (error) {
      console.error("nodes load error:", error.message);
      return out;
    }
    for (const n of data || []) out.set(n.card_id, n);
    if (!data || data.length < DECK_PAGE) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE PREDICTION ENGINE
//
// Replaces the pairwise duel. Instead of "which of these two", the app puts a
// single thing in front of the user and commits, out loud, to whether they
// will like it. They answer Match or Defy, and the guess is graded instantly.
//
// Why this is a better core loop than duels:
//
//   * A duel asks the user to do the work. A prediction makes the APP do the
//     work and puts it at risk — the interesting question stops being "which
//     do I prefer" and becomes "does this thing actually know me".
//   * Both outcomes are good for the user. A hit is eerie; a miss means they
//     are unreadable. Neither reads as losing, so there is no discouraging
//     branch to fall out of.
//   * The signal is cleaner. In a duel drawn from one family, a same-pole pair
//     ("Crispy" vs "Crunchy") teaches nothing about the axis but still lands
//     in wins/appearances. A single-item like is unambiguous: this exact card,
//     yes or no.
//
// STORAGE NOTE. calibrations.chosen has a CHECK constraint permitting only
// left/right/skip, so the two answers ride on the existing slots rather than
// requiring a migration that would take the core loop offline until it ran:
//
//     LIKE = "left"   the card wins  (Match — I'd like this)
//     PASS = "right"  the card loses (Defy  — not for me)
//
// left_ref holds the card. right_ref is NOT NULL in the schema, so it carries
// an empty object rather than null.
// ---------------------------------------------------------------------------

const PREDICTIONS_PER_DAY = 5;

const LIKE = "left";
const PASS = "right";

// A guess needs real grounding or it is a coin flip wearing a lab coat, and
// being caught coin-flipping is exactly what would destroy trust in the
// match scores this same model produces.
const PREDICT_MIN_EDGE = 0.12;
const PREDICT_CONFIDENCE_FLOOR = 0.55;
const PREDICT_CONFIDENCE_CEIL = 0.92;

/* Will they like this card? Three sources, most direct first.

   The second one is the reason this mechanic is worth building: generalising
   from the axes means the app can stake a claim on a dish the user has never
   been shown, purely from the shape of their taste. That is the moment that
   feels like being known rather than being surveyed. */
function predictLike(card, cards, nodes, readings) {
  const node = nodes.get(card.id);

  // 1. Direct history on this exact card.
  if (node && node.appearances >= 2) {
    const affinity = node.wins / node.appearances;
    const edge = Math.abs(affinity - 0.5);
    if (edge >= 0.2) {
      return {
        side: affinity > 0.5 ? LIKE : PASS,
        confidence: Math.min(PREDICT_CONFIDENCE_CEIL, 0.55 + edge * 0.7),
        basis: "history",
      };
    }
  }

  // 2. Generalise from the poles this card sits on.
  const sides = poleIndex(cards).get(card.id);
  if (sides) {
    let sum = 0;
    let weight = 0;
    for (const [axisKey, side] of sides) {
      const r = readings.get(axisKey);
      if (!r || !r.confident) continue;
      // How much the user leans toward the pole this card belongs to.
      const lean = side === "high" ? r.position : 1 - r.position;
      const w = decisiveness(r.position);
      if (w <= 0) continue;
      sum += lean * w;
      weight += w;
    }
    if (weight > 0) {
      const p = sum / weight;
      const edge = Math.abs(p - 0.5);
      if (edge >= PREDICT_MIN_EDGE) {
        return {
          side: p > 0.5 ? LIKE : PASS,
          confidence: Math.min(PREDICT_CONFIDENCE_CEIL, Math.max(PREDICT_CONFIDENCE_FLOOR, 0.5 + edge * 0.85)),
          basis: "taste",
        };
      }
    }
  }

  // 3. Nothing we'd stand behind. Say nothing rather than guess.
  return null;
}

/* Which cards to put up today.

   Weighted toward things we haven't measured, because an answer we can already
   predict with certainty teaches us nothing — this is active learning wearing
   a game's clothes. Families are rotated so a day covers breadth rather than
   drilling one corner, which also makes the map light up in more places. */
// "Would you like this?" only works if the reader instantly pictures the
// thing. A dish or a cuisine passes that test; "Umami bomb", "Elevated
// casual" and "Under 15 dollars" do not — they are attributes of a meal, not
// a meal. Those made up 42% of the deck and so 42% of what people were shown,
// which is most of why the cards felt wrong to answer.
//
// The abstract families still matter (they carry several taste axes), so they
// are not banned — just rationed to roughly one slot in five.
const ASKABLE_KINDS = new Set(["dish", "cuisine"]);
const ABSTRACT_SHARE = 0.2;

function pickPredictionCards(cards, nodes, count) {
  const concrete = cards.filter((c) => ASKABLE_KINDS.has(c.kind));
  const abstractSlots = Math.max(0, Math.round(count * ABSTRACT_SHARE));
  const pool = concrete.length >= count - abstractSlots ? concrete : cards;

  const byFamily = new Map();
  for (const c of pool) {
    const seen = nodes.get(c.id)?.appearances || 0;
    if (seen >= 3) continue; // well measured — leave it alone
    if (!byFamily.has(c.family)) byFamily.set(c.family, []);
    byFamily.get(c.family).push({ card: c, seen });
  }
  if (byFamily.size === 0) return cards.slice(0, count);

  // Least-explored families first, then a little randomness so two days in a
  // row don't look identical.
  const families = Array.from(byFamily.entries())
    .map(([family, list]) => ({
      family,
      list,
      explored: list.reduce((s, x) => s + x.seen, 0) / list.length,
    }))
    .sort((a, b) => a.explored - b.explored || Math.random() - 0.5);

  const target = pool === concrete ? count - abstractSlots : count;
  const picked = [];
  let round = 0;
  while (picked.length < target && round < 6) {
    for (const f of families) {
      if (picked.length >= target) break;
      const inFamily = f.list.filter((x) => !picked.some((p) => p.id === x.card.id));
      if (inFamily.length === 0) continue;
      // Unseen first inside the family.
      inFamily.sort((a, b) => a.seen - b.seen);
      const head = inFamily.slice(0, Math.max(1, Math.ceil(inFamily.length / 3)));
      picked.push(head[Math.floor(Math.random() * head.length)].card);
    }
    round += 1;
  }

  // Top up the remaining slot(s) with the abstract cards that carry the taste
  // axes — least-measured first, so they still earn their place.
  if (picked.length < count) {
    const rest = cards
      .filter((c) => !ASKABLE_KINDS.has(c.kind) && !picked.some((p) => p.id === c.id))
      .map((c) => ({ c, seen: nodes.get(c.id)?.appearances || 0 }))
      .filter((x) => x.seen < 3)
      .sort((a, b) => a.seen - b.seen || Math.random() - 0.5);
    for (const x of rest) {
      if (picked.length >= count) break;
      picked.push(x.c);
    }
  }

  return picked.slice(0, count);
}

async function generatePredictions(userId) {
  const today = todayStr();
  const cards = await deck();
  if (cards.length === 0) return [];

  const nodes = await loadNodes(userId);
  const readings = readAllAxes(cards, nodes);
  const chosen = pickPredictionCards(cards, nodes, PREDICTIONS_PER_DAY);

  const rows = chosen.map((card, slot) => {
    const guess = predictLike(card, cards, nodes, readings);
    return {
      user_id: userId,
      cal_date: today,
      slot,
      mode: "predict",
      axis: card.family,
      left_ref: { id: card.id, name: card.name, kind: card.kind, family: card.family, rarity: card.rarity || 1 },
      right_ref: {}, // NOT NULL in schema; unused by single-item predictions
      predicted: guess ? guess.side : null,
    };
  });

  if (rows.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("calibrations")
    .insert(rows)
    .select("id, slot, mode, axis, left_ref, right_ref, predicted, chosen");

  if (error) {
    console.error("prediction insert error:", error.message);
    return [];
  }
  return data || [];
}

/* The confidence attached to a stored prediction, recomputed live so the
   number shown is the confidence we hold NOW rather than one frozen at
   generation time and since drifted. */
function confidenceFor(row, cards, nodes, readings) {
  const card = row.left_ref;
  if (!card?.id) return null;
  const guess = predictLike(card, cards, nodes, readings);
  return guess && guess.side === row.predicted ? guess : null;
}

// The running scoreboard. This is the spine of the Daily Read: the user is
// not answering questions, they are playing against a model that keeps score
// — and crucially, BOTH columns are a good outcome for them. A high model
// score means the thing understands them; a high user score means they're
// unreadable. Neither reads as losing, which is why the loop has no
// discouraging branch to fall out of.
async function modelRecord(userId) {
  const { data, error } = await supabaseAdmin
    .from("calibrations")
    .select("predicted, chosen")
    .eq("user_id", userId)
    .not("predicted", "is", null)
    .not("chosen", "is", null);

  if (error) {
    console.error("model record error:", error.message);
    return { model: 0, you: 0, total: 0, accuracy: null };
  }

  let model = 0;
  let you = 0;
  for (const row of data || []) {
    if (row.chosen === "skip") continue;
    if (row.predicted === row.chosen) model += 1;
    else you += 1;
  }

  const total = model + you;
  return { model, you, total, accuracy: total ? model / total : null };
}

// How many more answers before we can stake a claim at all.
//
// Single-item predictions need either direct history on a card or a confident
// axis reading to generalise from, so the shortfall is measured against the
// nearest axis rather than a family pair. Reporting the real number matters —
// this message is a promise, and a promise that resolves late is worse than
// no promise at all.
function answersUntilPrediction(cards, nodes) {
  const readings = readAllAxes(cards, nodes);
  let best = Infinity;
  for (const axis of AXES) {
    const r = readings.get(axis.key);
    const have = r?.evidence || 0;
    best = Math.min(best, Math.max(0, axis.minEvidence - have));
  }
  return Number.isFinite(best) ? best : null;
}

// Builds the headline call for the day: the boldest unanswered prediction we
// are holding. Boldest rather than first, because this is the front door — it
// should be the most interesting thing we know, not whatever landed in slot
// zero.
async function buildDailyRead(userId, set, cards, nodes) {
  const record = await modelRecord(userId);
  const readings = readAllAxes(cards, nodes);

  const staked = (set || [])
    .filter((c) => !c.chosen && c.predicted && c.left_ref?.id)
    .map((c) => {
      const scored = confidenceFor(c, cards, nodes, readings);
      return scored ? { row: c, ...scored } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (staked) {
    return {
      state: "staked",
      id: staked.row.id,
      axis: staked.row.axis,
      side: staked.row.predicted,
      confidence: staked.confidence,
      basis: staked.basis,
      card: staked.row.left_ref,
      record,
    };
  }

  // An unanswered card we could not call. Still worth showing — we just say
  // so instead of inventing a guess.
  const blind = (set || []).find((c) => !c.chosen && c.left_ref?.id);
  if (blind) {
    return { state: "blind", id: blind.id, axis: blind.axis, card: blind.left_ref, record };
  }

  const spentToday = (set || []).some((c) => c.chosen);
  if (spentToday) return { state: "spent", record };

  return { state: "warming", need: answersUntilPrediction(cards, nodes), record };
}

// ---------------------------------------------------------------------------
// THE OVERNIGHT SEAL
//
// Everything else in this product resolves on the tap, which means nothing
// gives anyone a reason to return TOMORROW specifically. One prediction a day
// is therefore answered but not graded — the outcome is held overnight.
//
// That converts a habit into an appointment. A habit competes with everything
// else on the phone; an appointment is something of yours already waiting.
// It's the shape behind a Wordle reset, minus the currency.
//
// The seal is deliberately not on a timer that can expire. Someone who
// vanishes for a week returns to an envelope still sitting there, which turns
// a lapse into a welcome-back rather than a loss.
// ---------------------------------------------------------------------------

// The columns ship in backend/migrations/001_overnight_seal.sql. Until that
// has been run the feature simply switches itself off rather than 500ing
// every calibration fetch, so deploying the code first can't break anything.
// A positive result is cached for good — columns don't disappear. A negative
// one is re-probed, so applying the migration takes effect on its own instead
// of needing a restart nobody would think to do.
const SEAL_RETRY_MS = 5 * 60 * 1000;
let SEAL_READY = false;
let SEAL_PROBED_AT = 0;

async function sealSupported() {
  if (SEAL_READY) return true;
  if (SEAL_PROBED_AT && Date.now() - SEAL_PROBED_AT < SEAL_RETRY_MS) return false;

  SEAL_PROBED_AT = Date.now();
  const { error } = await supabaseAdmin.from("calibrations").select("sealed_at").limit(1);
  SEAL_READY = !error;

  if (SEAL_READY) console.log("overnight seal: enabled");
  else console.warn(`overnight seal: DISABLED — run backend/migrations/001_overnight_seal.sql (${error.message})`);
  return SEAL_READY;
}

async function outstandingSeal(userId) {
  if (!(await sealSupported())) return null;

  const { data, error } = await supabaseAdmin
    .from("calibrations")
    .select("id, axis, left_ref, right_ref, predicted, chosen, sealed_at")
    .eq("user_id", userId)
    .not("sealed_at", "is", null)
    .is("revealed_at", null)
    .order("sealed_at", { ascending: true })
    .limit(1);

  if (error) return null;
  const row = (data || [])[0];
  if (!row) return null;

  // sealed_at is stored UTC and todayStr() is a UTC date, so the comparison
  // is apples to apples. A seal set today isn't due yet.
  const sealedOn = String(row.sealed_at).slice(0, 10);
  if (sealedOn >= todayStr()) return { state: "set", sealedOn };

  return {
    state: "ready",
    id: row.id,
    axis: row.axis,
    left: row.left_ref,
    right: row.right_ref,
    chose: row.chosen,
    sealedOn,
  };
}

// Whether the answer being recorded right now should be held instead of
// graded. Requires that today's Read has already paid out, so nobody's first
// interaction of the day is a deferral.
async function shouldSeal(userId, row) {
  if (!row.predicted) return false;
  if (!(await sealSupported())) return false;

  const today = todayStr();

  const { count: sealedToday } = await supabaseAdmin
    .from("calibrations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("cal_date", today)
    .not("sealed_at", "is", null);
  if (sealedToday) return false;

  const { count: gradedToday } = await supabaseAdmin
    .from("calibrations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("cal_date", today)
    .neq("id", row.id)
    .not("predicted", "is", null)
    .not("chosen", "is", null)
    .is("sealed_at", null);

  return (gradedToday || 0) > 0;
}


// ---------------------------------------------------------------------------
// AXES, TRAITS, ARCHETYPE
//
// WHY THIS IS AXIS-BASED AND NOT FAMILY-BASED.
//
// Concept pairs are always drawn from the SAME family. That makes any rate
// aggregated over a whole family arithmetically pinned:
//
//     every answered pair gives one card +1 win / +1 appearance
//                          and the other  +0 win / +1 appearance
//     => sum(wins) = pairs, sum(appearances) = 2 * pairs
//     => familyRate(F) == 0.5, always, for every F
//
// The old heat_seeker and texture_led rules tested familyRate against 0.68,
// so they could never fire once. Every family in the deck is also single-kind,
// which pinned kindRate the same way.
//
// The fix is to measure a POLE — a named subset inside the family — instead of
// the family. "Ghost pepper hot" beating "Mild" is a real signal about heat;
// "some Heat card beat some other Heat card" is not.
//
// Card names below are taken from the live deck, not invented. The previous
// rules referenced "Under 10 dollars", "Locals only", "Strip mall gem" and
// others that do not exist in taste_cards, so those rules were quietly
// aggregating one card or zero.
// ---------------------------------------------------------------------------

const AXES = [
  {
    key: "heat",
    left: "Mild",
    right: "Fiery",
    minEvidence: 6,
    low: ["Mild", "Medium heat"],
    high: ["Properly spicy", "Numbing spice", "Ghost pepper hot", "Chili oil forward",
           "Wasabi sharp", "Black pepper heavy", "Harissa heat", "Scotch bonnet heat"],
    say: (p) =>
      p >= 0.72 ? "You take the spicier option almost every time it's offered."
      : p >= 0.58 ? "You lean hot when heat is on the table."
      : p <= 0.28 ? "You steer away from heat, consistently."
      : p <= 0.42 ? "You keep it mild more often than not."
      : "Heat doesn't swing your pick either way.",
    traits: {
      high: { key: "heat_seeker", label: "Heat seeker", detail: "You pick the spicier option most of the time." },
      low:  { key: "heat_averse", label: "Heat averse", detail: "You steer away from heat." },
    },
  },
  {
    key: "texture",
    left: "Soft",
    right: "Crisp",
    minEvidence: 6,
    low: ["Silky", "Creamy", "Gooey", "Melt in mouth", "Springy", "Chewy", "Juicy"],
    high: ["Crispy", "Crunchy", "Crackly skin", "Flaky", "Charred edges", "Al dente"],
    say: (p) =>
      p >= 0.70 ? "Crust and crackle decide it before flavour gets a vote."
      : p >= 0.58 ? "You lean toward the crisper version."
      : p <= 0.30 ? "You go soft, rich and slow-melting."
      : p <= 0.42 ? "You lean toward the softer version."
      : "Texture isn't what decides it for you.",
    traits: {
      high: { key: "texture_crisp", label: "Texture led", detail: "Crunch and crust decide it for you more than flavour does." },
      low:  { key: "texture_soft",  label: "Silk seeker", detail: "You go for soft and rich over crisp." },
    },
  },
  {
    key: "adventure",
    left: "Familiar",
    right: "Adventurous",
    minEvidence: 8,
    rarityHigh: 3, // rare cards can genuinely be paired against common ones in-family
    say: (p) =>
      p >= 0.68 ? "You order the thing you can't pronounce."
      : p >= 0.56 ? "You reach for the unfamiliar more than most people do."
      : p <= 0.30 ? "You know what you like and you stay there."
      : p <= 0.44 ? "You lean familiar when given the choice."
      : "You split evenly between the known and the new.",
    traits: {
      high: { key: "adventurous", label: "Adventurous", detail: "You reach for the unfamiliar option more than most." },
      low:  { key: "loyalist",    label: "Loyalist",    detail: "You know what you like and stay there." },
    },
  },
  {
    key: "price",
    left: "Cheap",
    right: "Expensive",
    minEvidence: 5,
    low: ["Under 15 dollars", "Under 25 dollars"],
    high: ["Splurge worthy", "Tasting menu"],
    say: (p) =>
      p >= 0.70 ? "You'd rather pay for the good one than save on the near one."
      : p >= 0.58 ? "You'll spend when the food justifies it."
      : p <= 0.30 ? "Price shapes your pick more than you'd probably admit."
      : p <= 0.42 ? "You lean toward the cheaper option."
      : "Price isn't the thing deciding it.",
    traits: {
      high: { key: "splurger",     label: "Splurger",     detail: "You'll pay up when the food is worth it." },
      low:  { key: "value_hunter", label: "Value hunter", detail: "Price shapes your pick more than you'd probably admit." },
    },
  },
  {
    key: "polish",
    left: "Humble",
    right: "Polished",
    minEvidence: 5,
    low: ["Dive", "No frills", "Hole in the wall", "Unmarked door", "Hidden entrance", "Neighborhood joint"],
    high: ["White tablecloth", "Elevated casual", "Destination spot", "Chef's counter", "Omakase style"],
    say: (p) =>
      p >= 0.70 ? "You want a room that knows exactly what it's doing."
      : p >= 0.58 ? "You lean toward the more polished room."
      : p <= 0.30 ? "You back the unmarked door over the famous one."
      : p <= 0.42 ? "You lean toward the plainer room."
      : "The room's polish doesn't sway you.",
    traits: {
      high: { key: "polished",   label: "Room matters", detail: "You want a room that knows what it's doing." },
      low:  { key: "gem_hunter", label: "Gem hunter",   detail: "You back the unmarked door over the famous one." },
    },
  },
  {
    key: "time",
    left: "Early",
    right: "Late night",
    minEvidence: 4,
    low: ["Early breakfast", "Mid morning", "Early dinner"],
    high: ["Late night", "After midnight", "24 hour"],
    say: (p) =>
      p >= 0.70 ? "Your best meals happen after most kitchens close."
      : p >= 0.58 ? "You drift late when the option is there."
      : p <= 0.30 ? "You eat before the rush, and you're right to."
      : p <= 0.42 ? "You lean earlier than most."
      : "Time of day doesn't decide it.",
    traits: {
      high: { key: "late_night", label: "Late-night bias", detail: "Late-night options win when you're offered them." },
      low:  { key: "early_bird", label: "Early bird",      detail: "You eat before the rush." },
    },
  },
];

// Pole membership is a property of the DECK, not of any user, so it is
// resolved once and reused. The population snapshot reads every axis for every
// user; doing an Array.includes per card per axis per user made that roughly
// seventy thousand string comparisons per user, for an answer that never
// changes between them.
let POLE_INDEX = null;
let POLE_INDEX_DECK = null;

function poleIndex(cards) {
  if (POLE_INDEX && POLE_INDEX_DECK === cards) return POLE_INDEX;

  const index = new Map(); // card.id -> Map(axisKey -> "high" | "low")
  const byName = new Map();
  for (const axis of AXES) {
    if (axis.rarityHigh) continue;
    for (const n of axis.high) byName.set(`${axis.key}|${n}`, "high");
    for (const n of axis.low) byName.set(`${axis.key}|${n}`, "low");
  }

  for (const card of cards) {
    const sides = new Map();
    for (const axis of AXES) {
      if (axis.rarityHigh) {
        sides.set(axis.key, (card.rarity || 1) >= axis.rarityHigh ? "high" : "low");
        continue;
      }
      const side = byName.get(`${axis.key}|${card.name}`);
      if (side) sides.set(axis.key, side);
    }
    if (sides.size) index.set(card.id, sides);
  }

  POLE_INDEX = index;
  POLE_INDEX_DECK = cards;
  return index;
}

// A pole reading. Evidence pointing "high" is high-pole wins PLUS low-pole
// losses, over every appearance on either pole — symmetric, and it still works
// when only one pole has been seen.
//
// Iterating the user's nodes rather than the whole deck matters: a person has
// met a few hundred cards at most, and the deck is 1,446.
function readAxis(axis, cards, nodes) {
  const index = poleIndex(cards);
  let hiWins = 0, hiApps = 0, loWins = 0, loApps = 0;

  for (const [cardId, node] of nodes) {
    if (!node.appearances) continue;
    const side = index.get(cardId)?.get(axis.key);
    if (!side) continue;
    if (side === "high") { hiWins += node.wins; hiApps += node.appearances; }
    else { loWins += node.wins; loApps += node.appearances; }
  }

  const seen = hiApps + loApps;
  if (seen === 0) return null;

  // Under single-item predictions every answer is informative: "would you like
  // Ghost pepper hot — yes" is direct evidence about heat, with no second card
  // to muddy it. So evidence is raw appearances again, unlike the pairwise era
  // where a same-pole pair contributed nothing and had to be discounted.
  //
  // The one degenerate case that survives is a user who has only ever been
  // shown one side of an axis: their position then measures how much they like
  // that pole in isolation, which is not the same as where they sit between
  // two. Requiring a couple of hits on each side rules that out cheaply.
  const bothSides = Math.min(hiApps, loApps) >= 2;

  const toward = hiWins + (loApps - loWins);
  return {
    key: axis.key,
    position: toward / seen,
    evidence: seen,
    seen,
    confident: seen >= axis.minEvidence && bothSides,
  };
}

function readAllAxes(cards, nodes) {
  const out = new Map();
  for (const axis of AXES) {
    const r = readAxis(axis, cards, nodes);
    if (r) out.set(axis.key, r);
  }
  return out;
}

// How far from the middle a reading sits. Drives which axis names the
// archetype and which order the bars appear in.
const DECISIVE = 0.14;
function decisiveness(position) {
  return Math.abs(position - 0.5) * 2;
}

// ---------------------------------------------------------------------------
// ARCHETYPE
//
// A label for the strongest thing we have actually measured — never a
// personality read invented to fill the space. It is gated on two confident,
// decisive axes, because a type produced from one weak signal is a Forer
// statement, and a product that sells "we know you" cannot afford one.
// ---------------------------------------------------------------------------

const ARCHETYPE_NAMES = {
  "heat:high":      { name: "The Char Chaser",  line: "You want heat, and you want it marked by fire." },
  "heat:low":       { name: "The Clean Palate", line: "You want the ingredient, not the burn." },
  "texture:high":   { name: "The Crunch Hunter", line: "Crust and crackle decide it before flavour gets a vote." },
  "texture:low":    { name: "The Silk Seeker",  line: "You go for soft, rich and slow-melting." },
  "adventure:high": { name: "The Far Traveller", line: "You order the thing you can't pronounce." },
  "adventure:low":  { name: "The Loyalist",     line: "You know what you like and you go back to it." },
  "price:high":     { name: "The Splurger",     line: "You'd rather pay for the good one than save on the near one." },
  "price:low":      { name: "The Value Hunter", line: "Price shapes your pick more than you'd probably admit." },
  "polish:high":    { name: "The Well Dressed", line: "You like a room that knows what it's doing." },
  "polish:low":     { name: "The Gem Hunter",   line: "You back the unmarked door over the famous one." },
  "time:high":      { name: "The Night Owl",    line: "Your best meals happen after most kitchens close." },
  "time:low":       { name: "The Early Bird",   line: "You eat before the rush, and you're right to." },
};

const ARCHETYPE_CLAUSE = {
  "heat:high": "chase the burn",           "heat:low": "keep it mild",
  "texture:high": "want the crunch",       "texture:low": "want it silky",
  "adventure:high": "reach for the unfamiliar", "adventure:low": "stay with what works",
  "price:high": "don't flinch at the bill", "price:low": "won't overpay",
  "polish:high": "like a room with polish", "polish:low": "prefer the unmarked door",
  "time:high": "eat late",                 "time:low": "eat early",
};

function archetypeFor(readings) {
  const ranked = AXES
    .map((a) => ({ axis: a, r: readings.get(a.key) }))
    .filter((x) => x.r && x.r.confident && decisiveness(x.r.position) >= DECISIVE)
    .sort((a, b) => decisiveness(b.r.position) - decisiveness(a.r.position));

  if (ranked.length < 2) return null;

  const poleOf = (x) => `${x.axis.key}:${x.r.position >= 0.5 ? "high" : "low"}`;
  const primary = ARCHETYPE_NAMES[poleOf(ranked[0])];
  if (!primary) return null;

  const clause = ARCHETYPE_CLAUSE[poleOf(ranked[1])];
  return {
    key: poleOf(ranked[0]),
    name: primary.name,
    line: clause ? `${primary.line} You also ${clause}.` : primary.line,
    from: ranked.slice(0, 3).map((x) => x.axis.key),
  };
}

// ---------------------------------------------------------------------------
// POPULATION
//
// Percentiles need a distribution, and there is no per-user axis table, so we
// build one in memory from taste_nodes on a long TTL. Comparative claims are
// suppressed entirely below POP_MIN readers on an axis — "more than most
// people" computed from four people is a lie with a number attached.
// ---------------------------------------------------------------------------

const POP_TTL_MS = 30 * 60 * 1000;
const POP_MIN = 25;
const POP_ROW_CAP = 200000;

let POP_CACHE = null;
let POP_CACHE_AT = 0;

async function population() {
  if (POP_CACHE && Date.now() - POP_CACHE_AT < POP_TTL_MS) return POP_CACHE;

  const empty = { axes: new Map(), archetypes: new Map(), users: 0 };
  try {
    const cards = await deck();
    const { data, error } = await supabaseAdmin
      .from("taste_nodes")
      .select("user_id, card_id, wins, appearances")
      .limit(POP_ROW_CAP);
    if (error || !data?.length) { POP_CACHE = empty; POP_CACHE_AT = Date.now(); return empty; }

    const byUser = new Map();
    for (const row of data) {
      if (!byUser.has(row.user_id)) byUser.set(row.user_id, new Map());
      byUser.get(row.user_id).set(row.card_id, row);
    }

    const axes = new Map(AXES.map((a) => [a.key, []]));
    const archetypes = new Map();

    for (const nodes of byUser.values()) {
      const readings = readAllAxes(cards, nodes);
      for (const [key, r] of readings) {
        if (r.confident) axes.get(key).push(r.position);
      }
      const arch = archetypeFor(readings);
      if (arch) archetypes.set(arch.key, (archetypes.get(arch.key) || 0) + 1);
    }

    for (const list of axes.values()) list.sort((a, b) => a - b);

    POP_CACHE = { axes, archetypes, users: byUser.size };
    POP_CACHE_AT = Date.now();
    console.log(`population snapshot: ${byUser.size} users, ${data.length} nodes`);
    return POP_CACHE;
  } catch (err) {
    console.error("population snapshot failed:", err.message);
    POP_CACHE = empty;
    POP_CACHE_AT = Date.now();
    return empty;
  }
}

function percentileIn(sorted, value) {
  if (!sorted || sorted.length < POP_MIN) return null;
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1; else hi = mid;
  }
  return lo / sorted.length;
}

// "More than most people" only when it is both true and worth saying.
function compareLine(pct) {
  if (pct == null) return null;
  if (pct >= 0.9) return `Further this way than ${Math.round(pct * 100)}% of people.`;
  if (pct <= 0.1) return `Further this way than ${Math.round((1 - pct) * 100)}% of people.`;
  if (pct >= 0.7) return "More than most people.";
  if (pct <= 0.3) return "Less than most people.";
  return null;
}

// ---------------------------------------------------------------------------
// TRAITS
//
// Traits are now derived from the same axis readings the bars use, so the two
// surfaces can never disagree, and every rule tests something that can
// actually move.
// ---------------------------------------------------------------------------

const TRAIT_MIN_DECISIVE = 0.2;

function traitsFromAxes(readings) {
  const out = [];
  for (const axis of AXES) {
    const r = readings.get(axis.key);
    if (!r || !r.confident) continue;
    if (decisiveness(r.position) < TRAIT_MIN_DECISIVE) continue;

    const side = r.position >= 0.5 ? "high" : "low";
    const t = axis.traits?.[side];
    if (!t) continue;

    out.push({
      key: t.key,
      label: t.label,
      detail: t.detail,
      confidence: Math.min(0.95, 0.5 + decisiveness(r.position) * 0.5),
    });
  }
  return out;
}

// What is almost known. Named and countable — a specific nearly-finished thing
// pulls people back in a way a percentage never does.
function pendingFromAxes(readings) {
  const out = [];
  for (const axis of AXES) {
    const r = readings.get(axis.key);
    if (r?.confident && decisiveness(r.position) >= TRAIT_MIN_DECISIVE) continue;
    const have = r?.evidence || 0;
    out.push({
      key: axis.key,
      label: `${axis.left} vs ${axis.right}`,
      need: Math.max(1, axis.minEvidence - have),
    });
  }
  return out.sort((a, b) => a.need - b.need);
}

async function refreshTraits(userId) {
  const cards = await deck();
  const nodes = await loadNodes(userId);
  if (cards.length === 0 || nodes.size === 0) return { revealed: [], pending: [] };

  const readings = readAllAxes(cards, nodes);
  const earned = traitsFromAxes(readings);

  const { data: existing } = await supabaseAdmin
    .from("taste_traits")
    .select("trait_key")
    .eq("user_id", userId);
  const have = new Set((existing || []).map((t) => t.trait_key));

  const fresh = [];
  for (const t of earned) {
    if (have.has(t.key)) continue;
    const row = {
      user_id: userId,
      trait_key: t.key,
      label: t.label,
      detail: t.detail,
      confidence: Math.round(t.confidence * 1000) / 1000,
    };
    const { error } = await supabaseAdmin
      .from("taste_traits")
      .upsert(row, { onConflict: "user_id,trait_key" });
    if (!error) fresh.push(row);
  }

  return { revealed: fresh, pending: pendingFromAxes(readings).slice(0, 3) };
}

// --- Pexels food photography ------------------------------------------------

/* Why the picture changed source.

   fetchWinnerImage below runs a Google image search for "<name> <address>
   restaurant" and hotlinks whatever comes back first. Two problems with that.
   The legal one: those URLs resolve to other companies' CDNs — Yelp, Uber
   Eats, Grubhub — and hotlinking them is at best unlicensed. The product one
   is worse. The first image result for a restaurant is frequently a storefront,
   a logo, a parking lot, or a DIFFERENT restaurant with a similar name, and we
   were presenting all of it, unlabelled, as though it were this place.

   A Pexels photo is properly licensed and looks like the food someone just
   asked for. It is also, unavoidably, NOT this restaurant's food — so it is
   labelled as representative wherever it appears. An unlabelled stock photo
   would trade a licensing problem for a trust problem, which is a worse deal
   for a product whose entire promise is that we actually looked.

   No key configured means this whole layer is skipped and the old path runs
   unchanged, so the site keeps working while the key is being set up. */

const PEXELS_TIMEOUT_MS = 3500;
const PEXELS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // stock photos do not go stale
const PEXELS_CACHE_MAX = 500;
const pexelsCache = new Map();

/* Cravings repeat far more than restaurants do — "pizza" is the same lookup
   for every user in every town — so caching by craving keeps us comfortably
   inside the free tier's 200 requests/hour no matter how the traffic grows. */
function pexelsCacheGet(key) {
  const hit = pexelsCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > PEXELS_CACHE_TTL_MS) { pexelsCache.delete(key); return null; }
  return hit.value;
}
function pexelsCachePut(key, value) {
  if (pexelsCache.size >= PEXELS_CACHE_MAX) pexelsCache.delete(pexelsCache.keys().next().value);
  pexelsCache.set(key, { at: Date.now(), value });
}

/* Words that describe the SEARCH rather than the food. Leaving them in sends
   Pexels looking for photographs of cheapness. */
const PHOTO_STOPWORDS = new Set([
  "cheap", "best", "good", "great", "top", "nice", "amazing", "authentic",
  "near", "nearby", "me", "open", "now", "late", "quick", "fast", "healthy",
  "a", "an", "the", "some", "any", "for", "with", "and", "or", "in", "at",
  "place", "places", "restaurant", "restaurants", "spot", "spots", "food",
]);

/* Bare "wings" returns birds and aircraft; bare "rolls" returns bread. Terms
   that are only food in context get the context put back. */
const NEEDS_FOOD_CONTEXT = new Set([
  "wings", "rolls", "roll", "buns", "bun", "chips", "greens", "shells",
  "cakes", "cake", "bowls", "bowl", "plates", "sticks", "fingers", "bites",
  "hot", "cold", "sweet", "spicy", "fresh",
]);

function pexelsQuery(raw) {
  const words = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !PHOTO_STOPWORDS.has(w));
  if (words.length === 0) return null;
  const term = words.slice(0, 3).join(" ");
  // Single ambiguous word → anchor it to food. Multi-word terms are already
  // unambiguous ("chicken wings" is never an aircraft).
  return words.length === 1 && NEEDS_FOOD_CONTEXT.has(words[0]) ? `${term} food` : term;
}

/* Same craving, different restaurants, different photos — but the SAME photo
   every time for a given restaurant. A picture that reshuffled on refresh
   would look like the pick itself had changed. */
function pickIndex(seed, length) {
  if (length <= 1) return 0;
  let h = 5381;
  const str = String(seed || "");
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h % length;
}

async function fetchPexelsFood(craving, seed) {
  if (!process.env.PEXELS_API_KEY) return null;
  const query = pexelsQuery(craving);
  if (!query) return null;

  let photos = pexelsCacheGet(query);
  if (!photos) {
    try {
      const response = await http.get("https://api.pexels.com/v1/search", {
        params: { query, per_page: 15, orientation: "landscape" },
        headers: { Authorization: process.env.PEXELS_API_KEY },
        timeout: PEXELS_TIMEOUT_MS,
      });
      photos = (response.data?.photos || [])
        .filter((ph) => ph?.src?.large)
        .map((ph) => ({
          imageUrl: ph.src.large,
          photographer: ph.photographer || "Pexels photographer",
          photographerUrl: ph.photographer_url || "https://www.pexels.com",
          pexelsUrl: ph.url || "https://www.pexels.com",
        }));
      pexelsCachePut(query, photos);
    } catch (err) {
      // A missing photo is a cosmetic failure. Never let it fail the search.
      console.error("Pexels lookup failed:", err.response?.status || err.message);
      pexelsCachePut(query, []); // negative-cache so one outage is not retried per request
      return null;
    }
  }

  if (!photos.length) return null;
  const chosen = photos[pickIndex(seed, photos.length)];
  return { ...chosen, source: "pexels", representative: true };
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

// ---------------------------------------------------------------------------
// THE FREE TRIAL
//
// One search, then sign in. Enforced here rather than in the browser, because
// a browser-side flag is a suggestion: clearing localStorage or opening a
// private window resets it, and the whole point of the wall is that it holds.
//
// Anonymous callers are identified by a HASH of their IP. Hashed because the
// server only needs to know whether it has seen this caller before — it never
// needs the address itself, and an unhashed IP log is personal data we would
// then be on the hook for.
//
// What this does and does not stop, stated plainly: clearing storage, private
// windows and a different browser all fail to get a second free search. A
// different network or a VPN will, as with any IP-based allowance. The bar is
// "not trivially bypassable from the client", not "unbypassable".
// ---------------------------------------------------------------------------

const crypto = require("crypto");

// X-Forwarded-For is client-settable when nothing sits in front of the app, so
// it is only consulted when the deployment says a proxy is there. Getting this
// backwards is worse than it sounds in both directions: trust it when exposed
// and anyone can spoof a fresh identity; ignore it behind a proxy and every
// visitor shares the proxy's address, so ONE free search exists for everyone.
const TRUST_PROXY = process.env.TRUST_PROXY === "1";

function clientIp(req) {
  if (TRUST_PROXY) {
    // The LAST entry, not the first. Each hop appends, so with one proxy in
    // front the rightmost value is the one that proxy observed — the only
    // entry the client could not have written. A caller who sends
    // "X-Forwarded-For: 203.0.113.99" just gets their real address appended
    // after it, so reading from the left would hand out a fresh free search
    // for every made-up address.
    const hops = String(req.headers["x-forwarded-for"] || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return req.socket?.remoteAddress || "unknown";
}

const IP_SALT = process.env.SUPABASE_SERVICE_ROLE_KEY || "savorscout";
const ipKey = (ip) => crypto.createHash("sha256").update(`${ip}:${IP_SALT}`).digest("hex").slice(0, 40);

// The table in migrations/002_anon_trial.sql makes the allowance survive a
// restart. Without it we fall back to process memory, which still blocks every
// client-side bypass — it just forgets on deploy. Probed the same way the seal
// is, so applying the migration takes effect without needing a restart.
const TRIAL_RETRY_MS = 5 * 60 * 1000;
let TRIAL_TABLE = false;
let TRIAL_PROBED_AT = 0;

async function trialTableReady() {
  if (TRIAL_TABLE) return true;
  if (TRIAL_PROBED_AT && Date.now() - TRIAL_PROBED_AT < TRIAL_RETRY_MS) return false;
  TRIAL_PROBED_AT = Date.now();
  const { error } = await supabaseAdmin.from("anon_trials").select("ip_hash").limit(1);
  TRIAL_TABLE = !error;
  if (TRIAL_TABLE) console.log("free trial: durable (anon_trials)");
  else console.warn(`free trial: in-memory only — run backend/migrations/002_anon_trial.sql (${error.message})`);
  return TRIAL_TABLE;
}

const trialMemory = new Map();
const TRIAL_MEM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sweepTrialMemory() {
  const cutoff = Date.now() - TRIAL_MEM_TTL_MS;
  for (const [k, v] of trialMemory) if (v.at < cutoff) trialMemory.delete(k);
}

async function trialSearchesUsed(key) {
  if (await trialTableReady()) {
    const { data } = await supabaseAdmin
      .from("anon_trials").select("searches").eq("ip_hash", key).maybeSingle();
    return data?.searches || 0;
  }
  return trialMemory.get(key)?.n || 0;
}

async function recordTrialSearch(key) {
  if (await trialTableReady()) {
    const used = await trialSearchesUsed(key);
    await supabaseAdmin.from("anon_trials").upsert(
      { ip_hash: key, searches: used + 1, last_at: new Date().toISOString() },
      { onConflict: "ip_hash" }
    );
    return;
  }
  if (trialMemory.size > 50000) sweepTrialMemory();
  const cur = trialMemory.get(key);
  trialMemory.set(key, { n: (cur?.n || 0) + 1, at: Date.now() });
}

/* One place that knows how a search gets counted, so no call site has to.
   A signed-in search increments that account's daily count; a trial search
   burns the IP's single free go. Every exit from /search routes through here,
   including the empty-result paths — otherwise the free search would only be
   spent when it happened to find something, and a query that returned nothing
   would leave the wall open forever. */
/* What to tell the client is left. A trial caller has just spent their only
   search, so it is zero and the sign-in wall goes up — reporting the signed-in
   allowance here would promise four more searches that the gate will refuse. */
function remainingFor(req, newCount) {
  if (!req.userId) return 0;
  return Math.max(0, DAILY_SEARCH_LIMIT - newCount);
}

async function countThisSearch(req, newCount) {
  if (req.userId) return recordSearch(req.userId, req.searchDate, newCount);
  if (req.anonTrialKey) return recordTrialSearch(req.anonTrialKey);
  return undefined;
}

/* Signed in -> the normal daily limit. Signed out -> the one free search, and
   then a hard stop that no amount of client-side tinkering gets past. */
async function requireAuthOrTrial(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return requireAuthAndLimit(req, res, next);
  }

  try {
    const key = ipKey(clientIp(req));
    const used = await trialSearchesUsed(key);

    if (used >= FREE_TRIAL_SEARCHES) {
      return res.status(401).json({
        error: "That was your free search — sign in to keep going.",
        requiresAuth: true,
        trialExhausted: true,
        searchesRemaining: 0,
      });
    }

    req.userId = null;          // every user-scoped write checks this
    req.anonTrialKey = key;
    req.currentSearchCount = 0;
    req.searchDate = todayStr();
    return next();
  } catch (err) {
    console.error("trial gate error:", err.message);
    // Fail CLOSED. An error here must not become a free unlimited tier.
    return res.status(401).json({
      error: "Please sign in to search.",
      requiresAuth: true,
    });
  }
}

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
      predictionsPerDay: PREDICTIONS_PER_DAY,
      nextMilestone: nextMilestone(state.streak_days),
      milestones: MILESTONES.map((m) => ({ ...m, reached: state.longest_streak >= m.days })),
    });
  } catch (err) {
    console.error("game state error:", err.message);
    return res.status(500).json({ error: "Couldn't load your progress" });
  }
});

// --- Calibration endpoints -------------------------------------------------

app.get("/calibration/today", requireAuth, async (req, res) => {
  try {
    const zip = String(req.query.zip || "").trim();
    const area = zipArea(zip);
    const today = todayStr();

    const { data: existing } = await supabaseAdmin
      .from("calibrations")
      .select("id, slot, mode, axis, left_ref, right_ref, predicted, chosen")
      .eq("user_id", req.userId)
      .eq("cal_date", today)
      .order("slot", { ascending: true });

    let set = existing || [];
    if (set.length === 0) set = await generatePredictions(req.userId);

    const { revealed, pending } = await refreshTraits(req.userId);

    // The Read is computed from the same nodes the predictions were made
    // against, so the confidence shown is the confidence we actually hold —
    // not a number stored at generation time that may since have drifted.
    const cards = await deck();
    const nodes = await loadNodes(req.userId);
    const read = await buildDailyRead(req.userId, set, cards, nodes);
    const seal = await outstandingSeal(req.userId);

    return res.json({
      remaining: set.filter((c) => !c.chosen),
      completed: set.filter((c) => c.chosen).length,
      total: set.length || PREDICTIONS_PER_DAY,
      pendingTraits: pending,
      justRevealed: revealed,
      read,
      seal,
    });
  } catch (err) {
    console.error("calibration error:", err.message);
    return res.status(500).json({ error: "Couldn't load today's calibration" });
  }
});

app.post("/calibration/answer", requireAuth, async (req, res) => {
  try {
    const { id, chosen } = req.body || {};
    if (typeof id !== "string" || !["left", "right", "skip"].includes(chosen)) {
      return res.status(400).json({ error: "Invalid answer" });
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("calibrations")
      .select("id, mode, left_ref, right_ref, predicted, chosen")
      .eq("id", id)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (fetchErr || !row) return res.status(404).json({ error: "Not found" });
    if (row.chosen) return res.status(409).json({ error: "Already answered" });

    await supabaseAdmin
      .from("calibrations")
      .update({ chosen, answered_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", req.userId);

    // Move the map. This is the whole point — an answer that changes nothing
    // visible is why plain duels went stale.
    //
    // A single-item prediction touches exactly ONE card: Match is a win, Defy
    // is an appearance without one. The old pairwise branch is kept only so
    // rows created before the switch still resolve correctly.
    let movedNodes = [];
    if (chosen !== "skip" && row.mode !== "place") {
      const touched = row.mode === "predict"
        ? [[row.left_ref, chosen === LIKE]]
        : [
            [chosen === "left" ? row.left_ref : row.right_ref, true],
            [chosen === "left" ? row.right_ref : row.left_ref, false],
          ];

      for (const [card, isWin] of touched) {
        if (!card?.id) continue;
        const { data: node } = await supabaseAdmin
          .from("taste_nodes")
          .select("wins, appearances")
          .eq("user_id", req.userId)
          .eq("card_id", card.id)
          .maybeSingle();

        const wins = (node?.wins || 0) + (isWin ? 1 : 0);
        const appearances = (node?.appearances || 0) + 1;

        await supabaseAdmin.from("taste_nodes").upsert(
          { user_id: req.userId, card_id: card.id, wins, appearances, last_seen: new Date().toISOString() },
          { onConflict: "user_id,card_id" }
        );

        movedNodes.push({
          id: card.id,
          name: card.name,
          family: card.family || null,
          affinity: wins / appearances,
          confidence: nodeConfidence(appearances),
          isNew: !node,
          liked: isWin,
        });
      }
    }

    const today = todayStr();
    const { count } = await supabaseAdmin
      .from("calibrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.userId)
      .eq("cal_date", today)
      .not("chosen", "is", null);

    const done = count || 0;

    let award = null;
    if (chosen !== "skip") {
      const state = await loadGameState(req.userId);
      await touchStreak(req.userId, state);
      const streakBonus = state.last_active_date === today ? 0 : XP.STREAK_DAY;
      const setBonus = done >= PREDICTIONS_PER_DAY ? XP.DUEL_SET_BONUS : 0;
      award = await awardXp(req.userId, XP.DUEL + setBonus + streakBonus, "calibration");
    }

    const { revealed, pending } = await refreshTraits(req.userId);

    // Hold this one overnight? The answer is still recorded and the map still
    // moves — only the GRADE is withheld, which is the entire mechanic. A seal
    // that also withheld the data would just be a slower duel.
    let sealed = false;
    if (chosen !== "skip" && (await shouldSeal(req.userId, row))) {
      const { error: sealErr } = await supabaseAdmin
        .from("calibrations")
        .update({ sealed_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", req.userId);
      sealed = !sealErr;
    }

    // The scoreboard has to move in the same response that resolved the call.
    // A record that updates on the next poll reads as decorative; one that
    // ticks on the tap reads as a game being played. A sealed answer moves
    // neither — its result doesn't exist for the user yet.
    const record = row.predicted && chosen !== "skip" && !sealed
      ? await modelRecord(req.userId)
      : null;

    return res.json({
      ok: true,
      completed: done,
      total: PREDICTIONS_PER_DAY,
      sealed,
      // Was our guess right? Both answers are good: a hit says the model knows
      // them, a miss is the most informative data point available. Withheld
      // entirely when sealed — the client must not be able to peek.
      // A skip is not an answer, so it cannot grade the guess. Comparing
      // predicted against "skip" always failed, which reported every skipped
      // card as a miss and quietly moved the scoreboard against us.
      prediction: row.predicted && !sealed && chosen !== "skip"
        ? { guessed: row.predicted, correct: row.predicted === chosen }
        : null,
      record,
      movedNodes,
      justRevealed: revealed,
      pendingTraits: pending,
      award,
    });
  } catch (err) {
    console.error("calibration answer error:", err.message);
    return res.status(500).json({ error: "Couldn't record that" });
  }
});

// Opening the envelope. This is the payoff for coming back, so it pays XP and
// advances the streak on its own — the appointment has to be worth keeping,
// not merely a prettier way to start the same daily grind.
app.post("/calibration/reveal", requireAuth, async (req, res) => {
  try {
    if (!(await sealSupported())) return res.status(409).json({ error: "Seals aren't enabled" });

    const { id } = req.body || {};
    if (typeof id !== "string") return res.status(400).json({ error: "Invalid seal" });

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("calibrations")
      .select("id, left_ref, right_ref, predicted, chosen, sealed_at, revealed_at")
      .eq("id", id)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (fetchErr || !row) return res.status(404).json({ error: "Not found" });
    if (!row.sealed_at) return res.status(409).json({ error: "That wasn't sealed" });
    if (row.revealed_at) return res.status(409).json({ error: "Already opened" });

    // Claim it first. Two tabs opening the same envelope must not both pay out.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("calibrations")
      .update({ revealed_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", req.userId)
      .is("revealed_at", null)
      .select("id");

    if (claimErr || !claimed?.length) return res.status(409).json({ error: "Already opened" });

    const today = todayStr();
    const state = await loadGameState(req.userId);
    await touchStreak(req.userId, state);
    const streakBonus = state.last_active_date === today ? 0 : XP.STREAK_DAY;
    const award = await awardXp(req.userId, XP.SEAL_OPEN + streakBonus, "seal opened");

    const pick = row.predicted === "left" ? row.left_ref : row.right_ref;

    return res.json({
      ok: true,
      correct: row.predicted === row.chosen,
      pickName: pick?.name || "that one",
      record: await modelRecord(req.userId),
      award,
    });
  } catch (err) {
    console.error("seal reveal error:", err.message);
    return res.status(500).json({ error: "Couldn't open that" });
  }
});

// ---------------------------------------------------------------------------
// SHARE PHOTO PROXY
//
// The share card is drawn on a <canvas>, and a canvas that has drawn a remote
// image without CORS headers is TAINTED — toBlob() then throws a SecurityError
// and the export fails outright. Winner photos come from arbitrary sites via
// image search, essentially none of which send Access-Control-Allow-Origin, so
// exporting a card with a photo could not work from the browser alone.
//
// Re-serving the bytes from our own origin fixes that, and incidentally fixes
// hotlink blocking too (which is why the <img> tags already set no-referrer).
//
// This is a URL-taking fetcher, so it is also an SSRF hole if left open. The
// guards below are the point of the endpoint, not decoration.
// ---------------------------------------------------------------------------

const dns = require("dns").promises;
const net = require("net");

const SHARE_PHOTO_MAX_BYTES = 6 * 1024 * 1024;
const SHARE_PHOTO_TIMEOUT_MS = 6000;

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;         // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // unique local
  if (v6.startsWith("fe80")) return true;                      // link-local
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return false;
}

app.get("/share/photo", requireAuth, async (req, res) => {
  try {
    const raw = String(req.query.u || "");
    if (!raw) return res.status(400).json({ error: "Missing url" });

    let url;
    try { url = new URL(raw); } catch { return res.status(400).json({ error: "Bad url" }); }
    if (url.protocol !== "https:") return res.status(400).json({ error: "https only" });

    // Resolve first and check every address the name maps to, so a hostname
    // that points at 169.254.169.254 or 127.0.0.1 can't be laundered through us.
    let addresses;
    try {
      addresses = await dns.lookup(url.hostname, { all: true });
    } catch {
      return res.status(400).json({ error: "Unresolvable host" });
    }
    if (addresses.some((a) => isPrivateAddress(a.address))) {
      return res.status(400).json({ error: "Blocked host" });
    }

    const upstream = await http.get(url.toString(), {
      responseType: "arraybuffer",
      timeout: SHARE_PHOTO_TIMEOUT_MS,
      maxContentLength: SHARE_PHOTO_MAX_BYTES,
      maxRedirects: 2,
      headers: { "User-Agent": "SavorScout/1.0", Accept: "image/*" },
      validateStatus: (s) => s === 200,
    });

    const type = String(upstream.headers["content-type"] || "");
    if (!type.startsWith("image/")) return res.status(415).json({ error: "Not an image" });

    res.set({
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",   // the entire reason this exists
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.send(Buffer.from(upstream.data));
  } catch (err) {
    // A failure here is never fatal: the card falls back to its no-photo
    // layout, which is designed to look deliberate rather than degraded.
    console.error("share photo proxy failed:", err.message);
    return res.status(502).json({ error: "Couldn't fetch that image" });
  }
});

// The map itself. Only encountered nodes come back — the absence of a row IS
// the fog of war, so we never have to fake "undiscovered" state.
app.get("/me/map", requireAuth, async (req, res) => {
  try {
    const cards = await deck();
    const nodes = await loadNodes(req.userId);
    const byId = new Map(cards.map((c) => [c.id, c]));

    const families = new Map();
    const all = [];
    for (const c of cards) {
      if (!families.has(c.family)) families.set(c.family, { family: c.family, total: 0, seen: 0, nodes: [] });
      const f = families.get(c.family);
      f.total += 1;
      const n = nodes.get(c.id);
      if (n) {
        f.seen += 1;
        const node = {
          id: c.id,
          name: c.name,
          kind: c.kind,
          rarity: c.rarity || 1,
          family: c.family,
          affinity: nodeAffinity(n.wins, n.appearances),
          confidence: nodeConfidence(n.appearances),
          appearances: n.appearances,
          staleness: nodeStaleness(n.last_seen),
        };
        f.nodes.push(node);
        all.push(node);
      }
    }

    // The at-a-glance answer to "what do I actually like." A constellation is
    // beautiful but slow to read; these two lists are the same truth in the
    // form a person can absorb in a second. Both are gated on confidence,
    // because an unconfident reading stated boldly is how a taste product
    // loses the only credibility it has.
    const confident = all.filter((n) => n.confidence >= 0.5 && n.affinity != null);
    const strongest = confident
      .filter((n) => n.affinity >= 0.6)
      .sort((a, b) => b.affinity - a.affinity || b.confidence - a.confidence)
      .slice(0, 6);
    const coldest = confident
      .filter((n) => n.affinity <= 0.35)
      .sort((a, b) => a.affinity - b.affinity || b.confidence - a.confidence)
      .slice(0, 6);

    // Regions drifting out of date, so the map can say which corner of it has
    // gone quiet rather than just dimming without explanation.
    const fading = Array.from(families.values())
      .filter((f) => f.seen >= 3)
      .map((f) => ({
        family: f.family,
        staleness: f.nodes.reduce((s, n) => s + n.staleness, 0) / f.nodes.length,
      }))
      .filter((f) => f.staleness >= 0.35)
      .sort((a, b) => b.staleness - a.staleness)
      .slice(0, 3);

    const { data: traits } = await supabaseAdmin
      .from("taste_traits")
      .select("trait_key, label, detail, confidence, revealed_at")
      .eq("user_id", req.userId)
      .order("revealed_at", { ascending: false });

    const { pending } = await refreshTraits(req.userId);

    // The cap is per-region and generous: the constellation reads as a field,
    // and a field needs density. 40 is where an average phone stops gaining
    // anything from more dots.
    const regions = Array.from(families.values())
      .map((f) => ({
        ...f,
        nodes: f.nodes.sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0)).slice(0, 40),
        explored: f.total ? f.seen / f.total : 0,
      }))
      .sort((a, b) => b.seen - a.seen);

    // --- the signature ---
    const readings = readAllAxes(cards, nodes);
    const pop = await population();

    // Only confident axes are rendered as bars. An unsure reading shown as a
    // bar is a puzzle the user has to decode; withheld, with a named finish
    // line under it, it's a reason to come back. Sorted by decisiveness so the
    // most interesting thing about someone is the first thing they read.
    const axes = AXES
      .map((axis) => {
        const r = readings.get(axis.key);
        if (!r || !r.confident) return null;
        const pct = percentileIn(pop.axes.get(axis.key), r.position);
        return {
          key: axis.key,
          left: axis.left,
          right: axis.right,
          position: r.position,
          evidence: r.evidence,
          say: axis.say(r.position),
          compare: compareLine(pct),
        };
      })
      .filter(Boolean)
      .sort((a, b) => decisiveness(b.position) - decisiveness(a.position));

    const measuring = AXES
      .filter((axis) => !axes.some((a) => a.key === axis.key))
      .map((axis) => `${axis.left.toLowerCase()} vs ${axis.right.toLowerCase()}`);

    const arch = archetypeFor(readings);
    let archetype = null;
    if (arch) {
      const share = pop.users >= POP_MIN && pop.archetypes.get(arch.key)
        ? pop.archetypes.get(arch.key) / pop.users
        : null;
      archetype = { ...arch, share };
    }

    // One collection row: the region nearest completion. Visible countable
    // gaps beat a percentage — the empty slots are the mechanic.
    const collectable = Array.from(families.values())
      .filter((f) => f.seen > 0 && f.seen < f.total && f.total <= 24)
      .sort((a, b) => b.seen / b.total - a.seen / a.total)[0]
      || Array.from(families.values()).filter((f) => f.seen > 0 && f.seen < f.total)
        .sort((a, b) => b.seen / b.total - a.seen / a.total)[0];

    let collection = null;
    if (collectable) {
      const found = collectable.nodes
        .slice()
        .sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))
        .slice(0, 8)
        .map((n) => ({ id: n.id, name: n.name, rarity: n.rarity }));
      collection = {
        family: collectable.family,
        seen: collectable.seen,
        total: collectable.total,
        found,
        missing: Math.min(6, collectable.total - collectable.seen),
      };
    }

    return res.json({
      regions,
      traits: traits || [],
      pendingTraits: pending,
      discovered: nodes.size,
      totalCards: cards.length,
      strongest,
      coldest,
      fading,
      archetype,
      axes,
      measuring,
      collection,
      // Every answered pair touches exactly two cards, so appearances halves
      // back to the number of choices the person actually made.
      choices: Math.round(
        Array.from(nodes.values()).reduce((s, n) => s + (n.appearances || 0), 0) / 2
      ),
    });
  } catch (err) {
    console.error("map error:", err.message);
    return res.status(500).json({ error: "Couldn't load your taste map" });
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

// Every search already writes a verdict row, so the search history is just
// that table read back. Answered and unanswered both come through — an entry
// you haven't rated yet is exactly the one worth showing, since rating it is
// the only thing the page asks of anyone.
app.get("/verdicts/history", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const { data, error } = await supabaseAdmin
      .from("verdicts")
      .select("id, name, address, category, query, match_score, distance_mi, rating, lat, lng, visited, outcome, created_at, responded_at")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("verdict history error:", error.message);
      return res.status(500).json({ error: "Couldn't load your history" });
    }

    const rows = data || [];
    const rated = rows.filter((r) => r.visited !== null);
    const went = rated.filter((r) => r.visited);
    const liked = went.filter((r) => r.outcome === "better" || r.outcome === "expected");

    return res.json({
      history: rows,
      stats: {
        searches: rows.length,
        rated: rated.length,
        visited: went.length,
        // Only stated once there's enough behind it to mean anything.
        likedRate: went.length >= 3 ? Math.round((liked.length / went.length) * 100) : null,
      },
    });
  } catch (err) {
    console.error("verdict history error:", err.message);
    return res.status(500).json({ error: "Couldn't load your history" });
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

app.post("/search", requireAuthOrTrial, async (req, res) => {
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
    // A trial caller has no profile and no rating history, so both lookups
    // are skipped rather than queried with a null id — which would match
    // every row with a null user and leak one stranger’s preferences into
    // another’s search.
    const profilePromise = req.userId
      ? Promise.resolve(
          supabaseAdmin
            .from("profiles")
            .select("allergies, dietary_preferences")
            .eq("id", req.userId)
            .maybeSingle()
        ).catch((err) => {
          console.error("profile fetch error:", err.message);
          return { data: null };
        })
      : Promise.resolve({ data: null });

    // Revealed preferences, learned from verdicts they've actually rated.
    // Runs concurrently with everything else, so it costs no latency.
    const tastePromise = req.userId
      ? loadTasteProfile(req.userId).catch((err) => {
          console.error("taste profile load failed:", err.message);
          return null;
        })
      : Promise.resolve(null);

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
      await countThisSearch(req, newCount);
      return res.json({
        preferences,
        locationName,
        restaurants: [],
        searchesRemaining: remainingFor(req, newCount),
        trialUsed: !req.userId,
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
        /* The label has to agree with the score that explains it. This used to
           require the whole phrase while computeRelevance already had a
           word-level fallback, so "chicken wings" vs "Bethpage House of Wings"
           scored as a partial match and then labelled itself as no match at
           all — and the card silently dropped the one reason that answers what
           the user actually asked for. */
        const matchedDish = matchDishLabel(haystack, dishKeyword, preferences.dish);
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
      await countThisSearch(req, newCount);
      return res.json({
        preferences,
        locationName,
        restaurants: [],
        searchesRemaining: remainingFor(req, newCount),
        trialUsed: !req.userId,
      });
    }

    // Layer 2a: the mode is a MAXIMUM, not a ladder.
    //
    // This used to walk the tiers outward and `break` at the first one holding
    // MIN_CANDIDATES_PER_TIER, which made the modes non-monotonic: a wider mode
    // could search a NARROWER area than a narrower one. "Willing to drive"
    // (10/15/25) settling at 10 covered less ground than "Nearby" (5/10/15)
    // escalating to 15 — so asking to drive further could return a smaller
    // pool, and anything genuinely good at 18mi was never even a candidate.
    //
    // The modes are now strictly nested, which is what picking them implies:
    //   nearby   -> everything within 15
    //   driving  -> everything nearby, plus everything out to 25
    //   anywhere -> everything within 40
    //
    // Preferring closer places is a RANKING job, not a filtering one. It is
    // handled by distancePenalty below, which is why widening the pool does
    // not simply hand the win to whatever sits at the far edge.
    const nearest = Math.min(...withFeatures.map((c) => c.distance));
    const tiers = RADIUS_TIERS[radiusMode] || RADIUS_TIERS[DEFAULT_RADIUS_MODE];
    const maxRadius = tiers[tiers.length - 1];
    // The distance the mode treats as unremarkable. Inside it, being closer
    // earns nothing extra; past it, a place has to justify the drive.
    const comfortRadius = tiers[0];

    const withinRadius = withFeatures.filter((c) => c.distance <= maxRadius);
    const radiusUsed = maxRadius;

    if (withinRadius.length === 0) {
      console.warn(
        `All ${withFeatures.length} candidates were beyond ${maxRadius}mi ` +
          `(nearest ${Math.round(nearest)}mi) for ZIP-scoped query "${locationName}". ` +
          `Serper received: ${JSON.stringify({ q: candidatePool.scopedQuery, location: locationName })}`
      );
      const { newCount } = emptyResult();
      countThisSearch(req, newCount).catch(() => {});
      return res.json({
        preferences,
        locationName,
        restaurants: [],
        outOfRange: true,
        nearestMiles: Math.round(nearest),
        maxRadiusMiles: maxRadius,
        searchesRemaining: remainingFor(req, newCount),
        trialUsed: !req.userId,
      });
    }

    console.log(
      `Radius "${radiusMode}": full ${maxRadius}mi pool, free inside ${comfortRadius}mi — ` +
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
    // Keyed to the mode's COMFORT radius, not to the pool edge. Now that the
    // pool is the mode's full range, keying it to radiusUsed would make
    // distance free all the way out — a 38mi place would compete on level
    // terms with a 2mi one under "Anywhere", which is not what anyone means
    // by picking it.
    //
    // The falloff is linear across the mode's own span and floors at 0.75 at
    // the far edge rather than collapsing. Choosing a wider mode is an
    // explicit statement that the drive is acceptable, so the edge has to stay
    // winnable for a clearly better place — combined with the 0.3-weighted
    // proximity term in the composite, a place at the limit still needs to be
    // roughly twice as good on everything else to take it. That is a real
    // preference for closer without making the wider modes decorative.
    const distancePenalty = (miles) => {
      if (miles <= comfortRadius) return 1;
      if (miles > maxRadius) return 0.15;
      const span = Math.max(1, maxRadius - comfortRadius);
      return 1 - 0.25 * ((miles - comfortRadius) / span);
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

      const dishMatch = computeDishRelevance(menuText, dishTerms);
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

    /* Group-vote candidates. The winner plus the next four, with just enough
       to render a game card. These are already scored and researched, so a
       room costs no extra Serper/OpenAI calls — it reuses the search the host
       already paid for, which is what keeps hosting a room free and instant. */
    /* Built from the SHORTLIST, not the researched finalists.

       This was the "only found one place" bug. Candidates came from `ranked`,
       which is `finalists` — and STAGE1_FINALIST_COUNT is 3, so a room could
       never hold more than three cards, and any craving whose shortlist came
       back thin produced one card and an error telling the user their craving
       was too narrow. The craving was rarely the problem; the cap was.

       Game cards only need name, rating, distance and category — all present
       on every shortlist entry. Deep research is what the finalists get, and
       the board does not display any of it. So the finalists lead (they carry
       real match scores) and the rest of the shortlist fills the board behind
       them, in the order stage 1 already ranked them. */
    const roomPool = [
      ...ranked,
      ...shortlist.filter((c) => !ranked.some((r) => r.place.placeId === c.place.placeId && r.place.title === c.place.title)),
    ].slice(0, ROOM_MAX_CARDS);

    const roomCandidates = roomPool.map((c, i) => ({
      id: String(c.place.placeId || c.place.cid || c.place.title),
      name: c.place.title,
      rating: typeof c.rating === "number" ? c.rating : null,
      reviewCount: c.reviewCount || 0,
      category: c.place.type || (c.place.types && c.place.types[0]) || null,
      address: c.place.address || "",
      lat: c.place.latitude,
      lng: c.place.longitude,
      distanceMiles: Math.round(c.distance * 10) / 10,
      /* Finalists carry a real, researched match score. Shortlist fill has
         only a stage-1 composite, which is a different scale — so rather than
         publish a number that looks equally trustworthy, they get a descending
         value that sits below every finalist. It is used for tie-breaking and
         board order, never shown as a percentage until the reveal. */
      matchScore: typeof c.matchScore === "number" ? c.matchScore : Math.max(1, 40 - i * 3),
      matchedDish: c.matchedDish || null,
      image: c.place.thumbnailUrl || c.place.thumbnail || null,
    }));

    /* Picture priority: the food they asked for, then the place.

       Pexels leads because it is licensed and it shows the dish rather than a
       storefront. It is seeded on the restaurant id, so two wing places in the
       same town get different photos and each keeps its own on every reload.

       The Serper paths remain as fallbacks for when Pexels has no photo of
       something, or when no key is configured. */
    const pexelsPhoto = await fetchPexelsFood(
      preferences.dish || preferences.cuisine || userRequest,
      winner.place.placeId || winner.place.cid || winner.place.title
    );
    const existingThumb = winner.place.thumbnailUrl || winner.place.thumbnail || null;
    const winnerImage = pexelsPhoto
      ? {
          imageUrl: pexelsPhoto.imageUrl,
          imageSourceUrl: pexelsPhoto.pexelsUrl,
          imageCredit: {
            source: "pexels",
            photographer: pexelsPhoto.photographer,
            photographerUrl: pexelsPhoto.photographerUrl,
            representative: true,
          },
        }
      : existingThumb
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
        imageCredit: winnerImage?.imageCredit || null,
      },
    ];

    const newCount = req.currentSearchCount + 1;
    // Neither of these blocks the response — the answer shouldn't wait on
    // bookkeeping. The verdict row is what makes the "did you go?" loop
    // possible, and it costs the user nothing to create.
    countThisSearch(req, newCount).catch(() => {});
    // No account, no history row to write it to — a trial search is
    // deliberately not remembered.
    if (req.userId) {
      recordVerdict(req.userId, winner, {
        query: userRequest.trim(),
        locationName,
        matchScore: winner.matchScore,
      }).catch(() => {});
    }

    // Every search quietly stocks the duel pool, so the daily game costs no
    // extra Serper calls and gets richer the more the area is searched.
    // BUG FIX: this used locationHint (a place NAME), so the pool was keyed
    // "Hic" while duels asked for "118". Use the actual ZIP the client sends.
    stockPlacePool(candidates, zipArea(req.body.zip || "")).catch(() => {});

    // Search XP decays through the day (40/25/15/5/0) so grinding converges
    // to zero. The bare-search rate is deliberately low — an unengaged
    // search is a log line, not data, and shouldn't be priced like data.
    if (req.userId) (async () => {
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
    if (req.userId && winner.place.type) {
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
      roomCandidates,
      searchesRemaining: remainingFor(req, newCount),
      trialUsed: !req.userId,
    });
  } catch (err) {
    console.error("Unhandled /search error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Something went wrong on our end. Please try again." });
    }
  }
});

/* ===========================================================================
   TASTE QUIZ

   Stores the quiz scores so search can weight results by them. Kept
   deliberately small: the quiz owns its own question state in the browser,
   and only the six numbers that actually affect recommendations come here.

   Writes to profiles.quiz_scores when that column exists and degrades to an
   in-process map when it does not — the same probe-and-fallback shape the free
   trial uses, so the feature works before anyone runs a migration and simply
   becomes durable once they do.
   =========================================================================== */

const QUIZ_DIMS = ["heat", "sweet", "value", "adventure", "lateNight", "discovery"];
const quizMemory = new Map();
let QUIZ_COLUMN = null; // null = unprobed, true/false = known

async function quizColumnReady() {
  if (QUIZ_COLUMN !== null) return QUIZ_COLUMN;
  const { error } = await supabaseAdmin.from("profiles").select("quiz_scores").limit(1);
  QUIZ_COLUMN = !error;
  if (!QUIZ_COLUMN) {
    console.warn(`quiz scores: in-memory only — add profiles.quiz_scores (${error.message})`);
  }
  return QUIZ_COLUMN;
}

function cleanScores(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of QUIZ_DIMS) {
    const v = Number(raw[k]);
    if (Number.isFinite(v) && v >= 0 && v <= 100) out[k] = Math.round(v);
  }
  return out;
}

app.post("/taste/quiz", requireAuth, async (req, res) => {
  const scores = cleanScores(req.body?.scores);
  if (!Object.keys(scores).length) return res.status(400).json({ error: "No usable scores." });

  quizMemory.set(req.userId, scores);
  if (await quizColumnReady()) {
    const { error } = await supabaseAdmin
      .from("profiles").update({ quiz_scores: scores }).eq("id", req.userId);
    if (error) console.error("quiz save failed:", error.message);
  }
  return res.json({ ok: true, scores });
});

async function quizScoresFor(userId) {
  if (!userId) return null;
  if (await quizColumnReady()) {
    const { data } = await supabaseAdmin
      .from("profiles").select("quiz_scores").eq("id", userId).maybeSingle();
    if (data?.quiz_scores) return cleanScores(data.quiz_scores);
  }
  return quizMemory.get(userId) || null;
}

/* ===========================================================================
   GEOCODING — anywhere, not just US ZIP codes

   The client used to hit Nominatim and Mapbox directly, both locked to the US
   and both restricted to postcodes. Anyone outside the US, and anyone who
   typed a city instead of five digits, simply could not use the product.

   Proxying it here rather than from the browser fixes the reliability half:
   Nominatim's usage policy requires a descriptive User-Agent, which a browser
   cannot set — fetch() forbids overriding it — so browser-direct requests are
   the ones that get throttled or refused. From the server we can identify
   ourselves properly, cache aggressively, and serialise our own requests so we
   stay inside their one-per-second rule.
   =========================================================================== */

const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEO_CACHE_MAX = 2000;
const geoCache = new Map();
const GEO_UA = "SavorScout/1.0 (restaurant recommender; +https://www.savorscout.net)";

function geoCacheGet(key) {
  const hit = geoCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > GEO_CACHE_TTL_MS) { geoCache.delete(key); return null; }
  return hit.value;
}
function geoCachePut(key, value) {
  if (geoCache.size >= GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value);
  geoCache.set(key, { at: Date.now(), value });
}

/* Nominatim asks for no more than one request per second. Chaining every call
   onto a single promise enforces that without a queue library, and the cache
   means real users almost never reach this path anyway. */
let geoChain = Promise.resolve();
function geoThrottled(fn) {
  const run = geoChain.then(fn, fn);
  geoChain = run.then(() => new Promise((r) => setTimeout(r, 1100)), () => new Promise((r) => setTimeout(r, 1100)));
  return run;
}

/* Providers return wildly different label quality. Zippopotam hands back
   "Downtown Toronto (CN Tower / King and Spadina / Railway Lands / ...)" for a
   single postcode, and BigDataCloud uses formal ISO country names like
   "United States of America (the)". Both are correct and both are unreadable
   on a card, so every label passes through here before a user sees it. */
const COUNTRY_TIDY = {
  "United States of America (the)": "United States",
  "United States of America": "United States",
  "Great Britain": "United Kingdom",
  "United Kingdom of Great Britain and Northern Ireland (the)": "United Kingdom",
  "Netherlands (the)": "Netherlands",
  "Philippines (the)": "Philippines",
};
function tidyPlace(name) {
  if (!name) return name;
  // Drop parenthetical neighbourhood dumps, then take the first alternative.
  let out = String(name).replace(/\s*\([^)]*\)\s*/g, " ").split("/")[0].trim();
  out = out.replace(/\s{2,}/g, " ").replace(/[,;]\s*$/, "");
  return out.length > 42 ? out.slice(0, 42).trim() + "…" : out;
}
function tidyCountry(c) { return c ? (COUNTRY_TIDY[c] || c) : c; }
function tidyLocation(loc, region) {
  if (!loc) return loc;
  const country = tidyCountry(loc.country);
  const short = tidyPlace(loc.short);
  const isUS = country === "United States";
  // Rebuild the label from tidied parts rather than patching the old string.
  const tail = isUS ? (region ? tidyPlace(region) : null) : country;
  const name = [short, tail].filter(Boolean).join(", ") || tidyPlace(loc.name);
  return { ...loc, name, short, country };
}

function shapeNominatim(hit) {
  if (!hit) return null;
  const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const a = hit.address || {};
  const city = a.city || a.town || a.village || a.hamlet || a.suburb ||
               a.municipality || a.county || a.state_district || a.state;
  const region = a.state || a.region || a.province || null;
  const country = a.country || null;
  // "Hicksville, New York" at home; "Shibuya, Japan" abroad, where a region
  // name would mean nothing to the person reading it.
  const parts = [city, region && region !== city ? region : null].filter(Boolean);
  if (!parts.length && country) parts.push(country);
  if (!parts.length) return null;
  const name = country && country !== "United States"
    ? [city || parts[0], country].filter(Boolean).join(", ")
    : parts.join(", ");
  return { name, short: city || parts[0], lat, lng, country };
}

/* Nominatim blocks datacentre IPs. Verified in production: the same query that
   answers 200 from a laptop fails 3/3 from Render, which made the "worldwide
   geocoding" fix work everywhere except the one place it runs. So Nominatim is
   now the LAST resort, and two providers that welcome server traffic go first.

   Neither needs an API key, which matters — a key would be one more thing to
   configure before location works at all. */

// Postcodes, ~60 countries, purpose-built for exactly this and happy to be
// called from a server. Handles the "11801 is not in the Dominican Republic"
// problem structurally rather than by guessing.
async function zippopotam(country, postcode) {
  const res = await fetch(`https://api.zippopotam.us/${country}/${encodeURIComponent(postcode)}`);
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  const p = d && Array.isArray(d.places) ? d.places[0] : null;
  if (!p) return null;
  const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const city = p["place name"], region = p["state"] || p["state abbreviation"] || null;
  const country_name = d.country || null;
  const name = country_name && country_name !== "United States"
    ? [city, country_name].filter(Boolean).join(", ")
    : [city, region].filter(Boolean).join(", ");
  return { name: name || city, short: city, lat, lng, country: country_name, region };
}

// Place names worldwide, no key, explicitly intended for programmatic use.
async function openMeteoGeocode(q) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(q)}`
  );
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  const hit = d && Array.isArray(d.results) ? d.results[0] : null;
  if (!hit) return null;
  const { latitude: lat, longitude: lng, name: city, admin1: region, country } = hit;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = country && country !== "United States"
    ? [city, country].filter(Boolean).join(", ")
    : [city, region].filter(Boolean).join(", ");
  return { name: label || city, short: city, lat, lng, country, region };
}

async function nominatim(pathAndQuery) {
  const res = await fetch(`https://nominatim.openstreetmap.org${pathAndQuery}`, {
    headers: { "User-Agent": GEO_UA, "Accept-Language": "en", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

app.get("/geocode", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 120);
  if (q.length < 2) return res.status(400).json({ error: "Type a place to search for." });

  const key = `f:${q.toLowerCase()}`;
  const cached = geoCacheGet(key);
  if (cached) return res.json({ location: cached, cached: true });

  try {
    /* A bare 5-digit string is ambiguous to free-text search and it guesses
       badly: "11801" returned Santo Domingo Este, Dominican Republic, not
       Hicksville NY. Postcode-shaped input is therefore tried as a postcode
       first, in the country whose format it matches, and only falls through to
       free text if that finds nothing. Without this, adding worldwide support
       would have broken every US user who types five digits — the exact thing
       that worked before. */
    let loc = null;
    const asPostcode =
      /^\d{5}$/.test(q) ? "us" :
      /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(q) ? "ca" :
      /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/.test(q) ? "gb" :
      null;

    /* Postcode-shaped input goes to a postcode service first. Free-text search
       resolves "11801" to Santo Domingo Este, Dominican Republic — so without
       this, adding worldwide support breaks every US user typing five digits. */
    if (asPostcode) {
      try { loc = await zippopotam(asPostcode, q.replace(/\s+/g, "")); } catch { /* next */ }
      // Canadian postcodes are only indexed by their forward sortation area.
      if (!loc && asPostcode === "ca") {
        try { loc = await zippopotam("ca", q.replace(/\s+/g, "").slice(0, 3)); } catch { /* next */ }
      }
      if (!loc && asPostcode === "gb") {
        try { loc = await zippopotam("gb", q.replace(/\s+/g, "").slice(0, -3)); } catch { /* next */ }
      }
    }

    if (!loc) { try { loc = await openMeteoGeocode(q); } catch { /* next */ } }

    // Last resort. Works from a laptop, usually refused from a datacentre.
    if (!loc) {
      try {
        const data = await geoThrottled(() =>
          nominatim(`/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`)
        );
        loc = shapeNominatim(Array.isArray(data) ? data[0] : null);
      } catch { /* fall through to the 404 */ }
    }
    if (!loc) return res.status(404).json({ error: `Couldn't find "${q}". Try adding the city or country.` });
    loc = tidyLocation(loc, loc.region);
    geoCachePut(key, loc);
    return res.json({ location: loc });
  } catch (err) {
    console.error("geocode failed:", err.message);
    return res.status(502).json({ error: "Location lookup is unavailable right now." });
  }
});

/* Turns GPS coordinates into a place name. This is the path that actually
   makes location work everywhere — no typing, no postcode format to get
   wrong, and correct in countries whose addresses we could not parse. */
app.get("/geocode/reverse", async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Bad coordinates." });
  }
  // ~1km buckets: enough to reuse the cache along a street without
  // pretending two different neighbourhoods are the same place.
  const key = `r:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = geoCacheGet(key);
  if (cached) return res.json({ location: { ...cached, lat, lng }, cached: true });

  let loc = null;
  /* BigDataCloud's reverse endpoint is keyless, worldwide, and unlike Nominatim
     does not refuse datacentre traffic — which is the whole reason this needs a
     first choice that is not Nominatim. */
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (r.ok) {
      const d = await r.json().catch(() => null);
      const city = d && (d.city || d.locality || d.principalSubdivision);
      if (city) {
        const label = d.countryName && d.countryName !== "United States"
          ? [city, d.countryName].filter(Boolean).join(", ")
          : [city, d.principalSubdivision].filter(Boolean).join(", ");
        loc = { name: label || city, short: city, lat, lng, country: d.countryName || null, region: d.principalSubdivision || null };
      }
    }
  } catch { /* fall through */ }

  try {
    if (!loc) {
      const data = await geoThrottled(() =>
        nominatim(`/reverse?format=json&addressdetails=1&zoom=12&lat=${lat}&lon=${lng}`)
      );
      loc = shapeNominatim(data);
    }
    if (!loc) return res.status(404).json({ error: "Couldn't name that location." });
    loc = tidyLocation(loc, loc.region);
    geoCachePut(key, loc);
    // Keep the caller's exact coordinates; only the label comes from the API.
    return res.json({ location: { ...loc, lat, lng } });
  } catch (err) {
    console.error("reverse geocode failed:", err.message);
    return res.status(502).json({ error: "Location lookup is unavailable right now." });
  }
});

/* ===========================================================================
   GROUP ROOMS — "Dinner Roulette"

   A host turns a search they already ran into a 90-second vote and drops the
   link in a group chat. Everyone taps, votes, and the room locks in one place.

   Design constraints this is built around, in priority order:

   1. NO SIGNUP, EVER. Joining is a GET of a 6-character code. Players get an
      auto-assigned handle. Asking a hungry person for an email is the single
      fastest way to lose the whole group.
   2. NO NEW INFRASTRUCTURE. Rooms live in process memory with a TTL. A dinner
      vote is over in ninety seconds and worthless an hour later, so durability
      buys nothing here — and a migration that never gets run would mean the
      feature simply does not work. The one real cost is that a server restart
      mid-vote drops live rooms; at this traffic that is a rounding error.
   3. NO EXTRA API SPEND. Candidates are passed in from the host's completed
      search rather than re-queried, so hosting a room is free and instant.
   4. IT MUST NEVER DEAD-END. Every resolution path produces a restaurant —
      including the case where the group vetoes literally everything.
   =========================================================================== */

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;   // rooms are useless long before this
const ROOM_VOTE_MS = 90 * 1000;           // the round, once the host starts it
const ROOM_MAX_PLAYERS = 12;
/* Hard ceiling on live rooms. Creation needs no account and no search of its
   own, so without a cap a loop can mint rooms as fast as the network allows —
   measured at 300 in 4.5s — and every one of them pins its cards in memory
   until the TTL. At the cap the oldest room is evicted rather than refusing
   the new one, because a real host must never be turned away by someone
   else's abuse. */
const ROOM_MAX_ACTIVE = 500;
/* A player is "present" if we have heard from them recently. Polling refreshes
   this every ~900ms, so this is generous enough to survive a lock screen or a
   tunnel while still noticing someone who closed the tab. */
const ROOM_PRESENCE_MS = 25 * 1000;
const rooms = new Map();

// No 0/O/1/I/L — these get read aloud and retyped from a phone screen.
const ROOM_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newRoomCode() {
  for (let attempt = 0; attempt < 40; attempt++) {
    let c = "";
    for (let i = 0; i < 6; i++) c += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    if (!rooms.has(c)) return c;
  }
  return `R${Date.now().toString(36).toUpperCase()}`;
}

/* Handles are assigned, not typed. A name field is a keyboard between someone
   and the game; a handle they did not choose is also funnier. */
const ROOM_ANIMALS = ["Fox", "Otter", "Wolf", "Crane", "Bear", "Hawk", "Moth", "Lynx", "Ram", "Owl", "Eel", "Boar"];
const ROOM_MOODS = ["Hungry", "Starving", "Picky", "Ravenous", "Impatient", "Snacky", "Peckish", "Feral"];
function newPlayerName(room) {
  const taken = new Set([...room.players.values()].map((p) => p.name));
  for (let i = 0; i < 60; i++) {
    const n = `${ROOM_MOODS[Math.floor(Math.random() * ROOM_MOODS.length)]} ${ROOM_ANIMALS[Math.floor(Math.random() * ROOM_ANIMALS.length)]}`;
    if (!taken.has(n)) return n;
  }
  return `Guest ${room.players.size + 1}`;
}

function sweepRooms() {
  const now = Date.now();
  for (const [code, r] of rooms) if (now - r.createdAt > ROOM_TTL_MS) rooms.delete(code);
}

/* On a timer, not only on create. Sweeping just inside POST /rooms meant that
   once room creation stopped, expired rooms were never collected — a quiet
   night left every room from the evening resident in memory until the process
   restarted. unref() so this never holds the process open. */
const roomSweepTimer = setInterval(sweepRooms, 5 * 60 * 1000);
if (roomSweepTimer.unref) roomSweepTimer.unref();

// Map preserves insertion order, so the first key is the oldest room.
function evictOldestRoom() {
  const oldest = rooms.keys().next();
  if (!oldest.done) rooms.delete(oldest.value);
}

const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
const seen = (room, player) => { if (player) player.lastSeen = Date.now(); return room; };
const presentPlayers = (room) => {
  const cutoff = Date.now() - ROOM_PRESENCE_MS;
  return [...room.players.values()].filter((p) => (p.lastSeen || 0) >= cutoff);
};

/* Resolution. Most YES wins among cards nobody vetoed; ties break on the match
   score the search already computed, so a tie is never decided by chance.

   The last branch is the important one: if the group nukes every option, the
   room does NOT fail. It revives whichever card had the most support and says
   so plainly. A game that can end in "no answer" is a game people stop
   playing, and the entire point of this product is that it always answers. */
function resolveRoom(room) {
  if (room.status === "done") return room;
  const alive = room.cards.filter((c) => !c.vetoedBy);
  const pool = alive.length ? alive : room.cards;
  const revived = alive.length === 0;

  let best = pool[0];
  for (const c of pool) {
    const cy = c.yes.length, by = best.yes.length;
    if (cy > by || (cy === by && (c.matchScore || 0) > (best.matchScore || 0))) best = c;
  }

  room.status = "done";
  room.winnerId = best.id;
  room.revived = revived;
  room.resolvedAt = Date.now();
  room.version++;
  return room;
}

// Auto-resolve on read rather than with a timer, so a sleeping dyno or a
// dropped connection can never leave a room stuck mid-game forever. A room in
// "lobby" has no clock at all — see /rooms/:code/start.
function touchRoom(room) {
  if (room.status === "voting" && room.endsAt && Date.now() >= room.endsAt) resolveRoom(room);
  return room;
}

/* Turns the raw vote arrays into things worth reading out loud.

   Deliberately blame-shaped rather than statistical: "Picky Wolf nuked the
   crowd favourite" is a sentence a group repeats, and "veto distribution" is
   not. The whole point of the ending is to give people something to argue
   about on the way to the restaurant. */
/* Viewer-aware on purpose. The roster already calls the reader "You", so
   naming them by their generated animal in the receipts reads like a fourth
   person was in a room of three. It also makes the best line land harder:
   "You nuked Birria Bar" is an accusation; "Ravenous Boar nuked Birria Bar"
   is a log entry. */
function buildReceipts(room, viewerId) {
  const nameOf = (id) =>
    id && id === viewerId ? "You" : room.players.get(id)?.name || "Someone";
  const winner = room.cards.find((c) => c.id === room.winnerId);
  const alive = room.cards.filter((c) => !c.vetoedBy);

  const kills = room.cards
    .filter((c) => c.vetoedBy)
    .map((c) => ({ by: nameOf(c.vetoedBy), place: c.name, yesCount: c.yes.length }));

  // Someone who bombed the option with the most support is the story of the
  // round, so it gets called out by name rather than buried in a list.
  const mostBacked = kills.slice().sort((a, b) => b.yesCount - a.yesCount)[0];
  const villain = mostBacked && mostBacked.yesCount > 0 ? mostBacked : null;

  const backers = winner ? winner.yes.map(nameOf) : [];
  const outvoted = [...room.players.values()]
    .filter((p) => p.voted && winner && !winner.yes.includes(p.id))
    .map((p) => p.name);

  // Margin over the best surviving alternative — "won by one vote" is the
  // difference between a decision and a landslide.
  const rivals = alive.filter((c) => c.id !== room.winnerId)
    .sort((a, b) => b.yes.length - a.yes.length);
  const margin = winner && rivals.length ? winner.yes.length - rivals[0].yes.length : null;

  return {
    kills,
    villain,
    backers,
    outvoted,
    margin,
    runnerUp: rivals.length ? { name: rivals[0].name, yesCount: rivals[0].yes.length } : null,
    unanimous: Boolean(winner && backers.length > 1 && outvoted.length === 0),
  };
}

function roomView(room, playerId) {
  const me = playerId ? room.players.get(playerId) : null;
  return {
    code: room.code,
    status: room.status,
    version: room.version,
    query: room.query,
    locationName: room.locationName,
    endsAt: room.endsAt,
    msLeft: room.endsAt ? Math.max(0, room.endsAt - Date.now()) : null,
    hostId: room.hostId,
    // One board-level fact instead of a per-card flag: are bombs live?
    vetoOpen: room.cards.filter((c) => !c.vetoedBy).length > ROOM_VETO_FLOOR,
    aliveCount: room.cards.filter((c) => !c.vetoedBy).length,
    revived: !!room.revived,
    winnerId: room.winnerId || null,
    /* The receipts. Only computed once the room is done, because this is the
       part people actually talk about afterwards — who blocked what, who
       backed the winner, who got outvoted. The room already holds every fact;
       it was just throwing them away at the moment they became interesting. */
    receipts: room.status === "done" ? buildReceipts(room, playerId) : null,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, voted: p.voted, vetoUsed: p.vetoUsed, isHost: p.id === room.hostId,
    })),
    cards: room.cards.map((c) => ({
      id: c.id, name: c.name, rating: c.rating, reviewCount: c.reviewCount,
      category: c.category, address: c.address, lat: c.lat, lng: c.lng,
      distanceMiles: c.distanceMiles, matchedDish: c.matchedDish, image: c.image,

      // matchScore is withheld while voting so people vote on the food rather
      // than on the algorithm's number — it only appears in the reveal.
      matchScore: room.status === "done" ? c.matchScore : null,
      yesCount: c.yes.length,
      vetoedBy: c.vetoedBy ? room.players.get(c.vetoedBy)?.name || "Someone" : null,
      myYes: me ? c.yes.includes(me.id) : false,
    })),
    me: me ? { id: me.id, name: me.name, vetoUsed: me.vetoUsed, isHost: me.id === room.hostId } : null,
  };
}

app.post("/rooms", (req, res) => {
  sweepRooms();
  const cands = Array.isArray(req.body?.candidates) ? req.body.candidates : [];
  /* Ids must be unique: votes are matched by find(), so two cards sharing an
     id would send every vote to the first and leave the second permanently
     unvotable — visible on the board and impossible to pick. */
  const seenIds = new Set();
  const clean = cands
    .filter((c) => {
      if (!c || !c.name || !c.id) return false;
      const id = String(c.id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    })
    .slice(0, ROOM_MAX_CARDS)
    .map((c) => ({
      id: String(c.id), name: String(c.name).slice(0, 120),
      rating: isFiniteNum(c.rating) ? c.rating : null,
      reviewCount: Number(c.reviewCount) || 0,
      category: c.category ? String(c.category).slice(0, 60) : null,
      address: c.address ? String(c.address).slice(0, 200) : "",
      /* Coordinates are built into a Google Maps URL on the client, so a
         non-numeric value is not just wrong — "0&q=whatever" injects extra
         query parameters into that link. Anything not a finite number becomes
         null, and the client omits the Directions button entirely. */
      lat: isFiniteNum(c.lat) ? c.lat : null,
      lng: isFiniteNum(c.lng) ? c.lng : null,
      distanceMiles: isFiniteNum(c.distanceMiles) ? c.distanceMiles : null,
      matchScore: Number(c.matchScore) || 0,
      matchedDish: c.matchedDish ? String(c.matchedDish).slice(0, 60) : null,
      image: typeof c.image === "string" && /^https:\/\//.test(c.image) ? c.image : null,
      yes: [], vetoedBy: null,
    }));

  if (clean.length < 2) {
    return res.status(400).json({ error: "Need at least two places to vote on. Run a search first." });
  }



  while (rooms.size >= ROOM_MAX_ACTIVE) evictOldestRoom();

  const code = newRoomCode();
  const hostId = crypto.randomBytes(9).toString("hex");
  /* Rooms open in "lobby" with NO clock running. Starting the countdown at
     creation meant the host burned a third of the round just pasting the link,
     and anyone who joined late arrived to a timer already half gone. The host
     starts the round once people are actually in. */
  const room = {
    code, hostId, createdAt: Date.now(), endsAt: null,
    status: "lobby", version: 1, winnerId: null, revived: false,
    query: String(req.body?.query || "").slice(0, 80),
    locationName: String(req.body?.locationName || "").slice(0, 80),
    cards: clean, players: new Map(),
  };
  room.players.set(hostId, { id: hostId, name: "", voted: false, vetoUsed: false, lastSeen: Date.now() });
  room.players.get(hostId).name = newPlayerName(room);
  rooms.set(code, room);

  console.log(`room ${code} created: ${clean.length} cards, "${room.query}" @ ${room.locationName}`);
  return res.json({ code, playerId: hostId, room: roomView(room, hostId) });
});

app.post("/rooms/:code/join", (req, res) => {
  const room = rooms.get(String(req.params.code || "").toUpperCase());
  if (!room) return res.status(404).json({ error: "That room has expired or never existed." });
  touchRoom(room);

  // Rejoining with a known id must NOT mint a second player — a refresh
  // mid-vote would otherwise inflate the roster and strand your veto.
  const existing = req.body?.playerId && room.players.get(String(req.body.playerId));
  if (existing) {
    seen(room, existing);
    return res.json({ playerId: existing.id, room: roomView(room, existing.id) });
  }

  if (room.players.size >= ROOM_MAX_PLAYERS) {
    return res.status(409).json({ error: "This room is full." });
  }
  const id = crypto.randomBytes(9).toString("hex");
  room.players.set(id, { id, name: "", voted: false, vetoUsed: false, lastSeen: Date.now() });
  room.players.get(id).name = newPlayerName(room);
  room.version++;
  return res.json({ playerId: id, room: roomView(room, id) });
});

app.get("/rooms/:code", (req, res) => {
  const room = rooms.get(String(req.params.code || "").toUpperCase());
  if (!room) return res.status(404).json({ error: "That room has expired or never existed." });
  // The poll doubles as the heartbeat — no separate keepalive to get out of sync.
  seen(room, room.players.get(String(req.query.playerId || "")));
  touchRoom(room);
  return res.json({ room: roomView(room, req.query.playerId) });
});

app.post("/rooms/:code/vote", (req, res) => {
  const room = rooms.get(String(req.params.code || "").toUpperCase());
  if (!room) return res.status(404).json({ error: "That room has expired or never existed." });
  touchRoom(room);
  // Votes before the round starts are ignored rather than queued — a Yes cast
  // in the lobby would silently pre-load the result before anyone saw a card.
  if (room.status !== "voting") return res.json({ room: roomView(room, req.body?.playerId) });

  const player = room.players.get(String(req.body?.playerId || ""));
  if (!player) return res.status(403).json({ error: "Join the room first." });
  seen(room, player);
  const card = room.cards.find((c) => c.id === String(req.body?.cardId || ""));
  if (!card) return res.status(404).json({ error: "No such option." });

  const kind = req.body?.kind === "veto" ? "veto" : "yes";
  if (kind === "veto") {
    if (player.vetoUsed) {
      return res.status(409).json({ error: "You've already used your veto.", room: roomView(room, player.id) });
    }
    if (card.vetoedBy) return res.json({ room: roomView(room, player.id) });
    /* Vetoing stops when two are left. Not a fixed pair of protected cards —
       ANY card can be bombed while three or more survive, and the moment the
       board is down to two the bombs go quiet and it becomes a straight vote.
       That way the final choice is always decided by votes rather than by
       whoever bombed last. */
    if (room.cards.filter((c) => !c.vetoedBy).length <= ROOM_VETO_FLOOR) {
      return res.status(409).json({
        error: "Down to the final two — it's votes only now.",
        room: roomView(room, player.id),
      });
    }
    card.vetoedBy = player.id;
    player.vetoUsed = true;
    card.yes = card.yes.filter((id) => id !== player.id);
  } else {
    const i = card.yes.indexOf(player.id);
    if (i >= 0) card.yes.splice(i, 1); else card.yes.push(player.id);
  }

  player.voted = room.cards.some((c) => c.yes.includes(player.id)) || player.vetoUsed;
  room.version++;

  /* Everyone still here has weighed in — no reason to stare at a timer.
     Counts only PRESENT players: someone who closed their tab used to hold the
     round hostage for the full ninety seconds, because a player who is gone
     never votes. */
  const here = presentPlayers(room);
  if (here.length > 1 && here.every((p) => p.voted)) resolveRoom(room);

  return res.json({ room: roomView(room, player.id) });
});

/* The host drops the countdown, not the clock. Only the host can start, so a
   friend who taps early cannot strand everyone still opening the link.

   With one exception, because the strict rule created a worse dead end than
   the one it prevented: if the host closes their tab in the lobby, nobody else
   could ever start and the room sat there until it expired. Once the host has
   gone quiet for longer than the presence window, anyone still in the room can
   start it. */
app.post("/rooms/:code/start", (req, res) => {
  const room = rooms.get(String(req.params.code || "").toUpperCase());
  if (!room) return res.status(404).json({ error: "That room has expired or never existed." });
  const playerId = String(req.body?.playerId || "");
  const player = room.players.get(playerId);
  if (!player) return res.status(403).json({ error: "Join the room first." });
  seen(room, player);

  const host = room.players.get(room.hostId);
  const hostPresent = host && (Date.now() - (host.lastSeen || 0)) < ROOM_PRESENCE_MS;
  if (playerId !== room.hostId && hostPresent) {
    return res.status(403).json({ error: "Only the host can start the round." });
  }
  if (playerId !== room.hostId) {
    // Whoever rescues the room becomes the host, so Lock it in works too.
    room.hostId = playerId;
    console.log(`room ${room.code}: host absent, handed off`);
  }
  if (room.status !== "lobby") return res.json({ room: roomView(room, playerId) });

  room.status = "voting";
  room.endsAt = Date.now() + ROOM_VOTE_MS;
  room.version++;
  console.log(`room ${room.code} started: ${room.players.size} players`);
  return res.json({ room: roomView(room, playerId) });
});

app.post("/rooms/:code/lock", (req, res) => {
  const room = rooms.get(String(req.params.code || "").toUpperCase());
  if (!room) return res.status(404).json({ error: "That room has expired or never existed." });
  if (room.status === "voting") resolveRoom(room);
  return res.json({ room: roomView(room, req.body?.playerId) });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});