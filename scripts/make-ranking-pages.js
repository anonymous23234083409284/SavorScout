/* /rankings/ — college food rankings: which schools in a conference, a state
 * or a university system have the most places to eat within a 10-minute walk.
 *
 * WHY THESE PAGES EXIST
 * The rankings started as TikTok countdowns and did better than anything else
 * the account posted: people stay to see where their school lands and send
 * it to friends at the others. A video can't be cited, though. A student
 * paper writing "our campus has the most restaurants within walking distance
 * in the Big Ten" needs a page that shows the whole table, says how it was
 * counted and can be linked to. That link, from a site Google trusts, is
 * what this young site needs most. So each ranking gets its page: the answer
 * in the first sentence, every school in the table, the method, and a
 * citation line.
 *
 * The groups are in data/rankings.js. The counts come from food-scene.json at
 * build time, the same figures the campus pages use.
 */
const fs = require("fs");
const path = require("path");
const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
} = require("./lib/page");

const WHO = "make-ranking-pages";
const RANKINGS = require("./data/rankings");
const SCENE = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "food-scene.json"), "utf8"));
const { CAMPUSES } = require("./lib/campuses");
const CAMPUS = new Map(CAMPUSES.map((c) => [c.s, c]));

const shell = shellOrDie(WHO);
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const HUB = { name: "Rankings", url: `${ORIGIN}/rankings/` };
const fmt = (n) => n.toLocaleString("en-US");
const plural = (noun) => (noun === "campus" ? "campuses" : noun === "university" ? "universities" : `${noun}s`);
const ORDINAL = ["", "first", "second", "third", "fourth", "fifth"];
const andList = (xs) => (xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* Every member with its counts, most places first, ranked so that ties share
   a place and the next school skips ahead (1, 2, 2, 4). A member missing its
   campus page or its counts stops the build: a ranking with a school quietly
   left out would be wrong, not just incomplete. */
function rowsFor(g) {
  const rows = g.members.map(([short, slug]) => {
    const c = CAMPUS.get(slug);
    const sc = SCENE.pages[`campus/${slug}`];
    if (!c || !sc) {
      console.error(`${WHO}: ${g.s}: no campus data for ${slug}`);
      process.exit(1);
    }
    return { short, slug, full: c.n, city: c.c, state: c.r, w: sc.w, street: sc.st && sc.st[0] ? sc.st[0][0] : "", r: sc.r };
  }).sort((a, b) => b.w - a.w || a.short.localeCompare(b.short));
  rows.forEach((r, i) => { r.rank = i && r.w === rows[i - 1].w ? rows[i - 1].rank : i + 1; });
  rows.forEach((r) => { r.tied = rows.filter((x) => x.rank === r.rank).length > 1; });
  return rows;
}

const question = (g) => (g.big
  ? `Which big ${g.name} university has the most restaurants within a 10-minute walk?`
  : `Which ${g.name} ${g.noun} has the most restaurants within a 10-minute walk?`);
/* "in the Big Ten", "among big Texas universities", "among UC campuses". */
const inGroup = (g) => (g.big ? `among big ${g.name} universities` : g.noun === "campus" ? `among ${g.name} campuses` : `in the ${g.name}`);
const groupWords = (g) => (g.big ? `${g.name} universities` : g.noun === "campus" ? `${g.name} campuses` : `${g.name} schools`);

/* The answer, in the words a reporter would quote: who leads, who follows,
   who trails. Built from the numbers, ties included. */
function answer(g, rows) {
  const ranks = [...new Set(rows.map((r) => r.rank))];
  const at = (k) => rows.filter((r) => r.rank === k);
  const names = (rs) => andList(rs.map((r) => r.short));
  const lead = at(ranks[0]);
  const out = [lead.length > 1
    ? `${names(lead)} tie for the most, with ${fmt(lead[0].w)} places to eat each within half a mile of campus, about a 10-minute walk.`
    : `${names(lead)} has the most: ${fmt(lead[0].w)} places to eat within half a mile of campus, about a 10-minute walk.`];
  const next = ranks.slice(1, ranks.length > 3 ? 3 : 2).map((k) => {
    const rs = at(k);
    const place = ORDINAL[k] || `No. ${k}`;
    return rs.length > 1 ? `${names(rs)} tie for ${place} with ${fmt(rs[0].w)} each` : `${names(rs)} is ${place} with ${fmt(rs[0].w)}`;
  });
  if (next.length) out.push(`${next.join(", and ")}.`);
  if (ranks.length > 2) {
    const last = at(ranks[ranks.length - 1]);
    const n = last[0].w;
    out.push(n === 0
      ? `${names(last)} ${last.length > 1 ? "have" : "has"} none within half a mile.`
      : `${names(last)} ${last.length > 1 ? "have" : "has"} the fewest, with ${fmt(n)}${last.length > 1 ? " each" : ""}.`);
  }
  return out.join(" ");
}

function tableHtml(g, rows) {
  const max = Math.max(...rows.map((r) => r.w)) || 1;
  /* Bars scale to 70% of the cell so the number always fits at the tip. */
  return `<table class="rank-tbl">
        <thead><tr><th scope="col">Rank</th><th scope="col" class="sch-h">${esc(g.noun[0].toUpperCase() + g.noun.slice(1))}</th><th scope="col">Places to eat<span class="lbl"> within a 10-minute walk</span></th></tr></thead>
        <tbody>
${rows.map((r) => {
    const pct = (70 * r.w / max).toFixed(1);
    const far = r.r !== 1 ? ` (within ${r.r} miles)` : "";
    return `          <tr><td class="rk">${r.tied ? "T-" : ""}${r.rank}</td>` +
      `<th scope="row" class="sch"><a href="/campus/${r.slug}">${esc(r.short)}</a>` +
      `${r.street ? `<small><span class="lbl">Busiest food street: </span>${esc(r.street)}${far}</small>` : ""}</th>` +
      `<td class="ct"><span class="bar">${r.w ? `<i style="width:${pct}%"></i>` : ""}<b>${fmt(r.w)}</b></span></td></tr>`;
  }).join("\n")}
        </tbody>
      </table>`;
}

const pageUrl = (g) => `${ORIGIN}/rankings/${g.s}`;
const write = (rel, html) => {
  const f = path.join(BUILD, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
};

const pages = RANKINGS.map((g) => ({ g, rows: rowsFor(g) }));

function rankingPage({ g, rows }) {
  const url = pageUrl(g);
  const trail = [HOME, HUB, { name: g.group || g.name, url }];
  const h1 = question(g);
  const top = rows[0];
  const title = fitTitle([
    `${groupWords(g)} Ranked by Restaurants Within a 10-Minute Walk`,
    `${groupWords(g)} by Restaurants Within a 10-Minute Walk`,
    `${groupWords(g)}: Restaurants Within a 10-Minute Walk`,
  ].map((t) => t.replace(/\b(schools|campuses|universities)\b/, (m) => m[0].toUpperCase() + m.slice(1))));
  const tiedTop = rows.filter((r) => r.rank === 1);
  const desc = [
    `${andList(tiedTop.map((r) => r.short))} ${tiedTop.length > 1 ? "have" : "has"} the most restaurants within a 10-minute walk of campus ${inGroup(g)}: ${fmt(top.w)}. All ${rows.length} ${plural(g.noun)} ranked, with each one's busiest food street.`,
    `${andList(tiedTop.map((r) => r.short))} ${tiedTop.length > 1 ? "have" : "has"} the most restaurants within a 10-minute walk of campus ${inGroup(g)}: ${fmt(top.w)}. All ${rows.length} ranked, with each one's busiest food street.`,
    `${andList(tiedTop.map((r) => r.short))} ${tiedTop.length > 1 ? "have" : "has"} the most restaurants within a 10-minute walk of campus: ${fmt(top.w)}. All ${rows.length} ${groupWords(g)} ranked.`,
  ].find((d) => d.length <= 160);
  const others = pages.filter((p) => p.g !== g);

  const body = `      ${crumbHtml(trail)}
      <h1>${esc(h1)}</h1>
      <p class="lede">${esc(answer(g, rows))}</p>

      <h2>All ${rows.length} ${esc(groupWords(g))}, ranked</h2>
      ${tableHtml(g, rows)}
      <p class="note">${esc(g.scope)} Each name opens that campus's page, with the places to eat closest to it.</p>

      <h2>How we counted</h2>
      <p>For each campus we counted the places to eat within half a mile, in a straight line from the campus. Half a mile is about a 10-minute walk.</p>
      <ul>
        <li><strong>Places to eat</strong> — restaurants, fast-food places, cafés and casual eateries in the <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a> open places data (release 2026-09-23.1). Chains count the same as independents. Listings marked closed, and low-confidence listings, are left out.</li>
        <li><strong>The campus</strong> — the location the U.S. Department of Education lists for each school, moved to the main campus where that point is an office away from it.</li>
        <li><strong>Busiest food street</strong> — the street with the most of those places within a mile of campus${rows.some((r) => r.r !== 1) ? ", or within the wider distance shown for a campus with few places close by" : ""}.</li>
      </ul>
      <p>Map data is never complete, and a new place can take a while to appear in it, so read the counts as a fair comparison between campuses rather than an exact census. <a href="/about/data">More on where our data comes from</a>.</p>

      <h2>Share or cite this ranking</h2>
      <p>You're welcome to share this ranking or use it in a story. Please credit Savor Scout and link to this page.</p>
      <p class="note">Savor Scout, &ldquo;${esc(h1)}&rdquo; ${esc(url.replace("https://www.", ""))}. Counts from Overture Maps open data, September 2026.</p>

      <h2>More college food rankings</h2>
      <ul>
${others.map((p) => `        <li><a href="/rankings/${p.g.s}">${esc(question(p.g))}</a></li>`).join("\n")}
      </ul>
      <hr>
      <p><a href="/rankings/">All rankings</a> &middot;
         <a href="/campus/">Restaurants near every campus</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: h1,
        description: desc,
        url,
        author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
        publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
        mainEntityOfPage: url,
        isBasedOn: { "@type": "Dataset", name: "Overture Maps places", url: "https://overturemaps.org/" },
      },
      {
        "@type": "ItemList",
        name: h1,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: rows.length,
        itemListElement: rows.map((r, i) => ({
          "@type": "ListItem", position: i + 1, name: r.full, url: `${ORIGIN}/campus/${r.slug}`,
        })),
      },
      breadcrumb(trail),
    ],
  });
  write(`rankings/${g.s}.html`, render(shell, { title, desc, url, body, ld, who: WHO }));
  return { loc: url, pri: "0.7", freq: "monthly" };
}

function hubPage() {
  const url = HUB.url;
  const trail = [HOME, HUB];
  const body = `      ${crumbHtml(trail)}
      <h1>College food rankings</h1>
      <p class="lede">Which campus has the most restaurants within a 10-minute walk? ${pages.length} rankings by conference, state and university system, counted from open map data.</p>

      <h2>The rankings</h2>
      <ul class="cards">
${pages.map(({ g, rows }) => {
    const lead = rows.filter((r) => r.rank === 1);
    return `        <li class="card"><a href="/rankings/${g.s}">${esc(question(g))}</a>` +
      `<span class="meta">#1: ${esc(andList(lead.map((r) => r.short)))}, ${fmt(lead[0].w)} places · ${rows.length} ${plural(g.noun)}</span></li>`;
  }).join("\n")}
      </ul>

      <h2>How we counted</h2>
      <p>Every count is the number of restaurants, fast-food places, cafés and casual eateries within half a mile of a campus, about a 10-minute walk, from <a href="https://overturemaps.org/" rel="nofollow noopener">Overture Maps</a> open data. Each ranking page has the details, and every campus has its own page with the places closest to it.</p>
      <hr>
      <p><a href="/campus/">Restaurants near every campus</a> &middot;
         <a href="/about/data">Where our data comes from</a> &middot;
         <a href="/">Savor Scout home</a></p>`;
  const desc = "Which campus has the most restaurants within a 10-minute walk? Rankings of the Big Ten, SEC, ACC, Big 12, Ivy League, UC, Texas, Florida and Pennsylvania.";
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "College food rankings",
    description: desc,
    url,
    breadcrumb: breadcrumb(trail),
  });
  write("rankings/index.html", render(shell, { title: "College Food Rankings: Restaurants Within a 10-Minute Walk", desc, url, body, ld, who: WHO }));
  return { loc: url, pri: "0.7", freq: "weekly" };
}

const urls = [hubPage(), ...pages.map(rankingPage)];
emit("rankings", urls);
console.log(`${WHO}: ${pages.length} rankings + hub, ${pages.reduce((n, p) => n + p.rows.length, 0)} school rows`);
