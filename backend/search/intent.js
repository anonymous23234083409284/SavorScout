/* Reading the craving.

   A model turns "cheap spicy ramen somewhere quiet" into structured fields.
   Compared with the old parser it also returns related terms (so "ramen"
   matches a "noodle bar"), alternative Google searches, what to avoid, what
   the person cares about most, and whether they want independent places.

   If the model fails or is slow, a keyword parser built on the food lexicon
   takes over. The old search returned a 500 error in that case; now the
   search still runs, a little less clever. */

const { CRAVINGS, FILLER, TASTE_WORDS, VIBE_SYNONYMS } = require("./lexicon");
const { detectCravings, norm, budgetLevel } = require("./features");

const INTENT_MODEL = process.env.SEARCH_INTENT_MODEL || "gpt-4o-mini";
const INTENT_TIMEOUT_MS = Number(process.env.SEARCH_INTENT_TIMEOUT_MS) || 4500;

const SYSTEM_PROMPT = [
  "You turn a food craving into a structured restaurant search. Return ONLY a JSON object with these keys:",
  '- dish: the specific food wanted, keeping taste words with it (e.g. "spicy ramen"). "" if no specific food.',
  '- cuisine: the cuisine, if stated or obvious from the dish (ramen -> "Japanese"). "" if none.',
  '- budget: the price wish in the user\'s own words ("cheap", "under $15", "fancy"). "" if not mentioned.',
  '- dietaryRestrictions: dietary needs mentioned (e.g. "vegetarian", "gluten-free", "halal"). [] if none.',
  "- importantFactors: ONLY atmosphere, company or occasion (quiet, cozy, romantic, good for groups, family friendly, late night, outdoor seating, study spot, fast service). Never food or taste words.",
  '- avoid: things they explicitly say to avoid (e.g. "chains", "fast food", "spicy", "buffet"). Never infer one. [] if none.',
  '- relatedTerms: 3 to 8 short words or phrases a fitting restaurant\'s name or Google Maps category would likely contain: the dish, the kinds of restaurant that serve it, close variants (ramen -> ["ramen", "noodle bar", "japanese", "izakaya"]). No generic words like "food", "restaurant" or "grill".',
  '- searchQueries: 1 or 2 short Google Maps searches, worded the way restaurants describe themselves, that would find the right places (["ramen shop", "japanese noodle restaurant"]). No location in them.',
  '- priority: "quality" if they ask for the best, top or highly rated; "distance" if they stress close, quick or walking; "price" if cost is the main point; otherwise "balanced".',
  '- timeContext: "now", unless they name a later time or meal ("tonight", "tomorrow", "breakfast tomorrow"), then "later".',
  '- independentOnly: true only if they explicitly ask for independent places or to skip chains ("no chains", "non-chain", "independent", "locally owned", "family-owned", "mom and pop"). "Local", "authentic", "hidden gem" or "hole-in-the-wall" on their own do not count. Otherwise false.',
  "Never put a city, neighborhood or address in any field. Use \"\" or [] for anything not mentioned. No other keys.",
].join("\n");

const str = (v, max = 60) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v, maxItems = 8, maxLen = 40) =>
  Array.isArray(v)
    ? [...new Set(v.map((x) => str(String(x ?? ""), maxLen)).filter(Boolean))].slice(0, maxItems)
    : [];

/* The model's JSON, cleaned: right types, bounded sizes, known enum values. */
function normalizeIntent(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const priority = ["quality", "distance", "price", "balanced"].includes(r.priority) ? r.priority : "balanced";
  const timeContext = r.timeContext === "later" ? "later" : "now";
  return {
    dish: str(r.dish),
    cuisine: str(r.cuisine, 40),
    budget: str(r.budget, 40),
    dietaryRestrictions: arr(r.dietaryRestrictions, 6),
    importantFactors: arr(r.importantFactors, 6),
    avoid: arr(r.avoid, 6),
    relatedTerms: arr(r.relatedTerms, 8, 30),
    searchQueries: arr(r.searchQueries, 2, 60),
    priority,
    timeContext,
    independentOnly: r.independentOnly === true,
  };
}

const DIET_RE = /\b(vegan|vegetarian|gluten[- ]free|halal|kosher|dairy[- ]free|nut[- ]free|keto|paleo|pescatarian|low[- ]carb)\b/gi;

/* The keyword parser: used when the model is unavailable, and to start a
   lexicon-worded Google search before the model has even answered. */
function heuristicIntent(text) {
  const t = String(text || "");
  const low = t.toLowerCase();
  const found = detectCravings(t);
  const lex = found.map((k) => CRAVINGS[k]);

  const words = norm(t).split(" ").filter(Boolean);
  const content = words.filter((w) => !FILLER.has(w) && !TASTE_WORDS.test(w));
  const taste = words.filter((w) => TASTE_WORDS.test(w) && !/^(vegan|vegetarian)$/.test(w));
  const dishCore = found[0] || content.slice(0, 3).join(" ");
  const dish = [taste.join(" "), dishCore].filter(Boolean).join(" ").trim();

  const factors = Object.entries(VIBE_SYNONYMS)
    .filter(([key, syns]) => [key, ...syns.slice(0, 2)].some((s) => low.includes(s)))
    .map(([key]) => key);

  const avoid = [];
  for (const m of low.matchAll(/\b(?:no|not|without|avoid|skip)\s+([a-z][a-z -]{2,20}?)(?=[,.!?]|\s+(?:and|or|but|please|near)\b|$)/g)) {
    avoid.push(m[1].trim());
  }

  const priority = /\b(best|top|highest rated|highly rated|amazing|incredible)\b/.test(low)
    ? "quality"
    : /\b(closest|nearest|walking|walk|quick|fast|right now|asap)\b/.test(low)
      ? "distance"
      : budgetLevel(t) === 1 && /\b(cheap|cheapest|budget|broke)\b/.test(low)
        ? "price"
        : "balanced";

  return {
    dish,
    cuisine: (lex.find((l) => l.cuisine) || {}).cuisine || "",
    budget: budgetLevel(t) != null ? (low.match(/\b(cheap|cheapest|affordable|budget|inexpensive|fancy|upscale|expensive|pricey|splurge|under \$?\d+)\b/) || [""])[0] : "",
    dietaryRestrictions: [...new Set((t.match(DIET_RE) || []).map((d) => d.toLowerCase()))],
    importantFactors: factors,
    avoid,
    relatedTerms: [...new Set(lex.flatMap((l) => l.related))].slice(0, 8),
    searchQueries: lex.map((l) => l.query).slice(0, 2),
    priority,
    timeContext: /\b(tomorrow|later|tonight at|next week|this weekend)\b/.test(low) ? "later" : "now",
    // Explicit wording only: "local" usually just means nearby.
    independentOnly: /\b(independent(?:ly owned)?|locally[- ]owned|family[- ]owned|non[- ]?chains?|no chains?|mom[- ](?:and|&)[- ]pop)\b/.test(low),
  };
}

/* Folds the lexicon into the model's answer: extra related terms, a cuisine
   when the model left it blank, and the lexicon's wording as a search query. */
function enrichIntent(intent, userText) {
  const found = detectCravings([userText, intent.dish, intent.cuisine].join(" "));
  const lex = found.map((k) => CRAVINGS[k]);
  const related = [...new Set([...intent.relatedTerms, ...lex.flatMap((l) => l.related)])]
    .filter((t) => !FILLER.has(norm(t)))
    .slice(0, 12);
  const queries = [...new Set([...intent.searchQueries, ...lex.map((l) => l.query)])].slice(0, 3);
  return {
    ...intent,
    cuisine: intent.cuisine || (lex.find((l) => l.cuisine) || {}).cuisine || "",
    relatedTerms: related,
    searchQueries: queries,
    cravings: found,
  };
}

async function parseIntent(openai, userText, log = console) {
  try {
    const res = await openai.chat.completions.create(
      {
        model: INTENT_MODEL,
        max_tokens: 320,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText },
        ],
      },
      { timeout: INTENT_TIMEOUT_MS, maxRetries: 0 }
    );
    const parsed = JSON.parse(res.choices[0].message.content);
    return { intent: enrichIntent(normalizeIntent(parsed), userText), source: "model" };
  } catch (err) {
    log.warn?.(`intent model failed (${err.message || err}); using the keyword parser`);
    return { intent: enrichIntent(normalizeIntent(heuristicIntent(userText)), userText), source: "fallback" };
  }
}

module.exports = { parseIntent, heuristicIntent, normalizeIntent, enrichIntent, SYSTEM_PROMPT };
