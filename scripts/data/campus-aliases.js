/* Abbreviations IPEDS does not carry, for schools people are searching by them.
 *
 * Every entry here came from Search Console: somebody typed the abbreviation
 * ("restaurants near umkc campus", "food near slu", "where to eat near nyu")
 * and the campus page could not match it, because IPEDS's alias field for that
 * school is blank. IPEDS is otherwise the source for every alias on the site;
 * this file only fills its gaps.
 *
 * The rule for adding one: it must be the school's own widely-used name for
 * itself, and it must not be ambiguous in a way that points at a different
 * school. "DU" goes on the University of Denver and NOT on Metropolitan State
 * University of Denver, even though the name contains "University of Denver",
 * because MSU Denver is not DU. Keyed by exact slug for the same reason — a
 * substring match is how that mistake would happen.
 *
 * Deliberately left out: "BSU", "MSU", "CMU", "USD" as bare guesses for
 * schools IPEDS has not already attached them to. Each names several schools,
 * and claiming one for the wrong campus would be a false statement on its page.
 */
module.exports = {
  "university-of-missouri-kansas-city": ["UMKC"],
  "saint-louis-university": ["SLU"],
  "new-york-university": ["NYU"],
  "university-of-nevada-reno": ["UNR"],
  "the-university-of-west-florida": ["UWF"],
  "california-state-university-fullerton": ["CSUF", "Cal State Fullerton"],
  "california-state-university-channel-islands": ["CSUCI", "CSU Channel Islands"],
  "university-of-nebraska-at-omaha": ["UNO"],
  "loyola-marymount-university": ["LMU"],
  "university-of-denver": ["DU"],
};
