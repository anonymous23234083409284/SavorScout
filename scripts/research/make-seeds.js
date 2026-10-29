/* Writes scripts/research/seeds.json, the input to mine-keywords.py.
 *
 * The miner runs on your own computer (Google refuses the build machine), so
 * it reads plain JSON rather than the generators' modules. This picks the
 * campuses worth asking Google about first: the Search Console focus pages,
 * then the largest campuses. For each it lists the names students type, short
 * form first ("Cal State LA" before "California State University-Los Angeles"),
 * and the food words the pages use, so the miner can turn "late night food near
 * ucla" into the pattern "late night food near {campus}".
 *
 *   node scripts/research/make-seeds.js [count]     (default 60 campuses)
 */
const fs = require("fs");
const path = require("path");
const { CAMPUSES } = require("../lib/campuses");
const FOCUS = require("../data/search-focus");

const COUNT = Number(process.argv[2]) || 60;

const focus = new Set(FOCUS.pages
  .map(([p]) => (p.match(/^\/campus\/([^/]+)$/) || [])[1]).filter(Boolean));
const ordered = [
  ...CAMPUSES.filter((c) => focus.has(c.s)),
  /* Then the biggest universities: Google has suggestions for "food near
     ohio state" and almost none for a small college, so these teach the
     patterns. Community colleges after universities of the same size. */
  ...CAMPUSES.filter((c) => !focus.has(c.s)).sort((a, b) =>
    b.sz - a.sz || /University/.test(b.n) - /University/.test(a.n) || a.n.localeCompare(b.n)),
].slice(0, COUNT);

const GENERIC = /^(California State|State|City|Central|Western|Eastern|Northern|Southern|National|American|Christian|Southwestern|Northwestern)$/;

/* "Weber State (WSU)" → "Weber State" and "WSU"; "University of X-Main Campus" → "University of X". */
function names(c) {
  const out = [];
  const add = (s, word = false) => {
    s = (s || "").replace(/\s+/g, " ").trim();
    /* A lone ordinary word ("City" for City College) matches far too much. */
    if (!word && /^[A-Z][a-z]+$/.test(s)) return;
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  };
  if (c.a) add(c.a);
  for (const t of [c.t, c.name, c.n]) {
    if (!t) continue;
    const m = t.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (m) { add(m[1]); add(m[2]); } else add(t.replace(/-Main Campus$/, "").replace(/-/g, " "));
  }
  for (const a of c.al || []) if (a.length > 3) add(a);  // "WSU" alone is ambiguous
  /* "Auburn University" is searched as "auburn", "Colorado State University
     Fort Collins" as "colorado state". Last, so the full name is the one the
     miner asks Google about first. */
  const m = (c.name || c.n).match(/^([A-Z][\w.&'-]*(?: [A-Z][\w.&'-]*)?) University\b/);
  if (m && !GENERIC.test(m[1]) && m[1] !== c.c) add(m[1], true);  // not "Boston" for BU
  return out;
}

/* Words the miner turns into {food}. Meal words stay as they are: "breakfast
   near {campus}" is a pattern worth seeing on its own. */
const MEALS = new Set(["food", "restaurants", "breakfast", "brunch", "lunch", "dinner"]);
const foods = new Set();
for (const p of require("../data/campus-cuisine.json").pages) foods.add(p.food.replace(/-/g, " "));
["coffee", "pizza", "tacos", "sushi", "ramen", "pho", "boba", "bubble tea",
 "chinese", "thai", "indian", "mexican", "korean", "vietnamese", "japanese", "italian", "mediterranean",
 "halal", "vegan", "vegetarian", "gluten free", "dessert",
 "wings", "burgers", "bbq", "seafood", "bagels", "donuts", "ice cream", "bakery", "deli", "sandwiches"]
  .forEach((f) => foods.add(f));
for (const m of MEALS) foods.delete(m);

const out = {
  made: new Date().toISOString().slice(0, 10),
  campuses: ordered.map((c) => ({ slug: c.s, city: c.c, state: c.r, names: names(c) })),
  foods: [...foods].sort((a, b) => b.length - a.length),
};
const file = path.join(__dirname, "seeds.json");
fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.campuses.length} campuses, ${out.foods.length} food words → ${path.relative(process.cwd(), file)}`);
