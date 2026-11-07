// Builds one personalized pitch per school from the rankings and the contact list.
// node make-pitches.js <repo> <contacts.jsonl> <out.json>
const fs = require("fs");
const path = require("path");
const [repo, contactsFile, outFile] = process.argv.slice(2);
const R = require(path.join(repo, "scripts/data/rankings"));
const SCENE = JSON.parse(fs.readFileSync(path.join(repo, "scripts/data/food-scene.json"), "utf8")).pages;
const ORIGIN = "https://www.savorscout.net";
const contacts = new Map(fs.readFileSync(contactsFile, "utf8").trim().split("\n").map(JSON.parse).map((c) => [c.slug, c]));

const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const fmt = (n) => n.toLocaleString("en-US");
/* "in the Big Ten", "among UC campuses", "among big Texas universities". */
const inGroup = (g) => (g.big ? `among big ${g.name} universities` : g.noun === "campus" ? `among ${g.name} campuses` : `in the ${g.name}`);
/* "every Big Ten campus", "every UC campus", "every big Texas university". */
const every = (g) => (g.big ? `every big ${g.name} university` : `every ${g.name} campus`);
const GREET = { "The Daily": "Daily UW", "Knight News / NSM Today": "Knight News" };

function rowsFor(g) {
  const rows = g.members.map(([short, slug]) => {
    const sc = SCENE[`campus/${slug}`];
    return { short, slug, w: sc.w, street: sc.st && sc.st[0] ? sc.st[0][0] : "", r: sc.r };
  }).sort((a, b) => b.w - a.w || a.short.localeCompare(b.short));
  rows.forEach((r, i) => { r.rank = i && r.w === rows[i - 1].w ? rows[i - 1].rank : i + 1; });
  rows.forEach((r) => { r.tied = rows.filter((x) => x.rank === r.rank).length > 1; });
  return rows;
}

// Every school's place in every ranking it belongs to.
const bySchool = new Map();
for (const g of R) {
  const rows = rowsFor(g);
  const lastRank = rows[rows.length - 1].rank;
  for (const r of rows) {
    const e = { g, rows, me: r, n: rows.length, first: r.rank === 1, last: r.rank === lastRank && rows.length > 2 };
    if (!bySchool.has(r.slug)) bySchool.set(r.slug, []);
    bySchool.get(r.slug).push(e);
  }
}

const others = (rows, me, k) => rows.filter((x) => x.slug !== me.slug).slice(0, k);
const lead = (rows) => rows.filter((x) => x.rank === 1);
const trail = (rows) => rows.filter((x) => x.rank === rows[rows.length - 1].rank);
const names = (xs) => (xs.length < 3 ? xs.map((x) => x.short).join(" and ") : `${xs.slice(0, -1).map((x) => x.short).join(", ")} and ${xs[xs.length - 1].short}`);

const DEF = "within half a mile of campus, about a 10-minute walk";
const each = (xs) => (xs.length > 1 ? " each" : "");
const strength = (e) => (e.first ? 0 : e.last ? 1 : 1 + e.me.rank);
const cap = (t) => t[0].toUpperCase() + t.slice(1);

/* The lead sentence for a school's strongest ranking, with the count and what it means. */
function finding(e) {
  const { g, rows, me, n } = e;
  const L = lead(rows), T = trail(rows);
  if (e.first) {
    const [a, b] = others(rows, me, 2);
    return `${me.short} came out on top ${inGroup(g)}, with ${fmt(me.w)} places to eat ${DEF}. ${a.short} is next with ${fmt(a.w)}, then ${b.short} with ${fmt(b.w)}.`;
  }
  if (e.last) {
    if (me.w === 0) return `${me.short} has the fewest ${inGroup(g)}: no places to eat at all ${DEF}. ${names(L)} leads with ${fmt(L[0].w)}.`;
    return `${me.short} ${me.tied ? "is tied for" : "has"} the fewest ${inGroup(g)}: ${fmt(me.w)} places to eat ${DEF}. ${names(L)} leads with ${fmt(L[0].w)}.`;
  }
  const fewest = T[0].w === 0 ? `${names(T)} ${T.length > 1 ? "have" : "has"} none`
    : `${names(T)} ${T.length > 1 ? "have" : "has"} the fewest, ${fmt(T[0].w)}${each(T)}`;
  return `${me.short} ${me.tied ? "is tied for" : "ranks"} ${ord(me.rank)} of ${n} ${inGroup(g)}, with ${fmt(me.w)} places to eat ${DEF}. ${names(L)} leads with ${fmt(L[0].w)}; ${fewest}.`;
}

/* A shorter line for a second ranking: the count was already given. */
function also(e) {
  const { g, rows, me, n } = e;
  const L = lead(rows);
  if (e.first) { const [a] = others(rows, me, 1); return `It also comes out on top ${inGroup(g)}, ahead of ${a.short} (${fmt(a.w)}).`; }
  if (e.last) return `It also has the fewest ${inGroup(g)}, where ${names(L)} leads with ${fmt(L[0].w)}.`;
  return `${cap(inGroup(g))}, it ${me.tied ? "is tied for" : "ranks"} ${ord(me.rank)} of ${n}; ${names(L)} leads with ${fmt(L[0].w)}.`;
}

function subjectFor(es) {
  const { g, me } = es[0];
  if (es[0].first) return `${me.short} has the most restaurants within a 10-minute walk ${inGroup(g)}`;
  if (es[0].last && me.w === 0) return `${me.short} has no restaurants within a 10-minute walk of campus`;
  if (es[0].last) return `${me.short} ${me.tied ? "ties for" : "has"} the fewest restaurants within a 10-minute walk ${inGroup(g)}`;
  return `${me.short} ${me.tied ? "ties for" : "ranks"} ${ord(me.rank)} of ${es[0].n} ${inGroup(g)} for restaurants within a 10-minute walk`;
}

/* Which to send first: a #1 or a last place is the clearest story, then the
   top five, then the rest. Within each, the ones with an address first. */
const tierOf = (es) => (es.some((e) => e.first) ? 1 : es.some((e) => e.last) ? 2 : es.some((e) => e.me.rank <= 5) ? 3 : 4);

const out = [];
for (const [slug, list] of bySchool) {
  const es = [...list].sort((a, b) => strength(a) - strength(b));
  const c = contacts.get(slug);
  const me = es[0].me;
  const street = me.street && me.r === 1 ? ` Its busiest food street is ${me.street}.` : "";
  const links = es.map((e) => `${ORIGIN}/rankings/${e.g.s}`);
  const body = [
    `Hi ${GREET[c.paper] || c.paper.replace(/^The /, "")} team,`,
    "",
    `I run Savor Scout (savorscout.net), a free site that helps people find a place to eat near campus. Using Overture Maps open data, we counted the places to eat within half a mile of ${es.map((e) => every(e.g)).join(" and ")}.`,
    "",
    [finding(es[0]), ...es.slice(1).map(also)].join(" ") + street,
    "",
    `The full ranking${es.length > 1 ? "s, with every school and how we counted, are" : ", with every school and how we counted, is"} here:`,
    ...links,
    "",
    `And the places to eat closest to ${me.short}'s campus:`,
    `${ORIGIN}/campus/${slug}`,
    "",
    "I thought it could make a fun story for your readers. You're welcome to use the numbers, and if you do, a link to the ranking page lets readers check them. I'm happy to share the data or answer questions about the method.",
    "",
    "Thanks,",
    "{name}",
    "Savor Scout",
  ].join("\n");
  out.push({
    slug, school: me.short, paper: c.paper, site: c.site, email: c.email || "", unconfirmed: !!c.unconfirmed,
    find: c.form || c.src, how: c.how, src: c.src, tier: tierOf(es),
    rankings: es.map((e) => ({ s: e.g.s, group: e.g.group || e.g.name, rank: e.me.rank, tied: e.me.tied, n: e.n, w: e.me.w })),
    subject: subjectFor(es), body, lead: finding(es[0]).split(". ")[0] + ".", link: links[0],
  });
}

/* Local news in the towns of the #1 schools: the same finding, told as a local story. */
const LOCAL = [
  ["MLive", "mlive.com", "university-of-michigan-ann-arbor", "Ann Arbor"],
  ["Nashville Scene", "nashvillescene.com", "vanderbilt-university", "Nashville"],
  ["Berkeleyside", "berkeleyside.org", "university-of-california-berkeley", "Berkeley"],
  ["Cincinnati CityBeat", "citybeat.com", "university-of-cincinnati-main-campus", "Cincinnati"],
  ["New Haven Independent", "newhavenindependent.org", "yale-university", "New Haven"],
  ["Austin American-Statesman", "statesman.com", "the-university-of-texas-at-austin", "Austin"],
  ["Tallahassee Democrat", "tallahassee.com", "florida-state-university", "Tallahassee"],
  ["StateCollege.com", "statecollege.com", "pennsylvania-state-university-main-campus", "State College"],
];
for (const [paper, site, slug, town] of LOCAL) {
  const es = [...bySchool.get(slug)].sort((a, b) => strength(a) - strength(b));
  const top = es.filter((e) => e.first);
  const me = es[0].me;
  const links = top.map((e) => `${ORIGIN}/rankings/${e.g.s}`);
  const body = [
    `Hi ${paper} team,`,
    "",
    `I run Savor Scout (savorscout.net), a free site that helps people find a place to eat near campus. Using Overture Maps open data, we counted the places to eat within half a mile of ${top.map((e) => every(e.g)).join(" and ")}, and ${town} came out ahead.`,
    "",
    [finding(top[0]), ...top.slice(1).map(also)].join(" ") + (me.street && me.r === 1 ? ` The busiest food street near campus is ${me.street}.` : ""),
    "",
    `The full ranking${links.length > 1 ? "s, with every school and how we counted, are" : ", with every school and how we counted, is"} here:`,
    ...links,
    "",
    "I thought it could make a fun local story. You're welcome to use the numbers, and if you do, a link to the ranking page lets readers check them. I'm happy to share the data or answer questions about the method.",
    "",
    "Thanks,",
    "{name}",
    "Savor Scout",
  ].join("\n");
  out.push({
    slug: `local-${slug}`, school: me.short, paper, site, email: "", unconfirmed: false,
    find: `https://www.${site}/`, how: `Local news in ${town}. Find the newsroom or tips address on ${site}.`, src: `https://www.${site}/`,
    tier: 5, local: true,
    rankings: top.map((e) => ({ s: e.g.s, group: e.g.group || e.g.name, rank: e.me.rank, tied: e.me.tied, n: e.n, w: e.me.w })),
    subject: `${town}'s campus has the most restaurants within a 10-minute walk ${inGroup(top[0].g)}`,
    body, lead: finding(top[0]).split(". ")[0] + ".", link: links[0],
  });
}
out.sort((a, b) => a.tier - b.tier || (b.email ? 1 : 0) - (a.email ? 1 : 0) || a.school.localeCompare(b.school));
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(out.length, "pitches; by tier:", [1, 2, 3, 4, 5].map((t) => out.filter((p) => p.tier === t).length).join(" / "));
