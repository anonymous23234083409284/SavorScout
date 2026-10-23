/* Generates the three written page classes and their hubs:
 *
 *   /what-to-eat/<situation>   60 pages — the decision, by circumstance
 *   /food/<dish>              228 pages — how to judge a dish, and what to order
 *   /diet/<restriction>        22 pages — eating out with a restriction
 *
 * WHY THESE AND NOT MORE CITY PAGES
 * The city pages compete for local intent against Yelp, TripAdvisor and
 * DoorDash, who have fifteen years of domain authority and the same underlying
 * place data we do. Multiplying them by cuisine — "best tacos in <every town>"
 * — would produce twenty thousand pages that say nothing a local could not
 * immediately catch us not knowing, which is the textbook description of a
 * doorway farm and would put the whole domain at risk.
 *
 * These three classes compete somewhere else entirely. "What to eat when
 * nothing sounds good", "how to find good ramen", "eating out with a sesame
 * allergy" are queries where the incumbent results are content farms and
 * fifteen-year-old forum threads, not entrenched directories — and where a
 * product whose entire job is making one decision has something true to say.
 *
 * Every word of the copy lives in scripts/data/*.js and was written per entry.
 * Nothing here fabricates a restaurant, a ranking, or a local detail: the pages
 * teach you what to look for and then hand you a search that does it.
 */
const fs = require("fs");
const path = require("path");
const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
} = require("./lib/page");

const WHO = "make-guide-pages";
/* Each class is split across an original file and the later batches written
   from Search Console data — see the header of each *-more / dishes-* file.
   The generator sees one array per class and nothing downstream knows. */
const { GROUP_ENABLED } = require("./lib/features");
const { guideFor, whereHtml, whereLd } = require("./lib/scene");
const { guideLinksHtml } = require("./lib/niche");
/* Diet guides whose restriction is also a kind of restaurant in the data. */
const DIET_DATA = { vegetarian: "diet:vegetarian", vegan: "diet:vegan", "gluten-free": "diet:gluten-free",
  kosher: "diet:kosher", halal: "halal-food" };
/* Group advice that is really a pitch for the parked rooms feature. Shown only
   while rooms are switched on; plain advice about eating as a group stays. */
const ROOM_PITCH = /\broom\b|\brooms\b|veto|share (a|the) link/i;
const SITUATIONS = [...require("./data/situations"), ...require("./data/situations-more")];
/* Two files, one list. dishes.js is the original 29; dishes-more.js is the 39
   added after Search Console showed /food/korean-food out-pulling all 627
   campus pages combined. Split only so neither file becomes unmanageable to
   edit — the generator sees one array and nothing downstream knows. */
const DISHES = [
  ...require("./data/dishes"),
  ...require("./data/dishes-more"),
  ...require("./data/dishes-cuisines"),
  ...require("./data/dishes-formats"),
  ...require("./data/dishes-formats-2"),
];

/* A slug ending in -food is a cuisine; anything else is a dish or a format.
   With 68 entries a flat list on the hub is a wall, so they are grouped. */
const isCuisine = (d) => /-food$/.test(d.s);
const DIETS = [...require("./data/diets"), ...require("./data/diets-more")];
const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));

const shell = shellOrDie(WHO);
const app = (craving) => `/?craving=${encodeURIComponent(craving)}`;
const sitMap = new Map(SITUATIONS.map((x) => [x.s, x]));
const dishMap = new Map(DISHES.map((x) => [x.s, x]));
const dietMap = new Map(DIETS.map((x) => [x.s, x]));

/* Top cities by population, for the "where" grid on every dish page. These link
   to the city pages rather than to the app so the link graph actually connects
   the two classes — a dish page is the hub a thousand city pages were missing. */
const TOP_CITIES = [...CITIES].sort((a, b) => b.p - a.p).slice(0, 60);

const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const list = (items) => `<ul>\n${items.map((i) => `        <li>${i}</li>`).join("\n")}\n      </ul>`;
const defs = (items) => `<ul>\n${items.map(([h, p]) =>
  `        <li><strong>${esc(h)}</strong> — ${esc(p)}</li>`).join("\n")}\n      </ul>`;
const paras = (ps) => ps.map((p) => `      <p>${esc(p)}</p>`).join("\n");

/* A direct answer to the question the page is most often reached by.

   Each came from Search Console: "is it weird to eat alone at a restaurant",
   "what is a kosher restaurant", "how to buy sushi". The question goes in as a
   heading worded the way people type it, and the answer sits immediately under
   it in forty to sixty words — the shape Google lifts into "People Also Ask"
   and featured snippets. The rest of the page is the long version; this is the
   short one, placed where it can be quoted. */
const qaHtml = (qa) => qa ? `
      <h2>${esc(qa[0])}</h2>
      <p class="qa">${esc(qa[1])}</p>` : "";

/* Titles for the food guides, rewritten to the phrasing people actually type.

   Search Console, 24 September: "korean restaurants near me" (22), "korean
   cuisine near me" (13), "best korean food near me" (11), "korean places near
   me" (11) — 88 impressions on one page and zero clicks. The title was "How to
   Find Good Korean Food Near You — Barbecue and Everything Else": a how-to,
   shown to people looking for restaurants. The same shape on soup and salad.

   Still honest. Every one of these pages does help you pick a good one, and its
   button runs the search that picks one. The h1 keeps the original wording, so
   the page carries both phrasings. */
/* Small joining words stay lower case after the first word — "Fish and Chips",
   not "Fish And Chips" — since several dish names now carry them. */
const SMALL = new Set(["and", "or", "of", "the", "a", "with"]);
const titleCase = (t) => t.replace(/\b([a-z])/g, (m) => m.toUpperCase())
  .replace(/ (And|Or|Of|The|A|With)\b/g, (m, w) => (SMALL.has(w.toLowerCase()) ? " " + w.toLowerCase() : m));
/* Search copy for guides Google already shows but nobody clicks, written to the
   words people search with (Search Console, 15 October 2026):
     /food/korean-food  108 impressions, position 39, 0 clicks
     /food/soup          68 impressions, position 33, 0 clicks
   The title leads with the query, the description promises what the page has.

   Second batch, 18 October (impressions, position, clicks):
     coffee 73, 23.3, 0 · chicken-sandwich 51, 20.7, 0 · venezuelan-food 50, 29.2, 0
     arepas 45, 7.4, 0 · afghan-food 32, 44.7, 0 · diet/shellfish-allergy 33, 11.6, 0
   Drafted three ways (exact query match, concrete specifics, the searcher's
   job), then judged against the page text: nothing here promises what the page
   does not have. */
const SEARCH_COPY = {
  "coffee": {
    seoTitle: ["Coffee Shops Near You to Work, Meet or Grab a Cup | Savor Scout", "Coffee Shops Near You to Work, Meet or Grab a Cup"],
    h1: "How to find a good coffee shop near you",
    desc: "Say what you need and Savor Scout picks one coffee shop near you. Plus how to spot fresh-roasted beans, a good cortado and silky milk, and what to order.",
  },
  "chicken-sandwich": {
    seoTitle: ["Fried Chicken Sandwich Near You, Classic or Spicy | Savor Scout", "Fried Chicken Sandwich Near You, Classic or Spicy"],
    h1: "How to find a good fried chicken sandwich near you",
    desc: "Brined thigh, a craggy crust, a toasted bun, sour pickles: what makes a good fried chicken sandwich. Savor Scout favors chicken shops over burger places.",
  },
  /* The cuisine guides with the biggest "near me" searches behind them (Semrush,
     October 2026): Mexican food near me 1.2M a month, Asian 301K, Vietnamese
     165K, Korean 135K. Titles lead with exactly that phrase. */
  "asian-food": {
    seoTitle: ["Asian Food Near You: Chinese, Japanese, Korean, Thai & More"],
  },
  "mexican-food": {
    seoTitle: [
      "Mexican Food Near You: Birria, Mole & What to Order | Savor Scout",
      "Mexican Food Near You: Birria, Mole & What to Order",
    ],
    h1: "Mexican food near you: how to find a good one",
    desc: "Oaxacan moles, Yucatecan cochinita, birria and barbacoa: how to tell a serious Mexican kitchen from a combo-plate menu, what to order, and where to look.",
  },
  "vietnamese-food": {
    seoTitle: [
      "Vietnamese Food Near You: Pho, Bánh Mì & Beyond | Savor Scout",
      "Vietnamese Food Near You: Pho, Bánh Mì & Beyond",
    ],
    h1: "Vietnamese food near you: beyond pho",
    desc: "Bun cha, bun bo Hue, com tam, banh mi: the Vietnamese dishes worth knowing beyond pho, and how to tell a serious kitchen near you.",
  },
  "venezuelan-food": {
    seoTitle: ["Venezuelan Food Near You: Pabellón, Cachapas and Tequeños"],
    h1: "How to find good Venezuelan food near you",
    desc: "Pabellón, cachapas and tequeños: what to order, how to tell a Venezuelan kitchen from a Colombian one, and where the {natl} US Venezuelan restaurants are.",
  },
  "arepas": {
    seoTitle: ["Arepas Near You: Venezuelan vs Colombian, What to Order"],
    h1: "How to find good arepas near you, Venezuelan or Colombian",
    desc: "Venezuelan arepas are split and stuffed, Colombian ones thin and flat. How to spot a good one and what to order, from reina pepiada to arepa de choclo.",
  },
  "afghan-food": {
    seoTitle: ["Afghan Food Near You: Kabuli Pulao, Mantu, Aushak | Savor Scout", "Afghan Food Near You: Kabuli Pulao, Mantu, Aushak"],
    h1: "How to find good Afghan food near you",
    desc: "Afghan restaurants are often signed Mediterranean or Middle Eastern, so cuisine filters miss them. Savor Scout searches by dish name. Plus what to order.",
  },
  "korean-food": {
    seoTitle: [
      "Korean Food & Korean BBQ Near You — What to Order | Savor Scout",
      "Korean Food & Korean BBQ Near You — What to Order",
    ],
    h1: "Korean food near you: how to find a good one",
    desc: "Korean BBQ, sundubu, bibimbap and fried chicken: what to order, how the banchan tells you a kitchen is good, and where the most Korean restaurants are.",
  },
  soup: {
    seoTitle: [
      "Good Soup Near You: Pho, Ramen, Pozole and More | Savor Scout",
      "Good Soup Near You: Pho, Ramen, Pozole and More",
    ],
    h1: "Good soup near you, and how to find it",
    desc: "Pho, ramen, pozole, matzo ball: where good soup actually is, how to tell a kitchen makes its own, and the soups worth seeking out.",
  },
};

/* A dish name in the middle of a sentence: "Find chicken sandwich near you",
   not "Find Chicken sandwich". Names that start with a place or people keep
   their capital (Korean BBQ, Nashville hot chicken, Pad Thai, Eggs Benedict). */
const KEEPS_CAPITAL = /^(Korean|Nashville|Peking|Chinese|Pad|Bún|Neapolitan|New|Detroit|Italian|Eggs|Cuban|Tacos al|Po')/;
function inSentence(n) {
  if (/ food$/.test(n) && !/^(Soul|Halal|Southern) /.test(n)) return n;   // Mexican food, Korean food
  return KEEPS_CAPITAL.test(n) ? n : n[0].toLowerCase() + n.slice(1);
}

/* Guides where shellfish is the main event or a common hidden ingredient
   (fish sauce, shrimp paste, shared fryers): the place a reader with the
   allergy most needs the allergy guide. */
const SHELLFISH = new Set(["seafood", "sushi", "oysters", "crab", "lobster", "lobster-rolls", "seafood-boil", "crawfish",
  "shrimp-and-grits", "poke", "ceviche", "mariscos", "fish-tacos", "thai-food", "vietnamese-food", "gumbo", "jambalaya",
  "po-boys", "cajun-food", "pad-thai", "dim-sum", "paella", "tempura"]);

/* A guide that gathers others (/food/asian-food): every guide inside it, with
   how many of that kind of place open listings put in the US. */
function hubHtml(x) {
  const rows = x.hub.filter((h) => dishMap.has(h)).map((h) => {
    const g = guideFor(h);
    const n = g && !g.via ? ` <span class="ct">${g.natl.toLocaleString("en-US")}</span>` : "";
    return `<a class="pill" href="/food/${h}">${esc(dishMap.get(h).n)}${n}</a>`;
  });
  return `
      <h2>The ${esc(x.n)} guides</h2>
      <p>Each of these goes deeper on one cuisine or dish: what to order and how to spot a good kitchen. Numbers are US listings in open map data.</p>
      <p class="pills">
        ${rows.join("\n        ")}
      </p>`;
}

const SEARCH_COPY_DIET = {
  "shellfish-allergy": {
    seoTitle: ["Shellfish Allergy at Restaurants: Hidden Sources and What to Ask"],
    h1: "Eating out with a shellfish allergy: what to ask before you order",
    desc: "Shellfish can hide in oyster sauce, shrimp paste, fish sauce, seafood stock and shared fryers. What to ask the kitchen, and which cuisines are easier.",
  },
};

function dishTitle(x) {
  if (x.seoTitle) return fitTitle(x.seoTitle);
  if (/-food$/.test(x.s)) {
    const base = titleCase(x.near || x.n.replace(/ food$/i, ""));
    return fitTitle([
      `${base} Restaurants Near You — How to Pick a Good One | Savor Scout`,
      `${base} Restaurants Near You — How to Pick a Good One`,
      `${base} Restaurants Near You | Savor Scout`,
      `${base} Restaurants Near You`,
    ]);
  }
  const dish = titleCase(x.near || x.n);
  return fitTitle([
    `Good ${dish} Near You — Where to Find It | Savor Scout`,
    `Good ${dish} Near You — Where to Find It`,
    `Good ${dish} Near You | Savor Scout`,
    `Good ${dish} Near You`,
  ]);
}

const write = (dir, slug, html) => {
  fs.mkdirSync(path.join(BUILD, dir), { recursive: true });
  fs.writeFileSync(path.join(BUILD, dir, `${slug}.html`), html);
};

/* ---- situations ----------------------------------------------------------- */

const SIT_HUB = { name: "What to eat", url: `${ORIGIN}/what-to-eat/` };

function situationPage(x) {
  const url = `${ORIGIN}/what-to-eat/${x.s}`;
  const trail = [HOME, SIT_HUB, { name: x.h1, url }];

  const dishLinks = (x.dishes || []).map((d) =>
    `<a href="/food/${d}">${esc(dishMap.get(d).n)}</a>`).join(", ");
  const relLinks = (x.related || []).map((r) =>
    `<li><a href="/what-to-eat/${r}">${esc(sitMap.get(r).h1)}</a></li>`);

  const body = `      ${crumbHtml(trail)}
      <h1>${esc(x.h1)}</h1>
      <p class="lede">${esc(x.lede)}</p>
      <p><a class="cta" href="${app(x.query)}">Search &ldquo;${esc(x.query)}&rdquo; &rarr;</a></p>${qaHtml(x.qa)}
${paras(x.why)}

      <h2>${esc(x.look.intro)}</h2>
      ${defs(x.look.items)}

      <h2>Try this search</h2>
      <p>
        Savor Scout takes a sentence rather than a category, so the criteria above can go
        straight into the box. For this, something like <strong>&ldquo;${esc(x.query)}&rdquo;</strong>
        works — it reads menus and reviews for those specific things and comes back with one
        place and the reasons it picked it.
      </p>
      <p><a class="cta" href="${app(x.query)}">Search &ldquo;${esc(x.query)}&rdquo; &rarr;</a></p>

      <h2>What usually goes wrong</h2>
      <p>${esc(x.avoid)}</p>
${x.group && (GROUP_ENABLED || !ROOM_PITCH.test(x.group)) ? `
      <h2>If you're deciding as a group</h2>
      <p>${esc(x.group)}</p>` : ""}

      <h2>What to eat</h2>
      <p>Worth considering here: ${dishLinks}.</p>

      <h2>Related</h2>
      ${list(relLinks.map((l) => l.replace(/^<li>|<\/li>$/g, "")))}
      <hr>
      <p><a href="/what-to-eat/">All ${SITUATIONS.length} situations</a> &middot;
         <a href="/food/">Food guides</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: x.h1,
    description: x.desc,
    url,
    author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    mainEntityOfPage: url,
    breadcrumb: breadcrumb(trail),
  });

  return { url, html: render(shell, { title: x.title, desc: x.desc, url, body, ld, who: WHO }) };
}

/* ---- dishes --------------------------------------------------------------- */

const FOOD_HUB = { name: "Food guides", url: `${ORIGIN}/food/` };

function dishPage(x) {
  if (SEARCH_COPY[x.s]) {
    x = { ...x, ...SEARCH_COPY[x.s] };
    const g = guideFor(x.s);
    if (g) x.desc = x.desc.replace("{natl}", g.natl.toLocaleString("en-US"));
  }
  const url = `${ORIGIN}/food/${x.s}`;
  const trail = [HOME, FOOD_HUB, { name: x.n, url }];

  const cityLinks = TOP_CITIES.map((c) =>
    `<li><a href="/eat/${c.s}">${esc(c.c)}, ${esc(c.r)}</a></li>`).join("\n        ");
  const relDish = (x.related || []).map((d) =>
    `<a href="/food/${d}">${esc(dishMap.get(d).n)}</a>`).join(", ");
  const relSit = (x.situations || []).map((s) =>
    `<li><a href="/what-to-eat/${s}">${esc(sitMap.get(s).h1)}</a></li>`).join("\n        ");

  const body = `      ${crumbHtml(trail)}
      <h1>${esc(x.h1)}</h1>
      <p class="lede">${esc(x.lede)}</p>
      <p><a class="cta" href="${app(x.n)}">Find ${esc(inSentence(x.n))} near you &rarr;</a></p>${qaHtml(x.qa)}

      <h2>What separates a good one from a bad one</h2>
      ${defs(x.good)}

      <h2>What to order</h2>
      ${defs(x.order)}
${x.hub ? hubHtml(x) : ""}
${whereHtml(guideFor(x.s), x.n)}
${guideLinksHtml(x.s)}

      <h2>How Savor Scout looks for it</h2>
      <p>${esc(x.signals)}</p>
      <p><a class="cta" href="${app(x.n)}">Find ${esc(inSentence(x.n))} near you &rarr;</a></p>

      <h2>Looking in a particular city?</h2>
      <p>
        Each of these opens Savor Scout with the location already set, so you can say what
        you want and it searches from there. It covers ${CITIES.length.toLocaleString("en-US")}
        US cities in total &mdash; these are simply the largest.
      </p>
      <ul class="cols">
        ${cityLinks}
      </ul>
      <p><a href="/eat/">All ${CITIES.length.toLocaleString("en-US")} cities &rarr;</a></p>

${SHELLFISH.has(x.s) ? `
      <p class="note">Shellfish allergy at the table? <a href="/diet/shellfish-allergy">Where shellfish hides on a menu, and what to ask before you order</a>.</p>
` : ""}
      <h2>Related food guides</h2>
      <p>${relDish}</p>

      <h2>When you might want this</h2>
      <ul>
        ${relSit}
      </ul>
      <hr>
      <p><a href="/food/">All food guides</a> &middot;
         <a href="/what-to-eat/">What to eat when&hellip;</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: x.h1,
    description: x.desc,
    url,
    author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    mainEntityOfPage: url,
    ...(whereLd(guideFor(x.s), x.n, x.s) ? { mentions: whereLd(guideFor(x.s), x.n, x.s) } : {}),
    breadcrumb: breadcrumb(trail),
  });

  return { url, html: render(shell, { title: dishTitle(x), desc: x.desc, url, body, ld, who: WHO }) };
}

/* ---- diets ---------------------------------------------------------------- */

const DIET_HUB = { name: "Eating out with a restriction", url: `${ORIGIN}/diet/` };

function dietPage(x) {
  if (SEARCH_COPY_DIET[x.s]) x = { ...x, ...SEARCH_COPY_DIET[x.s] };
  const url = `${ORIGIN}/diet/${x.s}`;
  const trail = [HOME, DIET_HUB, { name: x.n, url }];

  const relDiet = (x.related || []).map((d) =>
    `<li><a href="/diet/${d}">${esc(dietMap.get(d).h1)}</a></li>`).join("\n        ");
  const relDish = (x.dishes || []).map((d) =>
    `<a href="/food/${d}">${esc(dishMap.get(d).n)}</a>`).join(", ");
  const relSit = (x.situations || []).map((s) =>
    `<a href="/what-to-eat/${s}">${esc(sitMap.get(s).h1.toLowerCase())}</a>`).join(", ");

  const body = `      ${crumbHtml(trail)}
      <h1>${esc(x.h1)}</h1>
      <p class="lede">${esc(x.lede)}</p>
      <p><a class="cta" href="${app(x.n)}">Search ${esc(x.n)} options near you &rarr;</a></p>${qaHtml(x.qa)}

      <h2>What actually goes wrong</h2>
${paras(x.wrong)}

      <h2>What to ask, and how</h2>
      ${defs(x.ask)}

      <h2>Which cuisines make this easier</h2>
      ${defs(x.cuisines)}

${whereHtml(guideFor(DIET_DATA[x.s]), `${x.n} restaurants`)}

      <h2>How Savor Scout helps</h2>
      <p>${esc(x.tool)}</p>
      <p class="note"><strong>What this does not do.</strong> ${esc(x.limit)}</p>
      <p><a class="cta" href="${app(x.n)}">Search ${esc(x.n)} options near you &rarr;</a></p>

      <h2>Cuisines worth reading up on</h2>
      <p>${relDish}</p>
      <p>Situations where this comes up: ${relSit}.</p>

      <h2>Related guides</h2>
      <ul>
        ${relDiet}
      </ul>
      <hr>
      <p><a href="/diet/">All dietary guides</a> &middot;
         <a href="/food/">Food guides</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: x.h1,
    description: x.desc,
    url,
    author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    mainEntityOfPage: url,
    ...(whereLd(guideFor(DIET_DATA[x.s]), `${x.n} restaurants`)
      ? { mentions: whereLd(guideFor(DIET_DATA[x.s]), `${x.n} restaurants`) } : {}),
    breadcrumb: breadcrumb(trail),
  });

  return { url, html: render(shell, { title: x.seoTitle ? fitTitle(x.seoTitle) : x.title, desc: x.desc, url, body, ld, who: WHO }) };
}

/* ---- hubs ----------------------------------------------------------------- */

function hub({ dir, hubNode, title, desc, h1, intro, groups, extra }) {
  const trail = [HOME, hubNode];
  const body = `      ${crumbHtml(trail)}
      <h1>${esc(h1)}</h1>
      <p class="lede">${esc(intro)}</p>
${groups}
${extra || ""}
      <hr>
      <p><a href="/what-to-eat/">What to eat when&hellip;</a> &middot;
         <a href="/food/">Food guides</a> &middot;
         <a href="/diet/">Dietary guides</a> &middot;
         <a href="/eat/">Cities</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: h1,
    description: desc,
    url: hubNode.url,
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(trail),
  });

  fs.mkdirSync(path.join(BUILD, dir), { recursive: true });
  fs.writeFileSync(path.join(BUILD, dir, "index.html"),
    render(shell, { title, desc, url: hubNode.url, body, ld, who: WHO }));
}

/* Situations are grouped rather than listed flat, because thirty links in one
   column is a wall and the groupings are how somebody actually arrives: by how
   they feel, by who they are with, or by what the day is doing to them. */
const SIT_GROUPS = [
  ["When you can't decide", ["cant-decide", "nothing-sounds-good", "too-tired-to-cook", "trying-something-new",
    "stressed", "sad"]],
  ["How you're feeling", ["hungover", "sick-with-a-cold", "after-a-workout", "eating-healthy", "cheat-day",
    "pregnant", "hot-day", "cold-rainy-night"]],
  ["Who you're with", ["first-date", "second-date", "date-night", "meeting-the-parents", "with-picky-eaters",
    "with-a-toddler", "with-teenagers", "with-grandparents", "with-a-dog", "wheelchair-access",
    "vegetarians-and-meat-eaters", "big-group", "friends-visiting", "catching-up", "eating-alone"]],
  ["Work", ["work-team-lunch", "quick-lunch", "breakfast-meeting", "business-dinner", "job-interview-lunch",
    "traveling-for-work"]],
  ["Occasions", ["birthday-dinner", "anniversary", "proposal", "graduation", "celebrating", "after-a-funeral"]],
  ["Holidays", ["valentines-day", "mothers-day", "fathers-day", "thanksgiving", "christmas-day",
    "new-years-eve", "watching-the-game"]],
  ["Time, place and money", ["early-morning", "late-night", "after-a-shift", "on-a-budget", "finals-week",
    "sunday-night", "somewhere-quiet", "outdoor-dining"]],
  ["On the move", ["road-trip", "before-a-flight", "moving-day", "new-in-town"]],
];

/* ---- write everything ------------------------------------------------------ */

const urls = [];
const push = (loc, pri, freq = "monthly") => urls.push({ loc, pri, freq });

SITUATIONS.forEach((x) => {
  const p = situationPage(x);
  write("what-to-eat", x.s, p.html);
  push(p.url, "0.8");
});
DISHES.forEach((x) => {
  const p = dishPage(x);
  write("food", x.s, p.html);
  push(p.url, "0.8");
});
DIETS.forEach((x) => {
  const p = dietPage(x);
  write("diet", x.s, p.html);
  push(p.url, "0.8");
});

const seen = new Set();
SIT_GROUPS.forEach(([, slugs]) => slugs.forEach((s) => {
  if (!sitMap.has(s)) { console.error(`${WHO}: SIT_GROUPS names unknown situation "${s}"`); process.exit(1); }
  seen.add(s);
}));
const ungrouped = SITUATIONS.filter((x) => !seen.has(x.s));
if (ungrouped.length) {
  console.error(`${WHO}: situations missing from SIT_GROUPS: ${ungrouped.map((x) => x.s).join(", ")}`);
  process.exit(1);
}

hub({
  dir: "what-to-eat",
  hubNode: SIT_HUB,
  title: `What to Eat When… — ${SITUATIONS.length} Guides to Deciding | Savor Scout`,
  desc: `Can't decide what to eat? ${SITUATIONS.length} guides to picking a restaurant by situation — hungover, on a first date, with a big group, broke, or when nothing sounds good.`,
  h1: "What to eat when…",
  intro:
    "Choosing a restaurant is rarely a question about food. It is a question about what kind of evening it is, who is at the table, and how much attention you have left. These are written for the situation rather than the cuisine.",
  groups: SIT_GROUPS.map(([label, slugs]) =>
    `      <h2>${esc(label)}</h2>\n      <ul>\n` +
    slugs.map((s) => {
      const x = sitMap.get(s);
      return `        <li><a href="/what-to-eat/${s}">${esc(x.h1)}</a> — ${esc(x.lede.split(". ")[0])}.</li>`;
    }).join("\n") + "\n      </ul>").join("\n"),
});

hub({
  dir: "food",
  hubNode: FOOD_HUB,
  title: "Food Guides — How to Find the Good Version of Anything | Savor Scout",
  desc: `${DISHES.length} guides to finding good food: what separates a great taco, ramen, pizza or barbecue from an average one, and what to order.`,
  h1: "How to find the good version of anything",
  intro:
    "What makes a taco good has nothing in common with what makes a bowl of ramen good. These are guides to the specific things worth looking for, dish by dish — and to what to order once you are there.",
  groups: `      <h2>Dishes and formats</h2>\n      <ul class="cols">\n` +
    DISHES.filter((d) => !isCuisine(d)).slice().sort((a, b) => a.n.localeCompare(b.n)).map((d) =>
      `        <li><a href="/food/${d.s}">${esc(d.n)}</a></li>`).join("\n") +
    `\n      </ul>\n      <h2>Cuisines</h2>\n      <ul class="cols">\n` +
    DISHES.filter(isCuisine).slice().sort((a, b) => a.n.localeCompare(b.n)).map((d) =>
      `        <li><a href="/food/${d.s}">${esc(d.n)}</a></li>`).join("\n") +
    "\n      </ul>",
  extra: `      <h2>Or start from where you are</h2>
      <p>
        Savor Scout covers ${CITIES.length.toLocaleString("en-US")} US cities. Pick yours and
        it opens with the location already set.
      </p>
      <p><a href="/eat/">Browse cities &rarr;</a></p>`,
});

hub({
  dir: "diet",
  hubNode: DIET_HUB,
  title: "Eating Out With a Dietary Restriction — Practical Guides | Savor Scout",
  desc: `${DIETS.length} practical guides to eating out with an allergy or dietary restriction: what goes wrong in kitchens, what to ask, and which cuisines are structurally easier.`,
  h1: "Eating out with a restriction",
  intro:
    "These cover what actually goes wrong in a restaurant kitchen, the questions that get a useful answer, and which cuisines are structurally easier — which differs enormously depending on what you are avoiding.",
  groups: `      <h2>Allergies</h2>\n      <ul>\n` +
    ["gluten-free", "peanut-and-tree-nut-allergy", "shellfish-allergy", "fish-allergy", "dairy-free", "egg-allergy",
      "sesame-allergy", "soy-allergy", "alpha-gal"]
      .map((s) => `        <li><a href="/diet/${s}">${esc(dietMap.get(s).h1)}</a></li>`).join("\n") +
    `\n      </ul>\n      <h2>Diets and observance</h2>\n      <ul>\n` +
    ["vegan", "vegetarian", "pescatarian", "jain", "halal", "kosher", "low-fodmap", "keto-and-low-carb", "paleo",
      "high-protein"]
      .map((s) => `        <li><a href="/diet/${s}">${esc(dietMap.get(s).h1)}</a></li>`).join("\n") +
    `\n      </ul>\n      <h2>Health</h2>\n      <ul>\n` +
    ["heart-healthy", "low-sodium", "diabetes-friendly"]
      .map((s) => `        <li><a href="/diet/${s}">${esc(dietMap.get(s).h1)}</a></li>`).join("\n") +
    "\n      </ul>",
  extra: `      <p class="note">
        <strong>These are discovery guides, not safety checks.</strong> Savor Scout reads what
        restaurants and reviewers have written. It has not visited any kitchen and cannot see a
        shared fryer. For a serious allergy, use it to find places worth calling — and then call
        them.
      </p>`,
});

push(`${ORIGIN}/what-to-eat/`, "0.9", "weekly");
push(`${ORIGIN}/food/`, "0.9", "weekly");
push(`${ORIGIN}/diet/`, "0.9", "weekly");

emit("guides", urls);
console.log(`${WHO}: ${SITUATIONS.length} situations + ${DISHES.length} dishes + ${DIETS.length} diets + 3 hubs = ${urls.length} urls`);
