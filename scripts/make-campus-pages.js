/* Generates one page per US campus at /campus/<slug>.
 *
 * WHY CAMPUSES AND NOT MORE CITIES
 * "Where to eat near <university>" is a query with real, recurring volume and
 * far weaker competition than "restaurants in <city>", because the incumbent
 * directories index businesses rather than institutions. It is also genuinely
 * seasonal in our favour: the same question is asked again every August by an
 * entirely new set of people, plus their parents, plus everyone visiting for a
 * game or a graduation.
 *
 * WHERE THE DATA COMES FROM
 * IPEDS, the US Department of Education's institutional survey, via the Urban
 * Institute's open Education Data API. Public domain. Every figure on these
 * pages — the city, the state, the size bracket, the campus setting, the
 * coordinates — is from that dataset. Nothing is estimated and nothing is
 * invented, which matters more here than on the city pages: a student reading a
 * made-up claim about their own campus stops trusting the site in one sentence.
 *
 * WHAT MAKES 637 PAGES NOT ONE PAGE
 * Three independent real variables, not one:
 *   - Size bracket (5k-10k / 10k-20k / 20k+), which changes how much of a local
 *     restaurant economy the student body actually supports.
 *   - Setting (city / suburb / town / rural), which changes the problem
 *     completely. A rural campus has too few options and needs a drive; an
 *     urban one has too many and needs a filter. These are opposite pages.
 *   - Real geography, computed from real coordinates: which of our 1,000 city
 *     pages are actually nearest, and how far.
 *
 * The original 637 are four-year institutions of 5,000 students and up. The
 * second batch (data/campuses-more.json, see fetch-campuses-more.js) adds every
 * two-year college of that size — community colleges were already earning
 * impressions through their four-year neighbours' pages — plus the forty
 * largest four-year campuses just under 5,000. Below that the query thins out
 * fast and we would be padding the count, which is the thing this whole
 * architecture is trying not to do.
 */
const fs = require("fs");
const path = require("path");
const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
} = require("./lib/page");
const STATES = require("./data/states");
const { spotsFor, spotsHtml, spotsLd, directoryFor, directoryHtml } = require("./lib/nearby");
const { GROUP_ENABLED } = require("./lib/features");
const NICHE = require("./lib/niche");
const { PRIORITY, isPriority, preferSearched, askedQa } = require("./lib/search");
const { sceneFor, sceneHtml, neighboursHtml, inline, listSentence, leaders, ranksHtml, faq, withFaq,
  cravingsHtml, budgetHtml, openNowHtml } = require("./lib/scene");

/* Pages Google ranks on page one without anyone clicking get a description
   built from their own numbers: a count and three cuisines say more about what
   is on the page than any general line can. Search Console, 15 October 2026:
   /campus/azusa-pacific-university, 54 impressions, position 10.1, 0 clicks. */
const FOCUS_PAGES = require("./data/search-focus").pages;
const DATA_DESC = new Set(FOCUS_PAGES.map(([p]) => p).filter((p) => p.startsWith("/campus/")).map((p) => p.slice(8)));
/* The radius worth quoting. A campus on the edge of town may have five places
   within a mile and 165 within three; the bigger honest number is the one
   that tells a searcher the page is worth opening. */
function reach(sc) {
  if (sc.n < 25 && sc.n3 >= 25 && sc.n3 >= sc.n * 2) return { n: sc.n3, r: 3 };
  return { n: sc.n, r: sc.r };
}
const miles = (r, cap) => (r === 1 ? (cap ? "a Mile" : "a mile") : `${r} ${cap ? "Miles" : "miles"}`);

/* The name a description should use: the settled search name when it is a
   name rather than an abbreviation ("Cal State LA", "CUNY Graduate Center"),
   otherwise the full name, so the words someone typed are there to be bolded. */
function descName(c) {
  if (c.d) return c.d;
  const plainName = c.t && c.t.includes(" ") && !c.t.includes("(") && !/^[A-Z&]{2,6} [A-Z][a-z]+$/.test(c.t);
  const n = (plainName ? c.t : c.n).replace(/-Main Campus$/, "");
  return /^University of /.test(n) ? `the ${n}` : n;
}

const WORD = ["no", "one", "two", "three", "four", "five"];

/* `town` is the nearest city with its own page, for campuses with almost
   nothing around them: the honest pitch there is where to go instead.
   `shown` is how many places the page lists (three to five), so the promise
   matches the page. */
function dataDesc(c, sc, town, shown, dataFirst = false) {
  const { n, r } = reach(sc);
  const who = descName(c);
  const close = shown ? ` See ${WORD[shown] || shown} nearby, or get a free pick for your craving.`
    : " Get a free pick for your craving.";
  if (n < 12) {
    const head = `Only ${sc.n} ${sc.n === 1 ? "place" : "places"} to eat right by ${who}`;
    const more = town ? `; ${town.c}, ${town.miles} miles away, has far more.` : ".";
    return [`${head}${more}${close}`, `${head}${more}`, `${head}.`].find((d) => d.length <= 160);
  }
  const top = leaders(sc.top, 3).map((t) => inline(t[0], t[1]));
  const lead = top.length && r === sc.r
    ? ` ${top[0][0].toUpperCase()}${listSentence(top).slice(1)} ${top.length === 1 ? "leads" : "lead"} the list.`
    : "";
  const street = sc.st && sc.st.length && sc.st[0][1] >= 8 && r === sc.r ? ` Busiest food street: ${sc.st[0][0]}.` : "";
  const head = r === sc.r
    ? `${n.toLocaleString("en-US")} places to eat within ${miles(r)} of ${who}` +
      `${sc.w === 1 ? ", one a ten-minute walk away" : sc.w ? `, ${sc.w.toLocaleString("en-US")} a ten-minute walk away` : ""}.`
    : `${sc.n.toLocaleString("en-US")} places to eat within ${miles(sc.r)} of ${who} and ` +
      `${n.toLocaleString("en-US")} within ${miles(r)}.`;
  /* Longest version that fits in about 160 characters, Google's usual cut.
     `dataFirst` keeps what leads and the busiest street over the closing
     line when only one fits: those differ from page to page, the closing
     line is the same on all of them. The focus pages keep the order they
     have carried since 18 October. */
  return (dataFirst ? [
    `${head}${lead}${street}${close}`,
    `${head}${lead}${close}`,
    `${head}${lead}${street}`,
    `${head}${lead}`,
    `${head}${close}`,
    head,
  ] : [
    `${head}${lead}${street}${close}`,
    `${head}${lead}${close}`,
    `${head}${close}`,
    `${head}${lead}`,
    head,
  ]).find((d) => d.length <= 160) || head;
}

/* The description for a page that lists every nearby place: what the list is,
   then the closest few by name. A searcher deciding between results recognises
   a restaurant's name; a general line about the site tells them nothing. */
/* A name that is part of the campus ("NYU Stern - Sosnoff Lounge", "Student
   Union Food Court") is listed on the page but is no reason to click from
   search: most are for students only. */
const CAMPUS_PLACE = /\b(universit(y|ies)|college|campus|student|dining hall|residence|lounge|cafeteria)\b/i;

function listDesc(c, dir) {
  const who = descName(c);
  const { r, rows } = dir;
  const n = dir.n.toLocaleString("en-US");
  /* Local places by name, closest first: "Subway" tells a searcher nothing
     about this campus, the corner café does. Chains only make up the numbers. */
  const ok = rows.filter((p) => !CAMPUS_PLACE.test(p.n) && !(c.a && p.n.includes(c.a)));
  const names = [...ok.filter((p) => !p.chain), ...ok.filter((p) => p.chain)].map((p) => p.n);
  const head = dir.n <= 50
    ? `Every place to eat within ${miles(r)} of ${who}, closest first`
    : `${n} places to eat within ${miles(r)} of ${who}, closest first`;
  const tries = [];
  for (const k of [3, 2, 1]) {
    if (names.length < k) continue;
    const list = k === 1 ? names[0] : `${names.slice(0, k - 1).join(", ")} and ${names[k - 1]}`;
    tries.push(`${head}, including ${list}. With addresses and distances.`, `${head}, including ${list}.`);
  }
  return tries.find((d) => d.length <= 160) || `${head}.`;
}

/* Title for a focus page: the school as people search it, then the count,
   which is the one thing on the page no directory result shows in its title.
   Under a dozen places is no selling point, so those titles leave it out.
   60 characters rather than 65 here: Google cuts titles at about 600 pixels,
   and a title full of capitals and digits reaches that sooner.

   `whos` is the names to try, best first. Every name is tried with the count
   before any is tried without it: the count is the reason to click, so a
   shorter name that leaves room for it beats a longer one that does not. */
function dataTitle(c, sc, whos, max = 60) {
  whos = whos || [c.t || (c.a && c.a.length <= 24 ? c.a : c.n)];
  const { n: count, r } = reach(sc);
  const n = count.toLocaleString("en-US");
  const options = [
    ...(count >= 12 ? whos.flatMap((who) => [
      `Restaurants Near ${who}: ${n} Places Within ${miles(r, true)} | Savor Scout`,
      `Restaurants Near ${who}: ${n} Places to Eat Within ${miles(r, true)}`,
      `Restaurants Near ${who}: ${n} Places Within ${miles(r, true)}`,
      `Restaurants Near ${who}: ${n} Within ${miles(r, true)}`,
      `Restaurants Near ${who}: ${n} Nearby | Savor Scout`,
      `Restaurants Near ${who}: ${n} Nearby`,
    ]) : []),
    ...whos.flatMap((who) => [
      `Restaurants Near ${who}: Where to Eat Nearby | Savor Scout`,
      `Restaurants Near ${who} | Savor Scout`,
    ]),
  ];
  return options.find((t) => t.length <= max) || fitTitle([...options, `Restaurants Near ${whos[0]}`]);
}

/* The names a priority page's title can use, fullest first: the settled
   search name, the full name with its abbreviation, the full name, the short
   name, the abbreviation alone. */
const STATE_NAMES = new Set(Object.values(STATES));
function titleNames(c, abbr) {
  const full = c.n.replace(/-Main Campus$/, "");
  /* Not a one-word short name: in a title it reads as the place, not the
     school ("Illinois", "Brooklyn", "Northwest"), and several are shared
     ("Rutgers" is three campuses). Nor one that is a state or the town. */
  const short = c.a && c.a !== abbr && c.a.length <= 24 && !/^[A-Z][a-z]+$/.test(c.a) && !STATE_NAMES.has(c.a)
    && c.a !== c.c ? c.a : null;
  return [...new Set([
    ...(c.t ? [c.t] : []),
    ...(abbr ? [`${full} (${abbr})`] : []),
    full,
    ...(short ? [short] : []),
    ...(abbr ? [abbr] : []),
  ])];
}

/* A priority page's title. An abbreviation people search by ("food near
   ewu") should not drop out for want of a few characters: when the
   60-character title lost it, the full name with it may run to the site's
   usual 65. */
function priorityTitle(c, sc, abbr, pagePath, fallback) {
  const names = preferSearched(pagePath, titleNames(c, abbr));
  const t = dataTitle(c, sc, names);
  const keep = abbr ? names.filter((n) => n.includes(abbr)) : [];
  if (keep.length && !t.includes(abbr)) {
    const alt = dataTitle(c, sc, keep, 65);
    if (alt.length <= 65 && /\d/.test(alt) && alt.includes(" (")) return alt;
  }
  /* A name too long for any version with the count keeps the title it had,
     which was already fitted to the length. */
  return t.length <= 65 && /\d/.test(t) ? t : fallback;
}

const WHO = "make-campus-pages";

/* The exclusion rule and the filtered list live in lib/campuses.js, because the
   city generator needs to know which states have campuses too — see the comment
   there. */
const { CAMPUSES, BY_STATE: CAMPUS_BY_STATE } = require("./lib/campuses");

const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));
/* "Saint Louis" in IPEDS, "St. Louis" in the city list: one key for both. */
const townKey = (name, st) => `${name.toLowerCase().replace(/\./g, "").replace(/^saint /, "st ").replace(/^sainte /, "ste ")}|${st}`;
const CITY_PAGE = new Map(CITIES.map((x) => [townKey(x.c, x.r), x]));

const shell = shellOrDie(WHO);
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const HUB = { name: "Campuses", url: `${ORIGIN}/campus/` };

/* IPEDS institution size categories. The brackets are the survey's own, so
   quoting them is accurate in a way an estimated headcount would not be. */
const SIZE = {
  2: { label: "1,000 to 4,999 students" },
  3: { label: "5,000 to 9,999 students" },
  4: { label: "10,000 to 19,999 students" },
  5: { label: "20,000 students or more" },
};

/* IPEDS urban-centric locale codes, collapsed to the four that matter to this
   question. The setting is the single biggest determinant of what eating near a
   campus is actually like, which is why the copy branches on it. */
function setting(lc) {
  if (lc < 20) return "city";
  if (lc < 30) return "suburb";
  if (lc < 40) return "town";
  return "rural";
}

const SETTING_COPY = {
  city: { label: "in a city" },
  suburb: { label: "in a suburb" },
  town: { label: "in a college town" },
  rural: { label: "in a rural area" },
};

/* Two-year colleges are a different question, not a smaller one. Most students
   commute and many work, so the meal that matters is the one between a class
   and a shift — quick, cheap, and on the way somewhere — rather than the
   late-night one a residential campus is built around, and the guide links
   follow that. */
const LEVEL = {
  4: {
    type: (pub) => `${pub ? "Public" : "Private, not-for-profit"} four-year institution`,
    guides: [
      ["/what-to-eat/finals-week", "What to eat during finals week"],
      ["/what-to-eat/on-a-budget", "Where to eat when you're broke"],
      ["/what-to-eat/late-night", "Where to eat late at night"],
      ["/what-to-eat/friends-visiting", "Where to take visiting family and friends"],
      ["/diet/", "Eating out with a dietary restriction"],
    ],
  },
  2: {
    type: (pub, lv) => `${pub ? "Public" : "Private, not-for-profit"} two-year college${lv === 4
      ? " that also awards some bachelor's degrees" : ""}`,
    guides: [
      ["/what-to-eat/quick-lunch", "Where to get a quick lunch"],
      ["/what-to-eat/on-a-budget", "Where to eat when you're broke"],
      ["/what-to-eat/after-a-shift", "What to eat after a shift"],
      ["/what-to-eat/finals-week", "What to eat during finals week"],
      ["/diet/", "Eating out with a dietary restriction"],
    ],
  },
};

function nearestCities(c, k) {
  const cos = Math.cos((c.lat * Math.PI) / 180);
  return CITIES
    .map((o) => {
      const dx = (o.lng - c.lng) * cos;
      const dy = o.lat - c.lat;
      return { o, d2: dx * dx + dy * dy };
    })
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, k)
    .map((x) => ({ ...x.o, miles: Math.max(1, Math.round(Math.sqrt(x.d2) * 69)) }));
}

/* The nearest city over 150,000 people, with a real distance. On a rural or
   town campus this is the single most useful fact on the page — it is the
   answer to "where do we drive when nobody wants the same four places again" —
   and it is different for almost every campus, which is exactly what 637 pages
   need to be worth having. */
/* The nearest city of 100,000 or more, for the nights the options by campus
   run out. Null when the campus is already in or beside one (telling a CUNY
   student the nearest big city is New York helps no one) or when the nearest
   is more than an hour's drive away. */
function nearestBigCity(c) {
  const cos = Math.cos((c.lat * Math.PI) / 180);
  let best = null;
  for (const o of CITIES) {
    if (o.p < 100000) continue;
    const dx = (o.lng - c.lng) * cos;
    const dy = o.lat - c.lat;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) best = { o, d2 };
  }
  if (!best) return null;
  const miles = Math.max(1, Math.round(Math.sqrt(best.d2) * 69));
  const sameTown = best.o.c.toLowerCase() === c.c.toLowerCase() && best.o.r === c.r;
  if (sameTown || miles <= 10 || miles > 60) return null;
  return { ...best.o, miles };
}

function page(c) {
  const url = `${ORIGIN}/campus/${c.s}`;
  const place = `${c.c}, ${c.r}`;
  const set = setting(c.lc);
  const sc = SETTING_COPY[set];
  const sz = SIZE[c.sz];
  const near = nearestCities(c, 5);
  const big = nearestBigCity(c);
  const shortName = c.a || c.n;
  /* IPEDS files a college as four-year once it awards any bachelor's degree,
     which now includes many community colleges. Calling Glendale Community
     College a "four-year institution" is the survey's category, not how anyone
     there would describe it — so the name decides the copy, and the type line
     keeps the survey's fact. */
  const lv = c.lv || 4;
  const twoYearish = lv === 2 || /community college|junior college|technical college/i.test(c.n);
  const lvl = LEVEL[twoYearish ? 2 : 4];

  /* Led by "Restaurants Near", not "Where to Eat Near".
     Search Console, 24 September: of the campus queries reaching these pages,
     "restaurants near X" outnumbers every other phrasing combined, followed by
     "food near X" and "places to eat near X". The title was answering the
     phrasing hardly anyone types.

     And the abbreviation goes in when there is one, because a large share of
     those queries use it — "food near fau", "restaurants near umkc campus",
     "gvsu restaurants". A title naming only "Florida Atlantic University" has
     to rely on Google inferring that FAU means the same thing. */
  const abbr = c.a && c.a !== c.n && /^[A-Z&]{2,6}$/.test(c.a) ? c.a : null;
  /* A title/description test ran from 11 October on 28 pages; it ended when
     every campus page got the count-led title and the full list. */
  const dir = directoryFor(c.s);
  const sc0 = sceneFor(`campus/${c.s}`);
  const focus = DATA_DESC.has(c.s) && sc0;
  /* The 500 pages Google shows most (data/priority-pages.json) get the focus
     treatment too: the count in the title. */
  const pagePath = `/campus/${c.s}`;
  /* Every page with a list gets the count in its title, not only the 500
     Google showed most: the page now delivers what the count promises. */
  const prio = !focus && sc0 && (dir || isPriority(pagePath));
  const spots = spotsFor(`campus/${c.s}`);
  const baseTitle = fitTitle([
    ...(abbr ? [
      `Restaurants Near ${abbr} — Where to Eat Near ${c.n} | Savor Scout`,
      `Restaurants Near ${abbr} (${c.n}) | Savor Scout`,
      `Restaurants Near ${abbr} — ${c.n}`,
      `Restaurants Near ${abbr} — ${place} | Savor Scout`,
    ] : []),
    `Restaurants Near ${c.n} — ${place} | Savor Scout`,
    /* Two schools share this name (the slug carries the state), so the state
       goes in the title before anything shorter is allowed to drop it. */
    ...(c.s.endsWith(`-${c.r.toLowerCase()}`) ? [`Restaurants Near ${c.n}, ${c.r} | Savor Scout`] : []),
    `Restaurants Near ${c.n} | Savor Scout`,
    `Restaurants Near ${c.n}`,
    `Food Near ${c.n}`,
    ...(c.a && c.a !== c.n ? [`Restaurants Near ${c.a} — ${place} | Savor Scout`] : []),
  ]);
  const title = focus ? dataTitle(c, sc0) : prio ? priorityTitle(c, sc0, abbr, pagePath, baseTitle) : baseTitle;
  /* Every campus page with data gets a description built from it: the count,
     the walk, what leads, the busiest street. The general line it replaces was
     the same 30 words on a thousand pages, and ran past Google's cut. */
  const desc = sc0 && dir ? listDesc(c, dir)
    : sc0 ? dataDesc(c, sc0, near[0], spots ? spots.length : 0, !focus)
    :
    `Looking for food near ${c.n} in ${place}? Savor Scout picks one restaurant based on ` +
    `what you're craving instead of handing you a list. Free, no app, no signup.`;

  const stateNode = { name: STATES[c.r] || c.r, url: `${ORIGIN}/campus/${c.r.toLowerCase()}` };
  /* Home > Campuses > State > Town > Campus. The town step only where the town
     has its own page, so every crumb is a real place to go. */
  const town = CITY_PAGE.get(townKey(c.c, c.r));
  const trail = [HOME, HUB, stateNode,
    ...(town ? [{ name: `${town.c}, ${town.r}`, url: `${ORIGIN}/eat/${town.s}` }] : []),
    { name: c.n, url }];
  const appLink = `/?near=${encodeURIComponent(place)}`;


  /* Every other name the school goes by, for the facts list. The abbreviation
     already sits in the title and h1; this puts the longer forms ("Grand Valley
     State", "Cal State Fullerton") on the page too, as plain text, where a
     searcher using them can be matched to it. */
  const otherNames = (c.al || []).filter((s) => s && s !== c.n);

  const qa = faq({ name: shortName, near: `near ${shortName}`, sc: sc0, spots,
    extra: askedQa(pagePath, { near: `near ${shortName}`, sc: sc0 }) });
  const list = spotsLd(dir ? dir.rows : spots, `Places to eat near ${c.n}`);

  const body = `      ${crumbHtml(trail)}
      <h1>Restaurants near ${esc(c.n)}${abbr ? ` (${esc(abbr)})` : ""}</h1>
      <p><a class="cta" href="${appLink}">Find somewhere to eat near ${esc(shortName)} &rarr;</a></p>
${dir ? directoryHtml(dir, {
  who: shortName, from: c.at || "the campus",
  appLink, ctaText: `Ask Savor Scout near ${shortName}`,
}) : spotsHtml(spots, {
  heading: `A few places to eat near ${shortName}`,
  from: "campus",
  appLink,
  ctaText: `Ask Savor Scout near ${shortName}`,
})}
${sceneHtml(sceneFor(`campus/${c.s}`), { where: shortName, around: `around ${shortName}`, isCampus: true })}
${cravingsHtml(sc0, `near ${shortName}`)}
${NICHE.campusLinksHtml(c)}
${ranksHtml("campus", c.s, shortName)}
${budgetHtml(sc0, shortName, appLink)}
${openNowHtml(shortName, appLink)}

      <h2>The campus</h2>
      <ul>
        <li><strong>Location</strong> — ${esc(place)}</li>
${c.at ? `        <li><strong>Measured from</strong> — ${esc(c.at)}</li>\n` : ""}
${otherNames.length ? `        <li><strong>Other names, current or former</strong> — ${otherNames.map(esc).join(", ")}</li>\n` : ""}        <li><strong>Setting</strong> — ${esc(sc.label)}</li>
        <li><strong>Size</strong> — ${esc(sz.label)}</li>
        <li><strong>Type</strong> — ${esc(lvl.type(c.pub, lv))}</li>
      </ul>
      <p class="note">
        Campus figures are from IPEDS, the US Department of Education's institutional survey.
        Size is reported as the survey's own bracket rather than an exact headcount, because
        that is what the public dataset gives and we would rather quote it than estimate.
      </p>

      <h2>Nearby cities</h2>
      <ul>
        ${near.map((n) =>
          `<li><a href="/eat/${n.s}">${esc(n.c)}, ${esc(n.r)}</a> — about ${n.miles} ${n.miles === 1 ? "mile" : "miles"} away</li>`
        ).join("\n        ")}
      </ul>
${big ? `      <p>
        The nearest city of any real size is <a href="/eat/${big.s}">${esc(big.c)}, ${esc(big.r)}</a>,
        about ${big.miles} ${big.miles === 1 ? "mile" : "miles"} away, for the nights the options by campus run out.
      </p>` : ""}

${GROUP_ENABLED ? `
      <h2>Deciding as a group</h2>
      <p>
        Most campus meals are group meals, and a group chat is the worst possible way to choose a
        restaurant. Savor Scout turns it into a 90-second vote with one veto each —
        <a href="/what-to-eat/big-group">how that works, and why the veto is the move that matters</a>.
      </p>
` : ""}
      <h2>Guides worth reading</h2>
      <ul>
        ${lvl.guides.map(([h, t]) => `<li><a href="${h}">${esc(t)}</a></li>`).join("\n        ")}
      </ul>
${qa ? qa.html : ""}
${neighboursHtml(c)}
      <hr>
      <p><a href="/campus/${c.r.toLowerCase()}">All campuses in ${esc(STATES[c.r] || c.r)}</a> &middot;
         <a href="/campus/">All ${CAMPUSES.length} campuses</a> &middot;
         <a href="/eat/">Cities</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

  const ld = JSON.stringify(withFaq({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: desc,
    url,
    /* The day the full lists went on these pages. Change it when the page's
       content changes, not on every build. */
    dateModified: "2026-11-04",
    about: {
      "@type": "CollegeOrUniversity",
      name: c.n,
      /* The machine-readable form of "also known as", which is what the
         property exists for: telling Google that "GVSU" and "Grand Valley State
         University" are the same institution. */
      ...(c.al && c.al.length ? { alternateName: c.al } : {}),
      address: { "@type": "PostalAddress", addressLocality: c.c, addressRegion: c.r, addressCountry: "US" },
      geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
    },
    ...(list ? { mainEntity: list } : {}),
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(trail),
  }, qa));

  return { url, html: render(shell, { title, desc, url, body, ld, who: WHO }) };
}

/* ---- write ---------------------------------------------------------------- */

const outDir = path.join(BUILD, "campus");
fs.mkdirSync(outDir, { recursive: true });

const urls = [];
CAMPUSES.forEach((c) => {
  const p = page(c);
  fs.writeFileSync(path.join(outDir, `${c.s}.html`), p.html);
  urls.push({ loc: p.url, pri: c.sz === 5 ? "0.8" : "0.7", freq: "monthly" });
});

/* ---- campus x cuisine pages (lib/niche.js) -------------------------------- */
for (const p of NICHE.PAGES) {
  const n = NICHE.build(p, { ORIGIN, HOME, HUB, STATES, breadcrumb, crumbHtml });
  fs.mkdirSync(path.join(outDir, p.campus), { recursive: true });
  fs.writeFileSync(path.join(outDir, p.campus, `${p.food}.html`),
    render(shell, { title: n.title, desc: n.desc, url: n.url, body: n.body, ld: n.ld, who: WHO }));
  urls.push({ loc: n.url, pri: "0.6", freq: "monthly" });
}

/* ---- state hubs -------------------------------------------------------------
   Same reasoning as /eat/: a single index listing all 627 campuses was the only
   crawl path into every one of them, and a 627-link page splits its authority
   627 ways. /campus/ now lists states, and each state page lists its campuses.
   Two clicks from the homepage either way, but the links concentrate. */
const byState = CAMPUS_BY_STATE;
const stateCodes = Object.keys(byState).sort();
const CITY_STATES = new Set(CITIES.map((c) => c.r));

function stateHub(st) {
  const list = byState[st];
  const name = STATES[st] || st;
  const url = `${ORIGIN}/campus/${st.toLowerCase()}`;
  const trail = [HOME, HUB, { name, url }];

  const big = list.filter((c) => c.sz === 5).length;
  const twoYear = list.filter((c) => c.lv === 2).length;
  const kind = twoYear ? "Colleges" : "Universities";
  const settings = list.reduce((m, c) => {
    const g = setting(c.lc); m[g] = (m[g] || 0) + 1; return m;
  }, {});
  const shape = Object.entries(settings).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n} ${k === "city" ? "in cities" : k === "suburb" ? "in suburbs"
      : k === "town" ? "in college towns" : "rurally situated"}`).join(", ");

  const rows = list.map((c) => {
    const guides = NICHE.campusInlineLinks(c);
    return `        <li><a href="/campus/${c.s}">${esc(c.n)}</a> — ${esc(c.c)}, ` +
      `${esc(SIZE[c.sz].label)}${guides ? ` · ${guides}` : ""}</li>`;
  }).join("\n");

  const body = `      ${crumbHtml(trail)}
      <h1>Where to eat near ${esc(name)} campuses</h1>
      <p class="lede">
        ${list.length} ${esc(name)} ${list.length === 1 ? "campus" : "campuses"}${twoYear
          ? `, ${twoYear} of them two-year ${twoYear === 1 ? "college" : "colleges"}` : ""}${big
          ? `, and ${big} with 20,000 students or more` : ""}. Pick yours and Savor Scout opens
        with the location already set.
      </p>
      <p><a class="cta" href="/">Find somewhere to eat &rarr;</a></p>

      <h2>What eating near these campuses is like</h2>
      <p>
        Of the ${list.length} here, ${shape}. That matters more than it sounds: a campus in a city
        has too many options and needs a filter, while a rural one has too few and needs a drive.
        Each page below starts from whichever problem that campus actually has.
      </p>

      <h2>${esc(name)} campuses</h2>
      <ul>
${rows}
      </ul>

      <h2>Guides worth reading</h2>
      <ul>
        <li><a href="/what-to-eat/finals-week">What to eat during finals week</a></li>
        <li><a href="/what-to-eat/on-a-budget">Where to eat when you're broke</a></li>
        <li><a href="/what-to-eat/late-night">Where to eat late at night</a></li>
${CITY_STATES.has(st) ? `        <li><a href="/eat/${st.toLowerCase()}">${esc(name)} cities</a></li>
` : ""}      </ul>
      <hr>
      <p><a href="/campus/">All states</a> &middot; <a href="/">Savor Scout home</a></p>`;

  return {
    url,
    html: render(shell, {
      title: fitTitle([
        `Where to Eat Near ${name} Campuses — ${list.length} ${kind} | Savor Scout`,
        `Where to Eat Near ${name} Campuses — ${list.length} ${kind}`,
        `Where to Eat Near ${name} Campuses`,
      ]),
      desc: `Food near ${list.length} ${name} ${twoYear ? "college and university" : "university"} campuses. Savor Scout picks one restaurant ` +
        `based on what you're craving instead of handing you a list.`,
      url, body, who: WHO,
      ld: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Where to eat near ${name} campuses`,
        url,
        isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
        breadcrumb: breadcrumb(trail),
      }),
    }),
  };
}

stateCodes.forEach((st) => {
  const h = stateHub(st);
  fs.writeFileSync(path.join(outDir, `${st.toLowerCase()}.html`), h.html);
  urls.push({ loc: h.url, pri: "0.8", freq: "weekly" });
});

const hubTrail = [HOME, HUB];

/* The campus pages Google shows most, linked straight from the hub: the
   first 60 campuses on the priority list (data/priority-pages.json, ordered by
   Search Console impressions), which starts with the 18 October focus pages.
   The hub ranks on page one for "restaurants near campus"; this hands some of
   that to the campus pages sitting just below the top five. */
const BY_SLUG = new Map(CAMPUSES.map((x) => [x.s, x]));
const searched = (PRIORITY.length ? PRIORITY.map((p) => p.url) : FOCUS_PAGES.map(([p]) => p))
  .filter((p) => /^\/campus\/[^/]+$/.test(p) && BY_SLUG.has(p.slice(8)))
  .slice(0, 60)
  .map((p) => BY_SLUG.get(p.slice(8)));
const searchedCards = searched.map((x) =>
  `<li class="card"><a href="/campus/${x.s}">${esc(x.n)}</a><span class="meta">${esc(x.c)}, ${esc(x.r)}` +
  `${x.a && x.a.length <= 24 && !x.n.includes(x.a) ? ` · ${esc(x.a)}` : ""}</span></li>`).join("\n        ");
const stateRows = stateCodes.slice().sort((a, b) => (STATES[a] || a).localeCompare(STATES[b] || b)).map((st) =>
  `        <li><a href="/campus/${st.toLowerCase()}">${esc(STATES[st] || st)}</a> — ` +
  `${byState[st].length} ${byState[st].length === 1 ? "campus" : "campuses"}</li>`).join("\n");

const hubBody = `      ${crumbHtml(hubTrail)}
      <h1>Where to eat near campus: ${CAMPUSES.length.toLocaleString("en-US")} US colleges</h1>
      <p class="lede">
        ${CAMPUSES.length.toLocaleString("en-US")} US campuses across the 50 states, DC and Puerto Rico, from community colleges
        to universities of 20,000 students and more. Pick yours and Savor Scout opens with the location already set — say what you are
        craving and it finds one place, then shows why it chose it.
      </p>
      <p>
        Campus eating has its own constraints: it has to be cheap, it has to be close, it has to be
        open at the hour you actually finish, and it usually has to satisfy four people at once.
        These pages start from that rather than from a ranked list of everything within a mile.
      </p>
      <p><a class="cta" href="/">Try it &rarr;</a></p>
      <p class="note">
        Campus data from IPEDS, the US Department of Education's institutional survey (public
        domain). Degree-granting public and private not-for-profit institutions: four-year
        campuses and two-year colleges of 5,000 students and up, plus the largest four-year
        campuses just under that.
      </p>

      <h2>Most-searched campuses</h2>
      <p>The campus pages people find most often on Google right now.</p>
      <ul class="cards">
        ${searchedCards}
      </ul>

      <h2>Browse by state</h2>
      <ul class="cols">
${stateRows}
      </ul>
      <hr>
      <p><a href="/eat/">Cities</a> &middot;
         <a href="/what-to-eat/">What to eat when&hellip;</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

fs.writeFileSync(path.join(outDir, "index.html"), render(shell, {
  /* 39 impressions at position 7.1 and no clicks (18 October): the title now
     leads with "Restaurants Near Campus", the commoner search. */
  title: fitTitle([
    `Restaurants Near Campus: Where to Eat at ${CAMPUSES.length.toLocaleString("en-US")} US Colleges`,
    `Restaurants Near Campus | Savor Scout`,
  ]),
  desc: `Pick your college from ${CAMPUSES.length.toLocaleString("en-US")} US campuses, say what you are craving, and Savor Scout ` +
    `finds one place nearby, not a ranked list, and shows why it chose it.`,
  url: HUB.url,
  who: WHO,
  body: hubBody,
  ld: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Where to eat near campus",
    url: HUB.url,
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
    breadcrumb: breadcrumb(hubTrail),
  }),
}));
urls.push({ loc: HUB.url, pri: "0.9", freq: "weekly" });

emit("campus", urls);
console.log(`${WHO}: ${CAMPUSES.length} campus pages + ${NICHE.PAGES.length} campus x cuisine pages + index across ${Object.keys(byState).length} states`);
