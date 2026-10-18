/* Assembles sitemap.xml from the manifests every generator drops in
 * build/.sitemap, then removes the directory so it never ships.
 *
 * This replaces an arrangement where make-location-pages.js wrote the sitemap
 * and make-type-pages.js appended to it by string-replacing </urlset>. That
 * worked, in the sense that it produced a correct file while exactly two
 * generators existed and ran in exactly that order. With four of them it is a
 * silent-data-loss bug waiting for someone to reorder a line in package.json.
 *
 * Runs last. If a generator did not write a manifest, its URLs are missing from
 * the sitemap and that is a loud failure here rather than a quiet one in Search
 * Console three weeks later.
 */
const fs = require("fs");
const path = require("path");
const { BUILD, ORIGIN, MANIFEST_DIR } = require("./lib/page");

const EXPECTED = ["cities", "types", "guides", "campus", "about"];

if (!fs.existsSync(MANIFEST_DIR)) {
  console.error("make-sitemap: build/.sitemap missing — no generator ran?");
  process.exit(1);
}

const found = fs.readdirSync(MANIFEST_DIR).filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));
const missing = EXPECTED.filter((e) => !found.includes(e));
if (missing.length) {
  console.error(`make-sitemap: no manifest from: ${missing.join(", ")}`);
  console.error("  Every generator must call emit() before this runs.");
  process.exit(1);
}

/* Per-URL lastmod, from scripts/make-lastmod.js. Committed, not generated at
   build time — see the comment at the top of that file for why.

   Falling back to the build date for an unknown URL is deliberate: a page that
   has just been added genuinely did change today, and a missing entry means
   make-lastmod has not been run since it was created. */
const LASTMOD = (() => {
  const p = path.join(__dirname, "data", "lastmod.json");
  if (!fs.existsSync(p)) {
    console.warn("make-sitemap: no lastmod.json — every URL will carry the build date.");
    console.warn("  Run `node scripts/make-lastmod.js` after a build and commit the result.");
    return {};
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
})();

const today = new Date().toISOString().slice(0, 10);
const lastmodFor = (loc) => (LASTMOD[loc] && LASTMOD[loc].d) || today;

/* The homepage is the only URL not owned by a generator, so it is added here.
   Note what is NOT here: /?quiz=1. It is the homepage with a query string, so
   it serves the homepage and declares the homepage as its canonical — asking
   Google to index something we have already told it not to. If the quiz ever
   deserves to rank it needs a real page. */
const urls = [{ loc: `${ORIGIN}/`, pri: "1.0", freq: "weekly" }];

for (const name of found) {
  const rows = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, `${name}.json`), "utf8"));
  urls.push(...rows);
}

const seen = new Set();
const dupes = [];
for (const u of urls) {
  if (seen.has(u.loc)) dupes.push(u.loc);
  seen.add(u.loc);
}
if (dupes.length) {
  console.error(`make-sitemap: duplicate URLs across manifests: ${dupes.slice(0, 5).join(", ")}`);
  process.exit(1);
}

/* One sitemap per kind of page, under a sitemap index at /sitemap.xml.
   Search Console reports indexing per submitted sitemap, so splitting them is
   what makes "how many campus pages are indexed" a number you can read rather
   than something buried in 2,400 mixed URLs. robots.txt and the sitemap
   already submitted in Search Console both point at /sitemap.xml, which is now
   the index, so nothing has to be resubmitted. */
const GROUPS = { cities: "cities", campus: "campuses", guides: "guides", types: "pages", about: "pages" };
const byFile = new Map([["pages", [urls[0]]]]);
for (const name of found) {
  const file = GROUPS[name] || name;
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(...JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, `${name}.json`), "utf8")));
}
const urlset = (rows) => `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  rows.map((u) =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmodFor(u.loc)}</lastmod>\n` +
    `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  ).join("\n") + `\n</urlset>\n`;
const index = [];
for (const [file, rows] of byFile) {
  /* 50,000 URLs is the per-file limit in the sitemap spec. */
  if (rows.length > 50000) {
    console.error(`make-sitemap: sitemap-${file}.xml has ${rows.length} URLs, over the 50,000 limit.`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(BUILD, `sitemap-${file}.xml`), urlset(rows));
  index.push({ loc: `${ORIGIN}/sitemap-${file}.xml`, lastmod: rows.map((u) => lastmodFor(u.loc)).sort().pop() });
}
fs.writeFileSync(path.join(BUILD, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  index.map((i) => `  <sitemap>\n    <loc>${i.loc}</loc>\n    <lastmod>${i.lastmod}</lastmod>\n  </sitemap>`).join("\n") +
  `\n</sitemapindex>\n`);
fs.rmSync(MANIFEST_DIR, { recursive: true, force: true });
console.log(`make-sitemap: ${urls.length} urls in ${index.length} sitemaps (${[...byFile].map(([f, r]) => `${f} ${r.length}`).join(", ")}) under sitemap.xml`);
