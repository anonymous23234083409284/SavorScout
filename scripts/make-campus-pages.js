/* Generates one page per US campus at /campus/<slug>.
 *
 * WHY CAMPUSES AND NOT MORE CITIES
 * "Where to eat near <university>" is a query with real, recurring volume and
 * far weaker competition than "restaurants in <city>", because the incumbent
 * directories index businesses rather than institutions. It is also genuinely
 * seasonal in our favour: the same question is asked again every August by an
 * entirely new set of people, plus their parents, plus everyone visiting for a
 * game or a graduation.
 *
 * WHERE THE DATA COMES FROM
 * IPEDS, the US Department of Education's institutional survey, via the Urban
 * Institute's open Education Data API. Public domain. Every figure on these
 * pages — the city, the state, the size bracket, the campus setting, the
 * coordinates — is from that dataset. Nothing is estimated and nothing is
 * invented, which matters more here than on the city pages: a student reading a
 * made-up claim about their own campus stops trusting the site in one sentence.
 *
 * WHAT MAKES 637 PAGES NOT ONE PAGE
 * Three independent real variables, not one:
 *   - Size bracket (5k-10k / 10k-20k / 20k+), which changes how much of a local
 *     restaurant economy the student body actually supports.
 *   - Setting (city / suburb / town / rural), which changes the problem
 *     completely. A rural campus has too few options and needs a drive; an
 *     urban one has too many and needs a filter. These are opposite pages.
 *   - Real geography, computed from real coordinates: which of our 1,000 city
 *     pages are actually nearest, and how far.
 *
 * Filtered to institutions of 5,000 students and up. Below that the query does
 * not really exist and we would be padding the count, which is the thing this
 * whole architecture is trying not to do.
 */
const fs = require("fs");
const path = require("path");
const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
} = require("./lib/page");
const STATES = require("./data/states");

const WHO = "make-campus-pages";

/* The exclusion rule and the filtered list live in lib/campuses.js, because the
   city generator needs to know which states have campuses too — see the comment
   there. */
const { CAMPUSES, BY_STATE: CAMPUS_BY_STATE } = require("./lib/campuses");

const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));
const DINING = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "city-dining.json"), "utf8"));
const STATE_FOOD = require("./data/states-food");
const NOTES = require("./data/campus-notes");
const DISH_NAME = new Map([
  ...require("./data/dishes"), ...require("./data/dishes-more"), ...require("./data/dishes-extra"),
].map((d) => [d.s, d.n]));

/* A note naming a guide that does not exist would ship a link to a 404, and a
   note keyed to a slug that is not a campus would silently never appear. */
for (const [slug, n] of Object.entries(NOTES)) {
  if (!CAMPUSES.some((c) => c.s === slug)) { console.error(`${WHO}: campus-notes names unknown campus "${slug}"`); process.exit(1); }
  for (const f of n.foods || []) {
    if (!DISH_NAME.has(f)) { console.error(`${WHO}: campus-notes ${slug} names unknown guide "${f}"`); process.exit(1); }
  }
}
const fmt = (n) => n.toLocaleString("en-US");

/* A dish name dropped mid-sentence into the description loses its capital
   ("Apple stack cake" → "apple stack cake") unless it starts with a name: a
   state or a city in the list ("Texas wieners", "Springfield-style"), the
   first half of a two-word name ("Hot Brown"), or a word the notes capitalise
   mid-sentence and no prose on the site ever writes in lower case. */
const prose = (v) => (typeof v === "string" ? (/^[a-z0-9-]+$/.test(v) ? [] : [v]) : Object.values(v || {}).flatMap(prose));
const LOWER_TEXT = prose([NOTES, STATE_FOOD, require("./data/dishes"), require("./data/dishes-more"), require("./data/dishes-extra")]).join(" ");
const NOTE_TEXT = prose(NOTES).join(" ");
const PLACE_NAMES = [...Object.values(STATES), ...CITIES.map((c) => c.c)];
const NAME_WORDS = new Set((NOTE_TEXT.match(/(?<![.!?]\s)(?<!^)\b[A-Z][a-zé'.]+/g) || [])
  .filter((w) => !new RegExp(`\\b${w.toLowerCase()}\\b`).test(LOWER_TEXT)));
const midSentence = (n) =>
  PLACE_NAMES.some((p) => n === p || n.startsWith(p + " ") || n.startsWith(p + "-")) ||
  NAME_WORDS.has(n.split(/[\s-]/)[0]) || /^\S+\s[A-Z]/.test(n)
    ? n : n.charAt(0).toLowerCase() + n.slice(1);
const CITY_STATES = new Set(CITIES.map((c) => c.r));

const shell = shellOrDie(WHO);
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const HUB = { name: "Campuses", url: `${ORIGIN}/campus/` };

/* IPEDS institution size categories 3-5. The brackets are the survey's own, so
   quoting them is accurate in a way an estimated headcount would not be. */
const SIZE = {
  3: {
    label: "5,000 to 9,999 students", short: "mid-sized",
    craving: "somewhere we haven't already been",
  },
  4: {
    label: "10,000 to 19,999 students", short: "large",
    craving: "one thing done well, cheap",
  },
  5: {
    label: "20,000 students or more", short: "very large",
    craving: "good food without the queue",
  },
};

/* IPEDS urban-centric locale codes, collapsed to the four that matter to this
   question. The setting is the single biggest determinant of what eating near a
   campus is actually like, which is why the copy branches on it. */
function setting(lc) {
  if (lc < 20) return "city";
  if (lc < 30) return "suburb";
  if (lc < 40) return "town";
  return "rural";
}

const SETTING_COPY = {
  city: {
    label: "in a city",
    problem: (n) =>
      `${n} sits inside a city, which means the problem is not finding somewhere to eat — it is that there are hundreds of options and the same six get recommended to every new student. The good places are usually one neighbourhood over from the ones with the queue.`,
    advice:
      "Campus-adjacent blocks are priced and designed for students who will eat there twice a week for four years, which keeps them cheap and keeps them honest. The better cooking is often a short ride out, in the neighbourhoods where people actually live.",
    cravings: ["cheap eats", "open late", "somewhere quiet to work", "good coffee",
      "date night", "somewhere to take visiting parents"],
  },
  suburb: {
    label: "in a suburb",
    problem: (n) =>
      `${n} is in a suburban setting, which produces a specific pattern: a strip of chains close to campus, and the genuinely good independent restaurants scattered across a few miles in directions nobody tells you about in your first year.`,
    advice:
      "Suburban campuses reward a car or a willingness to take a bus for fifteen minutes. The restaurants worth knowing are rarely the ones visible from the main road, and a suburb's best food is frequently in an unremarkable plaza.",
    cravings: ["cheap eats", "worth the drive", "somewhere with parking", "open late",
      "big group", "somewhere to take visiting parents"],
  },
  town: {
    label: "in a college town",
    problem: (n) =>
      `${n} is in a town where the university is a large share of the local economy. That cuts both ways: the restaurants near campus are built around student budgets and student hours, and the same small set of places gets recommended until everyone is tired of them.`,
    advice:
      "College towns tend to have a handful of genuinely excellent long-running restaurants surrounded by a lot of interchangeable ones, and the difference is not visible from the street. They also empty out over breaks, when hours change without warning.",
    cravings: ["cheap eats", "open late", "somewhere that's been here forever",
      "somewhere quiet to work", "big group", "parents' weekend"],
  },
  rural: {
    label: "in a rural area",
    problem: (n) =>
      `${n} is rurally situated, which makes this a completely different question. There is no scrolling through options — the constraint is how far you are willing to drive, and knowing which of the nearby towns is worth the trip.`,
    advice:
      "A rural campus rewards knowing the surrounding towns rather than the surrounding blocks. Savor Scout searches a wide radius by default, so places twenty or thirty minutes out stay on the table when they are worth the drive.",
    cravings: ["worth the drive", "open on a Sunday", "somewhere in the next town over",
      "big group", "a proper sit-down meal", "parents' weekend"],
  },
};

function nearestCities(c, k) {
  const cos = Math.cos((c.lat * Math.PI) / 180);
  return CITIES
    .map((o) => {
      const dx = (o.lng - c.lng) * cos;
      const dy = o.lat - c.lat;
      return { o, d2: dx * dx + dy * dy };
    })
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, k)
    .map((x) => ({ ...x.o, miles: Math.max(1, Math.round(Math.sqrt(x.d2) * 69)) }));
}

/* The nearest city over 150,000 people, with a real distance. On a rural or
   town campus this is the single most useful fact on the page — it is the
   answer to "where do we drive when nobody wants the same four places again" —
   and it is different for almost every campus, which is exactly what 637 pages
   need to be worth having. */
function nearestBigCity(c) {
  const cos = Math.cos((c.lat * Math.PI) / 180);
  let best = null;
  for (const o of CITIES) {
    if (o.p < 150000) continue;
    const dx = (o.lng - c.lng) * cos;
    const dy = o.lat - c.lat;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) best = { o, d2 };
  }
  return best ? { ...best.o, miles: Math.max(1, Math.round(Math.sqrt(best.d2) * 69)) } : null;
}

const milesBetween = (a, b) => {
  const cos = Math.cos((a.lat * Math.PI) / 180);
  const dx = (b.lng - a.lng) * cos, dy = b.lat - a.lat;
  return Math.sqrt(dx * dx + dy * dy) * 69;
};

/* Other campuses within a short drive, nearest first. Real coordinates, so the
   list is a fact about this campus — and a student at one school very often
   eats in the neighbourhood of the one next to it. */
function campusesNear(c, radius = 10, k = 5) {
  return CAMPUSES.filter((o) => o.s !== c.s)
    .map((o) => ({ o, d: milesBetween(c, o) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
}

/* Other campuses in the same state, so the set is browsable sideways rather
   than only up to the hub. Nearest first rather than alphabetical: the old list
   was the same first six names on every page in the state. */
function siblings(c, exclude, k = 6) {
  return CAMPUSES.filter((o) => o.r === c.r && o.s !== c.s && !exclude.has(o.s))
    .map((o) => ({ ...o, d: milesBetween(c, o) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
}

/* The Census county figures for the campus's own town, when that town is one
   of the 1,000 covered cities. Matched on name and state, not on distance: a
   campus is in its town, and borrowing the nearest city's county when the town
   is not covered would put the wrong county's numbers on the page. */
const CITY_BY_NAME = new Map(CITIES.map((o) => [`${o.c}|${o.r}`, o]));
function townDining(c) {
  const city = CITY_BY_NAME.get(`${c.c}|${c.r}`);
  const d = city && DINING.cities[city.s];
  return d ? { city, d } : null;
}

function page(c) {
  const url = `${ORIGIN}/campus/${c.s}`;
  const place = `${c.c}, ${c.r}`;
  const set = setting(c.lc);
  const sc = SETTING_COPY[set];
  const sz = SIZE[c.sz];
  const near = nearestCities(c, 5);
  const big = nearestBigCity(c);
  const close = campusesNear(c);
  const sibs = siblings(c, new Set(close.map((x) => x.o.s)));
  const shortName = c.a || c.n;
  const note = NOTES[c.s];
  const town = townDining(c);
  const sf = STATE_FOOD[c.r];

  /* Led by "Restaurants Near", not "Where to Eat Near".
     Search Console, 24 September: of the campus queries reaching these pages,
     "restaurants near X" outnumbers every other phrasing combined, followed by
     "food near X" and "places to eat near X". The title was answering the
     phrasing hardly anyone types.

     And the abbreviation goes in when there is one, because a large share of
     those queries use it — "food near fau", "restaurants near umkc campus",
     "gvsu restaurants". A title naming only "Florida Atlantic University" has
     to rely on Google inferring that FAU means the same thing. */
  const abbr = c.a && c.a !== c.n && /^[A-Z&]{2,6}$/.test(c.a) ? c.a : null;
  const title = fitTitle([
    ...(abbr ? [
      `Restaurants Near ${abbr} — Where to Eat Near ${c.n} | Savor Scout`,
      `Restaurants Near ${abbr} (${c.n}) | Savor Scout`,
      `Restaurants Near ${abbr} — ${c.n}`,
      `Restaurants Near ${abbr} — ${place} | Savor Scout`,
    ] : []),
    `Restaurants Near ${c.n} — ${place} | Savor Scout`,
    `Restaurants Near ${c.n} | Savor Scout`,
    `Restaurants Near ${c.n}`,
    `Food Near ${c.n}`,
  ]);
  /* Written from the page's own content, so each result's snippet is about
     that campus. The old one was one sentence with the name swapped. */
  const desc = note && note.areas.length
    ? `Restaurants near ${shortName} in ${place}: ${note.areas.slice(0, 2).map((a) => a[0]).join(" and ")}` +
      `${note.local.length ? `, local food like ${midSentence(note.local[0][0])}` : ""}` +
      `, and one pick for what you're craving.`
    : note && note.local.length
    ? `Restaurants near ${shortName} in ${place}: local food like ` +
      `${note.local.slice(0, 2).map(([n]) => midSentence(n)).join(" and ")}` +
      `, and one pick for what you're craving.`
    : `Restaurants near ${shortName} in ${place}: what eating near a ${sz.short} campus ${sc.label} is like` +
      `${big && big.c !== c.c ? `, ${big.c} ${big.miles} miles away` : ""}, and one pick for what you're craving.`;

  const stateNode = { name: STATES[c.r] || c.r, url: `${ORIGIN}/campus/${c.r.toLowerCase()}` };
  const trail = [HOME, HUB, stateNode, { name: c.n, url }];
  const appLink = `/?near=${encodeURIComponent(place)}`;

  /* Drawn from the setting rather than a fixed list, plus one that follows from
     the size bracket — so a rural campus of 6,000 and an urban one of 30,000
     suggest genuinely different searches instead of the same six links. */
  const cravings = [...sc.cravings.slice(0, 5), sz.craving];

  /* Every other name the school goes by, for the facts list. The abbreviation
     already sits in the title and h1; this puts the longer forms ("Grand Valley
     State", "Cal State Fullerton") on the page too, as plain text, where a
     searcher using them can be matched to it. */
  const otherNames = (c.al || []).filter((s) => s && s !== c.n);

  const bigHtml = big ? `      <p>
        The nearest city of any real size is <a href="/eat/${big.s}">${esc(big.c)}, ${esc(big.r)}</a>,
        about ${big.miles} ${big.miles === 1 ? "mile" : "miles"} away — worth knowing for the nights
        when the usual options near campus have run out.
      </p>` : "";

  /* Written note for the campuses that have one; the setting-and-size copy for
     the rest. The generic copy is not shown alongside a note: it was written
     for campuses we knew nothing specific about. */
  const eatHtml = note ? `${note.scene.length > 1 || note.areas.length ? `      <h2>Where students eat near ${esc(shortName)}</h2>
${note.scene.slice(1).map((p) => `      <p>${esc(p)}</p>`).join("\n")}` : ""}
${note.areas.length ? `      <ul>
${note.areas.map(([n, t]) => `        <li><strong>${esc(n)}</strong> — ${esc(t)}</li>`).join("\n")}
      </ul>` : ""}
${note.local.length ? `
      <h2>Local food around ${esc(c.c)}</h2>
      <ul>
${note.local.map(([n, t]) => `        <li><strong>${esc(n)}</strong> — ${esc(t)}</li>`).join("\n")}
      </ul>` : ""}
      <p class="note">
        Streets, districts and local dishes, not restaurant recommendations. Savor Scout reads menus
        and reviews when you search, and shows why it picked what it picked.
      </p>
${bigHtml}` : `      <h2>Eating near a ${esc(sz.short)} campus ${esc(sc.label)}</h2>
      <p>${esc(sc.advice)}</p>
${bigHtml}${set === "town" || set === "rural" ? `
      <p>
        Term time and break are different towns here. Hours shrink, some places close entirely,
        and the listings almost never keep up — so a place that shows as open in July may not be.
      </p>` : ""}`;

  const townHtml = town ? `
      <h2>How many places to eat are there in ${esc(c.c)}?</h2>
      <p>
        ${esc(c.c)} is in ${esc(town.d.county)}, where the Census counts ${fmt(town.d.total)} places to
        eat or drink${town.d.per10k ? ` — ${town.d.per10k} for every 10,000 residents, against a national
        median of ${DINING.national.per10k}` : ""}.
        <a href="/eat/${town.city.s}">More on eating in ${esc(c.c)} &rarr;</a>
      </p>` : "";

  const closeHtml = close.length ? `
      <h2>Other campuses within 10 miles</h2>
      <ul>
        ${close.map(({ o, d }) => `<li><a href="/campus/${o.s}">${esc(o.n)}</a> — about ${Math.max(1, Math.round(d))} ${Math.max(1, Math.round(d)) === 1 ? "mile" : "miles"}</li>`).join("\n        ")}
      </ul>` : "";

  const stateHtml = sf && CITY_STATES.has(c.r) ? `
      <h2>What ${esc(STATES[c.r] || c.r)} is known for</h2>
      <p>
        ${sf.known.map(([n]) => esc(n)).join(" &middot; ")} &mdash;
        <a href="/eat/${c.r.toLowerCase()}">what ${esc(STATES[c.r] || c.r)} eats</a>.
      </p>` : "";

  const guideSlugs = [...new Set([...(note ? note.foods : []), ...(sf ? sf.foods.slice(0, 2) : [])])].slice(0, 5);

  const body = `      ${crumbHtml(trail)}
      <h1>Restaurants near ${esc(c.n)}${abbr ? ` (${esc(abbr)})` : ""}</h1>
      <p class="lede">${esc(note ? note.scene[0] : sc.problem(shortName))}</p>
      <p>
        Say what you are craving — a dish, a budget or a dietary need — and Savor Scout checks the
        menus of places near ${esc(place)} for it, then picks one place and tells you why.
      </p>
      <p><a class="cta" href="${appLink}">Find somewhere to eat near ${esc(shortName)} &rarr;</a></p>

      <h2>The campus</h2>
      <ul>
        <li><strong>Location</strong> — ${esc(place)}</li>
${otherNames.length ? `        <li><strong>Also known as</strong> — ${otherNames.map(esc).join(", ")}</li>\n` : ""}        <li><strong>Setting</strong> — ${esc(sc.label)}</li>
        <li><strong>Size</strong> — ${esc(sz.label)}</li>
        <li><strong>Type</strong> — ${c.pub ? "Public" : "Private, not-for-profit"} four-year institution</li>
      </ul>
      <p class="note">From IPEDS, the US Department of Education's survey, which reports size as a bracket.</p>

${eatHtml}
${townHtml}
${guideSlugs.length ? `
      <h2>Read up first</h2>
      <p>${guideSlugs.map((f) => `<a href="/food/${f}">${esc(DISH_NAME.get(f))}</a>`).join(", ")} — what separates a good one from an average one.</p>` : ""}

      <h2>Common searches near ${esc(shortName)}</h2>
      <ul>
        ${cravings.map((k) =>
          `<li><a href="${appLink}&craving=${encodeURIComponent(k)}">${esc(k)} near ${esc(shortName)}</a></li>`
        ).join("\n        ")}
      </ul>
${closeHtml}

      <h2>Nearby cities</h2>
      <ul>
        ${near.map((n) =>
          `<li><a href="/eat/${n.s}">${esc(n.c)}, ${esc(n.r)}</a> — about ${n.miles} ${n.miles === 1 ? "mile" : "miles"} away</li>`
        ).join("\n        ")}
      </ul>
${stateHtml}
${sibs.length ? `
      <h2>More campuses in ${esc(STATES[c.r] || c.r)}</h2>
      <ul>
        ${sibs.map((o) => `<li><a href="/campus/${o.s}">${esc(o.n)}</a> — ${esc(o.c)}</li>`).join("\n        ")}
      </ul>` : ""}
      <hr>
      <p><a href="/what-to-eat/finals-week">Finals week</a> &middot;
         <a href="/what-to-eat/on-a-budget">On a budget</a> &middot;
         <a href="/what-to-eat/late-night">Late night</a> &middot;
         <a href="/what-to-eat/big-group">Big group</a> &middot;
         <a href="/diet/">Dietary guides</a></p>
      <p><a href="/campus/">All ${CAMPUSES.length} campuses</a> &middot;
         <a href="/eat/">Cities</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: desc,
    url,
    about: {
      "@type": "CollegeOrUniversity",
      name: c.n,
      /* The machine-readable form of "also known as", which is what the
         property exists for: telling Google that "GVSU" and "Grand Valley State
         University" are the same institution. */
      ...(c.al && c.al.length ? { alternateName: c.al } : {}),
      address: { "@type": "PostalAddress", addressLocality: c.c, addressRegion: c.r, addressCountry: "US" },
      geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
    },
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(trail),
  });

  return { url, html: render(shell, { title, desc, url, body, ld, who: WHO }) };
}

/* ---- write ---------------------------------------------------------------- */

const outDir = path.join(BUILD, "campus");
fs.mkdirSync(outDir, { recursive: true });

const urls = [];
CAMPUSES.forEach((c) => {
  const p = page(c);
  fs.writeFileSync(path.join(outDir, `${c.s}.html`), p.html);
  urls.push({ loc: p.url, pri: c.sz === 5 ? "0.8" : "0.7", freq: "monthly" });
});

/* ---- state hubs -------------------------------------------------------------
   Same reasoning as /eat/: a single index listing all 627 campuses was the only
   crawl path into every one of them, and a 627-link page splits its authority
   627 ways. /campus/ now lists states, and each state page lists its campuses.
   Two clicks from the homepage either way, but the links concentrate. */
const byState = CAMPUS_BY_STATE;
const stateCodes = Object.keys(byState).sort();

function stateHub(st) {
  const list = byState[st];
  const name = STATES[st] || st;
  const url = `${ORIGIN}/campus/${st.toLowerCase()}`;
  const trail = [HOME, HUB, { name, url }];

  const big = list.filter((c) => c.sz === 5).length;
  const settings = list.reduce((m, c) => {
    const g = setting(c.lc); m[g] = (m[g] || 0) + 1; return m;
  }, {});
  const shape = Object.entries(settings).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n} ${k === "city" ? "in cities" : k === "suburb" ? "in suburbs"
      : k === "town" ? "in college towns" : "rurally situated"}`).join(", ");

  const rows = list.map((c) =>
    `        <li><a href="/campus/${c.s}">${esc(c.n)}</a> — ${esc(c.c)}, ` +
    `${esc(SIZE[c.sz].label)}</li>`).join("\n");

  const body = `      ${crumbHtml(trail)}
      <h1>Where to eat near ${esc(name)} campuses</h1>
      <p class="lede">
        ${list.length} ${esc(name)} ${list.length === 1 ? "campus" : "campuses"} of 5,000 students
        and up${big ? `, ${big} of them with 20,000 or more` : ""}. Pick yours and Savor Scout opens
        with the location already set.
      </p>
      <p><a class="cta" href="/">Find somewhere to eat &rarr;</a></p>

      <h2>What eating near these campuses is like</h2>
      <p>
        Of the ${list.length} here, ${shape}. That matters more than it sounds: a campus in a city
        has too many options and needs a filter, while a rural one has too few and needs a drive.
        Each page below starts from whichever problem that campus actually has.
      </p>

      <h2>${esc(name)} campuses</h2>
      <ul>
${rows}
      </ul>

      <h2>Guides worth reading</h2>
      <ul>
        <li><a href="/what-to-eat/finals-week">What to eat during finals week</a></li>
        <li><a href="/what-to-eat/on-a-budget">Where to eat when you're broke</a></li>
        <li><a href="/what-to-eat/late-night">Where to eat late at night</a></li>
${CITY_STATES.has(st) ? `        <li><a href="/eat/${st.toLowerCase()}">${esc(name)} cities</a></li>
` : ""}      </ul>
      <hr>
      <p><a href="/campus/">All states</a> &middot; <a href="/">Savor Scout home</a></p>`;

  return {
    url,
    html: render(shell, {
      title: fitTitle([
        `Where to Eat Near ${name} Campuses — ${list.length} Universities | Savor Scout`,
        `Where to Eat Near ${name} Campuses — ${list.length} Universities`,
        `Where to Eat Near ${name} Campuses`,
      ]),
      desc: `Food near ${list.length} ${name} university campuses. Savor Scout picks one restaurant ` +
        `based on what you're craving instead of handing you a list.`,
      url, body, who: WHO,
      ld: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Where to eat near ${name} campuses`,
        url,
        isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
        breadcrumb: breadcrumb(trail),
      }),
    }),
  };
}

stateCodes.forEach((st) => {
  const h = stateHub(st);
  fs.writeFileSync(path.join(outDir, `${st.toLowerCase()}.html`), h.html);
  urls.push({ loc: h.url, pri: "0.8", freq: "weekly" });
});

const hubTrail = [HOME, HUB];
const stateRows = stateCodes.map((st) =>
  `        <li><a href="/campus/${st.toLowerCase()}">${esc(STATES[st] || st)}</a> — ` +
  `${byState[st].length} ${byState[st].length === 1 ? "campus" : "campuses"}</li>`).join("\n");

const hubBody = `      ${crumbHtml(hubTrail)}
      <h1>Where to eat near campus</h1>
      <p class="lede">
        ${CAMPUSES.length} US campuses of 5,000 students and up, across ${stateCodes.length}
        states. Pick yours and Savor Scout opens with the location already set — say what you are
        craving and it finds one place, then shows why it chose it.
      </p>
      <p>
        Campus eating has its own constraints: it has to be cheap, it has to be close, it has to be
        open at the hour you actually finish, and it usually has to satisfy four people at once.
        These pages start from that rather than from a ranked list of everything within a mile.
      </p>
      <p><a class="cta" href="/">Try it &rarr;</a></p>
      <p class="note">
        Campus data from IPEDS, the US Department of Education's institutional survey (public
        domain). Four-year, degree-granting, public and private not-for-profit institutions.
      </p>

      <h2>Browse by state</h2>
      <ul class="cols">
${stateRows}
      </ul>
      <hr>
      <p><a href="/eat/">Cities</a> &middot;
         <a href="/what-to-eat/">What to eat when&hellip;</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

fs.writeFileSync(path.join(outDir, "index.html"), render(shell, {
  title: `Where to Eat Near Campus — ${CAMPUSES.length} US Universities | Savor Scout`,
  desc: `Food near your university: ${CAMPUSES.length} US campuses, with one restaurant pick instead of a list of thirty. Free, no app, no signup.`,
  url: HUB.url,
  who: WHO,
  body: hubBody,
  ld: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Where to eat near campus",
    url: HUB.url,
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(hubTrail),
  }),
}));
urls.push({ loc: HUB.url, pri: "0.9", freq: "weekly" });

emit("campus", urls);
console.log(`${WHO}: ${CAMPUSES.length} campus pages + index across ${Object.keys(byState).length} states`);
