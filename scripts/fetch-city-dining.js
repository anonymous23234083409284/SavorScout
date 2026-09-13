/* ONE-TIME DATA FETCH. Not part of the build.
 *
 * Run with:  node scripts/fetch-city-dining.js
 * Needs CENSUS_API_KEY in backend/.env (free: api.census.gov/data/key_signup.html).
 *
 * WHY THIS EXISTS
 * The city pages could not name a single restaurant, because we hold no
 * restaurant data and licensing somebody else's listings is not an option. That
 * left a thousand pages about where to eat in a place that said nothing
 * whatsoever about eating in that place — the definition of thin, and the most
 * likely reason Google declines to index them.
 *
 * County Business Patterns closes most of that gap legitimately. It is a US
 * Census product, public domain, and it counts business establishments by NAICS
 * code per county. So we cannot tell you which taqueria to go to, but we can
 * tell you — truthfully, and with a citation — how many restaurants a place
 * actually has, how they split between sit-down and counter service, and how
 * that compares with the rest of the country. Nobody else publishes that per
 * city, which is precisely what a page needs to deserve its own index entry.
 *
 * WHY IT IS NOT IN THE BUILD
 * CBP updates once a year. Fetching it on every deploy would make a Vercel
 * build depend on a third-party API being up — so a Census outage would break
 * the site. This writes a JSON file that gets committed, exactly like
 * campuses.json, and the build reads that.
 *
 * NAICS codes used (2017 basis):
 *   722511  full-service restaurants  (you sit down, someone takes an order)
 *   722513  limited-service           (counter service, fast food)
 *   722515  snack & non-alcoholic bars (coffee shops, juice, ice cream)
 *   722410  drinking places           (bars — many of which serve food)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", "backend", ".env") });
const fs = require("fs");
const path = require("path");

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error("fetch-city-dining: CENSUS_API_KEY missing from backend/.env");
  process.exit(1);
}

const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));
const YEAR = 2022;
const NAICS = { fs: "722511", ls: "722513", sn: "722515", bar: "722410" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 204) return null;          // Census: no data for this query
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(400 * (i + 1));
    }
  }
}

/* Cities are matched to counties through the Census geocoder rather than by
   nearest county centroid. Counties are large and irregular, so a centroid
   match puts any city near a county line in the wrong one — and being wrong
   about which county a city is in is exactly the kind of error a local reader
   spots immediately. */
async function countyFor(city) {
  const u = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
    `?x=${city.lng}&y=${city.lat}&benchmark=Public_AR_Current&vintage=Current_Current` +
    `&layers=Counties&format=json`;
  const j = await getJson(u);
  const c = j?.result?.geographies?.Counties?.[0];
  return c ? { fips: `${c.STATE}${c.COUNTY}`, name: c.NAME } : null;
}

async function mapCounties() {
  const out = new Map();
  let done = 0, failed = 0;
  const queue = [...CITIES];
  const WORKERS = 8;                               // polite; the geocoder is not rate-limit documented
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (queue.length) {
      const city = queue.shift();
      try {
        const c = await countyFor(city);
        if (c) out.set(city.s, c); else failed++;
      } catch { failed++; }
      if (++done % 100 === 0) process.stdout.write(`  geocoded ${done}/${CITIES.length}\r`);
    }
  }));
  console.log(`  geocoded ${done}/${CITIES.length} (${failed} without a county)      `);
  return out;
}

/* One bulk call per NAICS code for every county in the country, rather than
   1,000 individual lookups. Counties where the Census suppresses a figure for
   disclosure reasons simply do not appear, and are treated as unknown rather
   than as zero — reporting "0 restaurants" for a county that has some would be
   worse than saying nothing. */
async function cbpByCounty(code) {
  const j = await getJson(
    `https://api.census.gov/data/${YEAR}/cbp?get=ESTAB&for=county:*&NAICS2017=${code}&key=${KEY}`);
  const m = new Map();
  if (!j) return m;
  const [head, ...rows] = j;
  const iE = head.indexOf("ESTAB"), iS = head.indexOf("state"), iC = head.indexOf("county");
  for (const r of rows) {
    const n = Number(r[iE]);
    if (Number.isFinite(n)) m.set(`${r[iS]}${r[iC]}`, n);
  }
  return m;
}

async function acsByCounty() {
  const j = await getJson(
    `https://api.census.gov/data/${YEAR}/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=county:*&key=${KEY}`);
  const m = new Map();
  const [head, ...rows] = j;
  const iN = head.indexOf("NAME"), iP = head.indexOf("B01003_001E"),
        iI = head.indexOf("B19013_001E"), iS = head.indexOf("state"), iC = head.indexOf("county");
  for (const r of rows) {
    const pop = Number(r[iP]), inc = Number(r[iI]);
    m.set(`${r[iS]}${r[iC]}`, {
      name: r[iN],
      pop: Number.isFinite(pop) && pop > 0 ? pop : null,
      /* ACS uses large negative sentinels for "not available". */
      inc: Number.isFinite(inc) && inc > 0 ? inc : null,
    });
  }
  return m;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

(async () => {
  console.log("fetch-city-dining: mapping cities to counties…");
  const counties = await mapCounties();

  console.log("fetch-city-dining: pulling County Business Patterns…");
  const cbp = {};
  for (const [k, code] of Object.entries(NAICS)) {
    cbp[k] = await cbpByCounty(code);
    console.log(`  ${code} (${k}): ${cbp[k].size} counties`);
  }

  console.log("fetch-city-dining: pulling county population and income…");
  const acs = await acsByCounty();
  console.log(`  ACS: ${acs.size} counties`);

  /* National baselines, computed over the counties our cities actually sit in
     rather than over all 3,000 US counties. Comparing Toledo against a median
     dominated by rural counties with four restaurants would be technically true
     and completely useless to a reader. */
  const used = [...new Set([...counties.values()].map((c) => c.fips))];
  const densities = [];
  for (const f of used) {
    const a = acs.get(f);
    if (!a?.pop) continue;
    const total = ["fs", "ls", "sn", "bar"].reduce((s, k) => s + (cbp[k].get(f) || 0), 0);
    if (total > 0) densities.push((total / a.pop) * 10000);
  }
  const natDensity = median(densities);

  const ratios = [];
  for (const f of used) {
    const fsv = cbp.fs.get(f), lsv = cbp.ls.get(f);
    if (fsv && lsv) ratios.push(fsv / lsv);
  }
  const natRatio = median(ratios);

  const out = {};
  let withData = 0;
  for (const city of CITIES) {
    const c = counties.get(city.s);
    if (!c) continue;
    const a = acs.get(c.fips);
    const fsv = cbp.fs.get(c.fips) ?? null;
    const lsv = cbp.ls.get(c.fips) ?? null;
    const snv = cbp.sn.get(c.fips) ?? null;
    const barv = cbp.bar.get(c.fips) ?? null;
    const total = [fsv, lsv, snv, barv].reduce((s, v) => s + (v || 0), 0);
    if (!total) continue;
    const per10k = a?.pop ? (total / a.pop) * 10000 : null;
    out[city.s] = {
      county: c.name, fips: c.fips,
      fs: fsv, ls: lsv, sn: snv, bar: barv, total,
      cpop: a?.pop ?? null, inc: a?.inc ?? null,
      per10k: per10k ? Number(per10k.toFixed(1)) : null,
      ratio: fsv && lsv ? Number((fsv / lsv).toFixed(2)) : null,
    };
    withData++;
  }

  const payload = {
    source: "US Census Bureau, County Business Patterns and American Community Survey 5-year",
    year: YEAR,
    naics: NAICS,
    national: {
      per10k: natDensity ? Number(natDensity.toFixed(1)) : null,
      ratio: natRatio ? Number(natRatio.toFixed(2)) : null,
      counties: used.length,
    },
    cities: out,
  };
  fs.writeFileSync(path.join(__dirname, "data", "city-dining.json"), JSON.stringify(payload));
  console.log(`fetch-city-dining: ${withData}/${CITIES.length} cities have dining data`);
  console.log(`  national median: ${payload.national.per10k} food businesses per 10k people, ` +
              `full-to-limited ratio ${payload.national.ratio}`);
})();
