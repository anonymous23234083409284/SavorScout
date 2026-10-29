#!/usr/bin/env python3
"""Savor Scout keyword tool: what real people search, from the sources that know.

  Search Console   our own searches: impressions, clicks, position, per page
  URL Inspection   whether Google has indexed each page, and when it crawled it
  Bing Webmaster   Bing's searches for our site, and Bing search counts
  Google Ads       Google's monthly search volumes and their seasonality
  Autocomplete     what Google, YouTube, Bing and DuckDuckGo suggest as you type
  Google Trends    interest over time and related searches, from its CSV exports
  Reddit           how students phrase food questions on campus subreddits

Everything goes into one SQLite database (out/keywords.db). `analyze` lines it
up per search, matches each search to the page that should answer it, and
writes the report; `export` hands the Search Console part to the page
generators (scripts/data/search-terms.json).

    python3 scripts/research/keywords.py setup      what to set up, and how
    python3 scripts/research/keywords.py all        every source that is set up, then the report
    python3 scripts/research/keywords.py status     what is in the database

Each source also runs on its own: suggest, gsc, inspect, bing, ads, trends,
reddit, analyze, export. Add --help to any of them for its options.
Rebuild the site model after adding pages: node scripts/research/make-seeds.js
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from kw import analyze, auth, db  # noqa: E402
from kw.common import CONFIG_FILE, OUT, load_config, load_seeds, log, write_config_template  # noqa: E402

CITY_SEEDS = ["restaurants in {c} {st}", "places to eat in {c}", "best restaurants in {c}", "food in {c}"]
CAMPUS_SEEDS = ["restaurants near {c}", "food near {c}", "places to eat near {c}", "best restaurants near {c}",
                "cheap food near {c}", "late night food near {c}", "breakfast near {c}", "coffee near {c}",
                "{c} restaurants", "{c} food"]


def candidates(con, seeds, campuses=300, cities=150, limit=None):
    """The searches worth pricing: ours from Search Console first, then the
    phrasings every campus, city and food page targets, then suggestions."""
    out = [q for (q,) in con.execute(
        "SELECT query FROM obs WHERE source='gsc' AND metric='impressions' AND query!='' "
        "GROUP BY query ORDER BY SUM(value) DESC LIMIT 3000")]
    for c in seeds["campuses"][:campuses]:
        for n in c["names"][:2]:
            out += [p.format(c=n.lower()) for p in CAMPUS_SEEDS]
    for c in seeds["cities"][:cities]:
        out += [p.format(c=c["name"].lower(), st=c["state"].lower()) for p in CITY_SEEDS]
    for f in seeds["foods"]:
        out += [f"{f['words'][0]} near me", f"best {f['words'][0]} near me"]
    out += [q for (q,) in con.execute(
        "SELECT query FROM obs WHERE source LIKE 'suggest:%' GROUP BY query "
        "ORDER BY COUNT(DISTINCT source) DESC, MIN(value) LIMIT 6000")]
    seen, uniq = set(), []
    for q in out:
        q = q.strip().lower()
        if q and q not in seen and len(q) <= 80:
            seen.add(q)
            uniq.append(q)
    return uniq[:limit] if limit else uniq


def have(cfg):
    return {
        "gsc": auth.available(cfg, {"gsc"}),
        "bing": bool(cfg.get("bing_api_key")),
        "ads": bool(cfg.get("ads_developer_token") and cfg.get("ads_customer_id") and auth.available(cfg, {"ads"})),
        "reddit": bool(cfg.get("reddit_client_id") and cfg.get("reddit_client_secret")),
    }


SETUP = """
Set up whichever of these you can; the tool skips what is missing. Secrets go
in scripts/research/config.json (git ignores it) or in the environment
variable named in kw/common.py.

1. SEARCH CONSOLE (most important: the searches that already find us)
   a. console.cloud.google.com: create a project (any name).
   b. APIs & Services > Library: enable "Google Search Console API".
   c. OAuth consent screen: External; add your own Google account as a test user.
   d. Credentials > Create credentials > OAuth client ID > Desktop app.
      Download the JSON and save it as scripts/research/client_secret.json
   e. Run `keywords.py gsc`. A browser opens once to sign in; after that it
      remembers (re-sign weekly while the consent screen says "Testing").
   No browser available (a server, a scheduled job)? Use a service account
   instead: Credentials > Service account > Keys > JSON; put its path in
   google_service_account; add the service account's email under Search
   Console > Settings > Users and permissions; pip install google-auth.

2. BING WEBMASTER TOOLS (Bing search counts for any search, free)
   a. bing.com/webmasters: sign in, add the site (Import from Google Search
      Console verifies it in one step).
   b. Settings (gear) > API access > API Key > Generate. Put it in bing_api_key.

3. GOOGLE ADS KEYWORD PLANNER (Google's own monthly volumes)
   Needs an account holder 18 or older (a parent can own it; no ads have to run).
   a. ads.google.com: create a Google Ads account, then a manager account
      (ads.google.com/home/tools/manager-accounts) and link the two.
   b. In the manager account: Tools > API Center. Apply for a developer token
      (Basic or Explorer access; a test-only token cannot read real data).
   c. In the same Cloud project as step 1, enable "Google Ads API".
   d. config.json: ads_developer_token, ads_customer_id (the ad account's
      10 digits), ads_login_customer_id (the manager's 10 digits).

4. GOOGLE TRENDS: on trends.google.com, compare searches, press the download
   arrow on each chart, then `keywords.py trends <the csv files or folder>`.

5. REDDIT (optional): reddit.com/prefs/apps > create app > "script". Put the
   id under the app name and the secret in reddit_client_id/_secret.

6. AUTOCOMPLETE needs nothing.
"""


def cmd_setup(args, cfg):
    if write_config_template():
        log(f"Wrote a blank {CONFIG_FILE}")
    log(SETUP)
    for name, ok in have(cfg).items():
        log(f"  {'ready  ' if ok else 'not set'}  {name}")
    log("  ready    autocomplete\n")


def cmd_status(args, cfg):
    con = db.connect()
    for name, ok in have(cfg).items():
        log(f"  {'ready  ' if ok else 'not set'}  {name}")
    log("\nIn the database:")
    for src, n, last in con.execute("SELECT source, COUNT(*), MAX(fetched) FROM obs GROUP BY source ORDER BY source"):
        log(f"  {src:16} {n:>8} rows   last {last}")
    n = con.execute("SELECT COUNT(*) FROM inspect").fetchone()[0]
    log(f"  {'inspect':16} {n:>8} pages")


def cmd_suggest(args, cfg):
    from kw import suggest
    suggest.run(load_seeds(), engines=args.engines.split(","), delay=args.delay, campuses=args.campuses,
                deep=args.deep, foods=args.foods, from_gsc=args.from_gsc)


def cmd_gsc(args, cfg):
    from kw import gsc
    gsc.pull(cfg, days=args.days)


def cmd_inspect(args, cfg):
    from kw import gsc
    urls = None
    if args.urls:
        with open(args.urls, encoding="utf-8") as f:
            urls = [line.strip() for line in f if line.strip().startswith("/")]
    gsc.inspect(cfg, limit=args.limit, urls=urls)


def cmd_bing(args, cfg):
    from kw import bing
    if not cfg.get("bing_api_key"):
        sys.exit("bing_api_key is not set. See `keywords.py setup`.")
    bing.pull_site(cfg)
    con = db.connect()
    seeds = load_seeds()
    kws = candidates(con, seeds, campuses=args.campuses, limit=args.limit)
    related = ["food near campus", "restaurants near campus", "late night food", "cheap food", "places to eat near me"]
    related += [f"restaurants near {c['names'][0].lower()}" for c in seeds["campuses"][:20]]
    bing.volumes(cfg, kws, related_for=related)


def cmd_ads(args, cfg):
    from kw import ads
    con = db.connect()
    seeds = load_seeds()
    idea_seeds = ["food near campus", "restaurants near campus", "places to eat near college", "late night food",
                  "cheap food near me", "what should i eat", "where should i eat", "food near me", "places to eat near me"]
    idea_seeds += [f"restaurants near {c['names'][0].lower()}" for c in seeds["campuses"][:args.idea_campuses]]
    idea_seeds += [f"{f['words'][0]} near me" for f in seeds["foods"][:40]]
    ads.ideas(cfg, idea_seeds)
    ads.historical(cfg, candidates(con, seeds, campuses=args.campuses))


def cmd_trends(args, cfg):
    from kw import trends
    trends.run(args.files)


def cmd_reddit(args, cfg):
    from kw import reddit
    reddit.run(cfg, load_seeds(), campuses=args.campuses)


def cmd_analyze(args, cfg):
    analyze.run(min_impr=args.min_impr)
    log("Open " + os.path.join(OUT, "report.html"))


def cmd_export(args, cfg):
    analyze.export()


def cmd_all(args, cfg):
    ok = have(cfg)
    steps = [("autocomplete", lambda: cmd_suggest(argparse.Namespace(engines=args.engines, delay=1.1, campuses=60,
                                                                       deep=15, foods=60, from_gsc=100), cfg))]
    if ok["gsc"]:
        steps.insert(0, ("Search Console", lambda: cmd_gsc(argparse.Namespace(days=486), cfg)))
        steps.insert(1, ("URL Inspection", lambda: cmd_inspect(argparse.Namespace(limit=300, urls=None), cfg)))
    if ok["bing"]:
        steps.append(("Bing", lambda: cmd_bing(argparse.Namespace(campuses=150, limit=800), cfg)))
    if ok["ads"]:
        steps.append(("Google Ads", lambda: cmd_ads(argparse.Namespace(idea_campuses=40, campuses=400), cfg)))
    if ok["reddit"]:
        steps.append(("Reddit", lambda: cmd_reddit(argparse.Namespace(campuses=40), cfg)))
    for name, fn in steps:
        log(f"\n=== {name} ===")
        try:
            fn()
        except SystemExit as e:
            log(f"{name} stopped: {e}")
        except Exception as e:  # one source failing should not lose the rest
            log(f"{name} failed: {e}")
    skipped = [k for k, v in ok.items() if not v]
    if skipped:
        log(f"\nNot set up, so skipped: {', '.join(skipped)}. See `keywords.py setup`.")
    log("\n=== Report ===")
    analyze.run()
    if ok["gsc"]:
        analyze.export()
    log("Open " + os.path.join(OUT, "report.html"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("setup", help="what to set up for each source, and how")
    sub.add_parser("status", help="what is configured and what is in the database")
    p = sub.add_parser("suggest", help="autocomplete suggestions")
    p.add_argument("--engines", default="google", help="comma list from: google,youtube,bing,ddg")
    p.add_argument("--campuses", type=int, default=60)
    p.add_argument("--deep", type=int, default=15, help="campuses that also get the a-z expansion")
    p.add_argument("--foods", type=int, default=60)
    p.add_argument("--from-gsc", type=int, default=100, help="our top Search Console searches to expand")
    p.add_argument("--delay", type=float, default=1.1)
    p = sub.add_parser("gsc", help="Search Console searches and pages")
    p.add_argument("--days", type=int, default=486, help="how far back (Google keeps about 16 months)")
    p = sub.add_parser("inspect", help="URL Inspection: indexed or not")
    p.add_argument("--limit", type=int, default=500)
    p.add_argument("--urls", help="a file of paths, one per line, instead of the priority pages")
    p = sub.add_parser("bing", help="Bing site searches and keyword volumes")
    p.add_argument("--campuses", type=int, default=150)
    p.add_argument("--limit", type=int, default=800, help="searches to look up (one request each)")
    p = sub.add_parser("ads", help="Google Ads Keyword Planner volumes")
    p.add_argument("--idea-campuses", type=int, default=40)
    p.add_argument("--campuses", type=int, default=400)
    p = sub.add_parser("trends", help="import Google Trends CSV downloads")
    p.add_argument("files", nargs="+")
    p = sub.add_parser("reddit", help="campus subreddit food questions")
    p.add_argument("--campuses", type=int, default=40)
    p = sub.add_parser("analyze", help="write the report and CSVs")
    p.add_argument("--min-impr", type=int, default=10)
    sub.add_parser("export", help="write scripts/data/search-terms.json for the page generators")
    p = sub.add_parser("all", help="every source that is set up, then the report")
    p.add_argument("--engines", default="google,youtube")
    args = ap.parse_args()
    cfg = load_config()
    globals()["cmd_" + args.cmd](args, cfg)


if __name__ == "__main__":
    main()
