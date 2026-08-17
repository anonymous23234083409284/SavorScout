/* Builds build/room.html — the page Vercel serves for /r/<CODE>.
 *
 * Why this exists: iMessage, WhatsApp and Slack fetch a link's HTML and read
 * the og: tags WITHOUT running JavaScript. React can set document.title all it
 * likes; the scraper has already left. So a room link can only get its own
 * preview card if a different HTML file is served for that path.
 *
 * It is generated from the real index.html rather than hand-written, because
 * index.html references bundle filenames with content hashes that change every
 * build. Copy-and-swap keeps the room page loading the exact same app.
 *
 * The card is per-PATH, not per-room: every /r/... link gets the invite card.
 * Naming the actual restaurants would need the scraper to hit a live server,
 * which free-tier cold starts would routinely lose.
 */
const fs = require("fs");
const path = require("path");

const BUILD = path.join(__dirname, "..", "build");
const src = path.join(BUILD, "index.html");
const dest = path.join(BUILD, "room.html");

if (!fs.existsSync(src)) {
  console.error("make-room-html: build/index.html missing — did the build run?");
  process.exit(1);
}

let html = fs.readFileSync(src, "utf8");

const TITLE = "Vote on where we're eating — Savor Scout";
const DESC =
  "Someone started a Dinner Roulette round. Tap to join, vote in 90 seconds, " +
  "and settle it. No app, no signup.";
const IMG = "https://www.savorscout.net/og-room.jpg";

/* Replace by attribute rather than by whole-tag string, so this keeps working
   if the minifier reorders or requotes attributes. */
const swaps = [
  [/<title>[^<]*<\/title>/i, `<title>${TITLE}</title>`],
  [/(<meta property="og:title" content=")[^"]*(")/i, `$1${TITLE}$2`],
  [/(<meta property="og:description" content=")[^"]*(")/i, `$1${DESC}$2`],
  [/(<meta property="og:image" content=")[^"]*(")/i, `$1${IMG}$2`],
  [/(<meta property="og:image:secure_url" content=")[^"]*(")/i, `$1${IMG}$2`],
  [/(<meta property="og:image:alt" content=")[^"]*(")/i, `$1Join the vote$2`],
  [/(<meta name="twitter:title" content=")[^"]*(")/i, `$1${TITLE}$2`],
  [/(<meta name="twitter:description" content=")[^"]*(")/i, `$1${DESC}$2`],
  [/(<meta name="twitter:image" content=")[^"]*(")/i, `$1${IMG}$2`],
  [/(<meta name="description" content=")[^"]*(")/i, `$1${DESC}$2`],
  /* A room is a private, ephemeral URL. Letting it into the index would put
     thousands of dead 404-ish pages in front of the one page that matters. */
  [/<link rel="canonical"[^>]*>/i, '<meta name="robots" content="noindex" />'],
];

let missed = [];
for (const [re, to] of swaps) {
  if (!re.test(html)) { missed.push(String(re)); continue; }
  html = html.replace(re, to);
}

if (missed.length) {
  console.error("make-room-html: these tags were not found in index.html:");
  missed.forEach((m) => console.error("  " + m));
  // Fail the build. A silently un-swapped room.html would ship the homepage
  // pitch as the invite card and nobody would notice until it was live.
  process.exit(1);
}

fs.writeFileSync(dest, html);
console.log(`make-room-html: wrote build/room.html (${html.length} bytes)`);
