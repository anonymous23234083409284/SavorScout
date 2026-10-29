/* Writes scripts/research/seeds.json, the site model the keyword tool reads.
 *
 * The tool runs on your own computer (Google and Bing refuse the build
 * machine), so it reads plain JSON rather than the generators' modules. The
 * file describes what the site has, so every search the tool finds can be
 * matched to the page that should answer it:
 *
 *   campuses  every campus page, in the order worth asking about first (the
 *             Search Console focus pages, then the largest universities), with
 *             the names students type, short form first
 *   cities    every city page, largest first
 *   foods     every /food/ guide with the words that name it ("korean food",
 *             "korean"; "boba", "bubble tea")
 *   niche     the campus x cuisine pages that exist
 *   guides    the situation and diet guides, with the words that ask for them
 *
 *   node scripts/research/make-seeds.js
 */
const fs = require("fs");
const path = require("path");
const { CAMPUSES } = require("../lib/campuses");
const FOCUS = require("../data/search-focus");

const focus = new Set(FOCUS.pages
  .map(([p]) => (p.match(/^\/campus\/([^/]+)$/) || [])[1]).filter(Boolean));
/* The focus pages, then the biggest universities: Google has suggestions for
   "food near ohio state" and almost none for a small college, so these teach
   the patterns. Community colleges after universities of the same size. */
const ordered = [
  ...CAMPUSES.filter((c) => focus.has(c.s)),
  ...CAMPUSES.filter((c) => !focus.has(c.s)).sort((a, b) =>
    b.sz - a.sz || /University/.test(b.n) - /University/.test(a.n) || a.n.localeCompare(b.n)),
];

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
  /* IPEDS's alias field is split on commas, which leaves fragments like
     "University of" and "Univ of" that would match half of all searches. */
  for (const a of c.al || []) if (a.length > 3 && !/^(the |univ(ersity)?\.? |college )?(of|of the)?$|\bof( the)?$/i.test(a)) add(a);
  /* "Auburn University" is searched as "auburn", "Colorado State University
     Fort Collins" as "colorado state". Last, so the full name is the one the
     tool asks about first. */
  const full = c.name || c.n;
  const m = full.match(/^([A-Z][\w.&'-]*(?: [A-Z][\w.&'-]*)?) University\b/);
  if (m && !GENERIC.test(m[1]) && m[1] !== c.c) add(m[1], true);  // not "Boston" for BU
  /* The name without its campus: "University of Michigan" for Ann Arbor,
     "Texas A&M" for College Station. Several campuses share these, so the
     sharing rule below gives each to the largest. */
  const base = full.replace(/-[^-]+$/, "");
  if (base !== full) {
    add(base);
    const bare = base.replace(/ University$/, "");
    if (bare !== base && (/&/.test(bare) || bare.split(" ").length >= 2) && !GENERIC.test(bare)) add(bare.replace(/ & /g, "&"));
  }
  return out;
}

/* A name several campuses answer to ("Texas A&M", "University of Michigan",
   "ISU") goes to the largest of them, which is the school a search with only
   that name nearly always means. Where the largest is a tie, every one keeps
   it and the tool treats the search as ambiguous. The first name is never
   taken away: it is the one the tool asks Google about for that campus. */
function share(list) {
  const owners = new Map();
  for (const c of list) for (const n of c.names) {
    const k = n.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
    if (!owners.has(k)) owners.set(k, []);
    owners.get(k).push(c);
  }
  for (const [k, cs] of owners) {
    if (cs.length < 2) continue;
    const top = Math.max(...cs.map((c) => c.sz));
    const winners = cs.filter((c) => c.sz === top);
    if (winners.length !== 1) continue;
    for (const c of cs) {
      if (c === winners[0]) continue;
      c.names = [c.names[0], ...c.names.slice(1).filter((n) =>
        n.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim() !== k)];
    }
  }
  return list;
}

const DISHES = [
  ...require("../data/dishes"), ...require("../data/dishes-more"), ...require("../data/dishes-cuisines"),
  ...require("../data/dishes-formats"), ...require("../data/dishes-formats-2"),
];
/* Other words people use for a guide's food. Only where the guide's own name
   misses a common one; the tool also tries each name's singular. */
const EXTRA_WORDS = {
  bbq: ["bbq", "barbeque"], boba: ["bubble tea", "boba tea", "milk tea"], coffee: ["coffee shop", "coffee shops", "cafe", "cafes", "café"],
  "korean-bbq": ["kbbq"], "ice-cream": ["ice cream shop"], "fried-chicken": ["chicken tenders"], sandwiches: ["sandwich shop", "subs"],
  "halal-food": ["halal"], "mexican-food": ["taqueria"], dessert: ["desserts", "sweets"], "food-trucks": ["food truck"],
  "hot-pot": ["hotpot"], "dim-sum": ["dimsum"], pho: ["phở"],
};
const singular = (w) => (/ies$/.test(w) ? w.replace(/ies$/, "y")
  : /[^su]s$/.test(w) && w.length > 4 ? w.slice(0, -1) : w);
const foods = DISHES.map((d) => {
  const n = d.n.toLowerCase();
  const words = new Set([n, d.s.replace(/-/g, " ")]);
  if (/ food$/.test(n)) words.add(n.replace(/ food$/, ""));
  if (!n.includes(" ")) words.add(singular(n));
  for (const w of EXTRA_WORDS[d.s] || []) words.add(w);
  return { slug: d.s, words: [...words].filter((w) => w.length > 2) };
});

/* Situation guides by the words a search uses for them. The guide's slug is
   always one; these add the phrasings that are not its slug. */
const SITUATION_WORDS = {
  "late-night": ["late night", "open late", "after midnight", "24 hour", "24/7", "late night food"],
  "on-a-budget": ["cheap", "budget", "affordable", "inexpensive", "cheap eats", "broke"],
  "quick-lunch": ["quick lunch", "fast lunch"], "date-night": ["date night", "romantic"],
  "first-date": ["first date"], "big-group": ["big group", "large group", "large groups"],
  "eating-alone": ["eat alone", "eating alone", "solo dining"], "finals-week": ["finals week", "finals"],
  "somewhere-quiet": ["quiet"], "outdoor-dining": ["outdoor seating", "patio", "outdoor dining"],
  "early-morning": ["open early", "early morning"], "with-a-dog": ["dog friendly", "pet friendly"],
  "wheelchair-access": ["wheelchair accessible"], "cant-decide": ["cant decide", "can't decide"],
  "eating-healthy": ["healthy"], "friends-visiting": ["visiting parents", "parents weekend"],
  "birthday-dinner": ["birthday"], "work-team-lunch": ["team lunch"], "business-dinner": ["business dinner"],
};
const SITUATIONS = [...require("../data/situations"), ...require("../data/situations-more")];
const DIETS = [...require("../data/diets"), ...require("../data/diets-more")];
const guides = [
  ...SITUATIONS.map((s) => ({ path: `/what-to-eat/${s.s}`, words: [...new Set([s.s.replace(/-/g, " "), ...(SITUATION_WORDS[s.s] || [])])] })),
  ...DIETS.map((d) => {
    const w = new Set([d.s.replace(/-/g, " "), d.n.toLowerCase(), d.n.toLowerCase().replace(/-/g, " ")]);
    if (d.s === "keto-and-low-carb") ["keto", "low carb"].forEach((x) => w.add(x));
    if (d.s === "peanut-and-tree-nut-allergy") ["nut allergy", "peanut allergy", "nut free"].forEach((x) => w.add(x));
    return { path: `/diet/${d.s}`, words: [...w] };
  }),
];

const CITIES = require("../data/us-cities.json");
const STATES = require("../data/states");
const NICHE = require("../data/campus-cuisine.json").pages.map((p) => `${p.campus}/${p.food}`);

const out = {
  made: new Date().toISOString().slice(0, 10),
  site: "https://www.savorscout.net",
  campuses: share(ordered.map((c) => ({ slug: c.s, city: c.c, state: c.r, sz: c.sz, names: names(c) }))),
  cities: [...CITIES].sort((a, b) => b.p - a.p).map((c) => ({ slug: c.s, name: c.c, state: c.r, pop: c.p })),
  foods,
  niche: NICHE,
  guides,
  states: STATES,
};
const file = path.join(__dirname, "seeds.json");
fs.writeFileSync(file, JSON.stringify(out) + "\n");
console.log(`${out.campuses.length} campuses, ${out.cities.length} cities, ${foods.length} foods, ` +
  `${NICHE.length} campus x cuisine pages, ${guides.length} guides → ${path.relative(process.cwd(), file)}`);
