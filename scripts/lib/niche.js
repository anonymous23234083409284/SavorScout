/* Campus x cuisine pages: /campus/<school>/<food>, "Pizza near Simmons".
 *
 * The pages answer a narrow search exactly: the title and h1 are the search,
 * and the body is the real listings that answer it. Data from
 * scripts/data/campus-cuisine.json (scripts/fetch-nearby-places.py), which
 * only includes a pair with at least `min_places` matching listings within a
 * mile (scripts/data/niche-config.json), so no page here is thin or empty.
 * Raise `batch` in that config to publish the next set.
 *
 * What these pages do not claim: prices, opening hours, ratings. The listings
 * carry none of those, so "cheap", "open now" and "best" are not in any title.
 */
const fs = require("fs");
const path = require("path");
const { esc, fitTitle } = require("./page");
const { CAMPUSES } = require("./campuses");
const { listSentence } = require("./scene");

const FILE = path.join(__dirname, "..", "data", "campus-cuisine.json");
const DATA = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { pages: [] };
const CAMPUS = new Map(CAMPUSES.map((c) => [c.s, c]));
const DISH = new Map([
  ...require("../data/dishes"), ...require("../data/dishes-more"), ...require("../data/dishes-cuisines"),
  ...require("../data/dishes-formats"), ...require("../data/dishes-formats-2"),
].map((d) => [d.s, d]));

const PAGES = DATA.pages.filter((p) => CAMPUS.has(p.campus) && DISH.has(p.food));

/* How each food is named in a title and in a sentence. */
const LABEL = {
  coffee: ["Coffee Shops", "coffee shops"], bakery: ["Bakeries", "bakeries"], deli: ["Delis", "delis"],
  sandwiches: ["Sandwich Shops", "sandwich shops"], burgers: ["Burgers", "burger places"],
  "fried-chicken": ["Fried Chicken", "fried chicken places"], seafood: ["Seafood", "seafood restaurants"],
  sushi: ["Sushi", "sushi restaurants"], ramen: ["Ramen", "ramen shops"], pizza: ["Pizza", "pizza places"],
  tacos: ["Tacos", "taco places"], breakfast: ["Breakfast", "breakfast spots"], "ice-cream": ["Ice Cream", "ice cream shops"],
  bagels: ["Bagels", "bagel shops"], donuts: ["Donuts", "donut shops"], dessert: ["Dessert", "dessert places"],
  wings: ["Wings", "wing spots"], bbq: ["BBQ", "barbecue places"],
};
function label(food) {
  if (LABEL[food]) return LABEL[food];
  const n = DISH.get(food).n;                        // "Korean food"
  const title = n.replace(/\b\w/g, (ch) => ch.toUpperCase());
  return [title, `${n.replace(/ food$/, "")} restaurants`];
}

/* A dish name mid-sentence: "Italian food" keeps its capital, "pizza" does not. */
function inSentence(n) {
  if (/ food$/.test(n) && !/^(Soul|Halal|Southern) /.test(n)) return n;
  return /^(Korean|Nashville|Peking|Chinese|Pad|Neapolitan|New|Detroit|Italian|Cuban)/.test(n) ? n : n[0].toLowerCase() + n.slice(1);
}
const sentenceLabel = (food) => { const t = LABEL[food] ? LABEL[food][0] : DISH.get(food).n; return t[0] + t.slice(1).toLowerCase().replace(/\bbbq\b/, "BBQ"); };

const shortOf = (c) => c.a || c.n;
const titleName = (c) => c.t || shortOf(c);
const urlPath = (p) => `/campus/${p.campus}/${p.food}`;
const fmt = (n) => n.toLocaleString("en-US");

function mapsLink(p) {
  const q = `${p.n} ${p.st} ${p.loc} ${p.reg}`.replace(/\s+/g, " ").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* The count leads: "112 Italian Restaurants Near Suffolk University". A
   number is the one thing a directory result never puts first, and it is the
   page's real content. No "best", "verified" or "top picks": the listings are
   unranked and unreviewed, and a title that promises more than the page has
   wins the click and loses the visitor. */
const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

function title(p, c) {
  const [L, noun] = label(p.food);
  const TN = titleCase(noun);
  const n = fmt(p.n);
  /* The settled search name, then the full name; a raw abbreviation only when
     nothing else fits, since many are ambiguous ("BC" is Broward College here
     and Boston College to most readers). */
  const plain = c.n.replace(/[- ]Main Campus$/, "").replace(/^City Colleges of Chicago-/, "");
  const names = [...new Set([c.t, plain, c.t ? null : c.a].filter(Boolean))];
  const options = names.flatMap((who) => [
    `${n} ${TN} Near ${who} — Closest First`,
    `${n} ${TN} Near ${who} | Savor Scout`,
    `${n} ${TN} Near ${who}`,
  ]);
  const fallback = names.flatMap((who) => [`${L} Near ${who}: ${n} Within a Mile`, `${L} Near ${who}`]);
  return options.find((t) => t.length <= 60) || [...options, ...fallback].find((t) => t.length <= 65) || fallback[fallback.length - 1];
}

function desc(p, c) {
  const [, noun] = label(p.food);
  const who = c.d || c.n;
  const k = p.places.length;
  return [
    `Looking for ${noun} near ${who}? All ${fmt(p.n)} within a mile, the closest ${k} with addresses and walking distance, and what to order.`,
    `Looking for ${noun} near ${who}? All ${fmt(p.n)} within a mile, the closest ${k} with addresses and walking distance.`,
    `${fmt(p.n)} ${noun} within a mile of ${who}, the closest ${k} with addresses and walking distance.`,
  ].find((d) => d.length <= 160) || `${fmt(p.n)} ${noun} within a mile of ${who}.`;
}

/* ---- the page ----------------------------------------------------------- */

function build(p, { ORIGIN, HOME, HUB, STATES, breadcrumb, crumbHtml }) {
  const c = CAMPUS.get(p.campus);
  const dish = DISH.get(p.food);
  const [L, noun] = label(p.food);
  const short = shortOf(c);
  const url = `${ORIGIN}${urlPath(p)}`;
  const place = `${c.c}, ${c.r}`;
  const app = `/?near=${encodeURIComponent(place)}&craving=${encodeURIComponent(inSentence(dish.n))}`;
  const trail = [HOME, HUB,
    { name: STATES[c.r] || c.r, url: `${ORIGIN}/campus/${c.r.toLowerCase()}` },
    { name: short, url: `${ORIGIN}/campus/${c.s}` },
    { name: L, url }];

  const siblings = PAGES.filter((o) => o.campus === p.campus && o.food !== p.food);
  const sameFood = PAGES.filter((o) => o.food === p.food && o.campus !== p.campus).slice(0, 12);

  const qa = [
    [`How many ${noun} are near ${short}?`,
      `Open map listings put ${fmt(p.n)} ${noun} within a mile of ${c.n}` +
      `${p.w ? `, ${fmt(p.w)} of them within a ten-minute walk` : ""}${p.n3 > p.n ? `, and ${fmt(p.n3)} within 3 miles` : ""}. ` +
      `About ${p.loc}% are independent rather than chains.`],
    [`Which ${noun} are closest to ${short}?`,
      `${listSentence(p.places.slice(0, 5).map((x) => `${x.n} (${x.mi < 0.1 ? "under 0.1" : x.mi} mi)`))}.`],
    ...(p.st.length ? [[`Where are most ${noun} near ${short}?`,
      `The busiest ${p.st.length === 1 ? "street is" : "streets are"} ${listSentence(p.st.map(([s, n]) => `${s} (${n})`))}.`]] : []),
  ];

  const body = `      ${crumbHtml(trail)}
      <h1>${esc(sentenceLabel(p.food))} near ${esc(c.n)}${c.a && c.a !== c.n && /^[A-Z&]{2,6}$/.test(c.a) ? ` (${esc(c.a)})` : ""}</h1>
      <p><a class="cta" href="${app}">Find ${esc(inSentence(dish.n))} near ${esc(short)} &rarr;</a></p>
      <div class="stats">
        <div class="stat"><b>${fmt(p.n)}</b><span>${esc(noun)} within 1 mile</span></div>
        <div class="stat"><b>${fmt(p.w)}</b><span>within a ten-minute walk</span></div>
        <div class="stat"><b>${p.loc}%</b><span>independent, not chains</span></div>
      </div>
      <p class="lede">
        Open map listings put ${fmt(p.n)} ${esc(noun)} within a mile of ${esc(c.n)}${p.w ? `, ${fmt(p.w)} of them within a ten-minute walk` : ""}${p.n3 > p.n ? `, and ${fmt(p.n3)} within 3 miles` : ""}.
        ${p.st.length ? `The busiest ${p.st.length === 1 ? "street is" : "streets are"} ${listSentence(p.st.map(([s, n]) => `${esc(s)} (${n})`))}.` : ""}
      </p>

      <h2>The closest ${esc(noun)} to ${esc(short)}</h2>
      <ul class="spots">
        ${p.places.map((x) => `<li><a href="${mapsLink(x)}" rel="nofollow noopener" target="_blank"><strong>${esc(x.n)}</strong></a>` +
          `${x.c ? ` <span class="pill pill--sm pill--plain">${esc(x.c)}</span>` : ""} · ${x.mi < 0.1 ? "under 0.1 miles" : `${x.mi} ${x.mi === 1 ? "mile" : "miles"}`}` +
          `<br><span class="addr">${esc([x.st, x.loc].filter(Boolean).join(", "))}</span></li>`).join("\n        ")}
      </ul>
      <p class="note">
        Chosen local-first, then listed by distance from campus: a starting point, not a ranking. Listings from
        <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a> open data (September 2026);
        they carry no prices or opening hours, so check before you go.
      </p>

      <h2>What to order</h2>
      <ul>
        ${dish.order.slice(0, 4).map(([h, t]) => `<li><strong>${esc(h)}</strong> — ${esc(t)}</li>`).join("\n        ")}
      </ul>

      <h2>How to spot a good one</h2>
      <ul>
        ${dish.good.slice(0, 3).map(([h, t]) => `<li><strong>${esc(h)}</strong> — ${esc(t)}</li>`).join("\n        ")}
      </ul>
      <p>The whole picture is in the <a href="/food/${p.food}">${esc(inSentence(dish.n))} guide</a>.</p>

      <h2>Questions about ${esc(noun)} near ${esc(short)}</h2>
      <dl class="faq">
        ${qa.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("\n        ")}
      </dl>

      <h2>More near ${esc(short)}</h2>
      <p class="pills">
        <a class="pill" href="/campus/${c.s}">All food near ${esc(short)}</a>
        ${siblings.map((o) => `<a class="pill" href="${urlPath(o)}">${esc(label(o.food)[0])} near ${esc(short)}</a>`).join("\n        ")}
      </p>
${sameFood.length ? `
      <h2>${esc(L)} near other campuses</h2>
      <ul class="cards">
        ${sameFood.map((o) => { const oc = CAMPUS.get(o.campus); return `<li class="card"><a href="${urlPath(o)}">${esc(L)} near ${esc(shortOf(oc))}</a>` +
          `<span class="meta">${fmt(o.n)} within a mile · ${esc(oc.c)}, ${esc(oc.r)}</span></li>`; }).join("\n        ")}
      </ul>` : ""}
      <hr>
      <p><a href="/campus/${c.s}">${esc(c.n)}</a> &middot; <a href="/food/${p.food}">${esc(dish.n)} guide</a> &middot;
         <a href="/campus/">All campuses</a></p>`;

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage", name: title(p, c), description: desc(p, c), url,
        about: { "@type": "CollegeOrUniversity", name: c.n,
          address: { "@type": "PostalAddress", addressLocality: c.c, addressRegion: c.r, addressCountry: "US" } },
        mainEntity: {
          "@type": "ItemList", name: `${L} near ${c.n}`, numberOfItems: p.places.length,
          itemListElement: p.places.map((x, i) => ({
            "@type": "ListItem", position: i + 1,
            item: { "@type": p.food === "coffee" ? "CafeOrCoffeeShop" : p.food === "bakery" ? "Bakery" : "Restaurant",
              name: x.n,
              address: { "@type": "PostalAddress", streetAddress: x.st, ...(x.loc ? { addressLocality: x.loc } : {}),
                ...(x.reg ? { addressRegion: x.reg } : {}), ...(x.zip ? { postalCode: x.zip } : {}), addressCountry: "US" },
              geo: { "@type": "GeoCoordinates", latitude: x.lat, longitude: x.lng } },
          })),
        },
        isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
        breadcrumb: breadcrumb(trail),
      },
      { "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };
  return { url, title: title(p, c), desc: desc(p, c), body, ld: JSON.stringify(ld) };
}

/* ---- the links in ------------------------------------------------------- */

/* On a campus page: every cuisine page that campus has. */
function campusLinksHtml(c) {
  const mine = PAGES.filter((p) => p.campus === c.s);
  if (!mine.length) return "";
  const short = shortOf(c);
  return `
      <h2>Food guides for ${esc(short)}</h2>
      <p class="pills">
        ${mine.map((p) => `<a class="pill" href="${urlPath(p)}">${esc(label(p.food)[0])} near ${esc(short)} <span class="ct">${fmt(p.n)}</span></a>`).join("\n        ")}
      </p>`;
}

/* On a food guide: every campus with a page for that food. */
/* Capped: a guide is read by people, and 300 cards is not a section. Every
   page is also linked from its own campus page and its sibling pages, so the
   cap costs no page its way in. */
function guideLinksHtml(food) {
  const mine = PAGES.filter((p) => p.food === food).sort((a, b) => b.n - a.n).slice(0, 48);
  if (!mine.length) return "";
  const [L] = label(food);
  return `
      <h2>${esc(L)} near campus</h2>
      <ul class="cards">
        ${mine.map((p) => { const c = CAMPUS.get(p.campus); return `<li class="card"><a href="${urlPath(p)}">${esc(L)} near ${esc(shortOf(c))}</a>` +
          `<span class="meta">${fmt(p.n)} within a mile · ${esc(c.c)}, ${esc(c.r)}</span></li>`; }).join("\n        ")}
      </ul>`;
}

module.exports = { PAGES, build, campusLinksHtml, guideLinksHtml, urlPath };
