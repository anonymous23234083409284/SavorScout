/* Puts a "popular guides" row on the homepage, and only the homepage.
 *
 * Runs LAST in postbuild, after every generator has already read
 * build/index.html as its shell — so the row is injected into the homepage
 * alone and never propagates to the 1,856 generated pages. On those, the
 * #ss-home-popular placeholder is an empty div.
 *
 * WHY THESE PAGES
 * A link from the homepage is the strongest internal link the site can give,
 * and it should go to the pages closest to page one rather than being spread
 * evenly. These are the pages Search Console showed pulling the most
 * impressions on 24 September — /food/korean-food at 88 across ten phrasings,
 * the campus hub over the long tail of "restaurants near <school>" queries,
 * soup, eating alone, salad, gluten-free. Anchor text is worded the way those
 * queries are typed.
 *
 * Update this list from Search Console, not from intuition. When a page starts
 * ranking on its own, swap it out for the next one sitting at positions 11–20.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "build", "index.html");
/* An empty element rather than a comment: react-scripts minifies index.html
   and strips HTML comments, so a comment marker never reaches the build. */
const MARKER = '<div id="ss-home-popular"></div>';

/* Guides, ordered by Search Console impressions on 18 October (see
   data/search-focus.js), anchor text worded the way those searches are typed.
   The last three are earlier picks kept because they still pull impressions. */
const FOCUS = require("./data/search-focus");
const ANCHOR = {
  "/food/korean-food": "Korean restaurants near you",
  "/food/coffee": "Coffee shops near you",
  "/food/soup": "Good soup near you",
  "/food/chicken-sandwich": "Chicken sandwiches near you",
  "/food/venezuelan-food": "Venezuelan food near you",
  "/food/arepas": "Arepas near you",
  "/campus/": "Restaurants near campus",
  "/diet/shellfish-allergy": "Eating out with a shellfish allergy",
  "/food/afghan-food": "Afghan food near you",
};
const POPULAR = [
  ...FOCUS.pages.map(([p]) => p).filter((p) => ANCHOR[p]).map((p) => [p, ANCHOR[p]]),
  ["/what-to-eat/eating-alone", "Eating alone at a restaurant"],
  ["/diet/gluten-free", "Eating out gluten-free"],
  ["/what-to-eat/cant-decide", "Can't decide where to eat"],
];

/* And the campus pages Google shows most: the site's clicks have always come
   from campus searches, so the homepage points straight at the eight closest
   to the top of page one. */
const { CAMPUSES } = require("./lib/campuses");
const BY_SLUG = new Map(CAMPUSES.map((c) => [c.s, c]));
const CAMPUS_LINKS = FOCUS.pages.map(([p]) => p)
  .filter((p) => /^\/campus\/[^/]+$/.test(p) && BY_SLUG.has(p.slice(8)))
  .slice(0, 8)
  .map((p) => { const c = BY_SLUG.get(p.slice(8)); return [p, `Near ${c.a && c.a.length <= 24 ? c.a : c.n}`]; });

let html = fs.readFileSync(FILE, "utf8");
if (!html.includes(MARKER)) {
  console.error("make-home-links: marker missing from build/index.html — was the footer nav removed?");
  process.exit(1);
}

/* Every target must exist in the build. A homepage link to a page that is not
   there would be the worst broken link on the site. */
const missing = [...POPULAR, ...CAMPUS_LINKS].filter(([href]) => {
  const p = href.replace(/\/$/, "");
  return !fs.existsSync(path.join(__dirname, "..", "build", p + ".html")) &&
         !fs.existsSync(path.join(__dirname, "..", "build", p, "index.html"));
});
if (missing.length) {
  console.error(`make-home-links: targets not in build: ${missing.map(([h]) => h).join(", ")}`);
  process.exit(1);
}

const row = `<div style="margin:0 0 14px;color:#FDF8F2;font-weight:600">Popular guides</div>
        <div style="margin:0 0 20px">${POPULAR.map(([href, label]) =>
          `<a href="${href}" style="color:#FF9E1F;margin:0 10px;text-decoration:none;white-space:nowrap">${label}</a>`).join("\n        ")}</div>
        <div style="margin:0 0 14px;color:#FDF8F2;font-weight:600">Restaurants near campus</div>
        <div style="margin:0 0 20px">${CAMPUS_LINKS.map(([href, label]) =>
          `<a href="${href}" style="color:#FF9E1F;margin:0 10px;text-decoration:none;white-space:nowrap">${label}</a>`).join("\n        ")}</div>`;

html = html.replace(MARKER, '<div id="ss-home-popular">' + row + '</div>');
fs.writeFileSync(FILE, html);
console.log(`make-home-links: ${POPULAR.length} popular guides and ${CAMPUS_LINKS.length} campuses linked from the homepage`);
