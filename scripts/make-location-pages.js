/* Generates one indexable landing page per US city, plus a browsable index
 * and the sitemap.
 *
 * WHY THESE EXIST
 * The homepage cannot rank for "where to eat in Toledo" because it never says
 * Toledo. Local food queries are won by pages that name the place. The Maps
 * pack taking the top block does not empty the organic results beneath it —
 * Yelp, TripAdvisor and DoorDash live there and take real traffic from exactly
 * those searches.
 *
 * WHAT KEEPS 1,000 PAGES FROM BEING A DOORWAY FARM
 * The risk with a generator like this was never the page COUNT. It is 1,000
 * pages that are the same page. Google's helpful-content assessment is
 * sitewide, so a large block of interchangeable pages can drag down the
 * homepage — which would mean trading the one asset that ranks for pages that
 * never did. Four things make each page genuinely its own:
 *
 *   1. Real data per city. Population and coordinates come from a dataset, so
 *      every page states facts that are true and different.
 *   2. A real internal link graph. Nearest cities are computed from actual
 *      coordinates, so pages link to their genuine neighbours instead of 1,000
 *      orphans all pointing at the homepage — itself a doorway signal.
 *   3. Copy that varies with the place. A metro of four million and a city of
 *      forty thousand get different text, chosen from the population figure
 *      rather than randomised, so it is accurate rather than merely varied.
 *   4. The page DOES something. ?near= and ?craving= open the app with the
 *      location already resolved, so landing here is a working entry point and
 *      not a stop on the way to one.
 *
 * NOTHING IS INVENTED. No fabricated "best tacos in Akron" lists, no made-up
 * neighbourhoods. Every claim is either from the dataset or about the product.
 * Invented local detail is the first thing a real local catches you on.
 */
const fs = require("fs");
const path = require("path");

const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
} = require("./lib/page");

const WHO = "make-location-pages";
const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));

/* Each craving now has a real page behind it at /food/<slug>. They used to link
   to `/?near=…&craving=…`, which is the homepage with a query string — a URL
   that declares the homepage as its canonical, so a thousand pages were
   spending their internal links on something that could never rank. The slug is
   the destination; the label is what a person searching would actually type. */
const CRAVINGS = [
  ["tacos", "tacos"], ["pizza", "pizza"], ["sushi", "sushi"], ["burgers", "burgers"],
  ["ramen", "ramen"], ["wings", "wings"], ["chinese-food", "chinese food"],
  ["italian-food", "italian food"], ["thai-food", "thai food"], ["mexican-food", "mexican food"],
  ["bbq", "barbecue"], ["seafood", "seafood"], ["brunch", "brunch"],
  ["indian-food", "indian food"], ["sandwiches", "sandwiches"], ["noodles", "noodles"],
];

const fmt = (n) => n.toLocaleString("en-US");
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const HUB = { name: "Cities", url: `${ORIGIN}/eat/` };

/* Nearest neighbours by great-circle distance. Equirectangular is plenty here:
   we only need a correct ORDER over a few hundred miles, not a precise figure,
   and it is fast enough to run a thousand times against a thousand rows. */
function nearest(city, k = 6) {
  const latR = (city.lat * Math.PI) / 180;
  const cos = Math.cos(latR);
  const out = [];
  for (const o of CITIES) {
    if (o.s === city.s) continue;
    const dx = (o.lng - city.lng) * cos;
    const dy = o.lat - city.lat;
    out.push({ o, d2: dx * dx + dy * dy });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out.slice(0, k).map((x) => ({
    ...x.o,
    miles: Math.round(Math.sqrt(x.d2) * 69),
  }));
}

/* Copy chosen by population, so the description is accurate rather than just
   different. A city of 40,000 genuinely does have a different problem from
   one of 4 million: too few obvious options versus far too many. */
function sizeCopy(city) {
  const p = city.p;
  if (p >= 1000000) return {
    tier: "metro",
    problem: `${city.c} has more restaurants than anyone could work through, which is exactly why picking one is so hard. Every list you open is longer than the last.`,
    angle: `In a city this size the problem is never a lack of options — it is that thirty good ones look identical on a map.`,
  };
  if (p >= 250000) return {
    tier: "large",
    problem: `${city.c} has plenty of places to eat, and that is the problem. A ranked list of thirty gets you no closer to a decision than you were before you opened it.`,
    angle: `Enough choice to argue about for twenty minutes, which is usually what happens.`,
  };
  if (p >= 100000) return {
    tier: "mid",
    problem: `${city.c} has more than enough places to eat — the trouble is choosing between them without spending longer deciding than eating.`,
    angle: `A city this size has real range, and range is what makes the decision slow.`,
  };
  return {
    tier: "small",
    problem: `${city.c} does not have infinite options, and that brings its own problem: you have been to most of them, and picking again is somehow still hard.`,
    angle: `Somewhere this size rewards knowing which places are actually worth the trip.`,
  };
}

function page(shell, city) {
  const { c: name, r: region, s: slug, p: pop } = city;
  const place = `${name}, ${region}`;
  const near = nearest(city);
  const copy = sizeCopy(city);

  const title = fitTitle([
    `Where to Eat in ${place} — One Pick, Not a List | Savor Scout`,
    `Where to Eat in ${place} — One Pick, Not a List`,
    `Where to Eat in ${place} | Savor Scout`,
    `Where to Eat in ${place}`,
  ]);
  const desc = `Can't decide where to eat in ${name}? Savor Scout picks one restaurant in ${place} ` +
    `based on what you're craving and shows why it chose it. Free, no app, no signup.`;
  const url = `${ORIGIN}/eat/${slug}`;
  const app = `/?near=${encodeURIComponent(place)}`;

  const trail = [HOME, HUB, { name: place, url }];

  const cravingLinks = CRAVINGS
    .map(([slug, label]) =>
      `<li><a href="${app}&craving=${encodeURIComponent(label)}">${esc(label)} in ${esc(name)}</a>` +
      ` &middot; <a href="/food/${slug}">how to find good ${esc(label)}</a></li>`)
    .join("\n        ");
  const nearLinks = near
    .map((n) => `<li><a href="/eat/${n.s}">${esc(n.c)}, ${esc(n.r)}</a> — about ${n.miles} miles away</li>`)
    .join("\n        ");

  const body = `      ${crumbHtml(trail)}
      <h1>Where to eat in ${esc(place)}</h1>
      <p class="lede">${esc(copy.problem)}</p>
      <p>
        Savor Scout picks <strong>one</strong> restaurant in ${esc(name)} and tells you why it
        picked it. Say what you're craving and it reads menus and reviews for that specific
        dish, rather than sorting places by overall star rating. Free, runs in the browser,
        and one search needs no account.
      </p>
      <p><a class="cta" href="${app}">Find somewhere to eat in ${esc(name)} &rarr;</a></p>

      <h2>Eating out in ${esc(name)}</h2>
      <p>
        ${esc(name)} has a population of about ${fmt(pop)}. ${esc(copy.angle)}
        Savor Scout searches up to 35 miles around ${esc(name)}, so places just outside the
        city are still on the table when they are worth the drive.
      </p>

      <h2>What are you craving in ${esc(name)}?</h2>
      <ul>
        ${cravingLinks}
      </ul>

      <h2>Deciding as a group in ${esc(name)}</h2>
      <p>
        Group meals stall because everyone stays polite until someone gets annoyed. Savor
        Scout turns it into a 90-second vote: share a link, everyone taps yes on anything
        they would eat, and each person gets one veto to remove an option for the whole
        group. When two options remain the vetoes stop and votes decide. Nobody installs
        anything.
      </p>

      <h2>Near ${esc(name)}</h2>
      <ul>
        ${nearLinks}
      </ul>

      <h2>How this differs from Google Maps and Yelp</h2>
      <p>
        Maps and Yelp are directories: they rank everything nearby and leave the deciding to
        you. Savor Scout makes the call and shows its reasoning — the match score, what it
        beat, and the evidence behind the pick. The underlying place data comes from the
        same public sources, so the difference is the selection, not the data.
      </p>

      <h2>Guides</h2>
      <ul>
        <li><a href="/what-to-eat/">What to eat when&hellip;</a> — 30 guides by situation, from
            a first date to a hangover to a group of twelve.</li>
        <li><a href="/food/">Food guides</a> — what separates a good taco, ramen or pizza from
            an average one.</li>
        <li><a href="/diet/">Eating out with a restriction</a> — allergies, halal, kosher, vegan
            and more.</li>
        <li><a href="/campus/">Near a campus?</a> — food around 637 US universities.</li>
      </ul>
      <hr>
      <p><a href="/eat/">All cities</a> &middot; <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: desc,
    url,
    about: {
      "@type": "City",
      name: place,
      geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lng },
    },
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(trail),
  });

  return render(shell, { title, desc, url, body, ld, who: WHO });
}

/* ---- write ---------------------------------------------------------------- */

const shell = shellOrDie(WHO);
const outDir = path.join(BUILD, "eat");
fs.mkdirSync(outDir, { recursive: true });

CITIES.forEach((city) => {
  fs.writeFileSync(path.join(outDir, `${city.s}.html`), page(shell, city));
});

/* The index. Without it every city page is reachable only from the sitemap and
   from its handful of neighbours, which is a weak crawl path — and a set of
   pages with no browsable parent is itself a doorway tell. */
const byState = {};
CITIES.forEach((c) => { (byState[c.r] = byState[c.r] || []).push(c); });
const stateBlocks = Object.keys(byState).sort().map((st) => {
  const list = byState[st].sort((a, b) => a.c.localeCompare(b.c))
    .map((c) => `<li><a href="/eat/${c.s}">${esc(c.c)}, ${esc(c.r)}</a></li>`).join("\n        ");
  return `      <h2>${esc(st)}</h2>\n      <ul>\n        ${list}\n      </ul>`;
}).join("\n");

const hubTrail = [HOME, HUB];
const indexBody = `      ${crumbHtml(hubTrail)}
      <h1>Where to eat, city by city</h1>
      <p class="lede">
        Savor Scout picks one restaurant instead of handing you a list of thirty. Pick your
        city below and it opens with your location already set — say what you're craving and
        it finds the single best match, then shows why it chose it.
      </p>
      <p>${CITIES.length} cities across ${Object.keys(byState).length} states.</p>

      <h2>Or start somewhere else</h2>
      <ul>
        <li><a href="/what-to-eat/">What to eat when&hellip;</a> — guides by situation rather
            than by cuisine.</li>
        <li><a href="/food/">Food guides</a> — how to find the good version of a dish.</li>
        <li><a href="/diet/">Eating out with a restriction</a></li>
        <li><a href="/campus/">Near a campus</a></li>
      </ul>
${stateBlocks}
      <hr>
      <p><a href="/">Savor Scout home</a></p>`;
fs.writeFileSync(path.join(outDir, "index.html"), render(shell, {
  title: `Where to Eat — ${CITIES.length} US Cities | Savor Scout`,
  desc: `Can't decide where to eat? Savor Scout picks one restaurant for you in ${CITIES.length} US cities. Free, no app, no signup.`,
  url: `${ORIGIN}/eat/`,
  body: indexBody,
  who: WHO,
  ld: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Where to eat — ${CITIES.length} US cities`,
    url: `${ORIGIN}/eat/`,
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(hubTrail),
  }),
}));

const urls = [
  { loc: `${ORIGIN}/eat/`, pri: "0.9", freq: "weekly" },
  /* Priority tracks population. It is a hint rather than a ranking factor, but
     it is the honest one: bigger cities are where the search volume is, so
     that is the crawl order we would choose ourselves. */
  ...CITIES.map((c) => ({
    loc: `${ORIGIN}/eat/${c.s}`,
    pri: c.p >= 500000 ? "0.9" : c.p >= 150000 ? "0.8" : "0.7",
    freq: "weekly",
  })),
];

/* The homepage used to be added here. It now belongs to make-sitemap.js, which
   is the only place that knows about URLs no generator owns — listing it here
   as well would make it a duplicate the moment a second generator did the same. */
emit("cities", urls);

console.log(`make-location-pages: ${CITIES.length} city pages + index, ${urls.length} urls`);
