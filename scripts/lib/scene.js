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
function inline(label, slug) {
  if (slug && slug.endsWith("-food") && !COMMON_FOOD.has(slug)) return label;
  if (slug === "american-food" || /^(Tex-Mex|Cajun|Latin|Pan-Asian|Middle|Southern|Asian)/.test(label)) return label;
  if (!slug && /^[A-Z][a-z]+(an|ese|ish|ian|ic|i|ch)$/.test(label.split(" ")[0])) return label;
  return label.toLowerCase();
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
  const top = sc.top.filter((t) => t[0] !== "Coffee").slice(0, 3);
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
        <div class="stat"><b>${fmt(sc.cof)}</b><span>coffee shops and cafés</span></div>
      </div>
      <p>
        Open listings put ${fmt(sc.n)} places to eat within ${radius} of ${esc(where)}, ${walk}.${lead}
        ${sc.ff ? `${fmt(sc.ff)} are fast-food counters; the rest are sit-down restaurants, cafés, bakeries and takeaway spots.` : ""}
      </p>${hi}
      <p class="pills-label">By type of food — tap one for what to order and how to spot a good one:</p>
      <p class="pills">
        ${sc.top.map((t) => pill(t[0], t[1], t[2])).join("\n        ")}
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

function whereLd(g, name) {
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
        "@type": "Restaurant",
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
  systemOf,
};
