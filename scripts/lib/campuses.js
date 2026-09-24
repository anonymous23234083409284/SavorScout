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

const CAMPUSES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "campuses.json"), "utf8")
).filter((c) => !NO_CAMPUS.test(c.n)).map((c) => {
  const al = [...new Set([...(c.al || []), ...(EXTRA[c.s] || [])])];
  const abbr = al.find((s) => /^[A-Z&]{2,6}$/.test(s));
  return { ...c, al, a: abbr || c.a || al[0] || "" };
});

const BY_STATE = {};
CAMPUSES.forEach((c) => { (BY_STATE[c.r] = BY_STATE[c.r] || []).push(c); });
Object.values(BY_STATE).forEach((l) => l.sort((a, b) => a.n.localeCompare(b.n)));

module.exports = { CAMPUSES, BY_STATE, NO_CAMPUS };
