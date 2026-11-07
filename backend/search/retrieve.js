/* Finding the candidates.

   The old search asked Google Maps once, worded exactly as typed, and kept up
   to 20 results. A great place that missed that one list was never even
   considered. This asks up to three ways at once, in parallel so it costs
   about the time of one request, and merges the lists:

     1. the craving as typed            ("cheap spicy ramen")
     2. the food lexicon's wording      ("ramen shop")
     3. the intent model's wording      ("japanese noodle restaurant")

   The first two start the moment the request arrives, alongside the intent
   model; the third only runs when the model suggests something new. Each place
   remembers where it ranked in every list, because Google's own ordering is a
   good relevance signal (see googleRelevance). Typical pool: 35 to 55 places. */

const { norm } = require("./features");

const PER_QUERY = 20;                       // Serper's page size
const MAX_QUERIES = Number(process.env.SEARCH_MAX_QUERIES) || 3;
const SERPER_TIMEOUT_MS = Number(process.env.SEARCH_SERPER_TIMEOUT_MS) || 4000;
const ENDPOINT = process.env.SERPER_RETRIEVAL_ENDPOINT === "maps"
  ? "https://google.serper.dev/maps"
  : "https://google.serper.dev/places";

/* Serper field names vary a little between endpoints and over time. Read them
   all once here so nothing downstream has to guess. */
function normalizePlace(p, rank) {
  const rating = typeof p.rating === "number" ? p.rating : parseFloat(p.rating);
  const count = p.ratingCount ?? p.reviewsCount ?? p.reviews ?? p.user_ratings_total ?? p.userRatingCount ?? 0;
  return {
    ...p,
    title: p.title || p.name || "",
    latitude: typeof p.latitude === "number" ? p.latitude : p.gps_coordinates?.latitude,
    longitude: typeof p.longitude === "number" ? p.longitude : p.gps_coordinates?.longitude,
    type: p.type || p.category || (Array.isArray(p.types) ? p.types[0] : undefined),
    rating: Number.isFinite(rating) ? rating : null,
    ratingCount: Number.isFinite(Number(count)) ? Number(count) : 0,
    openingHours: p.openingHours || p.opening_hours || p.hours || null,
    _rank: Number.isFinite(p.position) ? p.position : rank,
  };
}

function idKey(p) {
  return p.placeId || p.cid || p.fid || null;
}
function nameKey(p) {
  if (typeof p.latitude !== "number" || typeof p.longitude !== "number") return `n:${norm(p.title)}`;
  return `n:${norm(p.title)}@${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`;
}

async function serperQuery(http, apiKey, { query, locationName, anchor }) {
  const body = { q: `${query} near ${locationName}`, gl: "us", location: locationName, num: PER_QUERY };
  if (anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)) {
    body.ll = `@${anchor.lat},${anchor.lng},13z`;
  }
  const res = await http.post(ENDPOINT, body, {
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    timeout: SERPER_TIMEOUT_MS,
  });
  return (res.data?.places || []).map((p, i) => normalizePlace(p, i + 1));
}

/* The distinct queries worth sending, in priority order, at most MAX_QUERIES,
   skipping any already sent. Compared after normalising, so "Ramen Shop" and
   "ramen shop" count once. */
function pickQueries(candidates, alreadySent = [], limit = MAX_QUERIES) {
  const seen = new Set(alreadySent.map((q) => norm(q)));
  const out = [];
  for (const q of candidates) {
    const n = norm(q);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(String(q).trim());
    if (out.length + alreadySent.length >= limit) break;
  }
  return out;
}

/* Runs queries in parallel. A failed query costs only its own results: the
   search fails only when every query fails. */
async function runQueries(http, apiKey, queries, ctx) {
  return Promise.all(
    queries.map(async (query) => {
      const t = Date.now();
      try {
        const places = await serperQuery(http, apiKey, { ...ctx, query });
        return { query, places, ms: Date.now() - t };
      } catch (err) {
        return { query, places: [], error: err.response?.data?.message || err.message || String(err), ms: Date.now() - t };
      }
    })
  );
}

/* Merges every list into one pool. A place found by several queries keeps the
   richest copy of its data and all of its ranks. */
function mergeResults(results) {
  const byId = new Map();
  const byName = new Map();
  const pool = [];
  results.forEach((r, qi) => {
    for (const p of r.places) {
      const id = idKey(p);
      const nk = nameKey(p);
      let entry = (id && byId.get(id)) || byName.get(nk);
      if (!entry) {
        entry = { place: p, ranks: [] };
        pool.push(entry);
      } else {
        // Fill gaps from the other copy (hours, website, price, thumbnail).
        for (const [k, v] of Object.entries(p)) {
          if (entry.place[k] == null || entry.place[k] === "") entry.place[k] = v;
        }
      }
      entry.ranks.push({ q: qi, rank: p._rank });
      if (id) byId.set(id, entry);
      byName.set(nk, entry);
    }
  });
  return pool;
}

module.exports = { runQueries, mergeResults, pickQueries, normalizePlace, MAX_QUERIES, PER_QUERY };
