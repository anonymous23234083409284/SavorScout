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
const STATES = require("./data/states");
const { BY_STATE: CAMPUS_BY_STATE } = require("./lib/campuses");

/* Hand-written food identity for the 50 largest cities.
 *
 * These 50 get a written page; the other 950 get the data-driven one. That is a
 * deliberate middle: the whole set indexes at 97% and should stay, but the
 * cities with the real search volume deserve better than a template, and fifty
 * is a number somebody can actually write.
 *
 * The written body replaces the generic opening only. Everything below it —
 * Census figures, cravings, nearby cities, guides — is shared, because those
 * sections are useful on every page regardless. */
const METROS = require("./data/metros");
const METRO = new Map(METROS.map((m) => [m.s, m]));
const DISH_NAME = new Map(require("./data/dishes").map((d) => [d.s, d.n]));

/* County Business Patterns, fetched once by scripts/fetch-city-dining.js.
   This is what lets a city page state something true about eating in that
   specific place instead of only describing the product. */
const DINING = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "city-dining.json"), "utf8"));

/* Cities grouped by county, so a page can name the other places it shares its
   figures with. 531 of the 1,000 share a county with at least one other, and
   without this those pages would print identical numbers with nothing to
   distinguish them — the exact duplicate-content problem the data was meant
   to solve. */
const BY_COUNTY = new Map();
for (const c of CITIES) {
  const d = DINING.cities[c.s];
  if (!d) continue;
  if (!BY_COUNTY.has(d.fips)) BY_COUNTY.set(d.fips, []);
  BY_COUNTY.get(d.fips).push(c);
}

const BY_STATE = {};
CITIES.forEach((c) => { (BY_STATE[c.r] = BY_STATE[c.r] || []).push(c); });
Object.values(BY_STATE).forEach((l) => l.sort((a, b) => b.p - a.p));

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

/* The dining paragraph.
 *
 * Every number here is from the Census and is stated as what it is: a COUNTY
 * figure, named as such. Presenting a county count as a city count would be
 * the kind of small dishonesty that a local reader catches instantly, and the
 * whole reason this data is usable is that it is checkable.
 *
 * Two things vary per city even when the county figures do not: the city's own
 * share of the county population, and which other covered cities sit in the
 * same county. Both are real, and together they keep eight Long Island pages
 * from printing the same paragraph eight times. */
function diningHtml(city) {
  const d = DINING.cities[city.s];
  if (!d) return "";
  const nat = DINING.national;
  const siblings = (BY_COUNTY.get(d.fips) || []).filter((o) => o.s !== city.s);

  /* Density and the sit-down/counter ratio are the two axes, and the copy
     branches on BOTH rather than slotting numbers into one fixed sentence.
     Measured: with a single template the figures varied per city and the
     six-word phrase overlap between two city pages did not move at all, which
     is the thing that actually reads as duplicate content. Four density bands
     times four ratio bands gives sixteen genuinely different write-ups, and the
     band a city lands in is a fact about the city rather than a rotation. */
  const dBand = !d.per10k || !nat.per10k ? null
    : d.per10k >= nat.per10k * 1.25 ? "high"
    : d.per10k >= nat.per10k * 1.05 ? "above"
    : d.per10k <= nat.per10k * 0.75 ? "low"
    : d.per10k <= nat.per10k * 0.95 ? "below" : "level";

  const rBand = d.ratio == null ? null
    : d.ratio >= 1.25 ? "sitdown"
    : d.ratio >= 1.0 ? "even"
    : d.ratio >= 0.8 ? "counter" : "fast";

  const HEAD = {
    high: (n) => `${n} has more places to eat than most of the country`,
    above: (n) => `How well supplied is ${n}?`,
    level: (n) => `How many places to eat are there in ${n}?`,
    below: (n) => `${n} is a little thinner on options than average`,
    low: (n) => `Eating out in ${n} means knowing where to look`,
  };

  const DENSITY = {
    high: (v, m) => `At <strong>${v} food businesses per 10,000 residents</strong> against a national median of ${m}, this is one of the better-supplied places in the country. Choice is not the constraint here; narrowing it down is.`,
    above: (v, m) => `That is <strong>${v} per 10,000 residents</strong>, comfortably above the national median of ${m}. Enough range that the deciding takes longer than the eating.`,
    level: (v, m) => `That works out at <strong>${v} per 10,000 residents</strong>, which is about level with the national median of ${m} — a normal amount of choice, and a normal amount of indecision.`,
    below: (v, m) => `That is <strong>${v} per 10,000 residents</strong>, a little under the national median of ${m}. Fewer options than average, which makes picking the right one matter more.`,
    low: (v, m) => `That is <strong>${v} per 10,000 residents</strong>, well under the national median of ${m}. Worth widening the search radius here — the best option is often in the next town.`,
  };

  const RATIO = {
    sitdown: `Unusually, sit-down restaurants outnumber counter-service ones. Nationally it runs close to even and most places tilt the other way, so this is a town that eats at tables.`,
    even: `Sit-down and counter-service places are close to balanced, with the edge to sit-down.`,
    counter: `Counter service edges out sit-down, which is the national norm.`,
    fast: `Counter service clearly outnumbers sit-down — more a drive-through town than a linger-over-dinner one.`,
  };

  const share = d.cpop && city.p ? Math.round((city.p / d.cpop) * 100) : null;

  const parts = [];
  parts.push(`      <h2>${esc((HEAD[dBand] || HEAD.level)(city.c))}</h2>`);

  const counts = [];
  if (d.fs) counts.push(`${fmt(d.fs)} full-service restaurants`);
  if (d.ls) counts.push(`${fmt(d.ls)} limited-service places`);
  if (d.sn) counts.push(`${fmt(d.sn)} cafés and snack bars`);
  if (d.bar) counts.push(`${fmt(d.bar)} bars`);

  parts.push(`      <p>
        ${esc(city.c)} sits in <strong>${esc(d.county)}</strong>, where the Census counts
        ${counts.slice(0, -1).join(", ")}${counts.length > 1 ? " and " : ""}${counts[counts.length - 1]}
        &mdash; ${fmt(d.total)} places to eat or drink in all.${share ? ` ${esc(city.c)} makes up about
        ${share}% of the county's population.` : ""}
      </p>`);

  if (dBand) {
    parts.push(`      <p>${DENSITY[dBand](d.per10k, nat.per10k)} ${rBand ? RATIO[rBand] : ""}</p>`);
  } else if (rBand) {
    parts.push(`      <p>${RATIO[rBand]}</p>`);
  }

  if (siblings.length) {
    const shown = siblings.slice(0, 8);
    parts.push(`      <p>
        Those county figures also cover
        ${shown.map((o) => `<a href="/eat/${o.s}">${esc(o.c)}</a>`).join(", ")}${siblings.length > shown.length
          ? ` and ${siblings.length - shown.length} more` : ""}, all within Savor Scout's search
        radius from ${esc(city.c)}.
      </p>`);
  }

  /* The full methodology used to be repeated in forty-odd words on every one of
     the thousand city pages, which is pure boilerplate and counts against the
     page. It lives on /about/data now and this points at it. */
  parts.push(`      <p class="note">
        County-level counts from the US Census (${DINING.year}) &mdash;
        <a href="/about/data">how we got these numbers</a>.
      </p>`);

  return parts.join("\n");
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

  const stateNode = { name: STATES[region] || region, url: `${ORIGIN}/eat/${region.toLowerCase()}` };
  const trail = [HOME, HUB, stateNode, { name: place, url }];

  /* One link per craving, pointing at the /food/ guide — a real indexable page
     that itself opens the app.

     This used to emit TWO links, the first being `/?near=…&craving=…`: the
     homepage with a query string, which correctly declares the homepage as its
     canonical and so can never be indexed on its own. Sixteen of those per page
     across a thousand pages was 16,000 crawlable dead ends, and Search Console
     had already found 1,070 of them sitting under "Alternate page with proper
     canonical tag". Not an error — but every one of those crawls was spent on a
     URL that resolves to the homepage instead of on a page that could rank. */
  const cravingLinks = CRAVINGS
    .map(([slug, label]) =>
      `<li><a href="/food/${slug}">${esc(label)} in ${esc(name)}</a> — what separates` +
      ` a good one from an average one</li>`)
    .join("\n        ");
  const nearLinks = near
    .map((n) => `<li><a href="/eat/${n.s}">${esc(n.c)}, ${esc(n.r)}</a> — about ${n.miles} miles away</li>`)
    .join("\n        ");

  const m = METRO.get(slug);

  /* The written opening, for the 50 cities that have one. */
  const intro = m ? `      <p class="lede">${esc(m.identity[0])}</p>
${m.identity.slice(1).map((x) => `      <p>${esc(x)}</p>`).join("\n")}
      <p><a class="cta" href="${app}">Find somewhere to eat in ${esc(name)} &rarr;</a></p>

      <h2>What to eat in ${esc(name)}</h2>
      <ul>
${m.dishes.map(([n, t]) => `        <li><strong>${esc(n)}</strong> — ${esc(t)}</li>`).join("\n")}
      </ul>

      <h2>Where to look</h2>
      <ul>
${m.areas.map(([n, t]) => `        <li><strong>${esc(n)}</strong> — ${esc(t)}</li>`).join("\n")}
      </ul>
      <p class="note">
        Neighbourhoods and regional dishes, not restaurant recommendations. We have not eaten in
        ${esc(name)}, and a page claiming the best taco in a city it has never visited is worth
        nothing. Savor Scout reads menus and reviews when you search, and shows why it picked what
        it picked.
      </p>

      <h2>Read up first</h2>
      <p>
        ${m.foods.map((f) => `<a href="/food/${f}">${esc(DISH_NAME.get(f))}</a>`).join(", ")} — what
        separates a good one from an average one, and what to order.
      </p>` : `      <p class="lede">${esc(copy.problem)}</p>
      <p>
        Savor Scout picks <strong>one</strong> restaurant in ${esc(name)} and tells you why it
        picked it. Say what you're craving and it reads menus and reviews for that specific
        dish, rather than sorting places by overall star rating. Free, runs in the browser,
        and one search needs no account.
      </p>
      <p><a class="cta" href="${app}">Find somewhere to eat in ${esc(name)} &rarr;</a></p>

      <h2>Eating out in ${esc(name)}</h2>`;

  const body = `      ${crumbHtml(trail)}
      <h1>Where to eat in ${esc(place)}</h1>
${intro}
      <p>
        ${esc(name)} has a population of about ${fmt(pop)}. ${esc(copy.angle)}
        Savor Scout searches up to 35 miles around ${esc(name)}, so places just outside the
        city are still on the table when they are worth the drive.
      </p>

${diningHtml(city)}

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
      <p><a href="/eat/${region.toLowerCase()}">All ${BY_STATE[region].length}
         ${esc(STATES[region] || region)} cities &rarr;</a></p>

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

/* ---- state hubs -------------------------------------------------------------
 *
 * WHY THESE EXIST
 * /eat/ used to link straight to all 1,000 city pages. A hub with a thousand
 * outbound links spreads whatever authority it has a thousand ways, and
 * Googlebot routinely does not walk the whole list — which made that one page
 * the sole crawl path into 1,000 URLs, and a bottleneck rather than a route.
 *
 * A state layer turns that into /eat/ (51 links) -> /eat/ny (however many New
 * York cities) -> the city. Every page stays two clicks from the homepage, the
 * links concentrate, and the tree is one a crawler can actually walk.
 *
 * They are not filler. Each one aggregates the real Census dining figures for
 * its own state, which makes it a page somebody might genuinely land on from
 * "restaurants per capita in Ohio" — and gives it a reason to exist beyond
 * being a list of links.
 */
function stateHub(st) {
  const list = BY_STATE[st];
  const name = STATES[st] || st;
  const url = `${ORIGIN}/eat/${st.toLowerCase()}`;
  const trail = [HOME, HUB, { name, url }];

  const withData = list.map((c) => DINING.cities[c.s]).filter(Boolean);
  const totalPop = list.reduce((n, c) => n + c.p, 0);
  const counties = new Set(withData.map((d) => d.fips));
  const dens = withData.map((d) => d.per10k).filter(Boolean).sort((a, b) => a - b);
  const medDens = dens.length ? dens[Math.floor(dens.length / 2)] : null;
  const nat = DINING.national;

  /* Ranked by density rather than alphabetically, so the ordering is itself
     information — and it differs from every other state's page. */
  const ranked = list
    .map((c) => ({ c, d: DINING.cities[c.s] }))
    .filter((x) => x.d && x.d.per10k)
    .sort((a, b) => b.d.per10k - a.d.per10k);
  const top = ranked[0], bottom = ranked[ranked.length - 1];

  const rows = list.slice().sort((a, b) => a.c.localeCompare(b.c)).map((c) => {
    const d = DINING.cities[c.s];
    return `        <li><a href="/eat/${c.s}">${esc(c.c)}</a>` +
      (d && d.per10k ? ` — ${d.per10k} per 10k` : "") + `</li>`;
  }).join("\n");

  const statsBlock = medDens ? `
      <h2>Eating out in ${esc(name)}, by the numbers</h2>
      <p>
        Across the ${counties.size} ${counties.size === 1 ? "county" : "counties"} these cities sit in,
        the median works out at <strong>${medDens} food businesses per 10,000 residents</strong>
        against a national median of ${nat.per10k}.
        ${medDens >= nat.per10k * 1.1
          ? `${esc(name)} is better supplied than the country as a whole.`
          : medDens <= nat.per10k * 0.9
          ? `That is on the thin side, so the search radius matters more here than it does elsewhere.`
          : `That puts ${esc(name)} close to the national middle.`}
      </p>
${top && bottom && top.c.s !== bottom.c.s ? `      <p>
        The densest of them is <a href="/eat/${top.c.s}">${esc(top.c.c)}</a> at ${top.d.per10k} per
        10,000; the thinnest is <a href="/eat/${bottom.c.s}">${esc(bottom.c.c)}</a> at ${bottom.d.per10k}.
      </p>` : ""}
      <p class="note">
        US Census Bureau, County Business Patterns (${DINING.year}), counted at county level by NAICS
        code. Business counts, not a quality ranking.
      </p>` : "";

  const body = `      ${crumbHtml(trail)}
      <h1>Where to eat in ${esc(name)}</h1>
      <p class="lede">
        Savor Scout covers ${list.length} ${esc(name)} ${list.length === 1 ? "city" : "cities"},
        together home to about ${fmt(totalPop)} people. Pick one and it opens with the location
        already set.
      </p>
      <p><a class="cta" href="/">Find somewhere to eat &rarr;</a></p>
${statsBlock}

      <h2>${esc(name)} cities</h2>
      <ul class="cols">
${rows}
      </ul>

      <h2>Guides</h2>
      <ul>
        <li><a href="/what-to-eat/">What to eat when&hellip;</a> — by situation, not cuisine.</li>
        <li><a href="/food/">Food guides</a> — how to find the good version of a dish.</li>
        <li><a href="/diet/">Eating out with a restriction</a></li>
${CAMPUS_BY_STATE[st] ? `        <li><a href="/campus/${st.toLowerCase()}">Campuses in ${esc(name)}</a> — ${CAMPUS_BY_STATE[st].length}</li>
` : ""}      </ul>
      <hr>
      <p><a href="/eat/">All states</a> &middot; <a href="/">Savor Scout home</a></p>`;

  return {
    url,
    html: render(shell, {
      title: fitTitle([
        `Where to Eat in ${name} — ${list.length} Cities | Savor Scout`,
        `Where to Eat in ${name} — ${list.length} Cities`,
        `Where to Eat in ${name}`,
      ]),
      desc: `Where to eat across ${list.length} ${name} cities. Savor Scout picks one restaurant ` +
        `instead of a list of thirty, plus Census figures on how well supplied each city is.`,
      url, body, who: WHO,
      ld: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Where to eat in ${name}`,
        url,
        isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
        breadcrumb: breadcrumb(trail),
      }),
    }),
  };
}

const stateCodes = Object.keys(BY_STATE).sort();
const stateUrls = [];
stateCodes.forEach((st) => {
  const h = stateHub(st);
  fs.writeFileSync(path.join(outDir, `${st.toLowerCase()}.html`), h.html);
  stateUrls.push({ loc: h.url, pri: "0.8", freq: "weekly" });
});

/* ---- the /eat/ index: 51 states, not 1,000 cities -------------------------- */
const hubTrail = [HOME, HUB];
const stateRows = stateCodes.map((st) =>
  `        <li><a href="/eat/${st.toLowerCase()}">${esc(STATES[st] || st)}</a> — ` +
  `${BY_STATE[st].length} ${BY_STATE[st].length === 1 ? "city" : "cities"}</li>`).join("\n");

const indexBody = `      ${crumbHtml(hubTrail)}
      <h1>Where to eat, city by city</h1>
      <p class="lede">
        Savor Scout picks one restaurant instead of handing you a list of thirty. Pick your state,
        then your city, and it opens with the location already set — say what you're craving and it
        finds the single best match, then shows why it chose it.
      </p>
      <p>${fmt(CITIES.length)} cities across ${stateCodes.length} states and territories.</p>
      <p><a class="cta" href="/">Try it &rarr;</a></p>

      <h2>Browse by state</h2>
      <ul class="cols">
${stateRows}
      </ul>

      <h2>Or start somewhere else</h2>
      <ul>
        <li><a href="/what-to-eat/">What to eat when&hellip;</a> — guides by situation rather
            than by cuisine.</li>
        <li><a href="/food/">Food guides</a> — how to find the good version of a dish.</li>
        <li><a href="/diet/">Eating out with a restriction</a></li>
        <li><a href="/campus/">Near a campus</a></li>
      </ul>
      <hr>
      <p><a href="/">Savor Scout home</a></p>`;

fs.writeFileSync(path.join(outDir, "index.html"), render(shell, {
  title: `Where to Eat — ${fmt(CITIES.length)} US Cities | Savor Scout`,
  desc: `Can't decide where to eat? Savor Scout picks one restaurant for you across ${fmt(CITIES.length)} US cities. Free, no app, no signup.`,
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
  ...stateUrls,
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

console.log(`make-location-pages: ${CITIES.length} city pages + ${stateCodes.length} state hubs + index, ${urls.length} urls`);
