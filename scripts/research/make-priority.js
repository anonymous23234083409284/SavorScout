/* Writes scripts/data/priority-pages.json: the 500 pages most worth working on.
 *
 *   node scripts/research/make-priority.js [count]     (default 500)
 *
 * WHICH PAGES, AND WHY THESE
 * The pages Google already shows. A page with impressions is indexed and is
 * being tried against real searches, so improving it pays off within weeks;
 * a page Google has never shown has a different problem (getting indexed) that
 * better copy does not solve. So the list is every page with Search Console
 * impressions, most impressions first, then clicks.
 *
 * The evidence, freshest first:
 *   scripts/data/search-terms.json  the keyword tool's Search Console export,
 *                                   when there is one (page totals, 16 months)
 *   scripts/data/search-focus.js    the 49 pages read on 18 October
 *   scripts/data/search-pages.js    every page with impressions, 7 October
 *
 * Many pages have the same small count (256 had one impression on 7 October),
 * so ties go to the page with more demand behind it, by official figures: a
 * campus's IPEDS size bracket, a city's Census population. Campuses rank above
 * cities of similar weight because campus searches are where the site's
 * clicks have come from.
 *
 * The generators read the list: priority campus and city pages get titles
 * built from their own numbers, the campus hub links the top of it, and the
 * keyword tool inspects these pages' index status first.
 */
const fs = require("fs");
const path = require("path");
const { CAMPUSES } = require("../lib/campuses");
const CITIES = require("../data/us-cities.json");
const FOCUS = require("../data/search-focus");
const SNAPSHOT = require("../data/search-pages");

const COUNT = Number(process.argv[2]) || 500;
const TERMS = path.join(__dirname, "..", "data", "search-terms.json");
const OUT = path.join(__dirname, "..", "data", "priority-pages.json");
const BUILD = path.join(__dirname, "..", "..", "build");

const campus = new Map(CAMPUSES.map((c) => [`/campus/${c.s}`, c]));
const city = new Map(CITIES.map((c) => [`/eat/${c.s}`, c]));

/* A page exists if the last build wrote it; without a build, if its data does. */
function exists(p) {
  if (fs.existsSync(BUILD)) {
    const rel = p === "/" ? "index.html" : p.endsWith("/") ? `${p.slice(1)}index.html` : `${p.slice(1)}.html`;
    return fs.existsSync(path.join(BUILD, rel));
  }
  return campus.has(p) || city.has(p) || /^\/(food|diet|what-to-eat|type|about|campus|eat)\b/.test(p) || p === "/";
}

const kind = (p) => (p === "/" ? "home" : campus.has(p) ? "campus" : city.has(p) ? "city"
  : /^\/campus\/[^/]+\/[^/]+$/.test(p) ? "campus-food" : p === "/campus/" ? "campus-hub" : p === "/eat/" ? "city-hub"
  : /^\/campus\/[a-z]{2}$/.test(p) ? "campus-state" : /^\/eat\/[a-z]{2}$/.test(p) ? "city-state" : p.split("/")[1]);

/* Demand behind a page, for breaking ties only. */
function weight(p) {
  const c = campus.get(p);
  if (c) return c.sz * 10;
  const t = city.get(p);
  if (t) return t.p >= 250000 ? 45 : t.p >= 100000 ? 35 : 25;
  return 30;
}

const ev = new Map();
const note = (p, impr, clicks, pos, src) => {
  const e = ev.get(p) || { impr: 0, clicks: 0, pos: null, src: [] };
  if (impr > e.impr) { e.impr = impr; e.pos = pos != null ? pos : e.pos; }
  e.clicks = Math.max(e.clicks, clicks || 0);
  if (pos != null && e.pos == null) e.pos = pos;
  e.src.push(src);
  ev.set(p, e);
};
for (const [p, clicks, impr] of SNAPSHOT.pages) note(p, impr, clicks, null, `gsc ${SNAPSHOT.asOf}`);
for (const [p, impr, pos] of FOCUS.pages) note(p, impr, 0, pos, `gsc ${FOCUS.asOf}`);
let fresh = null;
if (fs.existsSync(TERMS)) {
  const t = JSON.parse(fs.readFileSync(TERMS, "utf8"));
  fresh = t.window;
  for (const [p, [impr, clicks, pos]] of Object.entries(t.totals || {})) note(p, impr, clicks, pos, `gsc ${t.window}`);
}

const ranked = [...ev.entries()]
  .filter(([p, e]) => e.impr > 0 && exists(p))
  .sort((a, b) => b[1].impr - a[1].impr || b[1].clicks - a[1].clicks || weight(b[0]) - weight(a[0]) || a[0].localeCompare(b[0]))
  .slice(0, COUNT);

const out = {
  made: new Date().toISOString().slice(0, 10),
  evidence: [`search-pages.js (${SNAPSHOT.asOf})`, `search-focus.js (${FOCUS.asOf})`, ...(fresh ? [`search-terms.json (${fresh})`] : [])],
  pages: ranked.map(([p, e]) => ({ url: p, kind: kind(p), impr: e.impr, clicks: e.clicks, ...(e.pos != null ? { pos: e.pos } : {}) })),
};
fs.writeFileSync(OUT, "{\n" +
  ` "made": ${JSON.stringify(out.made)},\n "evidence": ${JSON.stringify(out.evidence)},\n "pages": [\n` +
  out.pages.map((x) => `  ${JSON.stringify(x)}`).join(",\n") + "\n ]\n}\n");
const kinds = out.pages.reduce((m, x) => ((m[x.kind] = (m[x.kind] || 0) + 1), m), {});
console.log(`${out.pages.length} priority pages → ${path.relative(process.cwd(), OUT)}`, kinds);
