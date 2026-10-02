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

const POPULAR = [
  ["/food/korean-food", "Korean restaurants near you"],
  ["/campus/", "Restaurants near campus"],
  ["/food/soup", "Good soup near you"],
  ["/what-to-eat/eating-alone", "Eating alone at a restaurant"],
  ["/diet/gluten-free", "Eating out gluten-free"],
  ["/food/salad", "Good salads near you"],
  ["/what-to-eat/nothing-sounds-good", "When nothing sounds good"],
  ["/what-to-eat/cant-decide", "Can't decide where to eat"],
];

let html = fs.readFileSync(FILE, "utf8");
if (!html.includes(MARKER)) {
  console.error("make-home-links: marker missing from build/index.html — was the footer nav removed?");
  process.exit(1);
}

/* Every target must exist in the build. A homepage link to a page that is not
   there would be the worst broken link on the site. */
const missing = POPULAR.filter(([href]) => {
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
          `<a href="${href}" style="color:#FF9E1F;margin:0 10px;text-decoration:none;white-space:nowrap">${label}</a>`).join("\n        ")}</div>`;

html = html.replace(MARKER, '<div id="ss-home-popular">' + row + '</div>');
fs.writeFileSync(FILE, html);
console.log(`make-home-links: ${POPULAR.length} popular links on the homepage`);
