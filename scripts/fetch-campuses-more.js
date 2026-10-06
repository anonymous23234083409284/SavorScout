/* ONE-TIME DATA FETCH. Not part of the build.
 *
 * Run with:  node scripts/fetch-campuses-more.js
 * Writes scripts/data/campuses-more.json, which is committed and read by
 * lib/campuses.js alongside the original campuses.json.
 *
 * WHY A SECOND FILE
 * campuses.json is the original 637: four-year, public or private
 * not-for-profit, 5,000 students and up, from IPEDS 2022. Search Console then
 * showed the campus class earning nearly every click the site gets — and
 * community colleges among them (Green River 27 impressions, Modesto Junior 26,
 * Tacoma 18, Columbia Basin 17, Bellevue a click). So this batch widens the rule
 * rather than repeating it, and keeps the original file untouched so its
 * records, and their lastmod dates, do not move.
 *
 * WHAT IT SELECTS, IN ORDER
 *   1. Every degree-granting, currently active, public or private
 *      not-for-profit institution in the IPEDS 2024 directory with 5,000+
 *      students that is not already on the site — two-year colleges included.
 *   2. Then, to reach TARGET, the largest four-year campuses in the 1,000–4,999
 *      bracket, ranked by IPEDS 2023 total fall headcount.
 * For-profit institutions stay out, as before: at this size they are almost all
 * online.
 *
 * "Not already on the site" is decided by IPEDS unitid, not by name, because
 * about two dozen of the original schools have been renamed since 2022 and a
 * name match would have given them a second page.
 *
 * Every figure written — city, state, size bracket, locale, coordinates,
 * control, level — is from IPEDS via the Urban Institute's Education Data API.
 * Public domain. Nothing is estimated.
 */
const fs = require("fs");
const path = require("path");

const API = "https://educationdata.urban.org/api/v1/college-university/ipeds";
const OUT = path.join(__dirname, "data", "campuses-more.json");
const TARGET = 400;
/* The API refuses the default "node" user-agent with a 403. */
const UA = { "User-Agent": "savorscout-data-fetch/1.0 (+https://www.savorscout.net/about/data)" };

const { NO_CAMPUS } = require("./lib/campuses");
const EXISTING = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "campuses.json"), "utf8"));

/* Institutions with no single campus a student eats near, which NO_CAMPUS
   cannot catch by name. Each was checked by hand:
     - mostly or entirely online: listing a restaurant near their address
       would describe an office, not a campus
     - seminaries and a graduate-only college: not the question being asked
     - a service academy: cadets do not go out to eat on a whim
     - statewide systems whose IPEDS address is a head office
     - a branch whose coordinates are its parent university's downtown campus */
const EXCLUDE = new Set([
  "American College of Financial Services",
  "Rio Salado College",
  "Trine University-Regional/Non-Traditional Campuses",
  "Herzing University-Madison",
  "Georgia State University-Perimeter College",
  "Ivy Tech Community College",
  "Community College of Vermont",
  "Harrisburg University of Science and Technology",
  "Golden Gate University",
  "The Southern Baptist Theological Seminary",
  "Midwestern Baptist Theological Seminary",
  "Teachers College at Columbia University",
  "University of Maine at Augusta",
  "Upper Iowa University",
  "United States Air Force Academy",
  "Central Methodist University-College of Graduate and Extended Studies",
  "Belhaven University",
]);

const slugify = (n) => n.toLowerCase().replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/* Sequential, with a pause: the API answers parallel requests with 403. */
const sizes = async (year, list) => {
  let out = [];
  for (const s of list) out = out.concat(await all(`${API}/directory/${year}/?inst_size=${s}`));
  return out;
};

async function all(url) {
  let out = [];
  while (url) {
    let r;
    for (let i = 0; i < 6; i++) {
      try { r = await fetch(url, { headers: UA }); if (r.ok) break; } catch (e) { if (i === 5) throw e; }
      await new Promise((ok) => setTimeout(ok, 5000 * (i + 1)));
    }
    if (!r || !r.ok) throw new Error(`HTTP ${r && r.status} for ${url}`);
    const j = await r.json();
    await new Promise((ok) => setTimeout(ok, 1500));
    out = out.concat(j.results);
    url = j.next;
  }
  return out;
}

(async () => {
  /* The original file has no unitids, so recover them from the 2022 directory
     it was built from — every one of the 637 matches by slug. */
  const dir22 = await sizes(2022, [3, 4, 5]);
  const id22 = new Map(dir22.map((x) => [slugify(x.inst_name), x.unitid]));
  const have = new Set();
  for (const c of EXISTING) {
    if (!id22.has(c.s)) throw new Error(`no 2022 unitid for existing campus ${c.s}`);
    have.add(id22.get(c.s));
  }

  const dir = await sizes(2024, [2, 3, 4, 5]);
  const enr = new Map();
  (await all(`${API}/enrollment-headcount/2023/99/?race=99&sex=99`))
    .filter((x) => x.ftpt === 99 && x.degree_seeking === 99 && x.class_level === 99)
    .forEach((x) => enr.set(x.unitid, x.headcount));

  const eligible = (x) =>
    !have.has(x.unitid) && [1, 2, 4, 5].includes(x.sector) && x.degree_granting === 1 &&
    x.currently_active_ipeds === 1 && !NO_CAMPUS.test(x.inst_name) && !EXCLUDE.has(x.inst_name) &&
    typeof x.latitude === "number" && typeof x.longitude === "number";

  const big = dir.filter((x) => x.inst_size >= 3 && eligible(x));
  const small = dir.filter((x) => x.inst_size === 2 && x.institution_level === 4 && eligible(x))
    .sort((a, b) => (enr.get(b.unitid) || 0) - (enr.get(a.unitid) || 0))
    .slice(0, Math.max(0, TARGET - big.length));
  const picked = [...big, ...small];

  /* Slugs must not collide with each other or with the originals. Two
     Glendale Community Colleges exist (AZ and CA); on a collision every
     school sharing the name gets its state appended, so neither is "the" one. */
  const taken = new Set(EXISTING.map((c) => c.s));
  const count = {};
  picked.forEach((x) => { const s = slugify(x.inst_name); count[s] = (count[s] || 0) + 1; });
  const out = picked.map((x) => {
    let s = slugify(x.inst_name);
    if (count[s] > 1 || taken.has(s)) s = `${s}-${x.state_abbr.toLowerCase()}`;
    if (taken.has(s)) throw new Error(`slug collision: ${s}`);
    taken.add(s);
    const al = (x.inst_alias || "").split("|").map((t) => t.trim()).filter((t) => t && t !== x.inst_name);
    return {
      s, n: x.inst_name, a: al[0] || "", c: x.city, r: x.state_abbr,
      sz: x.inst_size, lc: x.urban_centric_locale,
      pub: x.inst_control === 1 ? 1 : 0,
      lv: x.institution_level === 4 ? 4 : 2,
      lat: Math.round(x.latitude * 1e5) / 1e5, lng: Math.round(x.longitude * 1e5) / 1e5,
      al, id: x.unitid,
    };
  }).sort((a, b) => a.s.localeCompare(b.s));

  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`fetch-campuses-more: ${out.length} campuses (${big.length} of 5,000+, ${small.length} largest under 5,000)`);
})().catch((e) => { console.error(`fetch-campuses-more: ${e.message}`); process.exit(1); });
