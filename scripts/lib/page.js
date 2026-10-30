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
 * So `render` emits the copy into a real, visible <main>. The crawler sees it
 * because it is in the DOM; the reader sees it because it is the first thing
 * on the screen. Since October 2026 the page also carries the app's header,
 * its search bar and a footer, and no longer mounts the app beneath the copy:
 * see the note in render().
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

/* Styles for generated pages. Kept here rather than in App.css because these
   pages no longer load the app's stylesheet or bundle (see render), and a
   generator that carries its own presentation cannot be broken by a change to
   the application. The tokens are the app's own (src/App.css :root), so a
   guide page and the app read as one product. */
const STYLE = `
<style>
  :root{--void:#07050b;--raised:#13101c;--card:#1a1626;--ember:#ff5f1f;--saffron:#ffc857;--magenta:#ff2e88;
    --ink:#fdf8f2;--text:#e8e3dc;--soft:#b9aec4;--mid:#8d84a0;--line:rgba(253,248,242,.08);
    --line-warm:rgba(255,200,87,.22);--link:#ff9e1f;--hot:linear-gradient(110deg,#ffc857,#ff5f1f 60%,#ff2e88)}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
  body{margin:0;background:var(--void);color:var(--text);font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;
    -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  /* The app's three heat blooms, still rather than drifting: atmosphere, not an element. */
  body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
    background:radial-gradient(44vw 44vw at 4% -8%,rgba(255,95,31,.14),transparent 70%),
      radial-gradient(40vw 40vw at 102% 6%,rgba(255,46,136,.08),transparent 70%),
      radial-gradient(56vw 44vw at 40% 112%,rgba(124,45,107,.14),transparent 70%)}
  .ss-skip{position:absolute;left:-9999px;top:8px}
  .ss-skip:focus{left:16px;z-index:100;background:var(--card);color:var(--ink);padding:8px 14px;border-radius:8px}

  /* ---- header: the app's top bar ---- */
  .ss-top{position:sticky;top:0;z-index:50;background:rgba(7,5,11,.8);border-bottom:1px solid var(--line);
    backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4)}
  .ss-top__in{max-width:1120px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;gap:20px}
  .ss-logo{display:flex;align-items:center;gap:10px;flex-shrink:0;color:var(--ink);text-decoration:none;
    font-weight:700;font-size:18px;letter-spacing:-.02em}
  .ss-logo__mark{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;overflow:hidden;
    background:linear-gradient(140deg,#e04a16,#990d2b);box-shadow:0 0 22px rgba(255,95,31,.38)}
  /* A fixed height, not a percentage: in a grid cell a percentage resolves
     against the image's own 128px and the flame overflows the tile (the same
     trap App.css documents for .logo-flame). */
  .ss-logo__mark img{display:block;height:31px;width:auto;max-width:100%;transform:translateY(1px);
    filter:drop-shadow(0 1px 3px rgba(48,3,14,.55))}
  .ss-nav{display:flex;gap:2px;padding:3px;margin:0 auto;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid var(--line)}
  .ss-nav a{padding:7px 15px;border-radius:999px;color:var(--soft);font-size:13.5px;font-weight:500;text-decoration:none;white-space:nowrap}
  .ss-nav a:hover{color:var(--ink)}
  .ss-nav a[aria-current]{color:var(--void);font-weight:600;background:linear-gradient(120deg,var(--saffron),var(--ember));
    box-shadow:0 2px 14px rgba(255,95,31,.35)}
  .ss-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0;border:0;border-radius:999px;
    cursor:pointer;font:inherit;font-weight:700;color:var(--void);text-decoration:none;background:var(--hot);
    box-shadow:0 6px 24px rgba(255,95,31,.32)}
  .ss-btn:hover{filter:brightness(1.06)}
  .ss-top .ss-btn{padding:9px 18px;font-size:14px}

  /* ---- page: article column, and a side column on wide screens ---- */
  .ss-layout{max-width:1120px;margin:0 auto;padding:40px 24px 64px;display:grid;
    grid-template-columns:minmax(0,1fr) 268px;gap:48px;align-items:start}
  .ss-layout--single{grid-template-columns:minmax(0,780px);justify-content:center}
  .ss-static{min-width:0;font-size:17px;line-height:1.65}
  .ss-aside{position:sticky;top:92px;display:flex;flex-direction:column;gap:14px}

  .ss-static p{margin:0 0 16px}
  .ss-static a{color:var(--link);text-decoration:none;border-bottom:1px solid rgba(255,158,31,.32)}
  .ss-static a:hover{border-bottom-color:var(--link)}
  .ss-static strong{color:var(--ink);font-weight:600}
  .ss-static h1{font-size:clamp(30px,4.8vw,46px);line-height:1.06;letter-spacing:-.035em;color:var(--ink);margin:0 0 14px;font-weight:700}
  .ss-static h2{font-size:clamp(21px,2.8vw,25px);line-height:1.25;letter-spacing:-.02em;color:var(--ink);margin:0 0 14px;font-weight:700}
  .ss-static h3{font-size:17px;margin:22px 0 8px;color:var(--ink)}
  .ss-static ul,.ss-static ol{margin:0 0 18px;padding-left:20px}
  .ss-static li{margin:0 0 9px}
  .ss-static li::marker{color:var(--ember)}

  /* ---- hero ---- */
  .ss-hero{margin:0 0 26px}
  .ss-static .crumb{font-size:13.5px;line-height:1.5;color:var(--mid);margin:0 0 20px}
  .ss-static .crumb a{color:var(--mid);border:0}
  .ss-static .crumb a:hover{color:var(--ink)}
  .ss-kicker{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;
    color:var(--saffron);margin:0 0 12px}
  .ss-static .ss-sub{font-size:clamp(17px,2.2vw,19px);line-height:1.55;color:var(--soft);margin:0 0 22px;max-width:62ch}
  .ss-static .lede{font-size:clamp(18px,2.4vw,20px);line-height:1.55;color:var(--ink);margin-bottom:22px}

  /* ---- the search box: the app's search bar, on the page ---- */
  .ss-find{margin:6px 0 22px;padding:14px;border-radius:22px;border:1px solid var(--line-warm);
    background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025));box-shadow:0 18px 50px rgba(0,0,0,.35)}
  .ss-find__row{display:flex;gap:10px}
  .ss-find__q{flex:1;min-width:0;padding:15px 20px;border-radius:999px;border:1px solid var(--line);
    background:rgba(7,5,11,.6);color:var(--ink);font:inherit;font-size:16px;outline:none;-webkit-appearance:none;appearance:none}
  .ss-find__q::placeholder{color:#6d6480}
  .ss-find__q:focus{border-color:var(--saffron);box-shadow:0 0 0 4px rgba(255,200,87,.12)}
  .ss-find .ss-btn{padding:0 26px;font-size:15px}
  .ss-static .ss-find__meta{margin:10px 8px 2px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;line-height:1.5;color:var(--mid)}
  .ss-find__meta b{color:var(--text);font-weight:500}

  /* ---- sections ---- */
  .ss-sec{margin:0 0 18px;padding:26px 28px 10px;border-radius:22px;background:rgba(19,16,28,.72);
    border:1px solid var(--line);scroll-margin-top:96px}

  /* ---- on this page ---- */
  .ss-toc__h{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--mid);margin:0 0 10px}
  .ss-toc ol{list-style:none;margin:0;padding:0}
  .ss-toc li{margin:0}
  .ss-toc a{text-decoration:none;border:0}
  .ss-toc--side{padding:18px 18px 12px;border-radius:16px;background:rgba(255,255,255,.025);border:1px solid var(--line);
    max-height:calc(100vh - 260px);overflow:auto}
  .ss-toc--side a{display:block;padding:6px 10px;margin:0 -10px;border-radius:8px;color:var(--soft);font-size:14px;line-height:1.35}
  .ss-toc--side a:hover{background:rgba(255,255,255,.05);color:var(--ink)}
  .ss-toc--inline{display:none}
  .ss-card{padding:20px;border-radius:16px;border:1px solid var(--line-warm);
    background:linear-gradient(160deg,rgba(255,95,31,.14),rgba(255,46,136,.05))}
  .ss-card p{margin:0 0 14px;font-size:15px;line-height:1.5;color:var(--text)}
  .ss-card .ss-btn{width:100%;padding:11px 16px;font-size:14px}

  /* ---- content pieces ---- */
  .ss-static .cta{display:inline-flex;align-items:center;gap:8px;margin:6px 0;padding:13px 24px;border-radius:999px;border:0;
    background:var(--hot);color:var(--void);font-weight:700;box-shadow:0 6px 24px rgba(255,95,31,.3)}
  .ss-static .cta:hover{filter:brightness(1.06)}
  .ss-static .note{font-size:14.5px;line-height:1.55;color:var(--soft);background:rgba(255,255,255,.03);border:1px solid var(--line);
    border-radius:12px;padding:12px 16px;margin:16px 0}
  .ss-static .qa{font-size:18px;line-height:1.55;color:var(--ink);background:rgba(255,158,31,.07);
    border-left:3px solid var(--link);padding:14px 18px;border-radius:0 12px 12px 0;margin:0 0 18px}
  .ss-static .pills{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
  .ss-static .pills-label{font-size:14.5px;color:var(--soft);margin:6px 0 10px}
  .ss-static a.pill,.ss-static .pill{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;
    border:1px solid rgba(255,158,31,.3);background:rgba(255,158,31,.08);color:#ffd9a8;font-size:14.5px;line-height:1.3}
  .ss-static a.pill:hover{background:rgba(255,158,31,.18);border-color:var(--link)}
  .ss-static .pill--plain{border-color:rgba(232,227,220,.16);background:transparent;color:var(--soft)}
  .ss-static .pill.pill--sm,.ss-static a.pill.pill--sm{padding:1px 9px;font-size:12.5px;vertical-align:2px}
  .ss-static .pill .ct{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;opacity:.7}
  .ss-static .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:4px 0 18px}
  .ss-static .stat{border:1px solid var(--line);border-radius:14px;padding:14px 14px 12px;background:rgba(255,255,255,.03)}
  .ss-static .stat b{display:block;font-size:clamp(24px,4.4vw,32px);line-height:1.05;color:var(--ink);letter-spacing:-.02em;
    font-variant-numeric:tabular-nums}
  .ss-static .stat span{display:block;font-size:13px;line-height:1.35;color:var(--mid);margin-top:5px}
  .ss-static .spots{list-style:none;padding:0;margin:0 0 14px}
  .ss-static .spots li{margin:0;padding:12px 0;border-bottom:1px solid var(--line)}
  .ss-static .spots li:first-child{padding-top:2px}
  .ss-static .spots li:last-child{border-bottom:0}
  .ss-static .spots a{border:0}
  .ss-static .spots strong{color:var(--link)}
  .ss-static .spots .addr{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;color:var(--mid)}
  .ss-static .faq{margin:0 0 16px}
  .ss-static .faq dt{font-weight:600;color:var(--ink);margin:0;padding:14px 0 4px;border-top:1px solid var(--line)}
  .ss-static .faq dt:first-child{border-top:0;padding-top:0}
  .ss-static .faq dd{margin:0 0 12px;color:var(--text)}
  .ss-static .ranks{list-style:none;padding-left:0}
  .ss-static .ranks li{margin:0 0 8px;display:grid;grid-template-columns:42px 1fr}
  .ss-static .ranks b{color:var(--link);font-variant-numeric:tabular-nums}
  .ss-static .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;list-style:none;padding:0;margin:0 0 20px}
  .ss-static .card{margin:0;border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:rgba(255,255,255,.03)}
  .ss-static .card a{border:0;font-weight:600;color:var(--ink)}
  .ss-static .card a:hover{color:var(--link)}
  .ss-static .card .meta{display:block;font-size:13.5px;color:var(--mid);margin-top:2px}
  .ss-static .cols{columns:2;column-gap:26px}
  .ss-static .cols li{break-inside:avoid}
  .ss-endnav{display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 0}
  .ss-static .ss-endnav a{padding:8px 15px;border-radius:999px;border:1px solid var(--line);color:var(--soft);font-size:14px}
  .ss-static .ss-endnav a:hover{color:var(--ink);border-color:rgba(253,248,242,.2)}

  /* ---- what should this page add: the one-tap vote ---- */
  .ss-wish{margin:8px 0 18px;padding:22px 24px;border-radius:22px;border:1px dashed rgba(255,200,87,.32);
    background:rgba(255,200,87,.04)}
  .ss-static .ss-wish__h{margin:0 0 4px;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:-.01em}
  .ss-static .ss-wish__sub{margin:0 0 14px;font-size:14.5px;color:var(--soft)}
  .ss-wish__opts{display:flex;flex-wrap:wrap;gap:8px}
  .ss-wish button{padding:8px 15px;border-radius:999px;border:1px solid var(--line-warm);background:rgba(255,255,255,.04);
    color:var(--text);font:inherit;font-size:14.5px;cursor:pointer}
  .ss-wish button:hover{border-color:var(--saffron);color:var(--ink)}
  .ss-wish__other{display:flex;gap:8px;margin-top:12px}
  .ss-wish__other input{flex:1;min-width:0;padding:10px 16px;border-radius:999px;border:1px solid var(--line);
    background:rgba(7,5,11,.6);color:var(--ink);font:inherit;font-size:16px;outline:none}
  .ss-wish__other input:focus{border-color:var(--saffron)}
  .ss-wish .ss-wish__send{background:var(--hot);color:var(--void);font-weight:700;border:0}
  .ss-static .ss-wish__thanks{margin:0;color:var(--text)}
  .ss-wish [hidden]{display:none!important}

  /* ---- footer ---- */
  .ss-foot{border-top:1px solid var(--line);background:rgba(7,5,11,.6)}
  .ss-foot__in{max-width:1120px;margin:0 auto;padding:44px 24px 28px;display:grid;grid-template-columns:1.1fr 2fr;gap:40px}
  .ss-foot__brand p{color:var(--mid);font-size:14.5px;line-height:1.55;margin:14px 0 0;max-width:34ch}
  .ss-foot__nav{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .ss-foot__nav p{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--mid);margin:0 0 12px}
  .ss-foot__nav a{display:block;color:var(--text);text-decoration:none;font-size:14.5px;margin:0 0 9px}
  .ss-foot__nav a:hover{color:var(--saffron)}
  .ss-foot__base{max-width:1120px;margin:0 auto;padding:18px 24px 36px;display:flex;justify-content:space-between;align-items:center;
    gap:16px;border-top:1px solid var(--line);color:var(--mid);font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px}
  .ss-foot__base a{line-height:0;opacity:.62}

  @media(max-width:1000px){
    .ss-layout{grid-template-columns:minmax(0,1fr);max-width:820px;padding:26px 16px 56px}
    .ss-aside{display:none}
    .ss-toc--inline{display:block;margin:0 -16px 20px;padding:0 16px;overflow-x:auto;scrollbar-width:none}
    .ss-toc--inline::-webkit-scrollbar{display:none}
    .ss-toc--inline .ss-toc__h{display:none}
    .ss-toc--inline ol{display:flex;gap:8px;width:max-content}
    .ss-toc--inline a{display:block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:7px 14px;
      border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--soft);font-size:13.5px}
  }
  @media(max-width:860px){
    .ss-top{position:relative}
    .ss-top__in{flex-wrap:wrap;padding:10px 16px 12px;gap:10px}
    .ss-top .ss-btn{margin-left:auto}
    .ss-nav{order:3;width:100%;margin:0;overflow-x:auto;scrollbar-width:none}
    .ss-nav::-webkit-scrollbar{display:none}
    .ss-nav a{flex:1 0 auto;text-align:center}
  }
  @media(max-width:620px){
    .ss-static{font-size:16.5px}
    .ss-sec{padding:20px 18px 6px;border-radius:18px}
    .ss-find__row{flex-direction:column}
    .ss-find .ss-btn{padding:14px}
    .ss-static .stats{gap:8px}
    .ss-static .stat{padding:12px 10px 10px}
    .ss-static .cols{column-gap:16px;font-size:15px}
    .ss-foot__in{grid-template-columns:1fr;gap:28px;padding:34px 16px 18px}
    .ss-foot__nav{grid-template-columns:1fr 1fr}
    .ss-foot__base{padding:16px 16px 30px}
  }
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

/* ---- layout ---------------------------------------------------------------
 *
 * Every generator writes its body the same way: a breadcrumb, an <h1>, a
 * button into the app, then <h2> sections, then a row of links after an <hr>.
 * The layout is applied here, once, from that shape, so 3,500 pages change
 * together and no generator has to know about it:
 *
 *   the app's header on top, and its search bar right under the h1 in place
 *   of the button (it opens the app with the craving and the place filled in);
 *   each <h2> and what follows it as one card, with an id;
 *   "On this page": a side column on wide screens, a row of chips on phones;
 *   the closing links as chips, and the site footer.
 */
const KICKERS = [
  [/^\/campus\/[^/]+\/[^/]+$/, "Campus food guide"],
  [/^\/campus\/[a-z]{2}$/, "Campuses by state"],
  [/^\/campus\/$/, "Near campus"],
  [/^\/campus\//, "Restaurants near campus"],
  [/^\/eat\/[a-z]{2}$/, "Cities by state"],
  [/^\/eat\/$/, "Where to eat"],
  [/^\/eat\//, "City guide"],
  [/^\/food\/$/, "Food guides"],
  [/^\/food\//, "Food guide"],
  [/^\/what-to-eat\/$/, "What to eat when…"],
  [/^\/what-to-eat\//, "What to eat"],
  [/^\/diet\/$/, "Dietary guides"],
  [/^\/diet\//, "Dietary guide"],
  [/^\/type\/$/, "Food personalities"],
  [/^\/type\//, "Food personality"],
  [/^\/about\//, "About the data"],
];
const NAV = [["/campus/", "Campuses"], ["/eat/", "Cities"], ["/food/", "Food"], ["/what-to-eat/", "What to eat"], ["/diet/", "Diets"]];

const textOf = (h) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
  .replace(/&hellip;/g, "…").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

const logo = () => `<a class="ss-logo" href="/" aria-label="Savor Scout home"><span class="ss-logo__mark">` +
  `<img src="/logo-flame-128.webp" alt="" width="27" height="38"></span><span>SavorScout</span></a>`;

function header(pathname) {
  return `<a class="ss-skip" href="#content">Skip to content</a>
<header class="ss-top">
  <div class="ss-top__in">
    ${logo()}
    <nav class="ss-nav" aria-label="Guides">
      ${NAV.map(([href, label]) => `<a href="${href}"${pathname.startsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("\n      ")}
    </nav>
    <a class="ss-btn" href="/">Find my one</a>
  </div>
</header>`;
}

function footer() {
  return `<footer class="ss-foot">
  <div class="ss-foot__in">
    <div class="ss-foot__brand">
      ${logo()}
      <p>One pick, not a list. Say what you're craving and Savor Scout finds one place nearby and shows you why.</p>
    </div>
    <nav class="ss-foot__nav" aria-label="Site">
      <div><p>Explore</p><a href="/campus/">Near campus</a><a href="/eat/">Cities</a><a href="/food/">Food guides</a></div>
      <div><p>Decide</p><a href="/what-to-eat/">What to eat when&hellip;</a><a href="/diet/">Dietary guides</a><a href="/type/">Food personalities</a></div>
      <div><p>Savor Scout</p><a href="/">Find a place to eat</a><a href="/about/data">Where our data comes from</a></div>
    </nav>
  </div>
  <div class="ss-foot__base">
    <span>&copy; ${new Date().getFullYear()} SavorScout</span>
    <a href="https://maidensail.com/startup/savor-scout" rel="dofollow"><img src="https://maidensail.com/badge/savor-scout.svg?theme=dark" alt="Featured on Maidensail" width="152" height="35" loading="lazy"></a>
  </div>
</footer>`;
}

/* The app's search bar, as a plain form: it opens the app with the craving and
   the place already filled in, and go=1 runs the search on arrival. No script
   on this page is needed for it to work. */
function searchForm(href) {
  const q = new URLSearchParams(href.split("?")[1] || "");
  const near = q.get("near") || "";
  const craving = q.get("craving") || "";
  return `
      <form class="ss-find" action="/" method="get" role="search" aria-label="Find somewhere to eat">
        <div class="ss-find__row">
          <input class="ss-find__q" type="search" name="craving" value="${esc(craving)}" maxlength="300" autocomplete="off"
            enterkeyhint="search" placeholder="What are you craving? Cheap sushi, spicy ramen&hellip;" aria-label="What are you craving?">
${near ? `          <input type="hidden" name="near" value="${esc(near)}">\n` : ""}          <input type="hidden" name="go" value="1">
          <button class="ss-btn" type="submit">Find my one</button>
        </div>
        <p class="ss-find__meta">${near ? `Searching near <b>${esc(near)}</b>` : "Set your location on the next screen"} &middot; one pick, with the reasons</p>
      </form>`;
}

/* ---- what visitors want -------------------------------------------------
 *
 * The pages people actually reach are campus, campus x cuisine and city
 * pages, so those ask the one question this site most needs answered: what
 * would have made this page more useful? Each option is a page or a feature
 * we could build; the votes say which, before anything is built. One tap, or
 * a few words under "Something else". Sent to GA4 as page_wish (with the
 * page's address, which GA4 attaches to every event); nothing is stored here.
 *
 * Every page also reports clicks on its restaurant links (place_click): a
 * visitor who opens a place in Maps found what they came for, which is the
 * plainest measure of whether a page did its job. */
const WISHES = {
  campus: [["cheap", "Cheap eats"], ["late", "Open late"], ["study", "Study spots with wifi"], ["date", "Date spots"],
    ["healthy", "Healthy food"], ["groups", "Big groups"], ["delivery", "Delivery to campus"]],
  campus_food: [["cheap", "The cheapest ones"], ["late", "Open late"], ["reviews", "Best-reviewed"], ["order", "What to order there"],
    ["veg", "Vegetarian options"], ["delivery", "Delivery"]],
  city: [["cheap", "Cheap eats"], ["late", "Open late"], ["date", "Date night"], ["brunch", "Brunch"],
    ["family", "Family-friendly"], ["local", "Local favorites"]],
};

function pageType(pathname) {
  if (/^\/campus\/[^/]+\/[^/]+$/.test(pathname)) return "campus_food";
  if (/^\/campus\/[^/]{3,}$/.test(pathname)) return "campus";
  if (/^\/eat\/[^/]{3,}$/.test(pathname)) return "city";
  if (/^\/(campus|eat)\/[a-z]{2}$/.test(pathname)) return "state_hub";
  const m = pathname.match(/^\/([a-z-]+)\/(.*)$/);
  if (!m) return "other";
  return m[2] ? { food: "food_guide", "what-to-eat": "situation_guide", diet: "diet_guide", type: "personality", about: "about" }[m[1]] || "other" : "hub";
}

function wishHtml(type) {
  const opts = WISHES[type];
  if (!opts) return "";
  return `
      <div class="ss-wish" data-page-type="${type}">
        <p class="ss-wish__h">What would make this page more useful?</p>
        <p class="ss-wish__sub">Tap one. The ideas with the most votes get built first.</p>
        <div class="ss-wish__opts">
          ${opts.map(([k, l]) => `<button type="button" data-wish="${k}">${esc(l)}</button>`).join("\n          ")}
          <button type="button" data-wish="other">Something else&hellip;</button>
        </div>
        <form class="ss-wish__other" hidden>
          <input type="text" maxlength="80" placeholder="What were you looking for?" aria-label="What were you looking for?">
          <button class="ss-wish__send" type="submit">Send</button>
        </form>
        <p class="ss-wish__thanks" hidden>Thanks, your vote is counted.</p>
      </div>`;
}

/* Plain script, no bundle. Typed answers lose anything shaped like an email
   address or a phone number before they leave the page. */
const TRACK_JS = `<script>
(function(){
  var t=document.body.getAttribute("data-page-type")||"other";
  function ev(n,p){try{if(window.gtag){p.page_type=t;window.gtag("event",n,p);}}catch(e){}}
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest('a[href*="google.com/maps"]');
    if(a){var s=a.querySelector("strong");ev("place_click",{place:(s?s.textContent:a.textContent).trim().slice(0,80)});}
  });
  var box=document.querySelector(".ss-wish");if(!box)return;
  var key="ss_wish:"+location.pathname,opts=box.querySelector(".ss-wish__opts"),sub=box.querySelector(".ss-wish__sub"),
    form=box.querySelector(".ss-wish__other"),thanks=box.querySelector(".ss-wish__thanks");
  function done(){opts.hidden=true;sub.hidden=true;form.hidden=true;thanks.hidden=false;}
  function send(w){ev("page_wish",{wish:w});try{localStorage.setItem(key,"1");}catch(e){}done();}
  try{if(localStorage.getItem(key))done();}catch(e){}
  opts.addEventListener("click",function(e){
    var b=e.target.closest("button[data-wish]");if(!b)return;
    var w=b.getAttribute("data-wish");
    if(w==="other"){form.hidden=false;form.querySelector("input").focus();return;}
    send(w);
  });
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var v=(form.querySelector("input").value||"").trim()
      .replace(/\\S+@\\S+/g,"[email]").replace(/\\+?\\d[\\d\\s().-]{6,}\\d/g,"[number]").slice(0,80);
    if(v)send("other: "+v);
  });
})();
</script>`;

function layout(body, { url, desc }) {
  const pathname = url.replace(ORIGIN, "") || "/";
  const at = body.search(/<h2[\s>]/);
  let pre = at >= 0 ? body.slice(0, at) : body;
  let rest = at >= 0 ? body.slice(at) : "";
  let tail = "";
  const hr = rest.lastIndexOf("<hr>");
  if (hr >= 0) { tail = rest.slice(hr + 4); rest = rest.slice(0, hr); }

  /* The first button into the app becomes the search bar. A quiz button
     stays a button: that page's next step is the quiz, not a search. */
  let near = "";
  pre = pre.replace(/<p>\s*<a class="cta"[^>]*?href="([^"]*)"[^>]*>[\s\S]*?<\/a>\s*<\/p>/, (m, href) => {
    if (!(href === "/" || /^\/\?(?:[^"]*&)?(?:near|craving)=/.test(href))) return m;
    near = new URLSearchParams(href.split("?")[1] || "").get("near") || "";
    return searchForm(href);
  });
  const kicker = (KICKERS.find(([re]) => re.test(pathname)) || [])[1];
  if (kicker) pre = pre.replace("<h1>", `<p class="ss-kicker">${esc(kicker)}</p>\n      <h1>`);
  /* A campus or city page opens with no paragraph, straight into its list,
     so its description goes under the h1: the one sentence built from its
     own numbers that says what is on it. Written guides already open with
     their own. */
  if (/^\/(campus|eat)\/[^/]{3,}$/.test(pathname) && !/class="lede"/.test(pre) && desc) {
    pre = pre.replace("</h1>", `</h1>\n      <p class="ss-sub">${esc(desc)}</p>`);
  }

  /* A list that is nothing but links ("Guides worth reading", "Common
     searches near X") reads better as a row of chips than as bullets. Lists
     with words beside each link, and the classed ones (cards, columns), stay. */
  rest = rest.replace(/<ul>([\s\S]*?)<\/ul>/g, (m, inner) => {
    const items = inner.match(/<li>[\s\S]*?<\/li>/g) || [];
    const links = items.map((li) => li.match(/^<li>\s*(<a\b[^>]*>[^<]*<\/a>)\s*<\/li>$/)).filter(Boolean);
    if (items.length < 2 || links.length !== items.length) return m;
    return `<p class="pills">\n        ${links.map((l) => l[1].replace(/^<a\b/, '<a class="pill"')).join("\n        ")}\n      </p>`;
  });

  const ids = new Set();
  const toc = [];
  const sections = rest.split(/(?=<h2[\s>])/).filter((s) => s.trim()).map((chunk) => {
    const m = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const title = m ? textOf(m[1]) : "";
    const base = slugify(title).slice(0, 60) || "section";
    let id = base;
    for (let k = 2; ids.has(id); k++) id = `${base}-${k}`;
    ids.add(id);
    toc.push([id, title]);
    return `      <section class="ss-sec" id="${id}">\n      ${chunk.trim()}\n      </section>`;
  });
  const tocHtml = (cls) => (toc.length >= 3 ? `
      <nav class="ss-toc ${cls}" aria-label="On this page">
        <p class="ss-toc__h">On this page</p>
        <ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join("")}</ol>
      </nav>` : "");
  const links = [...tail.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
  const endnav = links.length ? `\n      <nav class="ss-endnav" aria-label="More">\n        ${links.join("\n        ")}\n      </nav>` : "";

  const type = pageType(pathname);
  const main = `      <div class="ss-hero">\n${pre.trim().replace(/^/, "      ")}\n      </div>${tocHtml("ss-toc--inline")}\n${sections.join("\n")}${wishHtml(type)}${endnav}`;
  const side = tocHtml("ss-toc--side");
  const aside = side ? `
  <aside class="ss-aside">${side}
    <div class="ss-card">
      <p>Can't decide? Say what you're craving and Savor Scout picks one place${near ? ` near ${esc(near)}` : ""}, with the reasons.</p>
      <a class="ss-btn" href="${near ? `/?near=${encodeURIComponent(near)}` : "/"}">Find my one</a>
    </div>
  </aside>` : "";
  return { main, aside, pathname, type };
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

  /* The homepage's FAQ schema answers questions that are on the homepage and
     nowhere else. Inherited by a generated page it describes content that page
     does not show (Google's structured-data rules call that misleading), and on
     campus and city pages it made a second FAQPage beside the page's own. */
  html = html.replace(/<script type="application\/ld\+json">(?:(?!<\/script>)[\s\S])*?"FAQPage"[\s\S]*?<\/script>/, "");
  if (/"FAQPage"/.test(html) && !/"FAQPage"/.test(ld || "")) {
    console.error(`${who}: the homepage FAQ schema survived into a generated page`);
    process.exit(1);
  }

  /* A generated page is a page, not a host for the app.

     The article used to sit above the whole app, which mounted beneath it: a
     reader scrolled past the guide to reach the app's own header, its signed-
     out banner and its hero, then the footer. Two products stacked on one URL.
     Now the page carries the app's header and its search bar (a plain form
     into the app, which opens with the craving and the place filled in) and
     the app's bundle and stylesheet are not loaded at all: about 230 kB of
     script a reader of a guide never used, gone from 3,500 pages. Analytics
     is untouched: gtag lives in the <head> and sends the page view itself. */
  if (!/<div id="root"><\/div>/.test(html)) {
    console.error(`${who}: could not find <div id="root"></div> in index.html`);
    process.exit(1);
  }
  const { main, aside, pathname, type } = layout(body, { url, desc });
  html = html
    .replace(/<noscript>[\s\S]*?<\/noscript>/i, "")
    .replace(/<script defer="defer" src="\/static\/js\/main\.[^"]+\.js"><\/script>/, "")
    .replace(/<link href="\/static\/css\/main\.[^"]+\.css" rel="stylesheet">/, "")
    .replace(/<footer class="static-badge"[\s\S]*?<\/footer>/, "")
    .replace('<div id="root"></div>', `${header(pathname)}
<div class="ss-layout${aside ? "" : " ss-layout--single"}">
  <main class="ss-static" id="content">
${main}
  </main>${aside}
</div>
${footer()}`)
    .replace("<body>", `<body data-page-type="${type}">`)
    .replace("</body>", `${TRACK_JS}\n</body>`);

  /* Every link into the app is the homepage with a query string — /?near=…,
     /?craving=…, /?quiz=1 — so each one correctly declares the homepage as its
     canonical and can never be indexed in its own right.

     Google still has to crawl one to learn that. Search Console showed 1,070 of
     them sitting under "Alternate page with proper canonical tag", which is not
     an error — it is Google correctly respecting the canonical — but every one
     of those crawls was spent on a URL that resolves to the homepage instead of
     on a page that could actually rank. There were 21,469 such links in the
     build, so the supply was effectively unlimited.

     rel="nofollow" is applied here rather than at each call site so a link added
     later cannot miss it. It changes nothing for a reader: the link still works,
     still opens the app, still pre-fills the search. */
  html = html.replace(
    /<a((?:\s+[a-zA-Z-]+="[^"]*")*)\s+href="(\/\?[^"]*)"/g,
    (match, attrs, href) =>
      /\brel=/.test(attrs) ? match : `<a${attrs} rel="nofollow" href="${href}"`
  );

  /* The marker meta stays: App.js reads it to leave a generated page's title
     alone, should the app ever be mounted on one again. */
  return html
    .replace("</head>",
      `<meta name="ss-static-page" content="1">${STYLE}` +
      `<script type="application/ld+json">${withModified(ld, url)}</script></head>`);
}

/* The date this page's content last changed, from data/lastmod.json, which
   only moves when the title, description or body actually changes (see
   make-lastmod.js). The same date the sitemap gives, now also in the page's
   own schema, where Google reads freshness for a result. A page not in the
   file yet (new this build) gets nothing rather than a guess. */
const LASTMOD_FILE = path.join(__dirname, "..", "data", "lastmod.json");
const LASTMOD = fs.existsSync(LASTMOD_FILE) ? JSON.parse(fs.readFileSync(LASTMOD_FILE, "utf8")) : {};
const DATED = new Set(["WebPage", "Article", "CollectionPage"]);
function withModified(ld, url) {
  const d = LASTMOD[url] && LASTMOD[url].d;
  if (!ld || !d) return ld;
  const doc = JSON.parse(ld);
  const node = Array.isArray(doc["@graph"]) ? doc["@graph"][0] : doc;
  if (!node || !DATED.has(node["@type"]) || node.dateModified) return ld;
  node.dateModified = d;
  return JSON.stringify(doc);
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

/* Crumbs start with a capital: "Soup", not "soup". Google can show the trail
   in place of the URL in a result. */
const crumbName = (n) => n.charAt(0).toUpperCase() + n.slice(1);

function breadcrumb(trail) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem", position: i + 1, name: crumbName(t.name), item: t.url,
    })),
  };
}

/* Rendered above the h1 on every generated page. Gives each one a visible path
   back up its own hierarchy, which is both the crawl route to the hub pages and
   the thing a reader needs when they land three levels deep from a search. */
function crumbHtml(trail) {
  return `<p class="crumb">` + trail.map((t, i) =>
    i === trail.length - 1 ? esc(crumbName(t.name))
      : `<a href="${t.url.replace(ORIGIN, "") || "/"}">${esc(crumbName(t.name))}</a>`
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
