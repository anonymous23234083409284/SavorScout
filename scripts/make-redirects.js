/* Writes the 301 redirects for the ~950 city pages that no longer exist, into
 * vercel.json.
 *
 * Run with:  node scripts/make-redirects.js
 * Not part of the build — vercel.json is committed config, not build output, so
 * this regenerates it only when the metro list changes.
 *
 * WHY REDIRECT RATHER THAN DELETE
 * Those URLs are live and Google has them in a sitemap it has already read.
 * Deleting the files leaves 950 URLs that resolve to the SPA catch-all and
 * return 200 with the homepage — a soft 404, which is the single worst outcome:
 * Google keeps crawling them, finds nothing, and forms a view about the site.
 * A 301 to the nearest surviving metro passes on whatever those pages earned,
 * and sends somebody searching for a small city to the nearest page that can
 * actually help them.
 *
 * WHY NEAREST-METRO AND NOT ALL TO /eat/
 * A redirect to a hub is a worse answer than a redirect to Cleveland for
 * somebody who searched for Elyria, and Google treats mass redirects to one
 * generic page as soft 404s anyway. Nearest is computed from real coordinates.
 *
 * SIZE: Vercel allows 1,024 redirects in vercel.json. This generates roughly
 * 950 plus the handful of hand-written ones, so the file is near that ceiling
 * by design — if the metro list ever grows past ~70 the surplus shrinks, and if
 * a future dataset adds cities this will fail loudly rather than silently drop
 * entries.
 */
const fs = require("fs");
const path = require("path");

const METROS = require("./data/metros");
const ALL = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));
const VERCEL = path.join(__dirname, "..", "vercel.json");
const LIMIT = 1024;

const keep = new Set(METROS.map((m) => m.s));
const survivors = METROS.map((m) => ALL.find((c) => c.s === m.s));
const removed = ALL.filter((c) => !keep.has(c.s));

function nearestMetro(city) {
  const cos = Math.cos((city.lat * Math.PI) / 180);
  let best = null;
  for (const o of survivors) {
    const dx = (o.lng - city.lng) * cos;
    const dy = o.lat - city.lat;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) best = { o, d2 };
  }
  return best.o;
}

const generated = removed.map((c) => ({
  source: `/eat/${c.s}`,
  destination: `/eat/${nearestMetro(c).s}`,
  permanent: true,
}));

/* The state hubs are gone too — /eat/ny and friends existed only to break up a
   1,000-link index. Two-letter codes cannot collide with a metro slug, so these
   can be redirected wholesale to the index. */
const stateCodes = [...new Set(ALL.map((c) => c.r))].sort();
const stateRedirects = stateCodes.map((st) => ({
  source: `/eat/${st.toLowerCase()}`,
  destination: `/eat/`,
  permanent: true,
}));

const config = JSON.parse(fs.readFileSync(VERCEL, "utf8"));

/* Hand-written redirects are the trailing-slash rules; keep them and drop any
   previously generated /eat/<slug> entries so this is idempotent. */
const handWritten = config.redirects.filter((r) => r.source.includes(":slug"));
const all = [...handWritten, ...generated, ...stateRedirects];

if (all.length > LIMIT) {
  console.error(`make-redirects: ${all.length} redirects exceeds Vercel's limit of ${LIMIT}.`);
  console.error("  Redirect the long tail to /eat/ in groups, or move this to middleware.");
  process.exit(1);
}

config.redirects = all;
fs.writeFileSync(VERCEL, JSON.stringify(config, null, 2) + "\n");

const bytes = fs.statSync(VERCEL).size;
console.log(`make-redirects: ${generated.length} city + ${stateRedirects.length} state redirects ` +
            `(${all.length}/${LIMIT}), vercel.json ${(bytes / 1024).toFixed(1)}kB`);

/* A quick sanity read: no redirect may point at a URL that is itself redirected,
   which would be a chain Google follows reluctantly or not at all. */
const sources = new Set(all.map((r) => r.source));
const chained = all.filter((r) => sources.has(r.destination));
if (chained.length) {
  console.error(`make-redirects: ${chained.length} redirect chains, e.g. ${chained[0].source} -> ${chained[0].destination}`);
  process.exit(1);
}
console.log("make-redirects: no redirect chains");
