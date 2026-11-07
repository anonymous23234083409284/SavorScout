/* The signals each candidate is scored on. Pure functions: no network, no
   database, so every one of them can be tested on its own. */

const { CRAVINGS, FILLER, TASTE_WORDS, NON_FOOD, FAST_FOOD } = require("./lexicon");
const CHAINS = new Set(require("./chains.json").names);

/* ---- text ---------------------------------------------------------------- */

/* Lowercase, strip accents and apostrophes, keep letters, digits and "&". */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();
}

/* Light stemming, enough that "tacos" finds "taco", "noodles" finds "noodle"
   and "dumplings" finds "dumpling", without turning "bus" into "bu". */
function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && /(?:ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("oes")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}

function tokens(s) {
  const n = norm(s);
  return n ? n.split(" ").map(stem) : [];
}

/* True when every token of the phrase appears in order, side by side. */
function hasPhrase(hay, phrase) {
  if (!phrase.length || phrase.length > hay.length) return false;
  outer: for (let i = 0; i <= hay.length - phrase.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (hay[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}

/* The words of a craving that name food, minus filler and taste words.
   "really good spicy ramen near me" -> ["ramen"] (spicy kept separately). */
function contentWords(s) {
  return norm(s)
    .split(" ")
    .filter((w) => w && !FILLER.has(w) && !TASTE_WORDS.test(w))
    .map(stem);
}

/* ---- place fields ---------------------------------------------------------- */

function placeCategory(p) {
  const types = Array.isArray(p.types) ? p.types : [];
  return [p.type, p.category, ...types].filter(Boolean).join(" ");
}

/* Pre-tokenised fields, computed once per candidate. */
function placeText(p) {
  return {
    name: tokens(p.title),
    category: tokens(placeCategory(p)),
    description: tokens(p.description),
  };
}

/* ---- cravings ---------------------------------------------------------- */

/* Which lexicon entries the request mentions, longest match first, so
   "korean fried chicken" wins over "fried chicken" and "chicken". */
const CRAVING_INDEX = Object.entries(CRAVINGS)
  .flatMap(([key, v]) => v.match.map((m) => ({ key, phrase: tokens(m) })))
  .sort((a, b) => b.phrase.length - a.phrase.length);

function detectCravings(text) {
  const hay = tokens(text);
  const found = [];
  const used = new Set();
  for (const { key, phrase } of CRAVING_INDEX) {
    if (found.includes(key)) continue;
    if (!hasPhrase(hay, phrase)) continue;
    // A shorter phrase inside an already-matched longer one is the same
    // craving, not a second one ("fried chicken" inside "korean fried chicken").
    const at = hay.findIndex((_, i) => phrase.every((t, j) => hay[i + j] === t));
    const span = phrase.map((_, j) => at + j);
    if (span.every((i) => used.has(i))) continue;
    span.forEach((i) => used.add(i));
    found.push(key);
  }
  return found;
}

/* ---- relevance --------------------------------------------------------- */

const FIELD_WEIGHT = { category: 1, name: 0.95, description: 0.75 };

/* Best weighted hit of any phrase in any field. */
function bestFieldHit(text, phrases, scale) {
  let best = 0;
  let where = null;
  let term = null;
  for (const ph of phrases) {
    if (!ph.tokens.length) continue;
    for (const field of ["category", "name", "description"]) {
      if (!hasPhrase(text[field], ph.tokens)) continue;
      const v = FIELD_WEIGHT[field] * scale;
      if (v > best) { best = v; where = field; term = ph.raw; }
    }
  }
  return { score: best, field: where, term };
}

/* Builds the phrase sets a candidate is matched against, once per search. */
function relevanceSpec(intent) {
  const toPh = (raw) => ({ raw, tokens: tokens(raw) });
  // A "dish" that is only a meal word ("dinner") names no food to match.
  const dishes = [intent.dish].filter((d) => d && contentWords(d).length);
  const primary = dishes.map(toPh).filter((p) => p.tokens.length);

  // The head of the dish: its food words without taste words, most important
  // last ("spicy pork ramen" -> "pork ramen", then "ramen").
  const heads = [];
  for (const d of dishes) {
    const cw = contentWords(d);
    if (cw.length > 1) heads.push({ raw: cw.join(" "), tokens: cw });
    if (cw.length) heads.push({ raw: cw[cw.length - 1], tokens: [cw[cw.length - 1]] });
  }

  const related = [...new Set((intent.relatedTerms || []).map((t) => String(t).trim()).filter(Boolean))]
    .map(toPh)
    .filter((p) => p.tokens.length && !(p.tokens.length === 1 && FILLER.has(p.tokens[0])));

  const cuisine = intent.cuisine ? [toPh(intent.cuisine)].filter((p) => p.tokens.length) : [];
  const avoid = (intent.avoid || []).map(toPh).filter((p) => p.tokens.length);

  return {
    specific: primary.length > 0 || cuisine.length > 0 || related.length > 0,
    primary, heads, related, cuisine, avoid,
  };
}

/* How well the place's own listing says it serves what was asked for, 0-1.
   Category beats name beats description; the full dish beats its head noun,
   which beats a related word, which beats the cuisine alone. */
function textRelevance(text, spec) {
  const full = bestFieldHit(text, spec.primary, 1);
  const head = bestFieldHit(text, spec.heads, 0.92);
  const rel = bestFieldHit(text, spec.related, 0.72);
  const cui = bestFieldHit(text, spec.cuisine, 0.66);
  const hits = [full, head, rel, cui].filter((h) => h.score > 0);
  const top = hits.reduce((a, b) => (b.score > a.score ? b : a), { score: 0, field: null, term: null });
  // Two independent signals agreeing (a "Japanese restaurant" called
  // "Menya Ramen") are worth a little more than either alone.
  const agree = hits.length >= 2 ? 0.04 : 0;
  return { score: Math.min(1, top.score + agree), matchedTerm: top.term, field: top.field, strength: top === full || top === head ? "dish" : top === rel ? "related" : top === cui ? "cuisine" : null };
}

/* Google's own ordering is a strong relevance signal: Maps ranked these
   places for this exact query. Reciprocal rank fusion across the queries we
   sent: showing up near the top of several of them scores highest. */
const RRF_K = 8;
function googleRelevance(ranks, queryCount) {
  if (!ranks || !ranks.length || !queryCount) return 0;
  const best = queryCount * (1 / (RRF_K + 1));
  const sum = ranks.reduce((s, r) => s + 1 / (RRF_K + r.rank), 0);
  return Math.min(1, sum / best);
}

function combinedRelevance(textRel, googleRel) {
  // Text decides; Google lifts places whose listing is vague but which Maps
  // itself puts near the top (an izakaya that does great ramen).
  return Math.min(1, 0.76 * textRel + 0.24 * googleRel);
}

function avoidHit(text, spec) {
  return spec.avoid.some((ph) => hasPhrase(text.name, ph.tokens) || hasPhrase(text.category, ph.tokens));
}

/* ---- quality ----------------------------------------------------------- */

/* The local baseline: what a typical rating looks like around here, weighted
   by how many reviews stand behind it. Ratings run higher in some areas than
   others, so "4.5" means less where everything is a 4.5. */
function localPrior(cands) {
  let sum = 0;
  let w = 0;
  for (const c of cands) {
    if (typeof c.rating !== "number" || !c.reviewCount) continue;
    const weight = Math.log1p(c.reviewCount);
    sum += c.rating * weight;
    w += weight;
  }
  const mean = w > 0 ? sum / w : 4.2;
  return Math.min(4.5, Math.max(3.9, mean));
}

const PRIOR_STRENGTH = 15;

/* Quality, 0-1: a Bayesian rating shrunk toward the local baseline (a 5.0
   from 4 reviews is mostly the baseline; a 4.7 from 900 is a 4.7), mapped
   onto the range restaurants actually occupy, plus a small credit for being
   proven popular. Unrated places get a below-average guess, not zero. */
function quality(rating, reviewCount, prior, popRef) {
  if (typeof rating !== "number" || !reviewCount) {
    return { score: 0.32, posterior: null, rated: false };
  }
  const n = reviewCount;
  const posterior = (PRIOR_STRENGTH * prior + n * rating) / (PRIOR_STRENGTH + n);
  const scaled = Math.min(1, Math.max(0, (posterior - 3.6) / (4.85 - 3.6)));
  const pop = Math.min(1, Math.log10(1 + n) / Math.log10(1 + popRef));
  return { score: 0.86 * scaled + 0.14 * pop, posterior, rated: true };
}

/* ---- price ------------------------------------------------------------- */

/* Serper reports price as "$$", as a number, or (newer Google listings) as a
   per-person range like "$10–20". The old parser read "$20–30" as one dollar
   sign, a budget place. A range now maps by its starting price. */
function priceLevel(p) {
  const raw = p.priceLevel ?? p.price_level ?? p.price;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.min(4, Math.max(1, Math.round(raw) || 1));
  const s = String(raw);
  const num = s.match(/(\d+)/);
  if (num) {
    const v = parseInt(num[1], 10);
    if (/\$/.test(s) || /[–-]/.test(s)) {
      if (v < 15) return 1;
      if (v < 30) return 2;
      if (v < 60) return 3;
      return 4;
    }
    if (v >= 1 && v <= 4) return v;
  }
  const dollars = s.match(/\${1,4}/);
  return dollars ? dollars[0].length : null;
}

function budgetLevel(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  if (/\${4,}/.test(text) || /(very expensive|fine dining|upscale|splurge|fancy|luxur)/.test(s)) return 4;
  if (/\${3}/.test(text) || /(expensive|pricey|high[- ]end|nice dinner|special occasion)/.test(s)) return 3;
  if (/\${2}/.test(text) || /(moderate|mid[- ]range|reasonabl|not too expensive)/.test(s)) return 2;
  if (/\$/.test(text) || /(cheap|budget|affordable|inexpensive|under \$?\d|broke|college budget|value)/.test(s)) return 1;
  return null;
}

/* Asymmetric on purpose: cheaper than asked is fine (a little off if they
   wanted a nice dinner), pricier than asked is the real miss. Unknown price is
   a mild doubt, not a verdict. */
function budgetFit(want, have) {
  if (want == null) return null;
  if (have == null) return 0.62;
  if (have <= want) {
    const under = want - have;
    if (want >= 3 && under >= 2) return 0.45; // asked for a nice dinner, got a fast-food price
    return 1 - 0.12 * under;
  }
  return Math.max(0.04, 1 - 0.48 * (have - want));
}

/* ---- distance ------------------------------------------------------------- */

const EARTH_RADIUS_MILES = 3958.8;
function miles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* Distance utility, 0-1. Flat-ish close by, falling smoothly, half value at
   `half` miles. Absolute, never normalised against the pool: the closest of a
   bad set of far places is still far. */
function distanceUtility(d, half) {
  return 1 / (1 + Math.pow(Math.max(0, d) / half, 2.2));
}

/* ---- chains and categories --------------------------------------------- */

function isChain(title) {
  const n = norm(title);
  if (!n) return false;
  const squashed = n.replace(/ /g, "");
  for (const c of [n, squashed]) if (CHAINS.has(c)) return true;
  // "McDonald's - Main St", "Chipotle Mexican Grill #1234"
  const words = n.split(" ");
  for (let k = Math.min(4, words.length); k >= 1; k--) {
    const head = words.slice(0, k).join(" ");
    if (CHAINS.has(head) || CHAINS.has(head.replace(/ /g, ""))) return true;
  }
  return false;
}

function isNonFood(p) {
  return NON_FOOD.test(placeCategory(p));
}

function isFastFood(p) {
  return FAST_FOOD.test(placeCategory(p));
}

/* Whether the search itself asks to skip chains, or fast food. Being a chain
   counts for nothing otherwise: an ordinary search treats a chain exactly like
   any other restaurant, in the scores and in what the judge is told. */
function wantsNoChains(intent) {
  return Boolean(intent.independentOnly) || (intent.avoid || []).some((a) => /\bchains?\b|franchise|corporate/i.test(a));
}

function wantsNoFastFood(intent) {
  return (intent.avoid || []).some((a) => /fast[- ]?food|drive[- ]?thru/i.test(a));
}

module.exports = {
  norm, stem, tokens, hasPhrase, contentWords, placeCategory, placeText,
  detectCravings, relevanceSpec, textRelevance, googleRelevance, combinedRelevance, avoidHit,
  localPrior, quality, priceLevel, budgetLevel, budgetFit, miles, distanceUtility,
  isChain, isNonFood, isFastFood, wantsNoChains, wantsNoFastFood, PRIOR_STRENGTH,
};
