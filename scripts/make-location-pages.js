/* Generates one page per major US metro at /eat/<slug>, plus the index.
 *
 * WHY THIS WENT FROM 1,000 PAGES TO 50
 *
 * The previous version generated a page for every city in a 1,000-row dataset,
 * built from a population figure and a county restaurant count. Every page was
 * true. No page was interesting, because nothing on it could only have been
 * written about that city — and 531 of the thousand shared a county with
 * another, so they shared their only real data too. Measured six-word phrase
 * overlap between two random city pages sat at 0.35 even after the Census
 * figures were added. That is a content farm with good sourcing, and it reads
 * like one to a person and very probably to Google.
 *
 * Fifty is a number somebody can actually write. American cities have genuinely
 * distinct food cultures — Nashville is not Memphis, Albuquerque is not Tucson,
 * Philadelphia is not Baltimore — and at fifty pages, saying so properly is
 * possible. The copy lives in data/metros.js and every entry was written for
 * that city.
 *
 * The Census data stays, because it is real and nobody else publishes it per
 * city. It is now supporting evidence under the writing rather than the entire
 * substance of the page.
 *
 * WHAT HAPPENED TO THE OTHER 950
 * They are 301 redirects to their nearest surviving metro, generated into
 * vercel.json by scripts/make-redirects.js. Deleting them outright would leave
 * 950 dead URLs that are still in Google's sitemap; redirecting preserves
 * whatever they earned and sends somebody searching for a small city to the
 * nearest page that can actually help them.
 */
const fs = require("fs");
const path = require("path");

const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
} = require("./lib/page");

const WHO = "make-location-pages";
const METROS = require("./data/metros");
const ALL_CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));
const DINING = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "city-dining.json"), "utf8"));
const DISHES = require("./data/dishes");
const { BY_STATE: CAMPUS_BY_STATE } = require("./lib/campuses");
const STATES = require("./data/states");

const CITY = new Map(ALL_CITIES.map((c) => [c.s, c]));
const DISH_NAME = new Map(DISHES.map((d) => [d.s, d.n]));

/* Every metro in metros.js must exist in the city dataset, or the page would be
   rendering a slug with no population, no coordinates and no Census row. */
const missing = METROS.filter((m) => !CITY.has(m.s));
if (missing.length) {
  console.error(`${WHO}: metros.js names cities not in us-cities.json: ${missing.map((m) => m.s).join(", ")}`);
  process.exit(1);
}

const fmt = (n) => n.toLocaleString("en-US");
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const HUB = { name: "Cities", url: `${ORIGIN}/eat/` };

/* Nearest surviving metros, by great-circle distance. Equirectangular is plenty:
   we need a correct ORDER over a few hundred miles, not a precise figure. */
function nearestMetros(city, k = 5) {
  const cos = Math.cos((city.lat * Math.PI) / 180);
  return METROS
    .map((m) => CITY.get(m.s))
    .filter((o) => o.s !== city.s)
    .map((o) => {
      const dx = (o.lng - city.lng) * cos;
      const dy = o.lat - city.lat;
      return { o, d2: dx * dx + dy * dy };
    })
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, k)
    .map((x) => ({ ...x.o, miles: Math.max(1, Math.round(Math.sqrt(x.d2) * 69)) }));
}

/* The Census paragraph. Branches on density and on the sit-down/counter ratio
   rather than slotting numbers into one fixed sentence — measured earlier: with
   a single template the figures varied per city and the phrase overlap did not
   move at all, which is the thing that actually reads as duplicated. */
function diningHtml(city) {
  const d = DINING.cities[city.s];
  if (!d) return "";
  const nat = DINING.national;

  const dBand = !d.per10k || !nat.per10k ? null
    : d.per10k >= nat.per10k * 1.25 ? "high"
    : d.per10k >= nat.per10k * 1.05 ? "above"
    : d.per10k <= nat.per10k * 0.75 ? "low"
    : d.per10k <= nat.per10k * 0.95 ? "below" : "level";

  const rBand = d.ratio == null ? null
    : d.ratio >= 1.25 ? "sitdown"
    : d.ratio >= 1.0 ? "even"
    : d.ratio >= 0.8 ? "counter" : "fast";

  const DENSITY = {
    high: (v, m) => `At <strong>${v} food businesses per 10,000 residents</strong> against a national median of ${m}, this is one of the best-supplied places in the country. Choice is not the constraint here; narrowing it down is.`,
    above: (v, m) => `That is <strong>${v} per 10,000 residents</strong>, comfortably above the national median of ${m}.`,
    level: (v, m) => `That works out at <strong>${v} per 10,000 residents</strong>, about level with the national median of ${m}.`,
    below: (v, m) => `That is <strong>${v} per 10,000 residents</strong>, a little under the national median of ${m} — fewer options than average, which makes picking the right one matter more.`,
    low: (v, m) => `That is <strong>${v} per 10,000 residents</strong>, well under the national median of ${m}. Worth widening the radius here; the best option is often a short drive out.`,
  };
  const RATIO = {
    sitdown: `Unusually, sit-down restaurants outnumber counter-service ones — nationally it runs close to even, so this is a city that eats at tables.`,
    even: `Sit-down and counter-service places are close to balanced.`,
    counter: `Counter service edges out sit-down, which is the national norm.`,
    fast: `Counter service clearly outnumbers sit-down.`,
  };

  const counts = [];
  if (d.fs) counts.push(`${fmt(d.fs)} full-service restaurants`);
  if (d.ls) counts.push(`${fmt(d.ls)} limited-service places`);
  if (d.sn) counts.push(`${fmt(d.sn)} cafés and snack bars`);
  if (d.bar) counts.push(`${fmt(d.bar)} bars`);

  return `      <h2>How many places to eat are there in ${esc(city.c)}?</h2>
      <p>
        ${esc(city.c)} sits in <strong>${esc(d.county)}</strong>, where the Census counts
        ${counts.slice(0, -1).join(", ")}${counts.length > 1 ? " and " : ""}${counts[counts.length - 1]}
        &mdash; ${fmt(d.total)} places to eat or drink in all.
      </p>
${dBand ? `      <p>${DENSITY[dBand](d.per10k, nat.per10k)} ${rBand ? RATIO[rBand] : ""}</p>` : ""}
      <p class="note">
        County-level counts from the US Census (${DINING.year}) &mdash;
        <a href="/about/data">how we got these numbers</a>.
      </p>`;
}

function page(shell, m) {
  const city = CITY.get(m.s);
  const place = `${city.c}, ${city.r}`;
  const url = `${ORIGIN}/eat/${m.s}`;
  const app = `/?near=${encodeURIComponent(place)}`;
  const near = nearestMetros(city);
  const trail = [HOME, HUB, { name: place, url }];

  const title = fitTitle([
    `Where to Eat in ${place} — What the City Actually Does Well`,
    `Where to Eat in ${place} — One Pick, Not a List`,
    `Where to Eat in ${place} | Savor Scout`,
    `Where to Eat in ${place}`,
  ]);
  const desc = `What ${city.c} actually does well, dish by dish — and a way to pick one place ` +
    `instead of scrolling thirty. Free, no app, no signup.`;

  const body = `      ${crumbHtml(trail)}
      <h1>Where to eat in ${esc(place)}</h1>
      <p class="lede">${esc(m.identity[0])}</p>
${m.identity.slice(1).map((p) => `      <p>${esc(p)}</p>`).join("\n")}
      <p><a class="cta" href="${app}">Find somewhere to eat in ${esc(city.c)} &rarr;</a></p>

      <h2>What to eat in ${esc(city.c)}</h2>
      <ul>
${m.dishes.map(([n, t]) => `        <li><strong>${esc(n)}</strong> — ${esc(t)}</li>`).join("\n")}
      </ul>

      <h2>Where to look</h2>
      <ul>
${m.areas.map(([n, t]) => `        <li><strong>${esc(n)}</strong> — ${esc(t)}</li>`).join("\n")}
      </ul>
      <p class="note">
        Neighbourhoods and regional dishes, not restaurant recommendations. We have not eaten in
        ${esc(city.c)}, and a page claiming the best taco in a city it has never visited is worth
        nothing. Savor Scout reads menus and reviews when you search, and tells you why it picked
        what it picked.
      </p>

${diningHtml(city)}

      <h2>Searches that work well here</h2>
      <ul>
${m.searches.map((q) => `        <li><a href="${app}&craving=${encodeURIComponent(q)}">${esc(q)}</a></li>`).join("\n")}
      </ul>

      <h2>Read up first</h2>
      <p>
        ${m.foods.map((f) => `<a href="/food/${f}">${esc(DISH_NAME.get(f))}</a>`).join(", ")} — what
        separates a good one from an average one, and what to order.
      </p>

      <h2>Deciding as a group in ${esc(city.c)}</h2>
      <p>
        Group meals stall because everyone stays polite until someone gets annoyed. Savor Scout turns
        it into a 90-second vote with one veto each &mdash;
        <a href="/what-to-eat/big-group">how that works, and why the veto is the move that matters</a>.
      </p>

      <h2>Other cities</h2>
      <ul>
${near.map((n) => `        <li><a href="/eat/${n.s}">${esc(n.c)}, ${esc(n.r)}</a> — about ${n.miles} miles away</li>`).join("\n")}
      </ul>
${CAMPUS_BY_STATE[city.r] ? `      <p><a href="/campus/${city.r.toLowerCase()}">Eating near ${esc(STATES[city.r] || city.r)} campuses &rarr;</a></p>` : ""}

      <h2>Guides</h2>
      <ul>
        <li><a href="/what-to-eat/">What to eat when&hellip;</a> — 30 guides by situation, from a
            first date to a hangover to a group of twelve.</li>
        <li><a href="/food/">Food guides</a> — what separates a good taco, ramen or pizza from an
            average one.</li>
        <li><a href="/diet/">Eating out with a restriction</a> — allergies, halal, kosher, vegan.</li>
      </ul>
      <hr>
      <p><a href="/eat/">All ${METROS.length} cities</a> &middot; <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Where to eat in ${place}`,
    description: desc,
    url,
    author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    mainEntityOfPage: url,
    about: {
      "@type": "City",
      name: place,
      geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lng },
    },
    breadcrumb: breadcrumb(trail),
  });

  return render(shell, { title, desc, url, body, ld, who: WHO });
}

/* ---- write ---------------------------------------------------------------- */

const shell = shellOrDie(WHO);
const outDir = path.join(BUILD, "eat");
fs.mkdirSync(outDir, { recursive: true });

METROS.forEach((m) => {
  fs.writeFileSync(path.join(outDir, `${m.s}.html`), page(shell, m));
});

/* The index. Fifty links, so no state layer is needed — that existed only to
   break up a 1,000-link page, and the problem it solved is gone. */
const hubTrail = [HOME, HUB];
const ranked = METROS.map((m) => ({ m, c: CITY.get(m.s) }))
  .sort((a, b) => b.c.p - a.c.p);

const rows = ranked.map(({ m, c }) => {
  const d = DINING.cities[c.s];
  return `        <li><a href="/eat/${m.s}">${esc(c.c)}, ${esc(c.r)}</a>` +
    (d && d.per10k ? ` — ${d.per10k} food businesses per 10k` : "") + `</li>`;
}).join("\n");

const indexBody = `      ${crumbHtml(hubTrail)}
      <h1>Where to eat, city by city</h1>
      <p class="lede">
        The ${METROS.length} largest cities in the United States, each written up for what it
        actually does well &mdash; the regional dishes, the food districts, and what the Census says
        about how well supplied it is.
      </p>
      <p>
        These are not restaurant rankings. They are the things a city is genuinely known for, so you
        know what to ask for. Savor Scout then picks one place and shows you why.
      </p>
      <p><a class="cta" href="/">Try it &rarr;</a></p>

      <h2>The ${METROS.length} largest US cities</h2>
      <ul class="cols">
${rows}
      </ul>

      <h2>Or start somewhere else</h2>
      <ul>
        <li><a href="/what-to-eat/">What to eat when&hellip;</a> — guides by situation rather than
            by cuisine.</li>
        <li><a href="/food/">Food guides</a> — how to find the good version of a dish.</li>
        <li><a href="/diet/">Eating out with a restriction</a></li>
        <li><a href="/campus/">Near a campus</a></li>
        <li><a href="/about/data">Where our data comes from</a></li>
      </ul>
      <hr>
      <p><a href="/">Savor Scout home</a></p>`;

fs.writeFileSync(path.join(outDir, "index.html"), render(shell, {
  title: `Where to Eat — the ${METROS.length} Biggest US Cities | Savor Scout`,
  desc: `What each of the ${METROS.length} largest US cities actually does well, dish by dish — ` +
    `and a way to pick one restaurant instead of scrolling thirty.`,
  url: `${ORIGIN}/eat/`,
  body: indexBody,
  who: WHO,
  ld: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Where to eat — the ${METROS.length} biggest US cities`,
    url: `${ORIGIN}/eat/`,
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(hubTrail),
  }),
}));

emit("cities", [
  { loc: `${ORIGIN}/eat/`, pri: "0.9", freq: "weekly" },
  ...METROS.map((m) => ({ loc: `${ORIGIN}/eat/${m.s}`, pri: "0.9", freq: "weekly" })),
]);

console.log(`make-location-pages: ${METROS.length} metro pages + index`);
