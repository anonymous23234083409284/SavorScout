/* Old engine vs new engine on the same scenarios.

   The legacy decision rules are re-implemented here from server.js
   (legacySearch): one Google query, 20 results, relevance by keyword,
   min-max normalised additive weights, top 3 researched (menus; reviews only
   when a vibe was asked for), then a second additive blend. No taste profile
   (the test person has none). Research comes straight from the fixtures, so
   both engines see the same evidence.

     node backend/search/test/compare-legacy.js */

const { runSearchV2 } = require("..");
const { openStatus } = require("../hours");
const fx = require("./fixtures");

/* ---- legacy rules, as in server.js ---------------------------------------- */
const miles = (a, b, c, d) => {
  const t = (x) => (x * Math.PI) / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const minMax = (vals) => {
  const f = vals.filter(Number.isFinite);
  const lo = Math.min(...f);
  const hi = Math.max(...f);
  return hi === lo ? vals.map(() => 1) : vals.map((v) => (v - lo) / (hi - lo));
};
const hay = (p) => `${p.title || ""} ${p.type || ""} ${(p.types || []).join(" ")} ${p.description || ""}`.toLowerCase();
function relevance(p, dish, cuisine) {
  if (!dish && !cuisine) return 0.5;
  const h = hay(p);
  if (dish) {
    if (h.includes(dish)) return 1;
    if (dish.split(/\s+/).filter((w) => w.length > 3).some((w) => h.includes(w))) return 0.6;
  }
  if (cuisine && h.includes(cuisine)) return 0.5;
  return 0;
}
const budgetLevel = (s) => {
  if (!s) return null;
  const l = s.toLowerCase();
  if (/(very expensive|fine dining|upscale|splurge)/.test(l)) return 4;
  if (/(expensive|pricey|high[- ]end)/.test(l)) return 3;
  if (/(moderate|mid[- ]range)/.test(l)) return 2;
  if (/(cheap|budget|affordable|inexpensive)/.test(l)) return 1;
  return null;
};
const priceLevel = (p) => {
  const raw = p.priceLevel;
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const m = String(raw).match(/\${1,4}/);
  return m ? m[0].length : null;
};
function dishRel(text, terms) {
  const t = text.toLowerCase();
  const ms = terms.filter(Boolean).map((x) => x.toLowerCase());
  if (!ms.length) return 0.5;
  let total = 0;
  for (const term of ms) {
    if (t.includes(term)) { total += 1; continue; }
    const w = term.split(/\s+/).filter((x) => x.length > 3);
    if (w.length < 2) continue;
    const hits = w.filter((x) => t.includes(x));
    if (hits.length) total += 0.8 * (hits.length / w.length);
  }
  return total / ms.length;
}
function conceptual(text, terms) {
  const ms = terms.filter(Boolean).map((x) => x.toLowerCase());
  if (!ms.length) return 0.5;
  return ms.filter((x) => text.toLowerCase().includes(x)).length / ms.length;
}

function legacyRank(query, intent, radiusMode) {
  const tiers = fx.RADIUS_TIERS[radiusMode];
  const maxR = tiers[tiers.length - 1];
  const comfort = tiers[0];
  const dish = intent.dish?.trim().toLowerCase();
  const cuisine = intent.cuisine?.trim().toLowerCase();
  const want = budgetLevel(intent.budget);
  const places = fx.serperResults(query).slice(0, 20);
  const feats = places.map((p) => {
    const n = p.ratingCount || 0;
    const r = typeof p.rating === "number" ? p.rating : null;
    const bay = r != null ? (10 * 4.2 + n * r) / (10 + n) : 4.2 * 0.85;
    const d = miles(fx.ANCHOR.lat, fx.ANCHOR.lng, p.latitude, p.longitude);
    const pl = priceLevel(p);
    return {
      p, n, r, bay, d, prox: Math.exp(-d / 3), rel: relevance(p, dish, cuisine),
      trust: (p.website ? 0.5 : 0) + (p.phoneNumber ? 0.5 : 0),
      budget: want == null || pl == null ? 0.5 : Math.max(0, 1 - Math.abs(want - pl) / 3),
    };
  });
  let pool = feats.filter((c) => c.d <= maxR);
  const relevant = pool.filter((c) => c.rel > 0);
  if ((dish || cuisine) && relevant.length >= 2) pool = relevant;
  const [rn, ln, tn, bn] = [minMax(pool.map((c) => c.bay)), minMax(pool.map((c) => c.rel)), minMax(pool.map((c) => c.trust)), minMax(pool.map((c) => c.budget))];
  const penalty = (d) => (d <= comfort ? 1 : d > maxR ? 0.15 : 1 - 0.25 * ((d - comfort) / Math.max(1, maxR - comfort)));
  const s1 = pool
    .map((c, i) => {
      const comp = 0.28 * rn[i] + 0.27 * ln[i] + 0.3 * c.prox + 0.08 * bn[i] + 0.07 * tn[i];
      const conf = Math.min(1, 0.7 + 0.3 * ((Math.min(1, c.n / 25) + c.trust) / 2));
      return { ...c, s1: comp * conf * penalty(c.d) };
    })
    .sort((a, b) => b.s1 - a.s1);
  const fin = s1.slice(0, 3);
  const vibe = intent.importantFactors || [];
  const terms = [intent.dish, intent.cuisine].filter(Boolean);
  const withEv = fin.map((c) => {
    const menu = c.p._menu ? { type: c.p.website ? "official_site" : "secondary", text: c.p._menu.join(" ") } : null;
    const rec = vibe.length && c.p._reviews ? { text: c.p._reviews.join(" ") } : null;
    const chan = (m) => (!m ? 0 : m.type === "official_site" ? 1 : 0.6);
    const ev = vibe.length ? 0.6 * chan(menu) + 0.4 * (rec ? 0.8 : 0) : chan(menu);
    const base = `${c.p.title} ${c.p.type}`;
    const dm = dishRel(`${base} ${menu?.text || ""}`, terms);
    const vm = vibe.length ? conceptual(`${base} ${rec?.text || ""}`, vibe) : null;
    return { ...c, ev, concept: vibe.length ? 0.65 * dm + 0.35 * vm : dm };
  });
  const [b2, e2, c2] = [minMax(withEv.map((c) => c.s1)), minMax(withEv.map((c) => c.ev)), minMax(withEv.map((c) => c.concept))];
  return withEv
    .map((c, i) => ({ ...c, final: 0.45 * b2[i] + 0.25 * e2[i] + 0.3 * c2[i] }))
    .sort((a, b) => b.final - a.final);
}

/* ---- side by side ---------------------------------------------------------- */
const CASES = [
  { q: "best spicy ramen near me", t: fx.FRI_7PM },
  { q: "cheap tacos", t: fx.FRI_7PM },
  { q: "quiet date night italian", t: fx.FRI_7PM },
  { q: "late night food", t: fx.SAT_1AM },
  { q: "burgers, no chains", t: fx.FRI_7PM },
  { q: "vegan burger", t: fx.FRI_7PM },
  { q: "dinner", t: fx.FRI_7PM },
];

function note(p, t) {
  const o = openStatus(p.openingHours, t);
  const bits = [`${p.rating}★ (${p.ratingCount})`, p.type];
  if (o.known && !o.open) bits.push("CLOSED NOW");
  return bits.join(", ");
}

(async () => {
  for (const { q, t } of CASES) {
    const legacy = legacyRank(q, fx.INTENTS[q] || { dish: q }, "nearby")[0];
    const v2 = await runSearchV2(
      { openai: fx.fakeOpenAI(), http: fx.fakeHttp(), serperKey: "x", exaKey: "x", cache: fx.fakeCache(), tasteMultiplier: () => 1, log: fx.quietLog },
      {
        userRequest: q, anchor: fx.ANCHOR, locationName: "Columbus, OH", radiusMode: "nearby", radiusTiers: fx.RADIUS_TIERS,
        localTime: t, allergyTerms: [], profileDietaryTerms: [], tasteProfile: null, quiz: null, roomMinCards: 3, roomWidenCeilingMiles: 60,
      }
    );
    const w = v2.ranked[0];
    console.log(`"${q}"`);
    console.log(`  old: ${legacy.p.title.padEnd(22)} ${note(legacy.p, t)}`);
    console.log(`  new: ${w.place.title.padEnd(22)} ${note(w.place, t)}${w.judge ? `  [judge ${Math.round(w.judge.fit * 10)}/10]` : ""}`);
  }
})();
