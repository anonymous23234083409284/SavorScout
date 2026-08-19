/* Generates a landing page per food personality at /type/<slug>.
 *
 * These are the best organic surface the quiz created. Unlike the city pages,
 * which compete for local intent against Yelp and TripAdvisor, these compete
 * for a query class almost nobody serves — "food personality quiz", "what kind
 * of eater am I", "the firewalker food personality" — where the competition is
 * listicles rather than incumbents with fifteen years of domain authority.
 *
 * They are also the natural destination when somebody shares their result,
 * which means a share and an indexable page are the same URL rather than two
 * things to maintain.
 *
 * The character is rendered as INLINE SVG rather than an <img>, so the artwork
 * is visible without JavaScript. A crawler fetching this page sees the drawing,
 * the type's name and its full description without executing anything — which
 * is the entire reason these rank when the app itself cannot.
 *
 * Personality copy is read from the same JSON the app imports, so a page and
 * the product can never end up describing a type differently.
 */
const fs = require("fs");
const path = require("path");

const BUILD = path.join(__dirname, "..", "build");
const ORIGIN = "https://www.savorscout.net";
const TYPES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "personalities.json"), "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugOf = (name) => name.toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Mirrors the prop shapes in personalities.jsx. Kept as strings because this
   runs in plain Node with no JSX toolchain — the shapes are simple enough that
   duplication costs less than wiring a build step to share them. */
function propSvg(prop, color) {
  switch (prop) {
    case "flame":   return `<path d="M100 34c10 16 18 26 18 38a18 18 0 0 1-36 0c0-8 6-14 10-22 3 8 8 10 8 16 4-10 0-20 0-32z" fill="${color}" opacity="0.95"/>`;
    case "leaf":    return `<path d="M82 60c16-22 40-24 40-24s2 26-14 40-32 8-32 8 0-14 6-24z" fill="${color}" opacity="0.95"/>`;
    case "cherry":  return `<g fill="${color}"><circle cx="88" cy="58" r="11"/><circle cx="112" cy="64" r="9"/><path d="M88 47c4-14 16-18 24-14" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
    case "coin":    return `<g><circle cx="100" cy="58" r="18" fill="${color}"/><circle cx="100" cy="58" r="11" fill="none" stroke="#0C0912" stroke-width="3" opacity="0.35"/></g>`;
    case "glass":   return `<g fill="${color}"><path d="M84 40h32l-13 20v18h8v6H89v-6h8V60z"/></g>`;
    case "compass": return `<g><circle cx="100" cy="58" r="19" fill="none" stroke="${color}" stroke-width="5"/><path d="M108 50l-5 14-11 4 5-14z" fill="${color}"/></g>`;
    case "moon":    return `<path d="M112 40a20 20 0 1 0 6 34 24 24 0 0 1-6-34z" fill="${color}"/>`;
    case "gem":     return `<g fill="${color}"><path d="M100 38l20 14-20 26-20-26z"/><path d="M80 52h40" stroke="#0C0912" stroke-width="3" opacity="0.3"/></g>`;
    default:        return "";
  }
}

function characterSvg(t) {
  return `<svg viewBox="0 0 200 200" width="180" height="180" role="img" aria-label="${esc(t.name)}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="b-${t.id}" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0%" stop-color="${t.color}" stop-opacity="0.95"/>
    <stop offset="100%" stop-color="${t.color}" stop-opacity="0.55"/></linearGradient></defs>
  <path d="M100 84c30 0 50 20 50 46 0 24-20 38-50 38s-50-14-50-38c0-26 20-46 50-46z" fill="url(#b-${t.id})"/>
  <ellipse cx="84" cy="170" rx="11" ry="6" fill="${t.color}" opacity="0.5"/>
  <ellipse cx="116" cy="170" rx="11" ry="6" fill="${t.color}" opacity="0.5"/>
  <circle cx="88" cy="116" r="5.5" fill="#0C0912"/><circle cx="112" cy="116" r="5.5" fill="#0C0912"/>
  <circle cx="89.6" cy="114" r="1.9" fill="#FDF8F2"/><circle cx="113.6" cy="114" r="1.9" fill="#FDF8F2"/>
  <path d="M90 131q10 9 20 0" stroke="#0C0912" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="74" cy="128" rx="6" ry="4" fill="#FF4081" opacity="0.28"/>
  <ellipse cx="126" cy="128" rx="6" ry="4" fill="#FF4081" opacity="0.28"/>
  ${propSvg(t.prop, t.color)}
</svg>`;
}

/* What each type means in practice — written per type rather than templated,
   because a page that says "you are The Gem Finder, which means you are a gem
   finder" is exactly the thin content this whole exercise is trying to avoid. */
const MEANS = {
  heat_high: "You order at the top of the heat scale and finish what you ordered. Chilli is not a dare you tolerate, it is a flavour you are there for — so the places worth your time are the ones that season for people who mean it, not the ones hedging for a table that might complain.",
  heat_low: "You want to taste what the kitchen actually made. Heat that buries a dish has wasted it, and you would rather have the seasoning balanced than proved. That makes you far pickier about cooking than people assume, because there is nothing to hide behind.",
  sweet_high: "Dessert is not an afterthought you agree to, it is a reason to pick a place. You will remember a pastry longer than the main it followed, and you have crossed a city for one before. Sweet-and-savoury together is a feature, not a compromise.",
  value_high: "You worked out early that the room has almost nothing to do with the cooking. Plastic chairs, a handwritten menu and a queue of locals is not a downgrade, it is a signal — and paying twice as much for a tablecloth reads to you as paying for the tablecloth.",
  value_low: "A meal is an evening, not fuel. You are paying for the room, the pace and the fact that nobody is rushing you, and you think people optimising for cost-per-calorie are solving a different problem than the one dinner is for.",
  adventure_high: "The dish you cannot identify is the one you order. You will let a kitchen choose for you, you have eaten some genuine mistakes, and you would do it again this week — because the ceiling on something unfamiliar is higher than the ceiling on the thing you already know is fine.",
  lateNight_high: "Rooms get better when they get busy, and the meal that ends a night beats the one that starts it. Breakfast at 9pm is a legitimate dinner. The places that are still serving when everywhere else has closed tend to be serious about it.",
  discovery_high: "Thirty reviews beats three thousand. A place with no website and a phone number reads to you as promising rather than risky, and you would rather be early to somewhere good than on time to somewhere everyone has already been.",
};

function page(shell, t, all) {
  const slug = slugOf(t.name);
  const url = `${ORIGIN}/type/${slug}`;
  const title = `${t.name} — Food Personality Type | Savor Scout`;
  const desc = `${t.name}: ${t.tagline} Take the free 7-day taste quiz and find out what kind of eater you are.`;

  const others = all.filter((o) => o.id !== t.id)
    .map((o) => `<li><a href="/type/${slugOf(o.name)}">${esc(o.name)}</a> — ${esc(o.tagline)}</li>`)
    .join("\n        ");

  const body = `
      <h1>${esc(t.name)}</h1>
      ${characterSvg(t)}
      <p><strong>${esc(t.tagline)}</strong></p>
      <p>${esc(t.blurb)}</p>

      <h2>What being ${esc(t.name)} actually means</h2>
      <p>${esc(MEANS[t.id] || t.blurb)}</p>

      <h2>How you find out</h2>
      <p>
        The Savor Scout taste quiz runs over seven days — five questions a day, about a
        minute each. Every day reads a different part of how you eat: heat, sweet, value,
        adventure, late nights and discovery. On the last day you get your type.
      </p>
      <p>
        It is not a personality test for its own sake. Your answers weight what the app
        recommends, starting from day one, so a ${esc(t.name)} and a
        ${esc((all.find((o) => o.id !== t.id) || t).name)} searching the same words in the
        same town get different restaurants back.
      </p>
      <p><a href="/?quiz=1">Take the taste quiz &rarr;</a></p>

      <h2>The other types</h2>
      <ul>
        ${others}
      </ul>
      <p><a href="/type/">All food personality types</a> &middot; <a href="/">Savor Scout home</a></p>
  `;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${t.name} — Food Personality Type`,
    description: desc,
    url,
    author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    mainEntityOfPage: url,
  });

  return { slug, url, title, html: render(shell, { title, desc, url, body, ld }) };
}

function render(shell, { title, desc, url, body, ld }) {
  let html = shell;
  const swaps = [
    [/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`],
    [/(<meta name="description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<meta property="og:title" content=")[^"]*(")/i, `$1${esc(title)}$2`],
    [/(<meta property="og:description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<meta property="og:url" content=")[^"]*(")/i, `$1${url}$2`],
    [/(<meta name="twitter:title" content=")[^"]*(")/i, `$1${esc(title)}$2`],
    [/(<meta name="twitter:description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<link rel="canonical" href=")[^"]*(")/i, `$1${url}$2`],
  ];
  const missed = [];
  for (const [re, to] of swaps) {
    if (!re.test(html)) { missed.push(String(re)); continue; }
    html = html.replace(re, to);
  }
  if (missed.length) {
    console.error("make-type-pages: tags missing from index.html:");
    missed.forEach((m) => console.error("  " + m));
    process.exit(1);
  }
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, `<noscript>${body}</noscript>`);
  return html.replace("</head>", `<script type="application/ld+json">${ld}</script></head>`);
}

const src = path.join(BUILD, "index.html");
if (!fs.existsSync(src)) {
  console.error("make-type-pages: build/index.html missing — did the build run?");
  process.exit(1);
}
const shell = fs.readFileSync(src, "utf8");
const all = Object.values(TYPES);
const outDir = path.join(BUILD, "type");
fs.mkdirSync(outDir, { recursive: true });

const made = all.map((t) => {
  const p = page(shell, t, all);
  fs.writeFileSync(path.join(outDir, `${p.slug}.html`), p.html);
  return p;
});

const indexBody = `
      <h1>Food personality types</h1>
      <p>
        Eight ways of eating, and the quiz that tells you which one is yours. Five questions
        a day for six days, about a minute each — then your type, and an app that starts
        recommending accordingly.
      </p>
      <p><a href="/?quiz=1">Take the taste quiz &rarr;</a></p>
      <ul>
        ${all.map((t) => `<li><a href="/type/${slugOf(t.name)}">${esc(t.name)}</a> — ${esc(t.tagline)} ${esc(t.blurb.slice(0, 110))}…</li>`).join("\n        ")}
      </ul>
      <p><a href="/">Savor Scout home</a></p>
`;
fs.writeFileSync(path.join(outDir, "index.html"), render(shell, {
  title: "Food Personality Types — What Kind of Eater Are You? | Savor Scout",
  desc: "Eight food personality types, and a free 7-day quiz that tells you which one you are. Your answers change what Savor Scout recommends.",
  url: `${ORIGIN}/type/`,
  body: indexBody,
  ld: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Food personality types",
    url: `${ORIGIN}/type/`,
    isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
  }),
}));

/* Appended to the sitemap the city script wrote, rather than replacing it —
   these two generators must not clobber each other's URLs. */
const sitemapPath = path.join(BUILD, "sitemap.xml");
const today = new Date().toISOString().slice(0, 10);
const extra = [{ loc: `${ORIGIN}/type/`, pri: "0.9" }, ...made.map((m) => ({ loc: m.url, pri: "0.8" }))]
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
              `    <changefreq>monthly</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join("\n");
let xml = fs.readFileSync(sitemapPath, "utf8");
xml = xml.replace("</urlset>", extra + "\n</urlset>");
fs.writeFileSync(sitemapPath, xml);

console.log(`make-type-pages: ${made.length} type pages + index (${made.map((m) => m.slug).join(", ")})`);
