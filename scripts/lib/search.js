/* What the search data says about each page, for the generators.
 *
 * Two files, both written from Search Console and both optional:
 *
 *   data/priority-pages.json  the 500 pages worth the most work (built by
 *                             research/make-priority.js): they get titles
 *                             built from their own numbers.
 *   data/search-terms.json    each page's real searches, exported by the
 *                             keyword tool (research/keywords.py export).
 *                             Absent until the tool has been run; every use
 *                             below falls back to the page as it was.
 *
 * From search-terms.json the generators take only what they can act on
 * without guessing: which of a campus's names people actually type, and the
 * words they add ("cheap", "late night", "breakfast"), answered on the page
 * from its own numbers where the data has an answer, and skipped where not.
 */
const fs = require("fs");
const path = require("path");

const read = (f) => {
  const p = path.join(__dirname, "..", "data", f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};
const PRIORITY = (read("priority-pages.json") || { pages: [] }).pages;
const PRIORITY_SET = new Set(PRIORITY.map((p) => p.url));
const TERMS = (read("search-terms.json") || { pages: {} }).pages || {};

const isPriority = (p) => PRIORITY_SET.has(p);

/* The name for a campus most of its searches use, if one clearly leads:
   "apu" when "food near apu" outweighs "azusa pacific university". */
function searchedName(p) {
  const t = TERMS[p];
  if (!t || !t.names || !t.names.length) return null;
  const total = t.names.reduce((s, [, n]) => s + n, 0);
  const [name, n] = t.names[0];
  return total && n / total >= 0.4 ? name : null;
}

/* Put the names that contain the searched form first, keeping the rest in order. */
function preferSearched(p, names) {
  const s = searchedName(p);
  if (!s) return names;
  const norm = (x) => x.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const hit = names.filter((n) => ` ${norm(n)} `.includes(` ${s} `));
  return [...hit, ...names.filter((n) => !hit.includes(n))];
}

const { inline } = require("./scene");

const fmt = (n) => n.toLocaleString("en-US");
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/* "One coffee shop", "16 coffee shops": a sentence never starts with "1". */
const num = (n) => (n === 1 ? "one" : fmt(n));
const BREAKFASTY = new Set(["Breakfast", "Brunch", "Bakery", "Bagels", "Donuts", "Café", "Coffee", "Diner", "Pancakes"]);

/* Questions people add to their searches, answered from the page's own scene
   data. Returns [question, answer] pairs; a modifier the data cannot answer
   honestly gets no entry. `near` reads "near NJIT" / "in Lincoln". */
function askedQa(p, { near, sc }) {
  const t = TERMS[p];
  if (!t || !t.mods || !t.mods.length || !sc) return [];
  const radius = `${sc.r} ${sc.r === 1 ? "mile" : "miles"}`;
  const out = [];
  const done = new Set();
  for (const [mod] of t.mods) {
    let qa = null;
    let key = mod;
    if (/^(cheap|cheap eats|budget|affordable|inexpensive|broke)$/.test(mod)) {
      key = "cheap";
      qa = [`Where is cheap food ${near}?`,
        `${sc.ff ? `${fmt(sc.ff)} of the ${fmt(sc.n)} places to eat within ${radius} are fast-food counters, the cheapest default. ` : ""}` +
        `The cheap good meals are usually at counter-service places, in lunch specials, and in dishes built on rice, ` +
        `noodles, bread or beans; Savor Scout's budget guide covers what to look for.`];
    } else if (/^(late night|open late|open now|24 hour|24\/7|after midnight)$/.test(mod)) {
      key = "late";
      qa = [`Is there late-night food ${near}?`,
        `There are ${fmt(sc.n)} places to eat within ${radius}, but these listings do not carry live opening hours, and ` +
        `late at night a fair share of places listed as open are not. Check hours or call before you go; ` +
        `Savor Scout's late-night guide covers how.`];
    } else if (/^(breakfast|brunch)$/.test(mod)) {
      key = "breakfast";
      const spots = sc.top.filter((x) => BREAKFASTY.has(x[0]));
      const cof = sc.cof || 0;
      if (spots.length || cof) {
        const parts = [...(cof ? [`${num(cof)} ${cof === 1 ? "coffee shop or café" : "coffee shops and cafés"}`] : []),
          ...spots.filter((x) => !/^(Café|Coffee)$/.test(x[0])).map((x) => `${num(x[2])} ${x[2] === 1 ? x[0].toLowerCase() : inline(x[0], x[1])}`)];
        qa = [`Where can I get breakfast ${near}?`,
          `Within ${radius}: ${parts.join(", ")}. Listings do not show hours, so check that a place is serving breakfast before you go.`];
      }
    } else if (/^(coffee|cafe|cafes|coffee shops?|study spots?|wifi)$/.test(mod)) {
      key = "coffee";
      if (sc.cof) {
        qa = [`Are there coffee shops ${near}?`,
          `${cap(num(sc.cof))} ${sc.cof === 1 ? "coffee shop or café is" : "coffee shops and cafés are"} within ${radius}, ` +
          `among ${fmt(sc.n)} places to eat in all.`];
      }
    } else {
      const hit = sc.top.find((x) => x[0].toLowerCase() === mod || (x[1] && x[1].replace(/-food$/, "").replace(/-/g, " ") === mod));
      if (hit) {
        key = hit[0];
        qa = [`How many ${inline(hit[0], hit[1])} places are ${near}?`,
          `${cap(num(hit[2]))} within ${radius}, out of ${fmt(sc.n)} places to eat in all.`];
      }
    }
    if (qa && !done.has(key)) {
      done.add(key);
      out.push(qa);
    }
    if (out.length === 3) break;
  }
  return out;
}

module.exports = { PRIORITY, isPriority, searchedName, preferSearched, askedQa };
