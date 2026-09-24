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

/* `--touch /food/` marks every URL under a prefix as changed today, for the
   rare edit this script cannot see for itself. Kept for that, and needed once:
   see the v1 migration note below. */
/* Takes a section name: `--touch food`. A leading slash is tolerated but
   stripped, and only the last path segment is kept, because Git Bash on Windows
   rewrites any argument beginning with "/" into a Windows path before Node sees
   it — "/food/" arrives as "C:/Program Files/Git/food/". That silently matched
   nothing the first time this was used, which is why an unmatched --touch is
   now an error rather than a no-op. */
const TOUCH = process.argv
  .flatMap((a, i, all) => a === "--touch" && all[i + 1] ? [all[i + 1]] : [])
  .map((p) => p.replace(/\\/g, "/").split("/").filter(Boolean).pop())
  .filter(Boolean);
const touchHits = Object.fromEntries(TOUCH.map((p) => [p, 0]));
const touched = (url) => {
  const hit = TOUCH.find((p) => url.startsWith(`${ORIGIN}/${p}/`));
  if (hit) touchHits[hit]++;
  return !!hit;
};

/* What counts as the page, for deciding whether it changed.

   v1 hashed only the <main> body. That missed a retitle — the 68 food pages
   were renamed on 24 September to match the queries people type, and a new
   <title> is precisely what Google should re-crawl for, yet v1 saw nothing.

   v2 hashes the <title>, the meta description and the <main> body: everything a
   reader or a results page shows, and nothing that changes on every build (the
   bundle filename lives in <script> tags, which are excluded). */
const V = 2;
const pick = (html, re) => (html.match(re) || [""])[0];
const bodyOf = (html) => {
  const i = html.indexOf('<main class="ss-static">');
  const j = html.indexOf("</main>");
  return i >= 0 && j > i ? html.slice(i, j) : "";
};
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");

for (const file of walk(BUILD)) {
  if (path.basename(file) === "room.html") continue;   // noindex, never in the sitemap
  const html = fs.readFileSync(file, "utf8");
  const body = bodyOf(html);
  const head = pick(html, /<title>[\s\S]*?<\/title>/) + pick(html, /<meta name="description"[^>]*>/);

  const hash = sha(head + body);
  const url = urlFor(file);
  const before = prev[url];

  if (!before) { next[url] = { v: V, h: hash, d: today }; added++; continue; }

  let isChanged;
  if (before.v === V) {
    isChanged = before.h !== hash;
  } else {
    /* One-time move from v1. A v1 hash is of a different thing, so comparing it
       to a v2 hash would report every page on the site as changed today — the
       exact failure this script exists to prevent. Instead: recompute the v1
       hash to see whether the body changed, and trust --touch for the prefixes
       whose <title> changed in the same deploy. */
    const v1 = sha(body || head);
    isChanged = before.h !== v1;
  }
  if (touched(url)) isChanged = true;

  if (isChanged) { next[url] = { v: V, h: hash, d: today }; changed++; }
  else { next[url] = { v: V, h: hash, d: before.d }; kept++; }
}

const dead = Object.entries(touchHits).filter(([, n]) => n === 0).map(([p]) => p);
if (dead.length) {
  console.error(`make-lastmod: --touch matched no URLs for: ${dead.join(", ")}`);
  console.error(`  Use a bare section name, e.g. --touch food. Nothing was written.`);
  process.exit(1);
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
