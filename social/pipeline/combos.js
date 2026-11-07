/* Every campus x cuisine pair a short video can be made from, as JSON on stdout.
 *
 * Reads the same data and helpers the site's /campus/<school>/<food> pages are
 * built from (scripts/lib/niche.js), so a video only ever points at a page that
 * exists, and names a place exactly as that page does.
 *
 * A pair qualifies when its campus has a name people actually say (SOCIAL_NAMES
 * below: "Penn State", never "Pennsylvania State University-Main Campus") and
 * at least five listings survive the clean-up: chains dropped, one place per
 * street address, names stripped of the city and category tails some listings
 * carry ("El Jefe's Taqueria - New Brunswick").
 *
 *   node social/pipeline/combos.js > combos.json
 */
const { PAGES, urlPath, label } = require("../../scripts/lib/niche");
const { CAMPUSES } = require("../../scripts/lib/campuses");
const SOCIAL_NAMES = require("./social-names.json");

const ORIGIN = "https://www.savorscout.net";
const CAMPUS = new Map(CAMPUSES.map((c) => [c.s, c]));

/* National chains the dataset's own rule (15+ listings) sometimes misses
   because the listings spell the name differently. Regional names people go
   to a campus town for (Cottage Inn, Adriatico's, Ian's) stay in. */
const CHAINS = /\b(chipotle|starbucks|domino'?s|pizza hut|papa john'?s|little caesars|subway|mcdonald'?s|taco bell|panda express|qdoba|moe'?s southwest|costa vida|mellow mushroom|pieology|blaze pizza|mod pizza|jimmy john'?s|jersey mike'?s|firehouse subs|potbelly|panera|dunkin|tim hortons|peet'?s|caribou coffee|pita pit|famous famiglia|boloco|sweetgreen|cava\b|insomnia cookies|wingstop|buffalo wild wings|five guys|shake shack|raising cane'?s|chick-fil-a|wendy'?s|burger king|popeyes|kfc|el pollo loco|del taco|sbarro|marco'?s pizza|hungry howie'?s|jet'?s pizza|cicis|noodles & company|p\.?f\.? chang'?s|pei wei|tropical smoothie|smoothie king|jamba|krispy kreme|baskin|dairy queen|cold stone|wetzel|auntie anne|einstein bros|bruegger'?s|au bon pain|corner bakery|la madeleine|which wich|capriotti'?s|charleys|cafe rio|torchy'?s|tijuana flats|chuy'?s|on the border|chili'?s|applebee'?s|olive garden|ihop|denny'?s|waffle house|first watch|another broken egg|white castle|culver'?s|steak ?n ?shake|sonic drive|whataburger|in-n-out|habit burger|smashburger|zaxby'?s|bojangles|church'?s chicken|jollibee|kung fu tea|gong cha|sharetea|coco fresh|tiger sugar|chatime|boba guys|teavana|philz|blue bottle|la colombe|joe & the juice|pret a manger|halal guys|naked pizza|&pizza|pizza studio|uncle maddio'?s|papa murphy'?s|toppers pizza|rosati'?s|giordano'?s|lou malnati'?s|gino'?s east|pizzeria uno|uno pizzeria|round table|godfather'?s|ledo pizza|bertucci'?s|california pizza kitchen|pie five)\b/i;

/* Listings carry tails like " - New Brunswick", " | Chinese", "大鼓米线", a
   trailing period, or a flag emoji. The fonts the video is set in have no CJK
   or emoji glyphs, and the tails read as noise in a headline anyway. */
function cleanName(n) {
  let s = n.normalize("NFC");
  s = s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "");
  s = s.replace(/[　-鿿가-힯豈-﫿＀-￯]+/g, "");
  s = s.split(/\s+[|·•]\s+/)[0];
  s = s.replace(/\s+[-–—]\s+.*$/, "");
  s = s.replace(/,\s.*$/, "");
  s = s.replace(/\s*\((?:[^)]*)\)\s*$/, "");
  s = s.replace(/[.\s]+$/, "").replace(/\s{2,}/g, " ").trim();
  return s;
}

/* "Cappy's Pizza", "Cappys Pizza" and "Cappy's Pizza & Subs" are one place to
   a reader. Two names collide when their first word (letters only) and the
   street address both match, or the whole letters-only names match. */
const letters = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const firstWord = (s) => letters(s.split(/\s+/)[0] || "");

function spotsOf(p) {
  const out = [];
  const seenAddr = new Set();
  for (const x of p.places) {
    if (x.chain || CHAINS.test(x.n)) continue;
    const name = cleanName(x.n);
    if (name.length < 3 || name.length > 34) continue;
    if (/fan ?page|catering|office|food court|cafeteria|dining hall|law school/i.test(name)) continue;
    const addr = letters(x.st || "");
    if (addr && seenAddr.has(addr)) continue;
    if (out.some((o) => letters(o.name) === letters(name) || (firstWord(o.name) === firstWord(name) && firstWord(name).length > 3))) continue;
    if (addr) seenAddr.add(addr);
    out.push({ name, raw: x.n, category: x.c, street: x.st, city: x.loc, region: x.reg,
      lat: x.lat, lng: x.lng, mi: x.mi });
  }
  return out;
}

const combos = [];
for (const p of PAGES) {
  const c = CAMPUS.get(p.campus);
  const short = SOCIAL_NAMES[p.campus];
  if (!c || !short) continue;
  const spots = spotsOf(p);
  if (spots.length < 5) continue;
  const [titleLabel, noun] = label(p.food);
  combos.push({
    id: `${p.campus}--${p.food}`,
    campus: { slug: c.s, name: c.n, short, city: c.c, region: c.r, lat: c.lat, lng: c.lng, size: c.sz },
    food: p.food, foodTitle: titleLabel, foodNoun: noun,
    count: p.n, withinHalfMile: p.w, localPct: p.loc, streets: p.st,
    url: `${ORIGIN}${urlPath(p)}`,
    spots,
  });
}
combos.sort((a, b) => b.campus.size - a.campus.size || b.count - a.count);
process.stdout.write(JSON.stringify(combos, null, 1));
