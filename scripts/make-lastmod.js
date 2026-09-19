/* Keeps an honest <lastmod> date per URL.
 *
 * Run with:  node scripts/make-lastmod.js     (after a build, before committing)
 * Writes scripts/data/lastmod.json, which is committed and read by
 * make-sitemap.js at build time.
 *
 * WHY THIS EXISTS
 * The sitemap was stamping every URL with the build date. 1,856 pages, one
 * lastmod value, changing on every deploy — a site announcing that all of its
 * content changed today, every day.
 *
 * Google's documented behaviour is to use lastmod when a site's dates are
 * consistently accurate and to ignore the field entirely when they are not. So
 * the old behaviour did not just fail to help, it actively burned the one
 * signal available for telling Google which pages are worth re-crawling. With
 * 306 URLs sitting in "Discovered — currently not indexed", that signal is
 * exactly what is needed.
 *
 * HOW IT DECIDES
 * It hashes the <main class="ss-static"> block only — the written content —
 * and not the surrounding shell. The shell carries the JS bundle filename,
 * which changes on every build even when nothing was written, and hashing it
 * would reproduce the original problem with extra steps.
 *
 * A page whose content is unchanged keeps its previous date. A new or edited
 * page gets today. That is the whole mechanism.
 *
 * WHY IT IS NOT IN THE BUILD
 * Vercel builds are ephemeral: a build cannot commit an updated hash file back
 * to the repository. So this runs locally, its output is committed alongside
 * the content change that caused it, and the build only reads.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUILD = path.join(__dirname, "..", "build");
const STORE = path.join(__dirname, "data", "lastmod.json");
const ORIGIN = "https://www.savorscout.net";

if (!fs.existsSync(BUILD)) {
  console.error("make-lastmod: build/ missing — run npm run build first");
  process.exit(1);
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "static" || e.name === ".sitemap") continue;
      out = out.concat(walk(p));
    } else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/* Build path -> the URL the sitemap will use, so the two files agree. */
function urlFor(file) {
  let rel = path.relative(BUILD, file).split(path.sep).join("/").replace(/\.html$/, "");
  if (rel === "index") return `${ORIGIN}/`;
  if (rel.endsWith("/index")) return `${ORIGIN}/${rel.slice(0, -6)}/`;
  return `${ORIGIN}/${rel}`;
}

const prev = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8")) : {};
const today = new Date().toISOString().slice(0, 10);
const next = {};
let changed = 0, added = 0, kept = 0;

for (const file of walk(BUILD)) {
  if (path.basename(file) === "room.html") continue;   // noindex, never in the sitemap
  const html = fs.readFileSync(file, "utf8");
  const i = html.indexOf('<main class="ss-static">');
  const j = html.indexOf("</main>");
  /* The homepage has no static block; hash its <title> and description so a
     genuine change to it still registers, without the bundle filename. */
  const content = i >= 0 && j > i ? html.slice(i, j)
    : (html.match(/<title>[\s\S]*?<\/title>/) || [""])[0] +
      (html.match(/<meta name="description"[^>]*>/) || [""])[0];

  const hash = crypto.createHash("sha1").update(content).digest("hex");
  const url = urlFor(file);
  const before = prev[url];

  if (!before) { next[url] = { h: hash, d: today }; added++; }
  else if (before.h !== hash) { next[url] = { h: hash, d: today }; changed++; }
  else { next[url] = before; kept++; }
}

const gone = Object.keys(prev).filter((u) => !(u in next));

fs.writeFileSync(STORE, JSON.stringify(next, null, 0) + "\n");

console.log(`make-lastmod: ${Object.keys(next).length} urls`);
console.log(`  new:       ${added}`);
console.log(`  changed:   ${changed}`);
console.log(`  unchanged: ${kept}  (keeping their previous lastmod)`);
if (gone.length) console.log(`  removed:   ${gone.length}`);
const dates = new Set(Object.values(next).map((v) => v.d));
console.log(`  distinct lastmod dates now: ${dates.size}`);
