/* Search v2: the whole pipeline, start to finish.

     t=0     read the craving (intent model)   ┐ in parallel
             Google Maps: the craving as typed  │
             Google Maps: the lexicon's wording ┘
     ~1s     Google Maps: the model's wording, only if it's new
     ~1.5s   score all ~50 candidates (stage 1), gate, pick 6 finalists
             read menus (6) and reviews (top 4), cache first, 1.8s deadline
     ~3.5s   judge the finalists with the evidence (3s timeout, optional)
     ~4.5s   final blend -> the pick, three runner-ups, and the board for rooms

   Everything outside this file is injected (OpenAI client, HTTP client, keys,
   the research cache, the taste-profile multiplier), so the pipeline runs the
   same in production and in the offline tests. */

const { parseIntent, heuristicIntent } = require("./intent");
const { runQueries, mergeResults, pickQueries, MAX_QUERIES } = require("./retrieve");
const { researchFinalists } = require("./research");
const { judgeFinalists } = require("./judge");
const F = require("./features");
const R = require("./rank");
const { TASTE_WORDS } = require("./lexicon");

const FINALISTS = Number(process.env.SEARCH_FINALISTS) || 6;
const REVIEWED = Number(process.env.SEARCH_REVIEWED_FINALISTS) || 4;
const RESEARCH_DEADLINE_MS = Number(process.env.SEARCH_RESEARCH_DEADLINE_MS) || 1800;

class SearchError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

function validLocalTime(t) {
  if (!t || typeof t !== "object") return null;
  const day = Number(t.day);
  const minutes = Number(t.minutes);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  if (!Number.isFinite(minutes) || minutes < 0 || minutes >= 1440) return null;
  return { day, minutes: Math.floor(minutes) };
}

function percentile(values, p) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return 0;
  return v[Math.min(v.length - 1, Math.floor(p * v.length))];
}

/**
 * @param deps  { openai, http, serperKey, exaKey, cache:{fetchBatch,store}, tasteMultiplier, log }
 * @param input { userRequest, anchor:{lat,lng}, locationName, radiusMode, radiusTiers, localTime,
 *                allergyTerms, profileDietaryTerms, tasteProfile, quiz, roomMinCards, roomWidenCeilingMiles }
 */
async function runSearchV2(deps, input) {
  const log = deps.log || console;
  const t0 = Date.now();
  const timings = {};
  const lap = (name, since) => { timings[name] = Date.now() - since; };

  const { userRequest, anchor, locationName } = input;
  const radiusMode = input.radiusTiers[input.radiusMode] ? input.radiusMode : "nearby";
  const tiers = input.radiusTiers[radiusMode];
  const maxRadius = tiers[tiers.length - 1];
  const comfortRadius = tiers[0];
  const localTime = validLocalTime(input.localTime);

  /* 1. Intent and the first searches, in parallel. */
  const early = heuristicIntent(userRequest);
  const firstQueries = pickQueries([userRequest, ...early.searchQueries], [], Math.min(2, MAX_QUERIES));
  const qctx = { locationName, anchor };
  const tq = Date.now();
  const firstSearch = runQueries(deps.http, deps.serperKey, firstQueries, qctx);
  const ti = Date.now();
  const { intent, source: intentSource } = await parseIntent(deps.openai, userRequest, log);
  lap("intentMs", ti);

  /* 2. One more search if the model worded it differently. */
  const secondQueries = pickQueries(intent.searchQueries, firstQueries, MAX_QUERIES);
  const [firstResults, secondResults] = await Promise.all([
    firstSearch,
    runQueries(deps.http, deps.serperKey, secondQueries, qctx),
  ]);
  lap("retrievalMs", tq);
  const results = [...firstResults, ...secondResults];
  const okResults = results.filter((r) => !r.error);
  if (!okResults.length) {
    throw new SearchError("retrieval_failed", "Every Google Maps query failed", results.map((r) => `${r.query}: ${r.error}`));
  }
  // Rank positions are indexed by query, so failed queries keep their slot
  // (empty) and RRF normalises by the queries that actually answered.
  const merged = mergeResults(results).filter(
    (e) => typeof e.place.latitude === "number" && typeof e.place.longitude === "number"
  );
  const rawCandidates = merged.map((e) => e.place);
  if (!merged.length) {
    return { ok: false, reason: "no_candidates", intent, intentSource, rawCandidates, timings };
  }

  /* 3. What this request needs, then every candidate's signals. */
  const spec = F.relevanceSpec(intent);
  const factors = intent.importantFactors.filter(Boolean);
  const vibeTerms = factors.filter((f) => !TASTE_WORDS.test(f.trim()));
  const dishAttributes = factors.filter((f) => TASTE_WORDS.test(f.trim()));
  const dietaryTerms = [...new Set([...intent.dietaryRestrictions, ...(input.profileDietaryTerms || [])])];
  const allergyTerms = input.allergyTerms || [];
  const budgetWant = F.budgetLevel(intent.budget) ?? (intent.priority === "price" ? 1 : null);
  const useHours = Boolean(localTime) && intent.timeContext === "now";
  const halfDistance = R.HALF_DISTANCE[radiusMode] * (intent.priority === "distance" ? 0.7 : 1);

  const ratedForPrior = merged.map((e) => ({ rating: e.place.rating, reviewCount: e.place.ratingCount }));
  const ctx = {
    anchor, spec, intent, localTime, useHours, radiusMode, maxRadius, budgetWant, halfDistance,
    queryCount: okResults.length,
    prior: F.localPrior(ratedForPrior),
    popRef: Math.max(400, percentile(merged.map((e) => e.place.ratingCount || 0), 0.9)),
    vibeTerms, dietaryTerms, allergyTerms,
    meal: R.mealContext(userRequest, localTime),
    noChains: F.wantsNoChains(intent),
    noFastFood: F.wantsNoFastFood(intent),
    tasteMultiplier: deps.tasteMultiplier,
    tasteProfile: input.tasteProfile,
    quiz: input.quiz,
  };
  const withFeatures = merged.map((e) => R.describeCandidate(e, ctx));

  /* 4. The radius the person chose is a ceiling. Group rooms reach a little
     further when the radius can't field a board (same rule as before). */
  let withinRadius = withFeatures.filter((c) => c.distance <= maxRadius);
  const nearest = Math.min(...withFeatures.map((c) => c.distance));
  if (radiusMode === "group" && withinRadius.length < input.roomMinCards) {
    const reachable = withFeatures
      .filter((c) => c.distance <= input.roomWidenCeilingMiles)
      .sort((a, b) => a.distance - b.distance);
    if (reachable.length >= input.roomMinCards) {
      withinRadius = reachable.slice(0, Math.max(input.roomMinCards, withinRadius.length));
    }
  }
  if (!withinRadius.length) {
    return {
      ok: false, reason: "out_of_range", intent, intentSource, rawCandidates, timings,
      nearestMiles: Math.round(nearest), maxRadiusMiles: maxRadius,
    };
  }

  /* 5. Stage 1 on everything inside the radius. */
  ctx.weights = R.stage1Weights(intent, spec, ctx);
  const stage1Ranked = withinRadius
    .map((c) => ({ ...c, ...R.scoreStage1(c, ctx) }))
    .sort((a, b) => b.stage1 - a.stage1);

  /* 6. Gates. Each applies only if it leaves a real choice, so a thin area
     still gets an answer instead of nothing. */
  let contenders = stage1Ranked;
  const gate = (keep) => {
    const kept = contenders.filter(keep);
    if (kept.length >= Math.min(3, contenders.length)) contenders = kept;
  };
  gate((c) => !c.nonFood);
  if (useHours) gate((c) => !(c.open.known && c.openScore === 0));
  if (spec.specific && contenders.filter((c) => c.relevance >= 0.45).length >= 3) gate((c) => c.relevance >= 0.2);

  const finalists = R.pickFinalists(contenders, FINALISTS);

  /* 7. Read menus and reviews for the finalists. */
  const menuParts = [intent.dish, intent.cuisine, ...dishAttributes, ...dietaryTerms].filter(Boolean);
  const menuQuery = menuParts.length ? `${menuParts.join(" ")} menu dishes prices` : "menu specialties prices";
  const reviewSubject = [intent.dish || intent.cuisine, ...vibeTerms].filter(Boolean).join(" ");
  const reviewQuery = `${reviewSubject ? `${reviewSubject} ` : ""}review food quality taste service atmosphere`;
  const tr = Date.now();
  const research = await researchFinalists(deps, finalists, {
    menuQuery,
    reviewQuery,
    reviewCount: Math.min(REVIEWED, finalists.length),
    deadlineMs: RESEARCH_DEADLINE_MS,
  });
  lap("researchMs", tr);
  finalists.forEach((c, i) => { c.research = research[i]; });
  finalists.forEach((c) => { c.evidence = R.evidenceFeatures(c, ctx); });

  /* 8. The judge, then the final blend. */
  const tj = Date.now();
  const judge = await judgeFinalists(deps.openai, userRequest, intent, finalists, log);
  lap("judgeMs", tj);
  const ranked = R.finalize(finalists, judge, ctx);
  for (const c of ranked) Object.assign(c, R.dishLabels(c, intent, spec));
  timings.totalMs = Date.now() - t0;

  log.log?.(
    `search v2 "${userRequest}": ${rawCandidates.length} found, ${withinRadius.length} in ${maxRadius}mi, ` +
      `${contenders.length} contenders, judge ${judge ? "on" : "off"}, ${timings.totalMs}ms\n` +
      ranked
        .map((c, i) =>
          `  ${i + 1}. ${c.place.title.slice(0, 32).padEnd(32)} rel ${(c.relevance ?? 0).toFixed(2)} ` +
          `q ${c.quality.score.toFixed(2)} ${c.distance.toFixed(1)}mi s1 ${c.stage1.toFixed(3)} ` +
          `ev ${c.evidence.composite == null ? " -- " : c.evidence.composite.toFixed(2)} ` +
          `judge ${c.judge ? c.judge.fit.toFixed(1) : "--"} -> ${c.final.toFixed(3)} (${c.matchScore}%)`
        )
        .join("\n")
  );

  return {
    ok: true,
    intent,
    intentSource,
    preferences: {
      dish: intent.dish,
      cuisine: intent.cuisine,
      budget: intent.budget,
      dietaryRestrictions: intent.dietaryRestrictions,
      importantFactors: intent.importantFactors,
      avoid: intent.avoid,
      priority: intent.priority,
    },
    queries: results.map((r) => ({ query: r.query, results: r.places.length, error: r.error || null })),
    rawCandidates,
    withFeatures,
    withinRadius,
    stage1Ranked,
    contenders,
    ranked,
    judgeUsed: Boolean(judge),
    radiusMode,
    radiusUsed: maxRadius,
    maxRadius,
    comfortRadius,
    vibeTerms,
    wantsVibe: vibeTerms.length > 0,
    dietaryTerms,
    allergyTerms,
    timings,
  };
}

module.exports = { runSearchV2, SearchError, validLocalTime };
