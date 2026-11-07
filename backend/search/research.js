/* Reading about the finalists: menus and reviews, through Exa.

   Two channels per place:
     menu    - the restaurant's own site when it has one (otherwise the best
               page found for "<name> <address> menu"), with passages about
               the dish and any dietary needs.
     reviews - review and write-up pages, with passages about the dish and the
               atmosphere asked for. The old search only read reviews when a
               vibe was requested; reviews are also where "best ramen in town"
               or "the broth was bland" lives, so the top finalists always get
               them now.

   Cache keys include a short hash of what was asked. The old keys were per
   place only, so passages saved for a "gyoza" search were reused for "ramen". */

const crypto = require("crypto");
const { norm } = require("./features");

const EXA_TIMEOUT_MS = Number(process.env.SEARCH_EXA_TIMEOUT_MS) || 4000;

function cacheKey(place, channel, query) {
  const base = place.website || `place:${place.placeId || place.cid || norm(place.title)}`;
  const q = crypto.createHash("sha1").update(norm(query)).digest("hex").slice(0, 10);
  return `${channel}2:${base}#${q}`;
}

async function exaPost(http, apiKey, path, body) {
  const res = await http.post(`https://api.exa.ai/${path}`, body, {
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    timeout: EXA_TIMEOUT_MS,
  });
  return res.data;
}

async function menuResearch(deps, place, query) {
  const { http, exaKey } = deps;
  if (place.website) {
    try {
      const data = await exaPost(http, exaKey, "contents", {
        urls: [place.website],
        highlights: { query, maxCharacters: 400 },
        maxAgeHours: 720,
      });
      const status = data?.statuses?.[0];
      const result = data?.results?.[0];
      if ((!status || status.status === "success") && result && (result.highlights || []).length) {
        return { sourceType: "official_site", sourceUrl: result.url || place.website, highlights: result.highlights };
      }
    } catch (_) {
      /* fall through to a search */
    }
  }
  const data = await exaPost(http, exaKey, "search", {
    query: `${place.title} ${place.address || ""} menu`.trim(),
    type: "fast",
    numResults: 1,
    contents: { highlights: { query, maxCharacters: 400 } },
  });
  const hit = data?.results?.[0];
  if (!hit || !(hit.highlights || []).length) return null;
  return { sourceType: "secondary", sourceUrl: hit.url, highlights: hit.highlights };
}

async function reviewResearch(deps, place, query) {
  const { http, exaKey } = deps;
  const data = await exaPost(http, exaKey, "search", {
    query: `${place.title} ${place.address || ""} reviews`.trim(),
    type: "fast",
    numResults: 2,
    contents: { highlights: { query, maxCharacters: 400 } },
  });
  const hits = data?.results || [];
  const highlights = hits.flatMap((h) => h.highlights || []).filter(Boolean);
  if (!highlights.length) return null;
  return { sourceType: "reception", sourceUrl: hits[0].url, highlights };
}

/* Resolves with whatever finished inside `ms`; stragglers keep running and
   write to the cache, so the next search for the same place is instant. */
function settleWithin(promises, ms) {
  const DEADLINE = Symbol("deadline");
  const timer = new Promise((resolve) => setTimeout(() => resolve(DEADLINE), ms));
  return Promise.all(
    promises.map((p) => Promise.race([p.catch(() => null), timer]).then((v) => (v === DEADLINE ? null : v)))
  );
}

/* Researches finalists: menus for all of them, reviews for the first
   `reviewCount`. Cache hits return immediately; misses race the deadline. */
async function researchFinalists(deps, finalists, { menuQuery, reviewQuery, reviewCount, deadlineMs }) {
  if (!deps.exaKey || !finalists.length) {
    return finalists.map(() => ({ menu: null, reviews: null }));
  }
  const keys = finalists.flatMap((c, i) => [
    cacheKey(c.place, "menu", menuQuery),
    ...(i < reviewCount ? [cacheKey(c.place, "reviews", reviewQuery)] : []),
  ]);
  let cached = new Map();
  try {
    cached = (await deps.cache.fetchBatch(keys)) || new Map();
  } catch (_) {
    cached = new Map();
  }

  const job = (channel, c, query, fn) => {
    const key = cacheKey(c.place, channel, query);
    if (cached.has(key)) {
      const hit = cached.get(key);
      return Promise.resolve(hit && hit.sourceType !== "none" ? hit : null);
    }
    return fn(deps, c.place, query).then(async (record) => {
      // "Nothing found" is cached too, so a place with no menu online isn't
      // looked up again on every search. It reads back as null, never as
      // evidence against the place.
      const toStore = record || { sourceType: "none", sourceUrl: null, highlights: [] };
      try { await deps.cache.store(key, c.place.placeId || c.place.cid || null, toStore); } catch (_) { /* cache is best effort */ }
      return record;
    });
  };

  const menuJobs = finalists.map((c) => job("menu", c, menuQuery, menuResearch));
  const reviewJobs = finalists.map((c, i) =>
    i < reviewCount ? job("reviews", c, reviewQuery, reviewResearch) : Promise.resolve(null)
  );
  const [menus, reviews] = await Promise.all([settleWithin(menuJobs, deadlineMs), settleWithin(reviewJobs, deadlineMs)]);
  return finalists.map((_, i) => ({ menu: menus[i] || null, reviews: reviews[i] || null }));
}

module.exports = { researchFinalists, cacheKey, settleWithin };
