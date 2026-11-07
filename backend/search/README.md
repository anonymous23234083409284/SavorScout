# Search v2

The engine behind `POST /search`. It picks one restaurant for a craving, a
location and a radius. `index.js` has the pipeline overview; each step is its
own file:

| File | Job |
|---|---|
| `intent.js` | Reads the craving (OpenAI) into dish, cuisine, budget, dietary needs, atmosphere, things to avoid, related terms, extra searches, priority. Falls back to a keyword parser if the model fails. |
| `retrieve.js` | Up to 3 Google Maps searches (Serper) in parallel, merged into one pool of ~35–55 places. Keeps each place's rank in every list. |
| `features.js` | Relevance, quality, price, distance, chain detection: pure functions. |
| `hours.js` | Parses opening hours and says whether a place is open at the person's local time. |
| `rank.js` | Stage 1 scoring of every candidate, gates, finalists, evidence features, final blend, the numbers on the card. |
| `research.js` | Reads menus (6 finalists) and reviews (top 4) through Exa, with a per-dish cache. |
| `judge.js` | A model scores the finalists 0–10 for fit with the evidence in front of it. Optional; the search works without it. |
| `lexicon.js`, `chains.json` | Food knowledge: cravings and related terms, vibe synonyms, review sentiment words, non-restaurant categories, ~350 chain names (used only when a search asks for no chains). |

## How a place is scored

**Stage 1 (every candidate in the radius):** five signals, each 0–1.
- Relevance: does its name, category or description say it serves the dish? 76%. Google's own ranking for our queries (reciprocal rank fusion): 24%.
- Quality: the rating shrunk toward the local average by review count (a 5.0 from 6 reviews is mostly average), plus a little credit for popularity.
- Distance: absolute, half value at 5 / 9 / 15 / 10 miles for Nearby / Driving / Anywhere / Group.
- Budget: only when one was asked for. Cheaper is fine; pricier is penalised.
- Open: only when hours are known and the search is for now.

These are combined as a **weighted geometric mean**, so a place has to be decent on
everything that matters to the request. The weights follow the request: a
specific dish leads with relevance, "best" leans on quality, "closest" on
distance, "cheap" on price. Then come multipliers:
- chains, but only when the search itself says "no chains", "independent",
  "locally owned" or similar. Otherwise a chain is treated exactly like any
  other restaurant, and the judge isn't even told which places are chains.
  "Local" on its own just means nearby, and "no fast food" marks down fast
  food, not sit-down chains.
- things they said to avoid
- meal fit (no coffee shop for "dinner")
- their rating history and taste quiz (small)
- listing completeness

Gates remove places that are closed now, clearly irrelevant, or not
restaurants. Each gate applies only if it still leaves a real choice.

**Stage 2 (6 finalists, one per brand):**
- **Evidence:** menu and review passages. Is the dish there? What do reviewers say about it? Does the requested atmosphere show up (with synonyms)? Are dietary needs met?
- **Judge:** a 0–10 fit score from a model that sees all of it.

Final score = 50% stage 1 + 20% evidence + 30% judge, or 68% / 32% without the
judge. A place the judge rates 2/10 or lower can't win on numbers alone when
another finalist rates 6 or higher.

## Settings (environment variables)

| Variable | Default | Effect |
|---|---|---|
| `SEARCH_ALGORITHM` | `v2` | `legacy` switches `/search` back to the old engine. `/search/legacy` always runs it. |
| `SEARCH_INTENT_MODEL` / `SEARCH_JUDGE_MODEL` | `gpt-4o-mini` | Any OpenAI chat model with JSON output. A stronger judge model is the cheapest quality upgrade. |
| `SEARCH_JUDGE` | on | `off` skips the judge (faster, cheaper). |
| `SEARCH_INTENT_TIMEOUT_MS` / `SEARCH_JUDGE_TIMEOUT_MS` | 4500 / 3000 | When to give up on each model call and carry on without it. |
| `SEARCH_RESEARCH_DEADLINE_MS` | 1800 | How long to wait for menus and reviews. Late lookups still finish in the background and warm the cache. |
| `SEARCH_FINALISTS` / `SEARCH_REVIEWED_FINALISTS` | 6 / 4 | How many places get menus / reviews read. |
| `SEARCH_MAX_QUERIES` | 3 | Google Maps searches per request. |
| `SERPER_RETRIEVAL_ENDPOINT` | `places` | `maps` uses Serper's maps endpoint instead. |

## Tests

```bash
cd backend && npm test             # 22 scenarios, fake Google/Exa/OpenAI, no keys needed
cd backend && npm run test:compare  # old vs new engine on the same scenarios
```
