/* The food scene around a place, and where each food is found.
 *
 * Reads scripts/data/food-scene.json, built by scripts/fetch-nearby-places.py
 * from the Overture Maps places dataset. Every number here is a count of real
 * listings; nothing is estimated or ranked by quality. The copy says "listed"
 * rather than "there are", because a listing dataset undercounts and the page
 * should not claim more precision than it has.
 *
 * The other half of this file is linking. Every cuisine becomes a pill that
 * points at its food guide, every city and campus named in a guide points at
 * its page, and campuses point at their neighbours. That is what turns two
 * thousand separate pages into one site a crawler (and a reader) can walk.
 */
const fs = require("fs");
const path = require("path");
const { esc } = require("./page");
const { CAMPUSES } = require("./campuses");

const FILE = path.join(__dirname, "..", "data", "food-scene.json");
const DATA = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { pages: {}, guides: {} };
const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "us-cities.json"), "utf8"));
const CITY = new Map(CITIES.map((c) => [c.s, c]));
const CAMPUS = new Map(CAMPUSES.map((c) => [c.s, c]));

const fmt = (n) => n.toLocaleString("en-US");

function miles(a, b) {
  const R = 3958.8, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* "diet:vegan" -> /diet/vegan, "korean-food" -> /food/korean-food. */
function guideHref(slug) {
  if (!slug) return null;
  return slug.startsWith("diet:") ? `/diet/${slug.slice(5)}` : `/food/${slug}`;
}

function pill(label, slug, count) {
  const href = guideHref(slug);
  const ct = count != null ? ` <span class="ct">${fmt(count)}</span>` : "";
  return href
    ? `<a class="pill" href="${href}">${esc(label)}${ct}</a>`
    : `<span class="pill pill--plain">${esc(label)}${ct}</span>`;
}

/* How a food type reads mid-sentence: "Italian" and "Korean" keep their
   capital, "Pizza" and "Coffee" lose it. Cuisine guides are the ones whose
   slug ends in -food, which is exactly the set named after a people or place. */
const COMMON_FOOD = new Set(["soul-food", "halal-food", "asian-fusion-food", "american-food"]);
const PLURAL = { Bakery: "bakeries", Deli: "delis", Diner: "diners", Buffet: "buffets", Steakhouse: "steakhouses",
  Gastropub: "gastropubs", Bistro: "bistros", Cafeteria: "cafeterias" };
function inline(label, slug) {
  if (PLURAL[label]) return PLURAL[label];
  if (slug && slug.endsWith("-food") && !COMMON_FOOD.has(slug)) return label;
  if (slug === "american-food" || /^(Tex-Mex|Cajun|Latin|Pan-Asian|Middle|Southern|Asian)/.test(label)) return label;
  if (!slug && /^[A-Z][a-z]+(an|ese|ish|ian|ic|i|ch)$/.test(label.split(" ")[0])) return label;
  return label.toLowerCase();
}

/* The types worth naming as "most common": at least three places each, at most
   k of them, and never a cut through a tie (naming two of four types on 3
   places each would be an arbitrary pick presented as a finding). */
function leaders(top, k) {
  const ok = top.filter((t) => t[2] >= 3);
  let n = Math.min(k, ok.length);
  while (n > 0 && n < ok.length && ok[n - 1][2] === ok[n][2]) n--;
  return ok.slice(0, n);
}

function listSentence(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/* ---- campus and city pages ---------------------------------------------- */

function sceneFor(key) {
  return DATA.pages[key] || null;
}

/* `around` reads "around campus" / "in central Waco"; `where` is the place name. */
function sceneHtml(sc, { where, around, isCampus }) {
  if (!sc) return "";
  const radius = `${sc.r} ${sc.r === 1 ? "mile" : "miles"}`;
  const walk = sc.w === 0
    ? `none of them within a ten-minute walk${isCampus ? " of the middle of campus" : ""}`
    : `${fmt(sc.w)} within a ten-minute walk (half a mile)`;
  const top = leaders(sc.top, 3);
  const lead = top.length
    ? ` The most common: ${listSentence(top.map((t) => `${esc(inline(t[0], t[1]))} (${fmt(t[2])})`))}.`
    : "";
  const hi = sc.hi.length
    ? `
      <p>
        What stands out ${esc(around)} is ${listSentence(sc.hi.map((h) =>
          `${guideHref(h[1]) ? `<a href="${guideHref(h[1])}">${esc(inline(h[0], h[1]))}</a>` : esc(inline(h[0], h[1]))}`))}
        — ${sc.hi.length === 1 ? "a type that is" : "types that are"} listed here at
        ${sc.hi.length === 1 ? `about ${Math.round(sc.hi[0][2])} times` : `${Math.round(sc.hi[sc.hi.length - 1][2])} to ${Math.round(sc.hi[0][2])} times`}
        the national rate.
      </p>`
    : "";
  return `
      <h2>The food scene ${esc(around)}</h2>
      <div class="stats">
        <div class="stat"><b>${fmt(sc.n)}</b><span>places to eat within ${radius}</span></div>
        <div class="stat"><b>${sc.loc}%</b><span>independent, not chains</span></div>
        <div class="stat"><b>${fmt(sc.cof)}</b><span>${sc.cof === 1 ? "coffee shop or café" : "coffee shops and cafés"}</span></div>
      </div>
      <p>
        Open listings put ${fmt(sc.n)} places to eat within ${radius} of ${esc(where)}, ${walk}${sc.n3 > sc.n && sc.r < 3 ? `,
        and ${fmt(sc.n3)} within 3 miles` : ""}.${lead}
        ${sc.ff ? `${sc.ff === 1 ? "One is a fast-food counter" : `${fmt(sc.ff)} are fast-food counters`}; the rest are sit-down restaurants, cafés, bakeries and takeaway spots.` : ""}
      </p>${sc.st && sc.st.length ? `
      <p>
        <strong>Where to walk:</strong> ${sc.st.length === 1 ? "the street with the most places to eat" : "the streets with the most places to eat"}
        within ${radius} ${sc.st.length === 1 ? "is" : "are"} ${listSentence(sc.st.map(([st, n]) => `${esc(st)} (${fmt(n)})`))}.
      </p>` : ""}${hi}
${sc.top.length ? `
      <p class="pills-label">By type of food — tap one for what to order and how to spot a good one:</p>
      <p class="pills">
        ${sc.top.map((t) => pill(t[0], t[1], t[2])).join("\n        ")}
      </p>` : ""}`;
}

/* "1 is a coffee shop", "none are fast-food counters", "12 are …". */
function count(n, one, many) {
  return n === 0 ? `none ${many}` : n === 1 ? `one ${one}` : `${fmt(n)} ${many}`;
}

/* ---- questions people search, answered from the page's own data -------- */

/* `name` is how the place is searched ("RPI", "Waco"); `near` finishes
   "places to eat ..." ("near RPI", "in central Waco"). Every answer is built
   from the same numbers shown above it, so the FAQ can never disagree with the
   page. Returns { html, ld } or null when there is nothing to answer with. */
function faq({ name, near, sc, spots }) {
  const qa = [];
  if (spots && spots.length) {
    qa.push([`What restaurants are ${near}?`,
      `A few to start with, nearest first: ${listSentence(spots.map((p) =>
        `${p.n}${p.c ? ` (${p.c.toLowerCase()}, ${p.mi < 0.1 ? "under 0.1" : p.mi} mi)` : ""}`))}. ` +
      `They are chosen local-first, then listed by distance; a starting point, not a ranking.`]);
  }
  if (sc) {
    const radius = `${sc.r} ${sc.r === 1 ? "mile" : "miles"}`;
    qa.push([`How many places to eat are ${near}?`,
      `Open map listings put ${fmt(sc.n)} places to eat within ${radius}` +
      `${sc.w ? `, ${fmt(sc.w)} of them within a ten-minute walk` : ""}` +
      `${sc.n3 > sc.n && sc.r < 3 ? `, and ${fmt(sc.n3)} within 3 miles` : ""}. About ${sc.loc}% are independent rather than chains; ` +
      `${count(sc.cof, "is a coffee shop or café", "are coffee shops or cafés")} and ` +
      `${count(sc.ff, "is a fast-food counter", "are fast-food counters")}.`]);
    if (sc.st && sc.st.length) {
      const streets = sc.st.map(([st, n]) => `${st} (${fmt(n)} ${n === 1 ? "place" : "places"})`);
      qa.push([`Where is the food ${near}?`,
        `The busiest ${streets.length === 1 ? "street is" : "streets are"} ${listSentence(streets)}.`]);
    }
    const top = leaders(sc.top, 4);
    if (top.length) {
      qa.push([`What kind of food is ${near}?`,
        `The most common types are ${listSentence(top.map((t) => `${inline(t[0], t[1])} (${fmt(t[2])})`))}.` +
        (sc.hi.length ? ` Unusually common compared with the rest of the country: ${listSentence(sc.hi.map((h) => inline(h[0], h[1])))}.` : "")]);
    }
  }
  if (!qa.length) return null;
  return {
    html: `
      <h2>Questions about eating ${esc(near)}</h2>
      <dl class="faq">
        ${qa.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("\n        ")}
      </dl>`,
    ld: {
      "@type": "FAQPage",
      mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  };
}

/* One JSON-LD block holding the page and its FAQ. */
function withFaq(pageLd, f) {
  if (!f) return pageLd;
  const { ["@context"]: ctx, ...page } = pageLd;
  return { "@context": ctx || "https://schema.org", "@graph": [page, f.ld] };
}

/* ---- links into the core cuisine guides, the budget guide, and late night */

/* The four cuisine guides with the biggest "near me" searches behind them
   (Mexican 1.2M a month, Asian 301K, Vietnamese 165K, Korean 135K), linked
   from a campus or city page only where that food is actually there. */
const CORE = [
  ["Mexican food", "/food/mexican-food", (sc) => (sc.cz || {}).Mexican || 0, 3],
  ["Asian food", "/food/asian-food", (sc) => sc.as || 0, 5],
  ["Korean food", "/food/korean-food", (sc) => (sc.cz || {}).Korean || 0, 2],
  ["Vietnamese food", "/food/vietnamese-food", (sc) => (sc.cz || {}).Vietnamese || 0, 2],
];

function cravingsHtml(sc, where) {
  if (!sc) return "";
  const radius = `${sc.r} ${sc.r === 1 ? "mile" : "miles"}`;
  const hits = CORE.map(([label, href, n, min]) => [label, href, n(sc), min]).filter(([, , n, min]) => n >= min)
    .sort((a, b) => b[2] - a[2]);
  if (!hits.length) return "";
  return `
      <p>
        <strong>Popular cravings ${esc(where)}</strong>, within ${radius}:
        ${listSentence(hits.map(([label, href, n], i) => `<a href="${href}">${label}</a> (${fmt(n)}${i === 0 ? ` ${n === 1 ? "place" : "places"}` : ""})`))}.
        Each guide covers what to order and how to tell a good kitchen from an average one.
      </p>`;
}

/* Every campus page: where the cheap meals are, and the guide to finding them. */
function budgetHtml(sc, name, appLink) {
  const fast = sc && sc.ff
    ? ` Of the places listed nearby, ${fmt(sc.ff)} ${sc.ff === 1 ? "is a fast-food counter" : "are fast-food counters"}: the cheapest default, rarely the cheapest good meal.`
    : "";
  return `
      <h2>Eating on a student budget near ${esc(name)}</h2>
      <p>
        Cheap and bad overlap much less than price filters suggest.${fast} The value is usually in lunch
        specials, counter service, short menus and dishes built on rice, noodles, bread or beans.
        <a href="/what-to-eat/on-a-budget">Where to eat when you're broke</a> covers what to look for, or
        <a href="${appLink}&craving=${encodeURIComponent("cheap eats")}">search cheap eats near ${esc(name)}</a>.
      </p>`;
}

/* "Open now" searches are real and big, but nothing here knows live hours, so
   this sends them where the honest help is: the late-night guide on how to
   check, and a search, with the caveat said out loud. */
function openNowHtml(name, appLink) {
  return `
      <p class="note">
        <strong>Need somewhere open right now?</strong> These listings do not carry live opening hours, and
        late at night a fair share of what is listed as open is not. The
        <a href="/what-to-eat/late-night">late-night guide</a> covers how to check before you go, or
        <a href="${appLink}&craving=${encodeURIComponent("late night food")}">search late-night food near ${esc(name)}</a>
        and call ahead.
      </p>`;
}

/* ---- campus neighbours -------------------------------------------------- */

/* "University of California-Davis" and "University of California-Irvine" are
   one system; so are the CUNY and SUNY colleges and "The University of Texas
   at ...". Returns null for a school that is not obviously part of one. */
function systemOf(name) {
  if (/\bCUNY\b/.test(name)) return "CUNY";
  if (/\bSUNY\b|State University of New York/.test(name)) return "SUNY";
  let m = /^(The University of [A-Z][A-Za-z .&]+?) at [A-Z]/.exec(name)
    || /^(University of [A-Z][A-Za-z .&]+?) at [A-Z]/.exec(name);
  if (m) return m[1].replace(/^The /, "");
  m = /^(.+?(?:University|College|System)(?: of [A-Z][A-Za-z .&]+)?)-[A-Z]/.exec(name);
  if (m) return m[1].replace(/^The /, "");
  return null;
}

const BY_SYSTEM = new Map();
for (const c of CAMPUSES) {
  const s = systemOf(c.n);
  if (!s) continue;
  if (!BY_SYSTEM.has(s)) BY_SYSTEM.set(s, []);
  BY_SYSTEM.get(s).push(c);
}

function nearestCampuses(from, k, maxMiles, skip) {
  return CAMPUSES
    .filter((o) => o.s !== skip)
    .map((o) => ({ ...o, miles: Math.round(miles(from, o) * 10) / 10 }))
    .filter((o) => o.miles <= maxMiles)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, k);
}

function campusCard(o, note) {
  return `<li class="card"><a href="/campus/${o.s}">${esc(o.n)}</a>` +
    `<span class="meta">${esc(o.c)}, ${esc(o.r)}${note ? ` · ${esc(note)}` : ""}</span></li>`;
}

function neighboursHtml(c) {
  const near = nearestCampuses(c, 6, 60, c.s);
  const system = systemOf(c.n);
  const sisters = system
    ? (BY_SYSTEM.get(system) || []).filter((o) => o.s !== c.s && !near.some((n) => n.s === o.s)).slice(0, 6)
    : [];
  let html = "";
  if (near.length) {
    html += `
      <h2>Nearby campuses</h2>
      <p>Comparing schools, or eating with friends across town? These are the closest campuses to ${esc(c.a || c.n)}.</p>
      <ul class="cards">
        ${near.map((o) => campusCard(o, `${o.miles} ${o.miles === 1 ? "mile" : "miles"}`)).join("\n        ")}
      </ul>`;
  }
  if (sisters.length) {
    html += `
      <h2>Other ${esc(system)} campuses</h2>
      <ul class="cards">
        ${sisters.map((o) => campusCard(o)).join("\n        ")}
      </ul>`;
  }
  return html;
}

/* For a city page: the campuses in and around it. */
function cityCampusesHtml(city) {
  const near = nearestCampuses(city, 8, 20, null);
  if (!near.length) return "";
  return `
      <h2>Campuses in and near ${esc(city.c)}</h2>
      <p>Each has its own page: what is within walking distance and a few places to start with.</p>
      <ul class="cards">
        ${near.map((o) => campusCard(o, o.miles < 1 ? "in town" : `${o.miles} miles`)).join("\n        ")}
      </ul>`;
}

/* ---- the way back: guide -> place, and place -> guide ------------------ */

/* Each food guide lists the cities and campuses with the most of its food.
   This is the reverse: on those city and campus pages, a line per guide saying
   where the place ranks, linking back. Every link in the guide now has a link
   returning to it, so the guide and the places it names reinforce each other.
   Only guides counted from their own restaurant type: a dish found "at Mexican
   restaurants" would repeat the same Mexican count a dozen times. */
const DISH_NAME = new Map([
  ...require("../data/dishes"), ...require("../data/dishes-more"), ...require("../data/dishes-cuisines"),
  ...require("../data/dishes-formats"), ...require("../data/dishes-formats-2"),
].map((d) => [d.s, d.n]));
const PROPER_START = /^(Korean|Nashville|Peking|Chinese|Pad|Bún|Neapolitan|New|Detroit|Italian|Eggs|Cuban|Tacos al|Po')/;
const guideName = (g) => {
  if (g.startsWith("diet:")) return `${g.slice(5)} food`;
  const n = DISH_NAME.get(g);
  if (!n || / food$/.test(n) || PROPER_START.test(n)) return n;
  return n[0].toLowerCase() + n.slice(1);
};

const RANKS = { city: new Map(), campus: new Map() };
for (const [g, d] of Object.entries(DATA.guides)) {
  if (d.via || !guideName(g)) continue;
  for (const [type, list] of [["city", d.cities], ["campus", d.campuses]]) {
    list.forEach(([s, n]) => {
      if (n <= 2) return;   // "#3 for empanadas, 2 listed" is noise, not a standing
      if (!RANKS[type].has(s)) RANKS[type].set(s, []);
      /* Competition ranking: places on the same count share the rank. */
      RANKS[type].get(s).push({ g, rank: 1 + list.filter(([, m]) => m > n).length, n, kind: d.kinds[0] });
    });
  }
}

function ranksHtml(type, slug, name) {
  const list = (RANKS[type].get(slug) || []).sort((a, b) => a.rank - b.rank || b.n - a.n).slice(0, 8);
  if (!list.length) return "";
  const among = type === "city"
    ? `the ${fmt(CITIES.length)} US cities on Savor Scout`
    : `the ${fmt(CAMPUSES.length)} campuses on Savor Scout, counting what is within a mile`;
  return `
      <h2>Where ${esc(name)} stands out</h2>
      <p>Among ${among}, ${esc(name)} ranks near the top for these. Each guide covers what to order and how to tell a good one.</p>
      <ul class="ranks">
        ${list.map((r) => `<li><b>#${r.rank}</b><span>for <a href="${guideHref(r.g)}">${esc(guideName(r.g))}</a>` +
          ` — ${fmt(r.n)} ${esc(r.kind)} listed</span></li>`).join("\n        ")}
      </ul>`;
}

/* ---- food and diet guides ----------------------------------------------- */

function guideFor(key) {
  return DATA.guides[key] || null;
}

function mapsLink(p) {
  const q = `${p.n} ${p.st} ${p.loc} ${p.reg}`.replace(/\s+/g, " ").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* `name` is how the guide names its food: "Korean food", "birria". */
function whereHtml(g, name) {
  if (!g) return "";
  const kinds = listSentence(g.kinds);
  const intro = g.via
    ? `${esc(name[0].toUpperCase() + name.slice(1))} is mostly found at ${esc(kinds)}, so that is where to look.
        Open listings put ${fmt(g.natl)} of them across the US, and these are the cities and campuses
        with the most.`
    : `Open listings put ${fmt(g.natl)} ${esc(kinds)} across the US. These are the cities and campuses
        with the most of them.`;
  const cities = g.cities.filter((c) => CITY.has(c[0]));
  const camps = g.campuses.filter((c) => CAMPUS.has(c[0]));
  const ex = g.ex.filter((e) => CITY.has(e.city));
  return `
      <h2>Where to find ${esc(name)}</h2>
      <p>
        ${intro}
      </p>${cities.length ? `
      <h3>Cities with the most</h3>
      <p class="pills">
        ${cities.map(([s, n]) => `<a class="pill" href="/eat/${s}">${esc(CITY.get(s).c)}, ${esc(CITY.get(s).r)} <span class="ct">${fmt(n)}</span></a>`).join("\n        ")}
      </p>` : ""}${camps.length ? `
      <h3>Campuses with the most within a mile</h3>
      <p class="pills">
        ${camps.map(([s, n]) => `<a class="pill" href="/campus/${s}">${esc(CAMPUS.get(s).a || CAMPUS.get(s).n)} <span class="ct">${fmt(n)}</span></a>`).join("\n        ")}
      </p>` : ""}${ex.length ? `
      <h3>A few to start with</h3>
      <ul class="spots">
        ${ex.map((e) => `<li><a href="${mapsLink(e)}" rel="nofollow noopener" target="_blank"><strong>${esc(e.n)}</strong></a>` +
          ` — <a href="/eat/${e.city}">${esc(CITY.get(e.city).c)}, ${esc(CITY.get(e.city).r)}</a>` +
          `<br><span class="addr">${esc([e.st, e.loc].filter(Boolean).join(", "))}</span></li>`).join("\n        ")}
      </ul>` : ""}
      <p class="note">
        Counts are listings in <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a>
        open data (September 2026), counted by the town in each address. Independent places only in the
        examples above, and they are a starting point rather than a ranking.
      </p>`;
}

/* The schema type for a guide's places: a coffee shop is not a Restaurant. */
const PLACE_TYPE = { coffee: "CafeOrCoffeeShop", matcha: "CafeOrCoffeeShop", bakery: "Bakery", donuts: "Bakery",
  bagels: "Bakery", "ice-cream": "IceCreamShop", gelato: "IceCreamShop", "shaved-ice": "IceCreamShop",
  "fried-chicken": "FastFoodRestaurant", "hot-dogs": "FastFoodRestaurant" };

function whereLd(g, name, slug) {
  if (!g) return null;
  const ex = g.ex.filter((e) => CITY.has(e.city));
  if (!ex.length) return null;
  return {
    "@type": "ItemList",
    name: `Places to find ${name}`,
    numberOfItems: ex.length,
    itemListElement: ex.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": PLACE_TYPE[slug] || "Restaurant",
        name: e.n,
        address: {
          "@type": "PostalAddress", streetAddress: e.st,
          ...(e.loc ? { addressLocality: e.loc } : {}), ...(e.reg ? { addressRegion: e.reg } : {}),
          ...(e.zip ? { postalCode: e.zip } : {}), addressCountry: "US",
        },
        geo: { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng },
      },
    })),
  };
}

module.exports = {
  sceneFor, sceneHtml, neighboursHtml, cityCampusesHtml, guideFor, whereHtml, whereLd, guideHref, pill,
  systemOf, inline, listSentence, leaders, ranksHtml, faq, withFaq, cravingsHtml, budgetHtml, openNowHtml,
};
