/* The judge: a final read of the finalists, with the evidence in front of it.

   Keyword matching cannot tell that an izakaya whose menu lists "tonkotsu
   ramen" is a better ramen pick than a sushi bar called "Ramen & Roll" that
   doesn't serve it, or that reviews saying "the broth was bland" should count
   against a ramen place. A language model reading the actual menu and review
   passages can. It scores each finalist 0-10 for fit with this exact request.

   It never decides alone: its score is one input to the final blend (see
   rank.js), it only sees facts we pass it, and if it is slow or fails the
   search simply ranks without it. */

const JUDGE_MODEL = process.env.SEARCH_JUDGE_MODEL || "gpt-4o-mini";
const JUDGE_TIMEOUT_MS = Number(process.env.SEARCH_JUDGE_TIMEOUT_MS) || 3000;
const JUDGE_ENABLED = process.env.SEARCH_JUDGE !== "off";

const SYSTEM = [
  "You are a careful local food expert choosing the best restaurant for one diner's request.",
  "Score every candidate from 0 to 10 for how well it fits THIS request, using only the facts given. Do not assume anything the facts don't say.",
  "What matters, in order:",
  "1. Does it actually serve what they asked for? Check the category, the name and especially the menu passages. A place that clearly doesn't serve it scores 0-3 however good it is.",
  "2. How good is it likely to be? A high rating backed by many reviews counts for more than a perfect rating from a few. Review passages praising or criticising the requested food count heavily.",
  "3. Any atmosphere, dietary needs or things to avoid that they mentioned, but only where the passages support it.",
  "4. Price fit and distance, weighed by what they said matters most (priority).",
  "Closed now, or matching something they want to avoid, should cost points.",
  'Return JSON: {"results":[{"id":"r1","fit":0-10,"serves":"yes|likely|unclear|no","reason":"one short factual sentence citing the facts"}]} with one entry per candidate.',
].join("\n");

const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function describe(c, i) {
  const p = c.place;
  const bits = [
    `${`r${i + 1}`}: ${clip(p.title, 70)}`,
    `category: ${clip(c.categoryText || p.type || "unknown", 60)}`,
    typeof c.rating === "number" ? `rating ${c.rating} from ${c.reviewCount} reviews` : "no rating",
    `${c.distance.toFixed(1)} miles away`,
    c.priceLevel ? `price ${"$".repeat(c.priceLevel)}` : "price unknown",
    c.open?.known ? (c.open.open ? `open now${c.open.closesAt ? ` until ${c.open.closesAt}` : ""}` : "closed now") : "hours unknown",
    c.chain ? "chain" : "independent or unknown",
  ];
  const menu = (c.research?.menu?.highlights || []).slice(0, 2).map((h) => clip(h, 260));
  const reviews = (c.research?.reviews?.highlights || []).slice(0, 2).map((h) => clip(h, 260));
  if (menu.length) bits.push(`menu passages: "${menu.join('" | "')}"`);
  if (reviews.length) bits.push(`review passages: "${reviews.join('" | "')}"`);
  return bits.join(" | ");
}

function requestSummary(userText, intent) {
  const parts = [`request: "${clip(userText, 200)}"`];
  if (intent.dish) parts.push(`dish: ${intent.dish}`);
  if (intent.cuisine) parts.push(`cuisine: ${intent.cuisine}`);
  if (intent.budget) parts.push(`budget: ${intent.budget}`);
  if (intent.dietaryRestrictions.length) parts.push(`dietary: ${intent.dietaryRestrictions.join(", ")}`);
  if (intent.importantFactors.length) parts.push(`atmosphere: ${intent.importantFactors.join(", ")}`);
  if (intent.avoid.length) parts.push(`avoid: ${intent.avoid.join(", ")}`);
  if (intent.independentOnly) parts.push("wants independent places");
  parts.push(`priority: ${intent.priority}`);
  return parts.join("\n");
}

/* Returns a Map index -> {fit 0-1, serves, reason}, or null when the judge did
   not run or its answer was unusable. */
async function judgeFinalists(openai, userText, intent, finalists, log = console) {
  if (!JUDGE_ENABLED || !openai || finalists.length < 2) return null;
  const user = `${requestSummary(userText, intent)}\n\ncandidates:\n${finalists.map(describe).join("\n")}`;
  try {
    const res = await openai.chat.completions.create(
      {
        model: JUDGE_MODEL,
        temperature: 0,
        max_tokens: 80 + 70 * finalists.length,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      },
      { timeout: JUDGE_TIMEOUT_MS, maxRetries: 0 }
    );
    const parsed = JSON.parse(res.choices[0].message.content);
    const rows = Array.isArray(parsed?.results) ? parsed.results : [];
    const out = new Map();
    for (const r of rows) {
      const m = String(r?.id || "").match(/^r(\d+)$/);
      if (!m) continue;
      const idx = parseInt(m[1], 10) - 1;
      const fit = Number(r.fit);
      if (idx < 0 || idx >= finalists.length || !Number.isFinite(fit)) continue;
      out.set(idx, {
        fit: Math.min(10, Math.max(0, fit)) / 10,
        serves: ["yes", "likely", "unclear", "no"].includes(r.serves) ? r.serves : "unclear",
        reason: clip(r.reason, 160),
      });
    }
    // An answer covering under half the finalists is more noise than signal.
    return out.size >= Math.ceil(finalists.length / 2) ? out : null;
  } catch (err) {
    log.warn?.(`judge skipped (${err.message || err})`);
    return null;
  }
}

module.exports = { judgeFinalists, describe, requestSummary, JUDGE_ENABLED };
