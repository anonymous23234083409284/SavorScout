# Keyword tool

Finds out what people actually type, from the sources that record it, and
matches every search to the page on savorscout.net that should answer it.
Nothing in its output is estimated: each number is one a source reported.

| Source | What it gives | Setup |
|---|---|---|
| Google Search Console API | Every search that showed one of our pages: impressions, clicks, position, per page, up to 16 months | Google Cloud OAuth client (free) |
| URL Inspection API | Whether Google has indexed each page, its last crawl, the canonical it chose | Same sign-in |
| Bing Webmaster API | Bing's searches for our site, and Bing search counts for any search | Free API key |
| Google Ads Keyword Planner API | Google's monthly search volumes, 12 months of seasonality | Ads account (holder 18+) and developer token |
| Autocomplete | What Google, YouTube, Bing and DuckDuckGo suggest as you type | None |
| Google Trends | Interest over time, by region, related searches | Download CSVs from trends.google.com |
| Reddit API | Food questions and phrases from campus subreddits | Reddit app (optional) |

## Run it

On your own computer, from the repository folder. It needs Python 3.8+ and
nothing else (a service-account sign-in also needs `pip install google-auth`).

```
python3 scripts/research/keywords.py setup     # what to set up for each source, step by step
python3 scripts/research/keywords.py all       # every source that is set up, then the report
open scripts/research/out/report.html
```

Or one source at a time: `suggest`, `gsc`, `inspect`, `bing`, `ads`,
`trends <csv files>`, `reddit`, then `analyze` for the report and `export`
for the page generators. `status` shows what is set up and stored.

Everything lands in `scripts/research/out/keywords.db` (SQLite), and runs add
to it, so pulling Search Console every few weeks builds a history. Long runs
can be stopped with Ctrl+C and resumed; what was asked is cached.

## What comes out

In `scripts/research/out/`:

- `report.html`: everything below, readable.
- `opportunities.csv`: what to change, search by search. **A** means Search Console shows the page already ranking, with the action its position and click rate call for. **B** means the data says a page is missing out. **C** means the page needs links from other sites.
- `queries.csv`: every search with what each source says about it.
- `patterns.csv`: searches with the campus, city and food swapped for `{campus}`, `{city}`, `{food}`, so the same phrasing across 80 campuses adds up.
- `template-gaps.csv`: words searched with three or more campuses that the page template never uses.
- `new-pages.csv`: searches with demand and no page made for them.
- `pages.csv`: our pages, with impressions, clicks, the last 28 days against the 28 before, and index status.
- `cannibalization.csv`: searches Google splits between two of our pages.

`export` writes `scripts/data/search-terms.json`. It holds each page's real
Search Console searches, the names students use for each campus, and the
words they add. The page generators read it on the next build, and work as
before when it is absent.

When pages are added, rebuild the site model with
`node scripts/research/make-seeds.js`.
