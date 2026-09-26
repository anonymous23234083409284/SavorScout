/* /about, /contact, /privacy and /terms — the pages that say who runs this.
 *
 * WHY THESE EXIST
 * Google's quality guidelines ask of every site: who is responsible for it, how
 * do you reach them, and what happens to your data. Until now Savor Scout could
 * answer none of those anywhere a crawler or a sceptical reader could find. It
 * has user accounts, stores allergy information and runs analytics, and had no
 * privacy policy — which is a legal gap as well as a ranking one, and the first
 * thing anyone deciding whether to trust a new site with their email looks for.
 *
 * They are static pages generated from the same shell as every other page, so
 * they carry the site's head, icon and footer and read without JavaScript.
 *
 * WHAT THEY SAY
 * Only what the code actually does. The privacy policy was written from
 * backend/server.js and src/App.js, not from a template: every category of data
 * and every service it names is one this codebase really sends data to. When
 * that changes — a new provider, a new table holding personal data — this page
 * has to change with it, and POLICY_DATE with it.
 *
 * Business facts (contact email, operator, social profiles) come from
 * scripts/data/org.js and are never invented here.
 */
const fs = require("fs");
const path = require("path");
const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie,
} = require("./lib/page");
const ORG = require("./data/org");

const WHO = "make-trust-pages";
const shell = shellOrDie(WHO);
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };

/* The date the privacy policy and terms last changed in substance. Bump it when
   the wording changes; a policy whose date moves on every deploy tells a reader
   nothing about when it last actually changed. */
const POLICY_DATE = "2026-09-26";
const POLICY_DATE_TEXT = "September 26, 2026";

/* A required fact that is still null renders as a visible placeholder so the
   copy can be reviewed on a preview deploy, and stops a production build. */
const PRODUCTION = process.env.VERCEL_ENV === "production";
const missing = ["email", "operator"].filter((k) => !ORG[k]);
if (missing.length) {
  const msg = `${WHO}: scripts/data/org.js is missing ${missing.join(", ")}`;
  if (PRODUCTION) {
    console.error(`${msg} — refusing to publish a privacy policy with placeholders.`);
    process.exit(1);
  }
  console.warn(`${msg} — rendering placeholders (non-production build).`);
}
const hole = (label) => `<strong>[${esc(label)} — not yet provided]</strong>`;
const EMAIL = ORG.email
  ? `<a href="mailto:${esc(ORG.email)}">${esc(ORG.email)}</a>` : hole("contact email");
const OPERATOR = ORG.operator ? esc(ORG.operator) : hole("operator name");

const ORG_ID = `${ORIGIN}/#organization`;
const pages = [];

function page({ file, slug, name, title, desc, body, type = "WebPage" }) {
  const url = `${ORIGIN}/${slug}`;
  const trail = [HOME, { name, url }];
  const out = path.join(BUILD, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(shell, {
    title, desc, url, who: WHO,
    body: `      ${crumbHtml(trail)}\n${body}\n${FOOT}`,
    ld: JSON.stringify({
      "@context": "https://schema.org",
      "@type": type,
      name,
      url,
      description: desc,
      isPartOf: { "@type": "WebSite", name: "Savor Scout", url: `${ORIGIN}/` },
      publisher: { "@id": ORG_ID },
      ...(type === "WebPage" ? {} : { about: { "@id": ORG_ID } }),
      breadcrumb: breadcrumb(trail),
    }),
  }));
  pages.push({ loc: url, pri: slug === "about" ? "0.6" : "0.3", freq: "yearly" });
}

const FOOT = `      <hr>
      <p><a href="/about">About</a> &middot;
         <a href="/about/data">Where the data comes from</a> &middot;
         <a href="/contact">Contact</a> &middot;
         <a href="/privacy">Privacy</a> &middot;
         <a href="/terms">Terms</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

/* ---------------------------------------------------------------- /about */

const founded = ORG.foundingYear ? ` Savor Scout launched in ${esc(ORG.foundingYear)}.` : "";
const whoMakesIt = ORG.founder
  ? `<p>Savor Scout is built and run by ${esc(ORG.founder)}.${founded} It is an independent
        product: no restaurant pays to be picked, and there is no advertising on the site.</p>`
  : `<p>Savor Scout is an independent product.${founded} No restaurant pays to be picked, and
        there is no advertising on the site.</p>`;

page({
  file: "about/index.html",
  slug: "about",
  name: "About Savor Scout",
  type: "AboutPage",
  title: "About Savor Scout | One restaurant pick, with the reasoning shown",
  desc: "What Savor Scout is, how it chooses a restaurant, what it is not, and who is behind it. " +
    "An independent tool that picks one place instead of handing you a list.",
  body: `      <h1>About Savor Scout</h1>
      <p class="lede">
        Savor Scout answers one question: where should I eat? You say what you are craving and
        where you are, and it comes back with one restaurant and the reasons it chose that one,
        instead of a list of thirty to sift through.
      </p>

      <h2>How a pick is made</h2>
      <p>
        When you run a search, Savor Scout looks up restaurants near the location you give it at
        that moment, then reads what menus and reviews say about the specific thing you asked for.
        A place with four and a half stars overall can still be mediocre at the dish you want, so
        the match is scored on the dish, not the star average. Dietary restrictions and allergies
        you have saved are part of every match rather than a filter you have to remember.
      </p>
      <p>
        Every pick shows its match score, the places it beat, and the evidence behind it. If the
        evidence is thin you can see that it is thin. Afterwards it asks whether you went and
        whether it was any good, and the answer shapes the next pick.
      </p>
      <p>
        Group rooms do the same job for several people: the host shares a link, everyone votes on
        options, each person gets one veto, and the room lands on one place. No app or account is
        needed to join.
      </p>

      <h2>What it is not</h2>
      <p>
        Savor Scout is not a directory and does not hold a restaurant database. Its place data comes
        from the same public sources Google Maps and Yelp surface, so it does not claim better data
        than they have. It claims a different job: they help you browse, it makes the call and
        shows its work. It has no reservations, delivery or photo library of its own.
      </p>
      <p>
        It is also not a safety check. Allergy and dietary matching reads what restaurants and
        reviewers have written. It is a way to find places worth calling, and anyone with a serious
        allergy should confirm with the restaurant.
      </p>

      <h2>Who makes it</h2>
      ${whoMakesIt}
      <p>
        The guides on this site — <a href="/eat/">city pages</a>, <a href="/campus/">campus
        pages</a>, <a href="/food/">food guides</a> and <a href="/diet/">dietary guides</a> — are
        written to help with the same decision. The figures in them come from public government
        datasets, and <a href="/about/data">this page says which ones</a> and what they do not
        cover.
      </p>

      <h2>Get in touch</h2>
      <p>
        Questions, corrections and press enquiries: ${EMAIL}. More on the
        <a href="/contact">contact page</a>.
      </p>
      <p><a class="cta" href="/">Try a search</a></p>`,
});

/* -------------------------------------------------------------- /contact */

page({
  file: "contact.html",
  slug: "contact",
  name: "Contact Savor Scout",
  type: "ContactPage",
  title: "Contact Savor Scout",
  desc: "How to reach the people behind Savor Scout: questions, corrections to a guide, " +
    "account and data requests, and press.",
  body: `      <h1>Contact Savor Scout</h1>
      <p class="lede">
        The quickest way to reach us is email: ${EMAIL}. A person reads every message.
      </p>

      <h2>What to write about</h2>
      <ul>
        <li><strong>A pick that was wrong.</strong> Tell us what you searched for, roughly where,
            and what went wrong. Bad picks are how the matching gets better.</li>
        <li><strong>A correction to a guide.</strong> If a figure on a city, campus or food page
            is wrong, send the page address. The sources are listed on
            <a href="/about/data">where the data comes from</a>, so we can check it against them.</li>
        <li><strong>Your account and your data.</strong> To see, correct or delete what Savor Scout
            holds about you, email from the address on your account. The
            <a href="/privacy">privacy policy</a> sets out what that covers.</li>
        <li><strong>Restaurants.</strong> Picks cannot be bought. If something about your restaurant
            is shown incorrectly, tell us and we will look at where it came from.</li>
        <li><strong>Press and partnerships.</strong> Same address.</li>
      </ul>`,
});

/* -------------------------------------------------------------- /privacy */

page({
  file: "privacy.html",
  slug: "privacy",
  name: "Privacy Policy",
  title: "Privacy Policy | Savor Scout",
  desc: "What Savor Scout collects when you search, sign up or join a group room, which " +
    "services process it, how long it is kept, and how to get it deleted.",
  body: `      <h1>Privacy Policy</h1>
      <p class="note">Last updated ${POLICY_DATE_TEXT}.</p>
      <p class="lede">
        This policy covers savorscout.net and the Savor Scout app, operated by ${OPERATOR}
        ("Savor Scout", "we"). It says what we collect, why, who else handles it, and what you
        can do about it. We do not sell personal information and we do not show ads.
      </p>

      <h2>What we collect</h2>
      <h3>When you search</h3>
      <p>
        What you type (for example "spicy ramen, under $20") and the location you give us: a ZIP
        code or city you enter, or your device's location if you choose to share it. We need both
        to find a restaurant near you. If you share your device location, it is used for that
        search and turned into a place name; we do not track your location in the background.
      </p>
      <h3>Without an account</h3>
      <p>
        You can run one search without signing up. To enforce that, we store a one-way hash of your
        IP address with a count of searches. The hash cannot be turned back into your address.
      </p>
      <h3>With an account</h3>
      <ul>
        <li>Your email address, and a password (stored hashed by our authentication provider,
            never readable by us) or your Google sign-in.</li>
        <li>What you tell us about how you eat: dietary restrictions, allergies, taste quiz
            answers, and the food personality they produce.</li>
        <li>Your picks and what you do with them: which restaurant was picked, whether you asked
            for directions, opened its website or called, whether you went, and how it was.
            This is what personalises later picks.</li>
        <li>Streaks, points and stamps from the app's game features.</li>
      </ul>
      <p>
        Allergy and dietary information can reveal health information. We use it only to match
        restaurants for you and never share it for any other purpose.
      </p>
      <h3>Group rooms</h3>
      <p>
        A room holds the search it was opened for and each player's votes. Rooms are kept in
        server memory, not in our database, and are discarded within a few hours.
      </p>
      <h3>Analytics and cookies</h3>
      <p>
        We use Google Analytics to understand how the site is used: which pages are visited, and
        events such as opening a group room or finishing a day of the taste quiz. Analytics sets cookies. In the EEA, the
        UK and Switzerland those cookies are off until you accept them; elsewhere they are on until
        you decline. Either way the banner lets you choose, and declining leaves everything working.
      </p>
      <p>
        We also keep a few small values in your browser's local storage so the site works: your
        cookie choice, whether you have used your free search, and your player id in a group room.
        None of these is sent to anyone else.
      </p>

      <h2>Who else handles it</h2>
      <p>
        Running a search means sending parts of it to other services. Each receives only what its
        job needs:
      </p>
      <ul>
        <li><strong>Supabase</strong> — our database and account system. Holds everything listed
            under "With an account".</li>
        <li><strong>Render</strong> and <strong>Vercel</strong> — host our server and website, and
            see the requests passing through them, including IP addresses.</li>
        <li><strong>OpenAI</strong> — reads the text of your search to work out what you are asking
            for.</li>
        <li><strong>Serper</strong> — looks up restaurants near the location of your search.</li>
        <li><strong>Exa</strong> — searches the web for menus and reviews about the restaurants being
            considered.</li>
        <li><strong>Mapbox</strong>, <strong>OpenStreetMap Nominatim</strong> and
            <strong>BigDataCloud</strong> — turn a ZIP code or coordinates into a place name.</li>
        <li><strong>Google</strong> — Analytics, as above, and sign-in if you choose to sign in
            with Google.</li>
      </ul>
      <p>
        We do not sell or rent personal information, share it for advertising, or give it to anyone
        else except where the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account data is kept until you delete your account. Group rooms are discarded within a few
        hours. Cached research about restaurants — which contains no personal information — expires
        after two weeks. Google Analytics data is kept according to Google's retention settings for
        our property.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Cookies:</strong> accept or decline analytics in the banner. Clearing your
            browser storage brings the banner back.</li>
        <li><strong>Location:</strong> type a ZIP code instead of sharing your device location.</li>
        <li><strong>Your data:</strong> email ${EMAIL} from the address on your account to get a
            copy of what we hold, correct it, or delete your account and its data. We reply within
            30 days.</li>
      </ul>
      <p>
        Depending on where you live — including California, the EEA and the UK — you may have
        further rights, such as objecting to processing or complaining to a data protection
        authority. Write to us and we will honour them.
      </p>

      <h2>Children</h2>
      <p>
        Savor Scout is not directed at children under 13 and we do not knowingly collect their
        information. If you believe a child has created an account, contact us and we will delete it.
      </p>

      <h2>Security</h2>
      <p>
        Data travels over HTTPS, and passwords are hashed by our authentication provider and never
        stored in readable form. No system is perfectly secure, and if a breach
        affects your data we will tell you.
      </p>

      <h2>Changes</h2>
      <p>
        When this policy changes, the date at the top changes with it. If a change affects how we
        use information we already hold, we will tell account holders by email first.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy: ${EMAIL}.</p>`,
});

/* ---------------------------------------------------------------- /terms */

const LAW = ORG.governingState
  ? `<h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of ${esc(ORG.governingState)}, United
        States, without regard to its conflict of law rules.</p>`
  : "";

page({
  file: "terms.html",
  slug: "terms",
  name: "Terms of Use",
  title: "Terms of Use | Savor Scout",
  desc: "The terms for using Savor Scout: what a pick is and is not, allergy information, " +
    "accounts, acceptable use, and the limits of our responsibility.",
  body: `      <h1>Terms of Use</h1>
      <p class="note">Last updated ${POLICY_DATE_TEXT}.</p>
      <p class="lede">
        These terms cover your use of savorscout.net and the Savor Scout app, operated by
        ${OPERATOR}. By using Savor Scout you agree to them. If you do not agree, please do not use
        the service.
      </p>

      <h2>What Savor Scout gives you</h2>
      <p>
        A pick is a recommendation, not a guarantee. It is based on information published by
        restaurants, reviewers and public sources at the time of your search, which can be
        incomplete or out of date: hours change, dishes come off menus, places close. Check
        anything that matters to you with the restaurant before you go.
      </p>

      <h2>Allergies and dietary needs</h2>
      <p>
        Dietary and allergy matching reads what others have written about a restaurant. It is not
        medical advice and not a safety check, and we cannot know how a particular kitchen handles
        cross-contact. If you have an allergy or a medical dietary need, confirm directly with the
        restaurant every time.
      </p>

      <h2>Your account</h2>
      <p>
        You need to be at least 13 to create an account. Keep your password to yourself; you are
        responsible for what happens under your account. You can stop using Savor Scout and ask us
        to delete your account at any time.
      </p>

      <h2>Using it fairly</h2>
      <p>Please do not:</p>
      <ul>
        <li>scrape, copy in bulk, or resell the service or its results;</li>
        <li>get around the free-search limit or other usage limits;</li>
        <li>interfere with the service, probe it for weaknesses without permission, or overload it;</li>
        <li>use group rooms or any other feature to harass anyone or to share unlawful content.</li>
      </ul>
      <p>We may suspend accounts or access that break these rules.</p>

      <h2>Content and ownership</h2>
      <p>
        The Savor Scout name, logo, site design and written guides belong to us. Restaurant names,
        reviews, menus and place details belong to their respective owners and are shown to explain
        a pick. Share cards you create are yours to post.
      </p>

      <h2>Third-party links</h2>
      <p>
        Picks link to maps, restaurant websites and phone numbers we do not control. We are not
        responsible for those sites or for the restaurants themselves.
      </p>

      <h2>No warranty</h2>
      <p>
        Savor Scout is provided "as is" and "as available", without warranties of any kind, express
        or implied, including fitness for a particular purpose and accuracy of information. We do not
        promise that it will be uninterrupted or error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, we are not liable for any indirect, incidental or
        consequential loss arising from your use of Savor Scout, including a meal, a visit or a
        reaction at a restaurant it suggested. Where liability cannot be excluded, it is limited to
        the amount you paid us in the twelve months before the claim, which for a free service is
        nothing. Some jurisdictions do not allow these limits, in which case they apply only as far
        as permitted.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top shows when they last changed, and continuing
        to use Savor Scout after a change means you accept it. We will email account holders about
        significant changes.
      </p>
      ${LAW}
      <h2>Contact</h2>
      <p>Questions about these terms: ${EMAIL}.</p>
      <p>See also the <a href="/privacy">privacy policy</a>.</p>`,
});

emit("trust", pages);
console.log(`${WHO}: ${pages.map((p) => p.loc.replace(ORIGIN, "")).join(", ")}` +
  ` (policy dated ${POLICY_DATE})`);
