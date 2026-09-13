/* /about/data — where every number on this site comes from.
 *
 * WHY THIS PAGE EXISTS
 * Two reasons, and the second is the real one.
 *
 * The practical reason: the Census methodology note was being repeated in forty
 * words on all 1,000 city pages. That is boilerplate, it counts against every
 * page carrying it, and it belongs in one place that the others link to.
 *
 * The substantive reason: a site that publishes figures should say where they
 * came from and what they do not cover, in a place a sceptical reader can find.
 * We state restaurant counts for a thousand cities while holding no restaurant
 * database at all, and that distinction deserves an honest page rather than a
 * footnote. It is also the page to point at when somebody asks whether any of
 * this is made up.
 */
const fs = require("fs");
const path = require("path");
const {
  BUILD, ORIGIN, esc, render, breadcrumb, crumbHtml, emit, shellOrDie,
} = require("./lib/page");

const WHO = "make-about-pages";
const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "us-cities.json"), "utf8"));
const DINING = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "city-dining.json"), "utf8"));
const { CAMPUSES } = require("./lib/campuses");

const shell = shellOrDie(WHO);
const HOME = { name: "Savor Scout", url: `${ORIGIN}/` };
const url = `${ORIGIN}/about/data`;
const trail = [HOME, { name: "Where the data comes from", url }];
const fmt = (n) => n.toLocaleString("en-US");

const body = `      ${crumbHtml(trail)}
      <h1>Where the data comes from</h1>
      <p class="lede">
        Savor Scout publishes figures about ${fmt(CITIES.length)} US cities and ${CAMPUSES.length}
        university campuses. Every one of them comes from a public government dataset, and this page
        says which, for which year, and what they do not tell you.
      </p>

      <h2>Restaurant counts</h2>
      <p>
        The counts on the city pages come from <strong>County Business Patterns</strong>, an annual
        US Census Bureau series that counts business establishments by industry code. We use the
        ${DINING.year} release and four NAICS codes:
      </p>
      <ul>
        <li><strong>722511</strong> — full-service restaurants, where you sit down and someone takes
            an order.</li>
        <li><strong>722513</strong> — limited-service: counter service, fast food, takeaway.</li>
        <li><strong>722515</strong> — snack and non-alcoholic beverage bars: coffee shops, juice
            counters, ice cream.</li>
        <li><strong>722410</strong> — drinking places, many of which serve food.</li>
      </ul>
      <p>
        County Business Patterns is published at county level, which is the finest geography the
        Census releases it for. So when a page says a number, it is describing the <em>county</em>
        the city sits in, and it says so. We do not present a county figure as a city figure, because
        that would be untrue and because anybody who lives there would know it.
      </p>
      <p>
        Cities are matched to counties with the Census Geocoder, using the city's own coordinates.
        Where the Census suppresses a figure for disclosure reasons the category is left out rather
        than recorded as zero — reporting no restaurants in a county that has some would be worse
        than saying nothing.
      </p>

      <h2>Population and income</h2>
      <p>
        County population and median household income are from the <strong>American Community
        Survey</strong> 5-year estimates (${DINING.year}). City populations come from a separate
        Census places dataset. The national comparison figure — currently
        <strong>${DINING.national.per10k} food businesses per 10,000 residents</strong> — is the
        median across the ${DINING.national.counties} counties our covered cities actually sit in,
        not across all ~3,100 US counties. A median dominated by rural counties with four restaurants
        would be technically accurate and useless as a comparison.
      </p>

      <h2>Campus data</h2>
      <p>
        Campus name, city, state, coordinates, size bracket and setting all come from
        <strong>IPEDS</strong>, the US Department of Education's annual survey of institutions,
        accessed through the Urban Institute's open Education Data API. Public domain.
      </p>
      <p>
        Student numbers are given as the IPEDS size bracket rather than an exact headcount, because
        the bracket is what the public dataset provides. We would rather quote the survey than
        estimate around it. Online divisions and multi-campus districts are excluded: their listed
        address is an administrative office, so a page about the food near it would be misleading.
      </p>

      <h2>What these numbers are not</h2>
      <p>
        They count businesses, not quality. A county with 400 restaurants is not necessarily a better
        place to eat than one with 120 — it is a bigger one. Nothing here is a ranking, and no page on
        this site claims a particular restaurant is the best anything.
      </p>
      <p>
        <strong>Savor Scout does not hold a restaurant database.</strong> When you run a search, it
        queries live place data at that moment, reads menus and reviews for what you actually asked
        for, and returns one result with its reasoning. It does not store or republish those listings,
        which is why these pages tell you how many restaurants a place has without naming them.
      </p>
      <p>
        Government data also lags. County Business Patterns for ${DINING.year} was collected in
        ${DINING.year} and published later, so a restaurant that opened last month is not in it, and
        one that closed last year may still be.
      </p>

      <h2>Dietary and allergy information</h2>
      <p>
        The <a href="/diet/">dietary guides</a> are written from public guidance and from how
        restaurant kitchens actually work. They are not medical advice, and the matching in the app
        reads what restaurants and reviewers have written — it is a way to find places worth calling,
        not a safety check. Every allergy page says so in its own words.
      </p>

      <h2>Corrections</h2>
      <p>
        If a figure here is wrong, it is because we have reproduced a public dataset incorrectly or
        because the dataset itself is out of date — both worth knowing about. The underlying sources
        are linked above so anything on this site can be checked against them.
      </p>
      <hr>
      <p><a href="/eat/">Cities</a> &middot;
         <a href="/campus/">Campuses</a> &middot;
         <a href="/what-to-eat/">What to eat when&hellip;</a> &middot;
         <a href="/">Savor Scout home</a></p>`;

const outDir = path.join(BUILD, "about");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "data.html"), render(shell, {
  title: "Where Our Data Comes From | Savor Scout",
  desc: `Every figure on Savor Scout, and its source: US Census County Business Patterns for ` +
    `restaurant counts, ACS for population, IPEDS for campuses — plus what those numbers do not tell you.`,
  url,
  body,
  who: WHO,
  ld: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Where the data comes from",
    url,
    author: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    publisher: { "@type": "Organization", name: "Savor Scout", url: `${ORIGIN}/` },
    mainEntityOfPage: url,
    breadcrumb: breadcrumb(trail),
  }),
}));

emit("about", [{ loc: url, pri: "0.6", freq: "monthly" }]);
console.log(`${WHO}: /about/data`);
