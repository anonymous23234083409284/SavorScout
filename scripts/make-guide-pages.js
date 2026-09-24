/* Generates the three written page classes and their hubs:
 *
 *   /what-to-eat/<situation>   30 pages — the decision, by circumstance
 *   /food/<dish>               29 pages — how to judge a dish, and what to order
 *   /diet/<restriction>        12 pages — eating out with a restriction
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
const SITUATIONS = require("./data/situations");
/* Two files, one list. dishes.js is the original 29; dishes-more.js is the 39
   added after Search Console showed /food/korean-food out-pulling all 627
   campus pages combined. Split only so neither file becomes unmanageable to
   edit — the generator sees one array and nothing downstream knows. */
const DISHES = [...require("./data/dishes"), ...require("./data/dishes-more")];

/* A slug ending in -food is a cuisine; anything else is a dish or a format.
   With 68 entries a flat list on the hub is a wall, so they are grouped. */
const isCuisine = (d) => /-food$/.test(d.s);
const DIETS = require("./data/diets");
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
const titleCase = (t) => t.replace(/\b([a-z])/g, (m) => m.toUpperCase());
function dishTitle(x) {
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
      <p class="lede">${esc(x.lede)}</p>${qaHtml(x.qa)}
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
${x.group ? `
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
      <p class="lede">${esc(x.lede)}</p>${qaHtml(x.qa)}

      <h2>What separates a good one from a bad one</h2>
      ${defs(x.good)}

      <h2>What to order</h2>
      ${defs(x.order)}

      <h2>How Savor Scout looks for it</h2>
      <p>${esc(x.signals)}</p>
      <p><a class="cta" href="${app(x.n)}">Find ${esc(x.n)} near you &rarr;</a></p>

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
    breadcrumb: breadcrumb(trail),
  });

  return { url, html: render(shell, { title: dishTitle(x), desc: x.desc, url, body, ld, who: WHO }) };
}

/* ---- diets ---------------------------------------------------------------- */

const DIET_HUB = { name: "Eating out with a restriction", url: `${ORIGIN}/diet/` };

function dietPage(x) {
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
      <p class="lede">${esc(x.lede)}</p>${qaHtml(x.qa)}

      <h2>What actually goes wrong</h2>
${paras(x.wrong)}

      <h2>What to ask, and how</h2>
      ${defs(x.ask)}

      <h2>Which cuisines make this easier</h2>
      ${defs(x.cuisines)}

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
    breadcrumb: breadcrumb(trail),
  });

  return { url, html: render(shell, { title: x.title, desc: x.desc, url, body, ld, who: WHO }) };
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
  ["When you can't decide", ["cant-decide", "nothing-sounds-good", "stressed", "sad"]],
  ["How you're feeling", ["hungover", "sick-with-a-cold", "after-a-workout", "hot-day", "cold-rainy-night"]],
  ["Who you're with", ["first-date", "meeting-the-parents", "with-picky-eaters", "with-a-toddler",
    "vegetarians-and-meat-eaters", "big-group", "friends-visiting", "eating-alone"]],
  ["Work", ["work-team-lunch", "business-dinner", "job-interview-lunch"]],
  ["Occasions", ["birthday-dinner", "celebrating"]],
  ["Time and money", ["late-night", "after-a-shift", "on-a-budget", "finals-week", "sunday-night"]],
  ["On the move", ["road-trip", "before-a-flight", "moving-day"]],
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
  title: "What to Eat When… — 30 Guides to Deciding | Savor Scout",
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
    ["gluten-free", "peanut-and-tree-nut-allergy", "shellfish-allergy", "dairy-free", "egg-allergy", "sesame-allergy"]
      .map((s) => `        <li><a href="/diet/${s}">${esc(dietMap.get(s).h1)}</a></li>`).join("\n") +
    `\n      </ul>\n      <h2>Diets and observance</h2>\n      <ul>\n` +
    ["vegan", "vegetarian", "halal", "kosher", "low-fodmap", "keto-and-low-carb"]
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
