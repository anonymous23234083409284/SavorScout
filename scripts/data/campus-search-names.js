/* How students search for a school, where the IPEDS name and abbreviations
 * miss it. Settled on 18 October 2026 by two independent passes (one from each
 * school's own branding, one skeptical of ambiguous short forms) and a third
 * that reconciled them. `title` follows "Restaurants Near" in a page title;
 * `desc` is the name a meta description uses when the data name reads badly
 * there ("University of Washington-Bothell Campus"). `name`, where set, replaces a name the school has since changed (Mercy College
 * became Mercy University in 2023). `short` is the name used in running text, or empty when no short form is
 * both common and unambiguous ("Simmons" alone is also Hardin-Simmons; "ISU"
 * alone usually means Iowa or Illinois State).
 */
module.exports = {
  /* Not focus pages: names other pages show for them (guide "most" pills,
     nearby grids) were decades out of date. */
  "the-new-school": { title: "The New School", short: "The New School" },
  "seattle-central-college": { title: "Seattle Central College", short: "Seattle Central" },
  "azusa-pacific-university": { title: "Azusa Pacific (APU)", short: "APU" },
  "simmons-university": { title: "Simmons University", short: "" },
  "cuny-graduate-school-and-university-center": { title: "CUNY Graduate Center", short: "" },
  "california-state-university-los-angeles": { title: "Cal State LA", short: "Cal State LA" },
  "new-jersey-institute-of-technology": { title: "NJIT", short: "NJIT" },
  "rensselaer-polytechnic-institute": { title: "RPI", short: "RPI" },
  "northeastern-illinois-university": { title: "Northeastern Illinois (NEIU)", short: "NEIU" },
  "modesto-junior-college": { title: "Modesto Junior College (MJC)", short: "MJC" },
  "suffolk-university": { title: "Suffolk University", short: "" },
  "green-river-college": { title: "Green River College", short: "" },
  "rochester-institute-of-technology": { title: "RIT", short: "RIT" },
  "pima-community-college": { title: "Pima Community College", short: "" },
  "concordia-university-saint-paul": { title: "Concordia St. Paul (CSP)", short: "Concordia St. Paul", desc: "Concordia University St. Paul" },
  "weber-state-university": { title: "Weber State (WSU)", short: "Weber State" },
  "lindenwood-university": { title: "Lindenwood University", short: "" },
  "davenport-university": { title: "Davenport University", short: "" },
  "lorain-county-community-college": { title: "Lorain County Community College", short: "LCCC" },
  "western-washington-university": { title: "Western Washington (WWU)", short: "WWU" },
  "delaware-state-university": { title: "Delaware State (DSU)", short: "Del State" },
  "johnson-county-community-college": { title: "Johnson County Community College", short: "JCCC" },
  "valdosta-state-university": { title: "Valdosta State (VSU)", short: "Valdosta State" },
  "university-of-washington-bothell-campus": { title: "UW Bothell", short: "UW Bothell", desc: "UW Bothell" },
  "purdue-university-northwest": { title: "Purdue Northwest (Hammond)", short: "Purdue Northwest" },
  "mercy-college": { title: "Mercy University (Dobbs Ferry)", short: "Mercy University", name: "Mercy University" },
  "washburn-university": { title: "Washburn University", short: "" },
  "california-state-university-east-bay": { title: "Cal State East Bay", short: "Cal State East Bay" },
  "des-moines-area-community-college": { title: "DMACC Ankeny", short: "DMACC" },
  "columbia-basin-college": { title: "Columbia Basin College (CBC)", short: "" },
  "idaho-state-university": { title: "Idaho State (ISU)", short: "Idaho State" },
  "university-of-west-alabama": { title: "University of West Alabama", short: "" },
  "east-tennessee-state-university": { title: "East Tennessee State (ETSU)", short: "ETSU" },
  "southern-illinois-university-edwardsville": { title: "SIU Edwardsville (SIUE)", short: "SIUE", desc: "SIU Edwardsville" },
  "tacoma-community-college": { title: "Tacoma Community College", short: "" },
  "cuny-city-college": { title: "City College (CCNY)", short: "CCNY" },
  "college-of-dupage": { title: "College of DuPage (COD)", short: "" },
  "cuny-borough-of-manhattan-community-college": { title: "BMCC", short: "BMCC" },
  "texas-southern-university": { title: "Texas Southern (TSU)", short: "Texas Southern" },
  "california-state-university-channel-islands": { title: "CSU Channel Islands", short: "CSUCI" },
  "onondaga-community-college": { title: "Onondaga Community College", short: "" },
  "washington-university-in-st-louis": { title: "WashU in St. Louis", short: "WashU", desc: "Washington University in St. Louis" },
};
