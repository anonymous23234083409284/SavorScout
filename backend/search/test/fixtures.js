/* Shared test data and fakes for search v2: fixture places around one point,
   and fake Google Maps (Serper), Exa and OpenAI clients that answer from them
   with realistic delays. Used by run.js and compare-legacy.js. */

const { SYSTEM_PROMPT } = require("../intent");

const ANCHOR = { lat: 40.0, lng: -83.0 };
const RADIUS_TIERS = { nearby: [5, 10, 15], driving: [10, 15, 25], anywhere: [15, 25, 40], group: [15, 25, 35] };
const FRI_7PM = { day: 5, minutes: 19 * 60 };
const SAT_1AM = { day: 6, minutes: 60 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
function at(miles) {
  const b = ((seq++ * 137) % 360) * (Math.PI / 180);
  return {
    latitude: ANCHOR.lat + (miles * Math.cos(b)) / 69,
    longitude: ANCHOR.lng + (miles * Math.sin(b)) / (69 * Math.cos((ANCHOR.lat * Math.PI) / 180)),
  };
}
const week = (text) =>
  Object.fromEntries(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => [d, text]));
function P(id, title, type, miles, rating, ratingCount, extra = {}) {
  return {
    placeId: id, title, type, ...at(miles), rating, ratingCount,
    address: `${100 + seq} Main St`, phoneNumber: "555-0100", openingHours: week("11 AM–10 PM"), ...extra,
  };
}

/* ---- fixtures ---------------------------------------------------------- */

const FILLER = [
  P("f1", "Tony's Pizzeria", "Pizza restaurant", 0.7, 4.3, 610), P("f2", "Burger Barn", "Hamburger restaurant", 1.1, 4.1, 340),
  P("f3", "Daily Grind Cafe", "Coffee shop", 0.4, 4.6, 220), P("f4", "Golden Wok", "Chinese restaurant", 1.6, 3.9, 180),
  P("f5", "El Rancho", "Mexican restaurant", 2.2, 4.2, 450), P("f6", "Main Street Diner", "Diner", 0.9, 4.0, 520),
  P("f7", "Sakura Sushi", "Sushi restaurant", 1.4, 4.5, 380), P("f8", "Olive & Vine", "Mediterranean restaurant", 2.8, 4.6, 290),
  P("f9", "Smokehouse 21", "Barbecue restaurant", 3.5, 4.4, 700), P("f10", "Curry Palace", "Indian restaurant", 2.0, 4.3, 260),
  P("f11", "Wing Stop Shop", "Chicken wings restaurant", 1.8, 3.8, 150), P("f12", "Bella Napoli", "Italian restaurant", 4.1, 4.5, 330),
  P("f13", "Seoul Garden", "Korean restaurant", 3.0, 4.4, 410), P("f14", "Green Bowl", "Salad shop", 0.8, 4.2, 120),
  P("f15", "The Bagel Spot", "Bagel shop", 1.3, 4.5, 260), P("f16", "Sunrise Bakery", "Bakery", 2.4, 4.7, 300),
  P("f17", "Harbor Fish House", "Seafood restaurant", 6.5, 4.4, 520), P("f18", "Taste of Saigon", "Vietnamese restaurant", 5.2, 4.5, 280),
  P("f19", "Tokyo Express", "Japanese restaurant", 2.6, 3.7, 140), P("f20", "Steak & Ale House", "Steak house", 7.4, 4.3, 610),
];

const RAMEN = {
  r1: P("r1", "Menya Hanabi", "Ramen restaurant", 1.2, 4.7, 910, {
    website: "https://menyahanabi.example", priceLevel: "$10–20",
    _menu: ["Tonkotsu Ramen $16. Spicy Miso Ramen $17, chili oil, ground pork, soft egg. Shoyu Ramen $15."],
    _reviews: ["The spicy miso ramen is incredible, rich broth and perfectly chewy noodles. Best ramen in town, worth the wait."],
  }),
  r2: P("r2", "JINYA Ramen Bar", "Ramen restaurant", 2.0, 4.5, 1600, {
    website: "https://jinya.example", priceLevel: "$20–30",
    _menu: ["Spicy Chicken Ramen $17. Tonkotsu Black $18. Wonton Chicken Ramen $16."],
    _reviews: ["The ramen was okay but the broth was salty and the service slow. A bit overpriced for what it is."],
  }),
  r3: P("r3", "Kumo Ramen House", "Ramen restaurant", 12.0, 4.9, 2100, {
    _reviews: ["Best ramen I have ever had, amazing broth. Long drive but worth it."],
  }),
  r4: P("r4", "Torii Izakaya", "Izakaya restaurant", 0.8, 4.6, 420, {
    website: "https://torii.example", priceLevel: "$20–30",
    _menu: ["Yakitori skewers, karaage, Tonkotsu Ramen $15, Spicy Tantanmen Ramen $16, sake flights."],
    _reviews: ["Great izakaya with a seriously good spicy tantanmen ramen, fresh and flavorful. Friendly staff."],
  }),
  r5: P("r5", "Ramen & Roll Sushi", "Sushi restaurant", 0.5, 4.0, 130, {
    _menu: ["California roll $8, spicy tuna roll $9, salmon sashimi $14, edamame."],
    _reviews: ["Rolls were okay, rice was dry. Despite the name there is no ramen on the menu anymore."],
  }),
  r6: P("r6", "Pho Saigon", "Vietnamese restaurant", 0.6, 4.4, 310, { _menu: ["Pho tai $13, bun bo hue $14, banh mi $8."] }),
  r7: P("r7", "Noodle Lab", "Ramen restaurant", 0.4, 5.0, 6, { _reviews: ["Just opened, tried the ramen, nice."] }),
  r8: P("r8", "Ramen Tatsu", "Ramen restaurant", 0.9, 4.8, 720, {
    openingHours: { ...week("11 AM–3 PM"), Friday: "11 AM–3 PM" },
    _menu: ["Spicy Garlic Ramen $15. Tonkotsu $16."],
    _reviews: ["Best spicy ramen, amazing broth."],
  }),
  r9: P("r9", "McDonald's", "Fast food restaurant", 0.2, 3.6, 1500),
  r10: P("r10", "Speedway", "Gas station", 0.3, 3.9, 80),
  r11: P("r11", "Bangkok Thai Kitchen", "Thai restaurant", 1.0, 4.6, 520),
};

const TACOS = {
  t1: P("t1", "Taqueria El Sol", "Taco restaurant", 1.0, 4.6, 400, { priceLevel: "$1–10", _menu: ["Al pastor tacos $3, carnitas tacos $3, birria tacos $4."], _reviews: ["Cheap, authentic tacos with fresh tortillas. Best al pastor around."] }),
  t2: P("t2", "Cantina Moderna", "Mexican restaurant", 0.8, 4.7, 600, { priceLevel: "$30–50", _menu: ["Duck carnitas tacos $24, tasting menu $65, mezcal flights."], _reviews: ["Upscale and pricey but delicious tacos."] }),
  t3: P("t3", "Taco Bell", "Fast food restaurant", 0.3, 3.8, 900, { priceLevel: "$" }),
  t4: P("t4", "Tacos La Esquina", "Taco restaurant", 2.5, 4.8, 300, { priceLevel: "$", _menu: ["Tacos de asada $3, lengua $3.50, suadero $3."], _reviews: ["Amazing tacos, generous and cheap. Worth the drive."] }),
};

const ITALIAN = {
  i1: P("i1", "Trattoria Lume", "Italian restaurant", 2.0, 4.6, 500, { priceLevel: "$$$", _reviews: ["Romantic and quiet, candlelit tables, perfect for date night. The handmade pasta was delicious."] }),
  i2: P("i2", "Olive Garden Italian Restaurant", "Italian restaurant", 1.0, 4.2, 3000, { priceLevel: "$$", _reviews: ["Loud and busy on weekends, lots of kids. Breadsticks were good."] }),
  i3: P("i3", "Pasta Fresca", "Italian restaurant", 1.5, 4.7, 450, { priceLevel: "$$", _reviews: ["Lively and loud but great pasta, fun energetic spot."] }),
};

const LATE = {
  l1: P("l1", "Night Owl Diner", "Diner", 2.0, 4.3, 800, { openingHours: week("Open 24 hours") }),
  l2: P("l2", "Luigi's Pizza", "Pizza restaurant", 0.5, 4.7, 650, { openingHours: week("11 AM–11 PM") }),
  l3: P("l3", "Midnight Tacos", "Taco restaurant", 1.5, 4.5, 500, { openingHours: { ...week("6 PM–3 AM") } }),
};

const BURGERS = {
  b1: P("b1", "Five Guys", "Hamburger restaurant", 0.7, 4.5, 2000),
  b2: P("b2", "Burger Joint 77", "Hamburger restaurant", 1.4, 4.6, 400, { _reviews: ["Best smash burger in the city, juicy and crispy."] }),
  b3: P("b3", "McDonald's", "Fast food restaurant", 0.4, 3.5, 2200),
  v1: P("v1", "Plant Power Burgers", "Vegan restaurant", 2.0, 4.5, 300, { _menu: ["Vegan cheeseburger $12, plant-based smash burger $13, vegan shake."] }),
  v2: P("v2", "Smash Shack", "Hamburger restaurant", 0.8, 4.7, 800, { _menu: ["Double beef smash burger $11, bacon cheeseburger $12."] }),
};

/* Which places Google Maps returns for each query, in order. */
function serperResults(q) {
  const s = q.toLowerCase();
  const pick = (...ps) => ps;
  if (s.includes("ramen") || s.includes("japanese noodle")) {
    const R = RAMEN;
    if (s.startsWith("ramen shop")) return pick(R.r1, R.r2, R.r8, R.r7, R.r3, R.r4, R.r5, R.r6, ...FILLER.slice(0, 6));
    if (s.includes("japanese noodle")) return pick(R.r4, R.r1, R.r2, R.r6, R.r5, FILLER[18], FILLER[6], ...FILLER.slice(8, 12));
    return pick(R.r7, R.r1, R.r2, R.r8, R.r4, R.r5, R.r3, R.r6, R.r11, R.r9, R.r10, ...FILLER.slice(0, 8));
  }
  if (s.includes("taco") || s.includes("taqueria")) return pick(TACOS.t3, TACOS.t2, TACOS.t1, TACOS.t4, FILLER[4], ...FILLER.slice(0, 5));
  if (s.includes("italian") || s.includes("date")) return pick(ITALIAN.i2, ITALIAN.i3, ITALIAN.i1, FILLER[11], ...FILLER.slice(0, 6));
  if (s.includes("late") || s.includes("open")) return pick(LATE.l2, LATE.l1, LATE.l3, ...FILLER.slice(0, 6));
  if (s.includes("burger") || s.includes("vegan")) return pick(BURGERS.b3, BURGERS.b1, BURGERS.v2, BURGERS.b2, BURGERS.v1, FILLER[1], ...FILLER.slice(5, 9));
  return FILLER.slice(0, 15);
}

/* ---- fakes ------------------------------------------------------------- */

function fakeHttp(opts = {}) {
  const calls = { serper: [], exa: [] };
  const byName = new Map(
    [...Object.values(RAMEN), ...Object.values(TACOS), ...Object.values(ITALIAN), ...Object.values(LATE), ...Object.values(BURGERS), ...FILLER]
      .map((p) => [p.title, p])
  );
  const byUrl = new Map([...byName.values()].filter((p) => p.website).map((p) => [p.website, p]));
  return {
    calls,
    async post(url, body) {
      if (url.includes("serper.dev")) {
        calls.serper.push(body.q);
        await sleep(opts.serperMs ?? 250);
        if (opts.serperFail) throw new Error("serper down");
        const q = body.q.replace(/ near .*$/, "");
        return { data: { places: serperResults(q).map((p, i) => ({ ...p, position: i + 1 })) } };
      }
      if (url.includes("exa.ai")) {
        calls.exa.push(url.split("/").pop());
        if (url.endsWith("/contents")) {
          const p = byUrl.get(body.urls[0]);
          await sleep(opts.exaMs ?? 180);
          if (!p?._menu) return { data: { results: [], statuses: [{ status: "error" }] } };
          return { data: { statuses: [{ status: "success" }], results: [{ url: p.website, highlights: p._menu }] } };
        }
        const name = [...byName.keys()].find((n) => body.query.startsWith(n));
        const p = byName.get(name);
        const slow = opts.slowPlace && name === opts.slowPlace;
        await sleep(slow ? 4000 : opts.exaMs ?? 180);
        const isReviews = /reviews$/.test(body.query);
        const hl = isReviews ? p?._reviews : p?._menu;
        if (!hl) return { data: { results: [] } };
        return { data: { results: [{ url: `https://reviews.example/${encodeURIComponent(name)}`, highlights: hl }] } };
      }
      throw new Error(`unexpected url ${url}`);
    },
  };
}

/* The intent model answers from a table; the judge reads the candidate lines
   the way a careful person would. */
const INTENTS = {
  "best spicy ramen near me": { dish: "spicy ramen", cuisine: "Japanese", budget: "", dietaryRestrictions: [], importantFactors: [], avoid: [], relatedTerms: ["ramen", "noodle bar", "japanese", "izakaya"], searchQueries: ["ramen shop", "japanese noodle restaurant"], priority: "quality", timeContext: "now", independentOnly: false },
  "cheap tacos": { dish: "tacos", cuisine: "Mexican", budget: "cheap", dietaryRestrictions: [], importantFactors: [], avoid: [], relatedTerms: ["taco", "taqueria", "mexican"], searchQueries: ["taqueria"], priority: "price", timeContext: "now", independentOnly: false },
  "quiet date night italian": { dish: "", cuisine: "Italian", budget: "", dietaryRestrictions: [], importantFactors: ["quiet", "romantic"], avoid: [], relatedTerms: ["italian", "trattoria", "pasta", "osteria"], searchQueries: ["italian restaurant"], priority: "balanced", timeContext: "now", independentOnly: false },
  "late night food": { dish: "", cuisine: "", budget: "", dietaryRestrictions: [], importantFactors: ["late night"], avoid: [], relatedTerms: [], searchQueries: ["restaurants open late"], priority: "balanced", timeContext: "now", independentOnly: false },
  "burgers, no chains": { dish: "burgers", cuisine: "American", budget: "", dietaryRestrictions: [], importantFactors: [], avoid: ["chains"], relatedTerms: ["burger", "hamburger", "smash burger"], searchQueries: ["burger restaurant"], priority: "balanced", timeContext: "now", independentOnly: true },
  dinner: { dish: "", cuisine: "", budget: "", dietaryRestrictions: [], importantFactors: [], avoid: [], relatedTerms: [], searchQueries: ["restaurants"], priority: "balanced", timeContext: "now", independentOnly: false },
  "vegan burger": { dish: "vegan burger", cuisine: "", budget: "", dietaryRestrictions: ["vegan"], importantFactors: [], avoid: [], relatedTerms: ["vegan", "burger", "plant based"], searchQueries: ["vegan burger restaurant"], priority: "balanced", timeContext: "now", independentOnly: false },
};

function judgeFor(userContent) {
  const lines = userContent.split("\n").filter((l) => /^r\d+:/.test(l));
  const req = userContent.toLowerCase();
  const wantRamen = req.includes("ramen");
  return lines.map((line) => {
    const id = line.split(":")[0];
    const l = line.toLowerCase();
    let fit = 5;
    if (wantRamen) fit = /menu passages: "[^"]*ramen/.test(l) ? 9 : l.includes("category: ramen") ? 7 : /no ramen/.test(l) ? 1 : 3;
    if (req.includes("dietary: vegan")) fit = l.includes("vegan") ? 9 : 2;
    if (req.includes("atmosphere: quiet")) fit = /romantic|quiet|candlelit/.test(l) ? 9 : /loud/.test(l) ? 3 : 5;
    if (/salty|overpriced|dry/.test(l)) fit -= 2;
    if (l.includes("closed now")) fit -= 4;
    return { id, fit: Math.max(0, Math.min(10, fit)), serves: fit >= 6 ? "yes" : "unclear", reason: "fake judge" };
  });
}

function fakeOpenAI(opts = {}) {
  const calls = { intent: 0, judge: 0 };
  return {
    calls,
    chat: {
      completions: {
        async create(body, reqOpts = {}) {
          const system = body.messages[0].content;
          const user = body.messages[1].content;
          const isIntent = system === SYSTEM_PROMPT;
          if (isIntent) calls.intent += 1;
          else calls.judge += 1;
          const delay = isIntent ? opts.intentMs ?? 400 : opts.judgeMs ?? 500;
          if (reqOpts.timeout && delay > reqOpts.timeout) {
            await sleep(reqOpts.timeout);
            throw new Error("Request timed out");
          }
          await sleep(delay);
          if (isIntent && opts.intentFail) throw new Error("openai down");
          if (!isIntent && opts.judgeFail) throw new Error("openai down");
          const content = isIntent
            ? JSON.stringify(INTENTS[user] || { dish: user, relatedTerms: [], searchQueries: [] })
            : JSON.stringify({ results: judgeFor(user) });
          return { choices: [{ message: { content } }] };
        },
      },
    },
  };
}

function fakeCache() {
  const m = new Map();
  return { map: m, fetchBatch: async (keys) => new Map(keys.filter((k) => m.has(k)).map((k) => [k, m.get(k)])), store: async (k, _id, rec) => { m.set(k, rec); } };
}

const quietLog = { log() {}, warn() {} };



module.exports = {
  ANCHOR, RADIUS_TIERS, FRI_7PM, SAT_1AM, FILLER, RAMEN, TACOS, ITALIAN, LATE, BURGERS, INTENTS,
  serperResults, fakeHttp, fakeOpenAI, fakeCache, quietLog, sleep,
};
