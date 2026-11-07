/* Ranking: from ~50 candidates to one pick.

   STAGE 1, every candidate, no network:
     relevance  does its listing say it serves this? (+ Google's own ranking)
     quality    rating shrunk toward the local baseline by review count
     distance   absolute utility, half value at a mode-dependent distance
     budget     asymmetric price fit, only when a budget was asked for
     open       open now / closing soon, only when hours are known
   combined as a WEIGHTED GEOMETRIC MEAN with weights set by the request.

   Why geometric: the old engine added scores, so a place could make up for not
   serving the dish by being close and well rated, and the nearest
   irrelevant place sometimes won. A geometric mean needs a place to be decent
   on everything that matters to this request: one near-zero drags it down.

   Then multipliers (chains when they asked for independent, things they said
   to avoid, what they've rated before, their taste quiz, listing quality) and
   gates (not open, clearly irrelevant, not a restaurant) remove the obvious
   misses before the finalists are picked.

   STAGE 2, the top six (one per brand):
     evidence   menu and review passages: is the dish there, what do people say
                about it, does the atmosphere match, are dietary needs met
     judge      a language model's 0-10 fit score with that evidence in front of it
   blended with the stage-1 score into the final ranking. */

const F = require("./features");
const { openStatus, openScore } = require("./hours");
const { VIBE_SYNONYMS, POSITIVE, NEGATIVE } = require("./lexicon");

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* Distance at which a place keeps half its distance value, by mode. */
const HALF_DISTANCE = { nearby: 5, driving: 9, anywhere: 15, group: 10 };

function normalizeWeights(w) {
  const total = Object.values(w).reduce((s, v) => s + v, 0) || 1;
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / total]));
}

/* Weights follow the request. A specific dish makes relevance the lead
   signal; "best" leans on quality, "closest" on distance, "cheap" on price;
   budget and hours only count when they're known. */
function stage1Weights(intent, spec, ctx) {
  const w = {
    relevance: spec.specific ? 0.36 : 0.1,
    quality: 0.3,
    distance: 0.24,
    budget: ctx.budgetWant != null ? 0.1 : 0,
    open: ctx.useHours ? 0.08 : 0,
  };
  if (intent.priority === "quality") { w.quality *= 1.45; w.distance *= 0.75; }
  if (intent.priority === "distance") { w.distance *= 1.6; w.quality *= 0.85; }
  if (intent.priority === "price") w.budget = Math.max(w.budget, 0.1) * 1.8;
  if (ctx.radiusMode === "anywhere") w.distance *= 0.7;
  if (ctx.radiusMode === "nearby") w.distance *= 1.1;
  return normalizeWeights(w);
}

/* Weighted geometric mean over the signals that exist (null = unknown, left
   out with its weight redistributed). The 0.03 floor keeps one zero from
   wiping out a place entirely: it stays rankable, just far down. */
function geometric(values, weights) {
  let logSum = 0;
  let wSum = 0;
  for (const [k, w] of Object.entries(weights)) {
    const v = values[k];
    if (!w || v == null || !Number.isFinite(v)) continue;
    logSum += w * Math.log(0.03 + 0.97 * clamp01(v));
    wSum += w;
  }
  return wSum ? Math.exp(logSum / wSum) : 0;
}

/* Small personal nudges from the taste quiz, capped at ±8%. Discovery-minded
   people get a lean toward independents and well-rated places that aren't
   famous yet; value-minded people lean cheaper when they didn't name a budget. */
function quizMultiplier(c, quiz, budgetWant) {
  if (!quiz) return 1;
  let adj = 0;
  if (typeof quiz.discovery === "number") {
    const d = (quiz.discovery - 50) / 50;
    if (c.chain) adj -= 0.05 * d;
    if (c.quality.rated && c.rating >= 4.5 && c.reviewCount >= 15 && c.reviewCount <= 300) adj += 0.04 * d;
  }
  if (typeof quiz.value === "number" && budgetWant == null && c.priceLevel != null) {
    adj -= 0.03 * ((quiz.value - 50) / 50) * Math.max(0, c.priceLevel - 2);
  }
  return 1 + Math.max(-0.08, Math.min(0.08, adj));
}

/* What kind of meal this is, from the words used or, failing that, the time
   on the person's clock. "dinner" at 7pm should not return a coffee shop. */
const SNACK_PLACE = /\b(?:coffee|cafe|café|espresso|bakery|bakehouse|bagel|donut|doughnut|ice cream|gelato|creamery|frozen yogurt|dessert|cupcake|cookie|candy|chocolate|juice|smoothie|tea house|boba|bubble tea|patisserie)\b/i;
const BREAKFAST_PLACE = /\b(?:breakfast|brunch|cafe|café|diner|bagel|bakery|coffee|pancake|waffle|donut|doughnut)\b/i;

function mealContext(text, localTime) {
  const s = String(text || "").toLowerCase();
  if (/\b(dinner|supper)\b/.test(s)) return "dinner";
  if (/\blunch\b/.test(s)) return "lunch";
  if (/\b(breakfast|brunch)\b/.test(s)) return "breakfast";
  if (/\b(dessert|coffee|snack|sweet|treat)\b/.test(s)) return "snack";
  if (!localTime) return null;
  const h = localTime.minutes / 60;
  if (h >= 5 && h < 10.5) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 16.5 && h < 22) return "dinner";
  return null;
}

/* Only for open-ended searches: a specific request ("coffee", "bagels")
   already says what kind of place it wants. */
function mealFit(c, meal, spec) {
  if (!meal || spec.specific) return 1;
  const cat = `${c.categoryText} ${c.place.title}`;
  if (meal === "dinner") return SNACK_PLACE.test(cat) ? 0.4 : 1;
  if (meal === "lunch") return SNACK_PLACE.test(cat) && !/\b(?:cafe|café|bagel|bakery)\b/i.test(cat) ? 0.6 : 1;
  if (meal === "breakfast") return BREAKFAST_PLACE.test(cat) ? 1.08 : 0.85;
  return 1;
}

const wantsNoChains = (intent) =>
  intent.independentOnly || intent.avoid.some((a) => /\bchains?\b|franchise|corporate/i.test(a));
const wantsNoFastFood = (intent) => intent.avoid.some((a) => /fast[- ]?food|drive[- ]?thru/i.test(a));

/* Every signal for one candidate. */
function describeCandidate(entry, ctx) {
  const p = entry.place;
  const text = F.placeText(p);
  const distance = F.miles(ctx.anchor.lat, ctx.anchor.lng, p.latitude, p.longitude);
  const rating = typeof p.rating === "number" ? p.rating : null;
  const reviewCount = p.ratingCount || 0;
  const priceLevel = F.priceLevel(p);
  const open = ctx.localTime ? openStatus(p.openingHours, ctx.localTime) : { known: false };
  const textRel = ctx.spec.specific ? F.textRelevance(text, ctx.spec) : { score: 0, matchedTerm: null, field: null, strength: null };
  const googleRel = F.googleRelevance(entry.ranks, ctx.queryCount);
  return {
    place: p,
    ranks: entry.ranks,
    text,
    categoryText: F.placeCategory(p),
    rating,
    reviewCount,
    distance,
    priceLevel,
    placePriceLevel: priceLevel, // the name server.js (verdicts, taste) reads
    open,
    openScore: ctx.useHours ? openScore(open) : null,
    chain: F.isChain(p.title),
    fastFood: F.isFastFood(p),
    nonFood: F.isNonFood(p),
    textRel,
    googleRel,
    relevance: ctx.spec.specific ? F.combinedRelevance(textRel.score, googleRel) : null,
    quality: F.quality(rating, reviewCount, ctx.prior, ctx.popRef),
    distanceUtil: F.distanceUtility(distance, ctx.halfDistance),
    budget: F.budgetFit(ctx.budgetWant, priceLevel),
    avoided: F.avoidHit(text, ctx.spec),
    dataTrust: (p.website ? 0.5 : 0) + (p.phoneNumber || p.phone ? 0.5 : 0),
  };
}

function scoreStage1(c, ctx) {
  const weights = ctx.weights;
  const base = geometric(
    { relevance: c.relevance, quality: c.quality.score, distance: c.distanceUtil, budget: c.budget, open: c.openScore },
    weights
  );
  let mult = 1;
  if (c.chain && ctx.noChains) mult *= 0.55;
  if (ctx.noFastFood && (c.fastFood || c.chain)) mult *= 0.55;
  if (c.avoided) mult *= 0.4;
  mult *= mealFit(c, ctx.meal, ctx.spec);
  mult *= ctx.tasteMultiplier ? ctx.tasteMultiplier(c, ctx.tasteProfile) : 1;
  mult *= quizMultiplier(c, ctx.quiz, ctx.budgetWant);
  mult *= 0.97 + 0.03 * c.dataTrust;
  return { stage1: base * mult, stage1Base: base, stage1Mult: mult };
}

/* One location per brand among the finalists: three branches of the same
   chain are one option, not three. */
function brandKey(c) {
  const words = F.norm(c.place.title).split(" ");
  return words.slice(0, Math.min(3, words.length)).join(" ");
}

function pickFinalists(ranked, k) {
  const out = [];
  const brands = new Set();
  for (const c of ranked) {
    const b = brandKey(c);
    if (brands.has(b)) continue;
    brands.add(b);
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
}

/* ---- stage 2: evidence ------------------------------------------------- */

function sentences(text) {
  return String(text || "").split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

const POS = POSITIVE.map((w) => F.tokens(w));
const NEG = NEGATIVE.map((w) => F.tokens(w));
function countHits(tokens, lists) {
  let n = 0;
  for (const ph of lists) if (F.hasPhrase(tokens, ph)) n += 1;
  return n;
}

/* What the menu and review passages say about this place, for this request. */
function evidenceFeatures(c, ctx) {
  const menu = c.research?.menu;
  const reviews = c.research?.reviews;
  const menuText = (menu?.highlights || []).join("\n");
  const reviewText = (reviews?.highlights || []).join("\n");
  const mt = F.tokens(menuText);
  const rt = F.tokens(reviewText);
  const any = Boolean(menu || reviews);
  const spec = ctx.spec;

  // Is the dish actually there? Menu mentions beat review mentions beat
  // related words beat the cuisine alone.
  let dish = null;
  let dishWhere = null;
  if (spec.specific && any) {
    const inText = (toks, phs) => phs.some((ph) => F.hasPhrase(toks, ph.tokens));
    if (inText(mt, spec.primary)) { dish = 1; dishWhere = "menu"; }
    else if (inText(mt, spec.heads)) { dish = 0.9; dishWhere = "menu"; }
    else if (inText(rt, spec.primary) || inText(rt, spec.heads)) { dish = 0.85; dishWhere = "reviews"; }
    else if (inText(mt, spec.related)) dish = 0.6;
    else if (inText(rt, spec.related)) dish = 0.5;
    else if (inText(mt, spec.cuisine) || inText(rt, spec.cuisine)) dish = 0.4;
    else dish = 0.15;
  }

  // What reviewers say. Sentences about the dish count double, so "the ramen
  // was incredible" outweighs "parking was a nightmare".
  let sentiment = null;
  if (reviews && rt.length) {
    const heads = spec.heads.length ? spec.heads : spec.primary;
    let pos = 0;
    let neg = 0;
    for (const s of sentences(reviewText)) {
      const st = F.tokens(s);
      const aboutDish = heads.some((h) => F.hasPhrase(st, h.tokens));
      const w = aboutDish ? 2 : 1;
      pos += w * countHits(st, POS);
      neg += w * countHits(st, NEG);
    }
    sentiment = (pos + 1) / (pos + neg + 2);
  }

  // The atmosphere asked for, read through the words reviewers actually use.
  const matchedFactors = [];
  for (const f of ctx.vibeTerms) {
    const syns = VIBE_SYNONYMS[F.norm(f)] || VIBE_SYNONYMS[f.toLowerCase()] || [f];
    if (syns.some((s) => F.hasPhrase(rt, F.tokens(s)) || F.hasPhrase(mt, F.tokens(s)))) matchedFactors.push(f);
  }
  const vibeRank = ctx.vibeTerms.length && any
    ? (matchedFactors.length ? 0.5 + 0.5 * (matchedFactors.length / ctx.vibeTerms.length) : 0.4)
    : null;

  // Dietary and allergy terms stay strict, literal phrases, as before: loosening
  // "tree nut" into "tree" would turn an allergy note into a false comfort.
  const listing = `${c.place.title} ${c.categoryText} ${c.place.description || ""}`;
  const both = `${listing}\n${menuText}\n${reviewText}`.toLowerCase();
  const matchedDietaryTerms = ctx.dietaryTerms.filter((t) => both.includes(t.toLowerCase()));
  const matchedAllergyTerms = ctx.allergyTerms.filter((t) => both.includes(t.toLowerCase()));
  const dietary = ctx.dietaryTerms.length ? matchedDietaryTerms.length / ctx.dietaryTerms.length : null;

  const strength = !any
    ? null
    : Math.min(1, (menu?.sourceType === "official_site" ? 0.8 : menu ? 0.55 : 0) + (reviews ? 0.3 : 0));

  const parts = { dish, sentiment, vibe: vibeRank, dietary, strength };
  const W = { dish: 0.42, sentiment: 0.26, vibe: 0.18, dietary: 0.14, strength: 0.08 };
  let sum = 0;
  let wsum = 0;
  for (const [k, w] of Object.entries(W)) {
    if (parts[k] == null) continue;
    sum += w * parts[k];
    wsum += w;
  }
  return {
    ...parts,
    dishWhere,
    composite: wsum ? sum / wsum : null,
    matchedFactors,
    matchedDietaryTerms,
    matchedAllergyTerms,
    vibeDisplay: matchedFactors.length ? matchedFactors.length / ctx.vibeTerms.length : null,
  };
}

/* ---- final blend ------------------------------------------------------- */

const DISPLAY_WEIGHTS = { relevance: 0.34, quality: 0.3, proximity: 0.2, evidence: 0.08, budget: 0.08, vibe: 0.1 };

function weightedMean(values, weights) {
  let sum = 0;
  let total = 0;
  for (const [k, w] of Object.entries(weights)) {
    const v = values[k];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    sum += w * v;
    total += w;
  }
  return total > 0 ? sum / total : 0;
}

/* Final order of the finalists, plus the honest numbers the card shows. */
function finalize(finalists, judge, ctx) {
  const maxS1 = Math.max(...finalists.map((c) => c.stage1), 1e-9);
  const judged = judge && judge.size;
  const anyGoodFit = judged && [...judge.values()].some((j) => j.fit >= 0.6);

  const scored = finalists.map((c, i) => {
    const s1 = c.stage1 / maxS1;
    const ev = c.evidence.composite ?? s1;
    const j = judged ? judge.get(i) : null;
    let final = j ? 0.5 * s1 + 0.2 * ev + 0.3 * j.fit : 0.68 * s1 + 0.32 * ev;
    // A place the judge says plainly doesn't fit can't win on numbers alone
    // when another finalist clearly does.
    if (j && j.fit <= 0.2 && anyGoodFit) final *= 0.65;

    const quality = c.quality.rated ? clamp01((c.quality.posterior - 3.5) / (4.8 - 3.5)) : null;
    const absolute = {
      relevance: ctx.spec.specific ? Math.max(c.relevance ?? 0, (c.evidence.dish ?? 0) * 0.95) : null,
      quality,
      proximity: clamp01(1 - (c.distance / Math.max(ctx.maxRadius, 1)) * 0.35),
      budget: ctx.budgetWant != null && c.priceLevel != null ? c.budget : null,
      evidence: c.evidence.strength,
      vibe: c.evidence.vibeDisplay,
    };
    let display = weightedMean(absolute, DISPLAY_WEIGHTS);
    if (j) display = 0.82 * display + 0.18 * j.fit;
    // Closed (or about to close) is part of how good a pick it is right now.
    if (ctx.useHours && c.open?.known) {
      if (!c.open.open) display *= 0.6;
      else if (c.open.closesInMin <= 30) display *= 0.85;
    }
    return { ...c, judge: j, final, absolute, matchScore: Math.round(clamp01(display) * 100) };
  });

  scored.sort((a, b) => b.final - a.final);
  // The numbers follow the ranking: the pick shows the highest, and no place
  // shows more than the one ranked above it. (The ranking already decided;
  // this keeps the card from contradicting that decision.)
  for (let i = 1; i < scored.length; i++) {
    const cap = i === 1 ? scored[0].matchScore - 1 : scored[i - 1].matchScore;
    if (scored[i].matchScore > cap) scored[i].matchScore = Math.max(1, cap);
  }
  return scored;
}

/* What the card is allowed to claim about the dish: only what the listing
   or the evidence actually shows. */
function dishLabels(c, intent, spec) {
  let matchedDish = null;
  if (c.textRel.strength === "dish" && c.textRel.matchedTerm) matchedDish = c.textRel.matchedTerm;
  else if (spec.heads.length && (c.evidence?.dish ?? 0) >= 0.85) matchedDish = spec.heads[spec.heads.length - 1].raw;
  const matchedCuisine = !matchedDish && intent.cuisine && c.textRel.strength === "cuisine" ? intent.cuisine : null;
  return { matchedDish, matchedCuisine };
}

module.exports = {
  stage1Weights, geometric, quizMultiplier, mealContext, mealFit, describeCandidate, scoreStage1, pickFinalists,
  evidenceFeatures, finalize, dishLabels, wantsNoChains, wantsNoFastFood, HALF_DISTANCE, DISPLAY_WEIGHTS,
};
