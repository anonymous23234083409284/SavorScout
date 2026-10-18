/* The filtered campus list, shared by every generator that needs it.
 *
 * The exclusion rule lives here rather than in make-campus-pages.js because two
 * generators now depend on knowing which campuses exist: the campus pages
 * themselves, and the city state-hubs, which link across to /campus/<state>.
 * When the rule lived in one script the other could not see it, and the two
 * disagreed about whether a state had any campuses — which is how /campus/pr
 * came to link to /eat/pr, a page that does not exist because Puerto Rico has
 * campuses in IPEDS and no cities in our 1,000-city dataset.
 */
const fs = require("fs");
const path = require("path");

/* Institutions with no single campus to eat near.
 *
 * IPEDS lists online divisions and multi-campus districts as institutions in
 * their own right, with a mailing address attached. That address is an
 * administrative office, so "where to eat near Penn State World Campus" would
 * be a page about the food near a building nobody studies in — and "near Austin
 * Community College District" points at a headquarters rather than at any of
 * the campuses students actually attend. Both are pages that would be wrong
 * rather than merely thin, which is worse. Excluded by name because IPEDS has
 * no flag that separates them. */
const NO_CAMPUS = /digital immersion|\bonline\b|global campus|world campus|\bdistrict\b|system office|\bvirtual\b/i;

/* IPEDS aliases, plus the handful of abbreviations people search by that IPEDS
   leaves blank — see data/campus-aliases.js. Merged here so every generator
   sees the same list. `a` is the one short name a page uses in running text:
   a genuine abbreviation when there is one ("FAU"), otherwise the first
   alias, otherwise nothing and the page uses the full name. */
const EXTRA = require("../data/campus-aliases");

/* How students actually search for a school, where that is not an all-caps
   abbreviation the rule below can find: "WashU", "Cal State LA", "Idaho State
   (ISU)". `short` replaces `a` in running text; `title` is how the school is
   named after "Restaurants Near" in a page title. */
const SEARCH_NAMES = require("../data/campus-search-names");

/* Where a page measures from, where IPEDS has an office rather than a campus. */
const LOCATIONS = require("../data/campus-locations.json");

/* Two files, one list. campuses.json is the original 637 four-year schools
   (IPEDS 2022); campuses-more.json is the second batch, community colleges
   included, written by fetch-campuses-more.js from IPEDS 2024. A record with no
   `lv` is a four-year institution, which every original one is. */
const read = (f) => {
  const p = path.join(__dirname, "..", "data", f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
};
const CAMPUSES = [...read("campuses.json"), ...read("campuses-more.json")]
.filter((c) => !NO_CAMPUS.test(c.n)).map((c) => (LOCATIONS[c.s] ? { ...c, ...LOCATIONS[c.s] } : c)).map((c) => {
  const al = [...new Set([...(c.al || []), ...(EXTRA[c.s] || [])])];
  const abbr = al.find((s) => /^[A-Z&]{2,6}$/.test(s));
  const sn = SEARCH_NAMES[c.s];
  /* A settled search name wins outright. With no common short form it is the
     plain name, so an ambiguous abbreviation never reaches the page. */
  if (sn) {
    const n = sn.name || c.n;
    return { ...c, n, al: sn.name ? [...new Set([c.n, ...al])] : al,
      a: sn.short || sn.title.replace(/\s*\(.*\)$/, ""), t: sn.title, d: sn.desc || "" };
  }
  return { ...c, al, a: abbr || c.a || al[0] || "", t: "" };
});

const BY_STATE = {};
CAMPUSES.forEach((c) => { (BY_STATE[c.r] = BY_STATE[c.r] || []).push(c); });
Object.values(BY_STATE).forEach((l) => l.sort((a, b) => a.n.localeCompare(b.n)));

module.exports = { CAMPUSES, BY_STATE, NO_CAMPUS };
