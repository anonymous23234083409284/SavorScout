/* Generates static, indexable landing pages for local food-intent searches.
 *
 * WHY THESE EXIST
 * The homepage cannot rank for "where to eat in Hicksville" because it never
 * says "Hicksville". Local food queries are won by pages that name the place,
 * and the Maps pack taking the top block does not mean the organic results
 * below it are empty — Yelp, TripAdvisor and DoorDash live there and collect
 * real traffic from exactly these searches.
 *
 * WHY THIS IS NOT A DOORWAY-PAGE FARM
 * Google penalises mass-generated pages that exist only to catch a keyword and
 * bounce you elsewhere. Two things keep these on the right side of that line:
 *
 *   1. Each page DOES something. It opens the app with the location already
 *      set, so landing on it is a working entry point rather than a stop on the
 *      way to one.
 *   2. The count is deliberately small and the copy is honest. There is no
 *      invented local knowledge — no fake "best taco spots in Levittown" list —
 *      because fabricated local detail is worse than no page at all, and it is
 *      the first thing a reader would catch us out on.
 *
 * Adding a hundred more towns would be trivial and is exactly the wrong move.
 */
const fs = require("fs");
const path = require("path");

const BUILD = path.join(__dirname, "..", "build");
const ORIGIN = "https://www.savorscout.net";

/* The market this product actually serves first. Every entry is a real place
   with a dense enough restaurant scene that a search there returns a full
   board — a landing page for somewhere the app then fails is worse than none. */
const PLACES = [
  { slug: "hicksville-ny",        name: "Hicksville",        region: "NY", q: "Hicksville NY" },
  { slug: "garden-city-ny",       name: "Garden City",       region: "NY", q: "Garden City NY" },
  { slug: "rockville-centre-ny",  name: "Rockville Centre",  region: "NY", q: "Rockville Centre NY" },
  { slug: "huntington-ny",        name: "Huntington",        region: "NY", q: "Huntington NY" },
  { slug: "farmingdale-ny",       name: "Farmingdale",       region: "NY", q: "Farmingdale NY" },
  { slug: "mineola-ny",           name: "Mineola",           region: "NY", q: "Mineola NY" },
  { slug: "massapequa-ny",        name: "Massapequa",        region: "NY", q: "Massapequa NY" },
  { slug: "great-neck-ny",        name: "Great Neck",        region: "NY", q: "Great Neck NY" },
  { slug: "long-beach-ny",        name: "Long Beach",        region: "NY", q: "Long Beach NY" },
  { slug: "levittown-ny",         name: "Levittown",         region: "NY", q: "Levittown NY" },
  { slug: "new-york-ny",          name: "New York City",     region: "NY", q: "New York NY" },
  { slug: "brooklyn-ny",          name: "Brooklyn",          region: "NY", q: "Brooklyn NY" },
];

/* Cravings people actually search alongside a place name. These become the
   internal links on each page, which is where the dish keywords come from —
   rather than generating a page per town per dish and drowning the site in
   near-identical copy. */
const CRAVINGS = [
  "tacos", "pizza", "sushi", "burgers", "ramen", "wings",
  "chinese food", "italian food", "thai food", "brunch", "bbq", "seafood",
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(shell, place) {
  const { name, region, slug, q } = place;
  const title = `Where to Eat in ${name}, ${region} — One Pick, Not a List | Savor Scout`;
  const desc =
    `Can't decide where to eat in ${name}? Savor Scout picks one restaurant in ${name}, ${region} ` +
    `based on what you're craving — and shows why it chose it. Free, no app, no signup.`;
  const url = `${ORIGIN}/eat/${slug}`;
  const appUrl = `/?near=${encodeURIComponent(q)}`;

  const cravingLinks = CRAVINGS.map(
    (c) => `<li><a href="${appUrl}&craving=${encodeURIComponent(c)}">${esc(c)} in ${esc(name)}</a></li>`
  ).join("\n        ");

  const body = `
      <h1>Where to eat in ${esc(name)}, ${esc(region)}</h1>
      <p>
        You already know ${esc(name)} has plenty of places to eat. That's the problem —
        opening Maps gives you thirty of them ranked by nothing in particular, and you're
        no closer to a decision than when you started.
      </p>
      <p>
        Savor Scout picks <strong>one</strong> restaurant in ${esc(name)} and tells you why.
        Say what you're craving, and it reads menus and reviews for that specific dish
        rather than sorting places by overall star average. It's free, it runs in the
        browser, and one search needs no account.
      </p>
      <p><a href="${appUrl}">Find somewhere to eat in ${esc(name)} →</a></p>

      <h2>Eating with a group in ${esc(name)}?</h2>
      <p>
        Group decisions stall because everyone stays polite until someone gets annoyed.
        Savor Scout's group rooms make it a 90-second vote: share a link, everyone taps yes
        on anything they'd eat, and each person gets one veto to kill an option for the
        whole group. At two options left the vetoes stop and votes decide. Nobody needs to
        install anything.
      </p>

      <h2>What are you craving in ${esc(name)}?</h2>
      <ul>
        ${cravingLinks}
      </ul>

      <h2>How it's different from Google Maps and Yelp</h2>
      <p>
        Maps and Yelp are directories: they rank everything nearby and leave the deciding
        to you. Savor Scout makes the call and shows its reasoning — the match score, what
        it beat, and the evidence behind the pick. The underlying place data comes from the
        same public sources, so the difference is the selection, not the data.
      </p>
      <p><a href="${ORIGIN}/">Savor Scout home</a></p>
  `;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: desc,
    url,
    about: { "@type": "Place", name: `${name}, ${region}` },
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
  });

  let html = shell;
  const swaps = [
    [/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`],
    [/(<meta name="description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<meta property="og:title" content=")[^"]*(")/i, `$1${esc(title)}$2`],
    [/(<meta property="og:description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<meta property="og:url" content=")[^"]*(")/i, `$1${url}$2`],
    [/(<meta name="twitter:title" content=")[^"]*(")/i, `$1${esc(title)}$2`],
    [/(<meta name="twitter:description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<link rel="canonical" href=")[^"]*(")/i, `$1${url}$2`],
  ];
  const missed = [];
  for (const [re, to] of swaps) {
    if (!re.test(html)) { missed.push(String(re)); continue; }
    html = html.replace(re, to);
  }
  if (missed.length) {
    console.error("make-location-pages: tags missing from index.html:");
    missed.forEach((m) => console.error("  " + m));
    process.exit(1);
  }

  // Replace the shared noscript block with copy about THIS town, so the page
  // is not a duplicate of the homepage with one word changed.
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, `<noscript>${body}</noscript>`);
  // Add the page-level schema alongside the app's existing blocks.
  html = html.replace("</head>", `<script type="application/ld+json">${ld}</script></head>`);
  return html;
}

const src = path.join(BUILD, "index.html");
if (!fs.existsSync(src)) {
  console.error("make-location-pages: build/index.html missing — did the build run?");
  process.exit(1);
}
const shell = fs.readFileSync(src, "utf8");

const outDir = path.join(BUILD, "eat");
fs.mkdirSync(outDir, { recursive: true });
PLACES.forEach((p) => {
  fs.writeFileSync(path.join(outDir, `${p.slug}.html`), page(shell, p));
});

/* Sitemap is regenerated rather than hand-maintained, so a place added above
   can never be left out of it. */
const urls = [
  { loc: `${ORIGIN}/`, pri: "1.0", freq: "weekly" },
  { loc: `${ORIGIN}/?quiz=1`, pri: "0.6", freq: "monthly" },
  ...PLACES.map((p) => ({ loc: `${ORIGIN}/eat/${p.slug}`, pri: "0.8", freq: "weekly" })),
];
const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
    `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  ).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(BUILD, "sitemap.xml"), sitemap);

console.log(`make-location-pages: wrote ${PLACES.length} pages + sitemap (${urls.length} urls)`);
