/* Shared page rendering for every static generator under scripts/.
 *
 * WHY THE CONTENT IS NO LONGER INSIDE <noscript>
 *
 * The city and type generators both wrote their copy into the page's <noscript>
 * block. That put the entire indexable body of a thousand pages into the one
 * container a crawler that runs JavaScript does not display — and Google runs
 * JavaScript. What its renderer sees on /eat/hempstead-ny is whatever React
 * mounts into #root, which is the same application shell it sees on every other
 * page on the domain. A thousand pages that differ only in a <title> and a
 * <noscript> is a very good description of a thousand pages that will not rank.
 *
 * So `render` now emits the copy into a real, visible <main>, ahead of #root.
 * The crawler sees it because it is in the DOM; the reader sees it because it is
 * the first thing on the screen; and the page finally has a reason to exist for
 * a human who lands on it, which it did not when the only visible thing was the
 * app. The app mounts directly beneath, as the tool the copy points at.
 *
 * SITEMAP MANIFESTS
 * Generators used to write sitemap.xml and then append to each other's output,
 * which only worked while they ran in a known order and silently lost URLs when
 * they did not. Each one now drops a manifest into build/.sitemap and
 * make-sitemap.js assembles the file once, last, from whatever it finds.
 */
const fs = require("fs");
const path = require("path");

const BUILD = path.join(__dirname, "..", "..", "build");
const ORIGIN = "https://www.savorscout.net";
const MANIFEST_DIR = path.join(BUILD, ".sitemap");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugify = (s) => String(s).toLowerCase().replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Styles for the static block. Kept here rather than in App.css because these
   rules exist only on generated pages, and a generator that carries its own
   presentation cannot be broken by a change to the application's stylesheet. */
const STYLE = `
<style>
  /* position/z-index are load-bearing, not decoration. The app paints two
     full-viewport fixed layers — .ambient at z-index 0 and .grain at z-index 1 —
     and a statically positioned <main> sits below both of them, which renders
     this entire block as a black rectangle. Verified in a browser: without these
     two properties the copy is in the DOM and invisible on screen. */
  .ss-static{position:relative;z-index:2;
    max-width:760px;margin:0 auto;padding:56px 22px 96px;
    font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;
    color:#E8E3DC;line-height:1.62;font-size:17px}
  .ss-static h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:0 0 18px;color:#FDF8F2;letter-spacing:-.02em}
  .ss-static h2{font-size:clamp(20px,3.4vw,25px);line-height:1.25;margin:44px 0 14px;color:#FDF8F2;letter-spacing:-.01em}
  .ss-static h3{font-size:17px;margin:26px 0 6px;color:#FDF8F2}
  .ss-static p{margin:0 0 16px}
  .ss-static ul{margin:0 0 18px;padding-left:20px}
  .ss-static li{margin:0 0 10px}
  .ss-static a{color:#FF9E1F;text-decoration:none;border-bottom:1px solid rgba(255,158,31,.32)}
  .ss-static a:hover{border-bottom-color:#FF9E1F}
  .ss-static .lede{font-size:clamp(18px,2.6vw,21px);line-height:1.5;color:#FDF8F2;margin-bottom:26px}
  .ss-static .cta{display:inline-block;margin:10px 0 6px;padding:13px 22px;border-radius:999px;
    background:linear-gradient(135deg,#FF3D00,#FF9E1F);color:#170F08;font-weight:700;border:0}
  .ss-static .cta:hover{opacity:.92}
  .ss-static .note{font-size:15px;color:#B9B1A6;border-left:2px solid rgba(255,158,31,.45);padding-left:14px;margin:18px 0}
  .ss-static .cols{columns:2;column-gap:26px}
  .ss-static .cols li{break-inside:avoid}
  .ss-static hr{border:0;border-top:1px solid rgba(232,227,220,.14);margin:44px 0}
  .ss-static .crumb{font-size:14px;color:#B9B1A6;margin-bottom:22px}
  .ss-static .crumb a{border:0;color:#B9B1A6}
  @media(max-width:620px){.ss-static{padding:38px 18px 72px}.ss-static .cols{columns:1}}
</style>`;

/* The head tags every page must carry. A generator that cannot find one of
   these in index.html is looking at a shell that changed underneath it, and
   should stop rather than silently ship a page with the homepage's canonical. */
function headSwaps({ title, desc, url }) {
  return [
    [/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`],
    [/(<meta name="description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<meta property="og:title" content=")[^"]*(")/i, `$1${esc(title)}$2`],
    [/(<meta property="og:description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<meta property="og:url" content=")[^"]*(")/i, `$1${url}$2`],
    [/(<meta name="twitter:title" content=")[^"]*(")/i, `$1${esc(title)}$2`],
    [/(<meta name="twitter:description" content=")[^"]*(")/i, `$1${esc(desc)}$2`],
    [/(<link rel="canonical" href=")[^"]*(")/i, `$1${url}$2`],
  ];
}

function render(shell, { title, desc, url, body, ld, who }) {
  let html = shell;
  const missed = [];
  for (const [re, to] of headSwaps({ title, desc, url })) {
    if (!re.test(html)) { missed.push(String(re)); continue; }
    html = html.replace(re, to);
  }
  if (missed.length) {
    console.error(`${who}: tags missing from index.html:`);
    missed.forEach((m) => console.error("  " + m));
    process.exit(1);
  }

  /* The old <noscript> body is dropped. Leaving a second copy of the same copy
     in the markup would be duplicate content against itself on every page. */
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i,
    `<noscript><p>Savor Scout needs JavaScript to run a search. The rest of this page reads fine without it.</p></noscript>`);

  if (!/<div id="root"><\/div>/.test(html)) {
    console.error(`${who}: could not find <div id="root"></div> in index.html`);
    process.exit(1);
  }
  /* The copy goes BEFORE #root, not after.
     Everybody who reaches one of these pages arrived from a search for the
     thing it is about. Putting the app first means that on a phone they land on
     a header, a trial banner, the full "why not just use Google Maps" explainer
     and a hero before reaching a single word of what they searched for —
     measured at around 1,150px on a desktop viewport and considerably more on a
     375px one. The article leads; the app sits directly beneath it as the tool,
     and every section here carries a button into it. */
  html = html.replace('<div id="root"></div>',
    `<main class="ss-static">\n${body}\n</main>\n<div id="root"></div>`);

  /* Tells App.js this document is a generated page so it leaves document.title
     alone. Without it the app's view-title effect overwrites the <title> on
     mount, and since Google indexes the RENDERED page, every one of these would
     be submitted to the index under the homepage's title. */
  return html
    .replace("</head>",
      `<meta name="ss-static-page" content="1">${STYLE}` +
      `<script type="application/ld+json">${ld}</script></head>`);
}

/* Picks the fullest title that still fits.
 *
 * Google truncates a result title at a pixel width that works out around 60-70
 * characters, and a title it considers unusable it simply rewrites — at which
 * point the wording is no longer ours. Rather than writing one short title for
 * every page and losing the detail where there is room for it, each generator
 * passes variants from fullest to barest and takes the first that fits.
 *
 * Some institution names genuinely exceed the budget on their own ("Louisiana
 * State University and Agricultural & Mechanical College"). Those fall through
 * to the shortest variant and are still too long; the alternative is truncating
 * an organisation's actual name, which is worse than a title Google trims. */
const TITLE_MAX = 65;
function fitTitle(variants) {
  return variants.find((t) => t.length <= TITLE_MAX) || variants[variants.length - 1];
}

function breadcrumb(trail) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem", position: i + 1, name: t.name, item: t.url,
    })),
  };
}

/* Rendered above the h1 on every generated page. Gives each one a visible path
   back up its own hierarchy, which is both the crawl route to the hub pages and
   the thing a reader needs when they land three levels deep from a search. */
function crumbHtml(trail) {
  return `<p class="crumb">` + trail.map((t, i) =>
    i === trail.length - 1 ? esc(t.name)
      : `<a href="${t.url.replace(ORIGIN, "") || "/"}">${esc(t.name)}</a>`
  ).join(" &rsaquo; ") + `</p>`;
}

function emit(name, urls) {
  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  fs.writeFileSync(path.join(MANIFEST_DIR, `${name}.json`), JSON.stringify(urls));
}

function shellOrDie(who) {
  const src = path.join(BUILD, "index.html");
  if (!fs.existsSync(src)) {
    console.error(`${who}: build/index.html missing — did the build run?`);
    process.exit(1);
  }
  return fs.readFileSync(src, "utf8");
}

module.exports = {
  BUILD, ORIGIN, MANIFEST_DIR,
  esc, slugify, render, breadcrumb, crumbHtml, emit, shellOrDie, fitTitle,
};
