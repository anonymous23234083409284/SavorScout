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
        The closest few by distance from ${esc(from)}, not a ranking — local places listed ahead of
        chains. Listings from <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a>
        open data (September 2026); hours and openings change, so check before you go.
        Want one picked for what you're craving instead? <a href="${appLink}">${esc(ctaText)}</a>.
      </p>`;
}

function schemaType(p) {
  if (p.c === "Café") return "CafeOrCoffeeShop";
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

module.exports = { spotsFor, spotsHtml, spotsLd };
