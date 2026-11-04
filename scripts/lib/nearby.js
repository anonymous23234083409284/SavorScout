/* A short list of real restaurants near a campus or city, plus the schema for it.
 *
 * The data is scripts/data/nearby-places.json, built once from the Overture Maps
 * places dataset (open data, CDLA-Permissive-2.0) by scripts/fetch-nearby-places.py.
 * Only places Overture marks as open, with a street address and a confidence of
 * at least 0.7, and local places before chains. The build reads the file and
 * never touches the network.
 *
 * The list says what it is: the closest few, not a ranking. We have no reviews
 * for these places and the copy does not pretend otherwise. The schema describes
 * exactly the places on the page, which is what Google requires of it.
 */
const fs = require("fs");
const path = require("path");
const { esc } = require("./page");

const FILE = path.join(__dirname, "..", "data", "nearby-places.json");
const DATA = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { pages: {} };

function spotsFor(key) {
  return DATA.pages[key] || null;
}

function mapsLink(p) {
  const q = `${p.n} ${p.st} ${p.loc} ${p.reg}`.replace(/\s+/g, " ").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function distance(mi) {
  if (mi < 0.1) return "under 0.1 miles";
  return `${mi} ${mi === 1 ? "mile" : "miles"}`;
}

/* The cuisine as a tag. Where a food guide covers it, the tag is a link to
   that guide, so every restaurant listed on a campus or city page points into
   the guides; elsewhere it is plain text. */
function cuisinePill(p) {
  if (!p.g) return `<span class="pill pill--sm pill--plain">${esc(p.c)}</span>`;
  const href = p.g.startsWith("diet:") ? `/diet/${p.g.slice(5)}` : `/food/${p.g}`;
  return `<a class="pill pill--sm" href="${href}">${esc(p.c)}</a>`;
}

/* `from` finishes the sentence "distance from …": "campus", "downtown Waco". */
function spotsHtml(spots, { heading, from, appLink, ctaText }) {
  if (!spots) return "";
  return `
      <h2>${esc(heading)}</h2>
      <ul class="spots">
        ${spots.map((p) => `<li><a href="${mapsLink(p)}" rel="nofollow noopener" target="_blank"><strong>${esc(p.n)}</strong></a>` +
          `${p.c ? ` ${cuisinePill(p)}` : ""} · ${distance(p.mi)}` +
          `<br><span class="addr">${esc([p.st, p.loc].filter(Boolean).join(", "))}</span></li>`).join("\n        ")}
      </ul>
      <p class="note">
        Chosen local-first, then listed by distance from ${esc(from)}: a starting point, not a
        ranking. Listings from <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a>
        open data (September 2026); hours and openings change, so check before you go.
        Want one picked for what you're craving instead? <a href="${appLink}">${esc(ctaText)}</a>.
      </p>`;
}

function schemaType(p) {
  if (p.c === "Café" || p.c === "Coffee") return "CafeOrCoffeeShop";
  if (p.c === "Fast food") return "FastFoodRestaurant";
  return "Restaurant";
}

function spotsLd(spots, name) {
  if (!spots) return null;
  return {
    "@type": "ItemList",
    name,
    numberOfItems: spots.length,
    itemListElement: spots.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": schemaType(p),
        name: p.n,
        ...(p.c && !["Café", "Fast food"].includes(p.c) ? { servesCuisine: p.c } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: p.st,
          ...(p.loc ? { addressLocality: p.loc } : {}),
          ...(p.reg ? { addressRegion: p.reg } : {}),
          ...(p.zip ? { postalCode: p.zip } : {}),
          addressCountry: "US",
        },
        geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
      },
    })),
  };
}

/* ---- the full list for a campus page ---------------------------------------
 *
 * Every place to eat within the radius the campus page counts (usually a mile),
 * closest first, up to the closest 50 where there are more: scripts/data/
 * campus-places.json, written by fetch-nearby-places.py from the same places as
 * the page's counts. "Restaurants near <campus>" is a search for the list
 * itself; five examples sent people straight back to the results.
 */
const DIR_FILE = path.join(__dirname, "..", "data", "campus-places.json");
const DIR = fs.existsSync(DIR_FILE) ? JSON.parse(fs.readFileSync(DIR_FILE, "utf8")) : { pages: {}, max: 50 };

function directoryFor(slug) {
  const rows = DIR.pages[slug];
  if (!rows || rows.length < 3) return null;
  return rows.map(([n, c, st, loc, reg, zip, lat, lng, mi, g, chain]) =>
    ({ n, c, st, loc, reg, zip, lat, lng, mi, ...(g ? { g } : {}), chain: !!chain }));
}

/* Straight-line distance, so the bands say "about": a walking route runs a
   little longer than the crow flies. */
const BANDS = [
  [0.25, "Right by campus", "about a 5-minute walk"],
  [0.5, "About a 10-minute walk", "a quarter to half a mile"],
  [1.0, "A 10- to 20-minute walk", "half a mile to a mile"],
  [2.0, "One to two miles", "a short drive, bus or bike ride"],
  [Infinity, "Two miles or more", "a short drive"],
];

const milesWord = (r) => (r === 1 ? "a mile" : `${r} miles`);

/* `n` is how many places the page counts within `r` miles; when that is more
   than the list holds, the heading says the list is the closest ones. */
function directoryHtml(rows, { who, n, r, from, appLink, ctaText }) {
  if (!rows) return "";
  const complete = n <= DIR.max;
  const heading = complete
    ? `Every place to eat within ${milesWord(r)} of ${who}`
    : `The ${rows.length} closest places to eat to ${who}`;
  /* Each place goes in the first band it fits; rows are already closest first. */
  const groups = BANDS.map(([hi, title, sub]) => ({ hi, title, sub, items: [] }));
  for (const p of rows) groups.find((g) => p.mi <= g.hi).items.push(p);
  const shown = groups.filter((g) => g.items.length);
  const item = (p) => `<li><a href="${mapsLink(p)}" rel="nofollow noopener" target="_blank"><strong>${esc(p.n)}</strong></a>` +
    `${p.c ? ` ${cuisinePill(p)}` : ""} · ${distance(Math.round(p.mi * 10) / 10)}` +
    `<br><span class="addr">${esc([p.st, p.loc].filter(Boolean).join(", "))}</span></li>`;
  return `
      <h2>${esc(heading)}</h2>
      <p>${complete ? `${rows.length} places, closest first.` : `Closest first, out of ${n.toLocaleString("en-US")} within ${milesWord(r)}.`}
        Distances are straight-line from ${esc(from)}, so a walk runs a little longer.</p>
${shown.map((g) => `      <h3>${esc(g.title)} <span class="note">· ${esc(g.sub)} (${g.items.length})</span></h3>
      <ul class="spots">
        ${g.items.map(item).join("\n        ")}
      </ul>`).join("\n")}
      <p class="note">
        Listings from <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a> open data
        (September 2026), open places with a street address only. Hours and openings change, so check before
        you go. Want one picked for what you're craving instead? <a href="${appLink}">${esc(ctaText)}</a>.
      </p>`;
}

module.exports = { spotsFor, spotsHtml, spotsLd, directoryFor, directoryHtml };
