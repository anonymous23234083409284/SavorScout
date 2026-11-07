/* Offline tests for search v2.

   Google Maps (Serper), Exa and OpenAI are replaced by fakes that answer from
   fixtures, with realistic delays, so the whole pipeline runs end to end with
   no keys and no network. Each scenario states what a person would expect the
   pick to be, and the run fails loudly if the engine disagrees.

     node backend/search/test/run.js            all scenarios
     node backend/search/test/run.js ramen      scenarios whose name matches */

const assert = require("assert");
const { runSearchV2, SearchError } = require("..");

const {
  ANCHOR, RADIUS_TIERS, FRI_7PM, SAT_1AM, fakeHttp, fakeOpenAI, fakeCache, quietLog,
} = require("./fixtures");

async function search(query, { localTime = FRI_7PM, radiusMode = "nearby", http = fakeHttp(), openai = fakeOpenAI(), cache = fakeCache(), exaKey = "x", quiz = null, log = quietLog } = {}) {
  return runSearchV2(
    { openai, http, serperKey: "x", exaKey, cache, tasteMultiplier: () => 1, log },
    {
      userRequest: query, anchor: ANCHOR, locationName: "Columbus, OH", radiusMode, radiusTiers: RADIUS_TIERS,
      localTime, allergyTerms: [], profileDietaryTerms: [], tasteProfile: null, quiz, roomMinCards: 3, roomWidenCeilingMiles: 60,
    }
  );
}

/* ---- scenarios ----------------------------------------------------------- */

const names = (r) => r.ranked.map((c) => c.place.title);
const scenarios = [];
const scenario = (name, fn) => scenarios.push({ name, fn });

scenario("ramen: a real ramen shop wins, not the closed one, the sushi bar, the 6-review newcomer or McDonald's", async () => {
  const http = fakeHttp();
  const openai = fakeOpenAI();
  const r = await search("best spicy ramen near me", { http, openai });
  const win = r.ranked[0].place.title;
  assert.ok(["Menya Hanabi", "Torii Izakaya"].includes(win), `winner was ${win}`);
  assert.ok(!names(r).includes("Ramen Tatsu") || r.ranked.find((c) => c.place.title === "Ramen Tatsu").open.open === false, "closed shop treated as open");
  assert.notStrictEqual(win, "Ramen & Roll Sushi");
  assert.notStrictEqual(win, "Noodle Lab");
  assert.ok(!names(r).includes("McDonald's"), "McDonald's reached the finalists");
  assert.ok(!names(r).includes("Speedway"), "a gas station reached the finalists");
  assert.ok(r.rawCandidates.length >= 20, `pool too small: ${r.rawCandidates.length}`);
  assert.strictEqual(http.calls.serper.length, 3, "expected three Google Maps queries");
  assert.ok(r.judgeUsed, "judge should have run");
  assert.ok(r.ranked[0].matchScore >= r.ranked[1].matchScore, "runner-up shows a higher score than the pick");
  assert.strictEqual(r.ranked[0].matchedDish, "ramen");
  return r;
});

scenario("ramen: closed-now place is gated out of the finalists", async () => {
  const r = await search("best spicy ramen near me");
  assert.ok(!names(r).includes("Ramen Tatsu"), `closed shop is a finalist: ${names(r)}`);
  return r;
});

scenario("ramen: the far 4.9 doesn't beat a great place 1 mile away in 'nearby'", async () => {
  const r = await search("best spicy ramen near me");
  assert.notStrictEqual(r.ranked[0].place.title, "Kumo Ramen House");
  return r;
});

scenario("tacos: 'cheap' picks a cheap taqueria over the pricey cantina and Taco Bell", async () => {
  const r = await search("cheap tacos");
  assert.ok(["Taqueria El Sol", "Tacos La Esquina"].includes(r.ranked[0].place.title), `winner ${r.ranked[0].place.title}`);
  return r;
});

scenario("italian: 'quiet date night' picks the place reviews call romantic and quiet", async () => {
  const r = await search("quiet date night italian");
  assert.strictEqual(r.ranked[0].place.title, "Trattoria Lume");
  assert.ok(r.ranked[0].evidence.matchedFactors.includes("quiet"));
  return r;
});

scenario("late night: at 1 AM Saturday only places open now can win", async () => {
  const r = await search("late night food", { localTime: SAT_1AM });
  assert.ok(["Night Owl Diner", "Midnight Tacos"].includes(r.ranked[0].place.title), `winner ${r.ranked[0].place.title}`);
  assert.ok(r.ranked[0].open.open, "the pick is not open");
  return r;
});

scenario("burgers: 'no chains' picks the independent over Five Guys", async () => {
  const r = await search("burgers, no chains");
  assert.ok(!r.ranked[0].chain, `picked a chain: ${r.ranked[0].place.title}`);
  assert.ok(!names(r).includes("Five Guys") || r.ranked[0].place.title !== "Five Guys");
  return r;
});

scenario("vegan burger: the vegan place wins over a higher-rated beef burger shop", async () => {
  const r = await search("vegan burger");
  assert.strictEqual(r.ranked[0].place.title, "Plant Power Burgers");
  assert.deepStrictEqual(r.ranked[0].evidence.matchedDietaryTerms, ["vegan"]);
  return r;
});

scenario("resilience: intent model down -> keyword parser, still a ramen pick", async () => {
  const r = await search("best spicy ramen near me", { openai: fakeOpenAI({ intentFail: true }) });
  assert.strictEqual(r.intentSource, "fallback");
  assert.ok(["Menya Hanabi", "Torii Izakaya", "JINYA Ramen Bar"].includes(r.ranked[0].place.title), `winner ${r.ranked[0].place.title}`);
  return r;
});

scenario("resilience: judge down -> ranked on numbers and evidence alone", async () => {
  const r = await search("best spicy ramen near me", { openai: fakeOpenAI({ judgeFail: true }) });
  assert.strictEqual(r.judgeUsed, false);
  assert.ok(["Menya Hanabi", "Torii Izakaya"].includes(r.ranked[0].place.title), `winner ${r.ranked[0].place.title}`);
  return r;
});

scenario("resilience: judge too slow -> times out at 3s and the search still answers", async () => {
  const t = Date.now();
  const r = await search("best spicy ramen near me", { openai: fakeOpenAI({ judgeMs: 6000 }) });
  assert.strictEqual(r.judgeUsed, false);
  assert.ok(Date.now() - t < 7000, "judge timeout not enforced");
  return r;
});

scenario("resilience: no Exa key -> ranks without research", async () => {
  const r = await search("best spicy ramen near me", { exaKey: null });
  assert.ok(r.ranked.length >= 3);
  assert.ok(["Menya Hanabi", "Torii Izakaya", "JINYA Ramen Bar"].includes(r.ranked[0].place.title), `winner ${r.ranked[0].place.title}`);
  return r;
});

scenario("resilience: a slow Exa lookup misses the deadline without delaying the answer", async () => {
  const t = Date.now();
  const r = await search("best spicy ramen near me", { http: fakeHttp({ slowPlace: "Torii Izakaya" }) });
  assert.ok(Date.now() - t < 6000, `took ${Date.now() - t}ms`);
  return r;
});

scenario("resilience: every Google query fails -> a clear retrieval error", async () => {
  await assert.rejects(search("best spicy ramen near me", { http: fakeHttp({ serperFail: true }) }), (e) => e instanceof SearchError && e.code === "retrieval_failed");
  return null;
});

scenario("cache: a second identical search reuses research and makes no menu or review calls", async () => {
  const cache = fakeCache();
  await search("best spicy ramen near me", { cache });
  const http = fakeHttp();
  await search("best spicy ramen near me", { cache, http });
  assert.strictEqual(http.calls.exa.length, 0, `exa calls on a warm cache: ${http.calls.exa.length}`);
  return null;
});

scenario("speed: typical latency stays under 4.5 seconds with realistic delays", async () => {
  const t = Date.now();
  const r = await search("best spicy ramen near me", { http: fakeHttp({ serperMs: 700, exaMs: 600 }), openai: fakeOpenAI({ intentMs: 900, judgeMs: 1100 }) });
  const ms = Date.now() - t;
  assert.ok(ms < 4500, `took ${ms}ms`);
  r._ms = ms;
  return r;
});

scenario("generic: 'dinner' at 7pm picks a well-rated restaurant, not a coffee shop or bakery", async () => {
  const r = await search("dinner");
  assert.ok(r.ranked.length >= 3);
  assert.ok(r.ranked[0].rating >= 4.2, `picked a ${r.ranked[0].rating}`);
  assert.ok(!/coffee|bakery|bagel/i.test(r.ranked[0].categoryText), `picked ${r.ranked[0].place.title} (${r.ranked[0].categoryText})`);
  return r;
});

scenario("display: match percentages never rise down the ranking", async () => {
  for (const q of ["best spicy ramen near me", "late night food", "cheap tacos"]) {
    const r = await search(q, { localTime: q === "late night food" ? SAT_1AM : FRI_7PM });
    for (let i = 1; i < r.ranked.length; i++) {
      assert.ok(r.ranked[i].matchScore <= r.ranked[i - 1].matchScore, `${q}: #${i + 1} shows more than #${i}`);
    }
  }
  return null;
});

/* ---- run ------------------------------------------------------------------ */

(async () => {
  const filter = process.argv[2];
  let pass = 0;
  let fail = 0;
  for (const s of scenarios) {
    if (filter && !s.name.includes(filter)) continue;
    const t = Date.now();
    try {
      const r = await s.fn();
      pass += 1;
      const top = r ? r.ranked.slice(0, 3).map((c) => `${c.place.title} (${c.matchScore}%)`).join(" > ") : "";
      console.log(`PASS  ${s.name}  [${Date.now() - t}ms]${top ? `\n      ${top}` : ""}`);
    } catch (err) {
      fail += 1;
      console.log(`FAIL  ${s.name}\n      ${err.message}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
