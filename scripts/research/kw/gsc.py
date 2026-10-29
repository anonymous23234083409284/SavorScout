"""Google Search Console: the searches real people made that showed our pages.

This is the best data the tool has. Every row is a real search on Google that
returned one of our pages, with how often it appeared, where it ranked and how
often it was clicked. The Search Console screen exports 1,000 rows; the API
returns everything Google keeps (up to 16 months), except searches too rare to
report, which Google withholds for privacy and which the page totals include.

What it pulls, each into the database:
  gsc        search x page, whole window: impressions, clicks, position
  gsc        search x page, last 28 days and the 28 before ('last28', 'prev28')
  gsc_page   page totals for the same windows (includes the withheld searches)
  gsc_month  page x month, for trends

And `inspect`, Google's URL Inspection: indexed or not, last crawl, and the
canonical Google chose, for up to 2,000 pages a day.
"""
import datetime as dt
import json
import os
import urllib.parse

from . import auth, db
from .common import PRIORITY_FILE, HttpError, http, log, path_of, pause

API = "https://searchconsole.googleapis.com/webmasters/v3"
INSPECT_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"


def _token(cfg):
    return auth.token(cfg, {"gsc"})


def _headers(cfg):
    return {"Authorization": "Bearer " + _token(cfg)}


def resolve_property(cfg):
    """The property to read: as configured, else the one listed for our site."""
    if cfg.get("gsc_property"):
        return cfg["gsc_property"]
    r = http("GET", API + "/sites", headers=_headers(cfg))
    sites = [s["siteUrl"] for s in r.get("siteEntry", []) if s.get("permissionLevel") != "siteUnverifiedUser"]
    host = urllib.parse.urlsplit(cfg["site"]).netloc.replace("www.", "")
    for want in (f"sc-domain:{host}", cfg["site"].rstrip("/") + "/", f"https://{host}/"):
        if want in sites:
            log(f"Search Console property: {want}")
            return want
    raise SystemExit("Could not find the site in Search Console. Properties this sign-in can read: "
                     + (", ".join(sites) or "none") + ". Set gsc_property in config.json.")


def query(cfg, prop, body):
    """Every row for one request, following startRow until the rows run out."""
    url = f"{API}/sites/{urllib.parse.quote(prop, safe='')}/searchAnalytics/query"
    rows, start = [], 0
    while True:
        r = http("POST", url, body=dict(body, rowLimit=25000, startRow=start), headers=_headers(cfg))
        got = r.get("rows", [])
        rows += got
        if len(got) < 25000:
            return rows
        start += 25000
        pause(0.5)


def _window(days, end):
    return (end - dt.timedelta(days=days - 1)).isoformat(), end.isoformat()


def pull(cfg, days=486):
    con = db.connect()
    started = db.now()
    prop = resolve_property(cfg)
    site = cfg["site"]
    # Search Console data runs about two days behind; 'all' includes the fresh
    # days that are still being finalised, so the latest week is not missing.
    end = dt.date.today() - dt.timedelta(days=1)
    whole = _window(min(days, 486), end)
    last28 = _window(28, end)
    prev28 = _window(28, end - dt.timedelta(days=28))
    total = 0
    for label, (a, b) in (("%s..%s" % whole, whole), ("last28", last28), ("prev28", prev28)):
        log(f"Search Console {label}: searches x pages {a} to {b}")
        rows = query(cfg, prop, {"startDate": a, "endDate": b, "dimensions": ["query", "page"],
                                 "type": "web", "dataState": "all"})
        db.clear(con, "gsc", label)
        for r in rows:
            q, page = r["keys"][0], path_of(r["keys"][1], site)
            for m in ("impressions", "clicks", "position"):
                db.put(con, "gsc", q, m, r[m], page=page, period=label)
        total += len(rows)
        log(f"  {len(rows)} search x page rows")
        pages = query(cfg, prop, {"startDate": a, "endDate": b, "dimensions": ["page"], "type": "web", "dataState": "all"})
        db.clear(con, "gsc_page", label)
        for r in pages:
            for m in ("impressions", "clicks", "position"):
                db.put(con, "gsc_page", "", m, r[m], page=path_of(r["keys"][0], site), period=label)
        log(f"  {len(pages)} pages")
        con.commit()
    log("Search Console: pages by month")
    rows = query(cfg, prop, {"startDate": whole[0], "endDate": whole[1], "dimensions": ["page", "date"],
                             "type": "web", "dataState": "all"})
    months = {}
    for r in rows:
        key = (path_of(r["keys"][0], site), r["keys"][1][:7])
        m = months.setdefault(key, [0, 0])
        m[0] += r["impressions"]
        m[1] += r["clicks"]
    db.clear(con, "gsc_month")
    for (page, month), (imp, clk) in months.items():
        db.put(con, "gsc_month", "", "impressions", imp, page=page, period=month)
        db.put(con, "gsc_month", "", "clicks", clk, page=page, period=month)
    db.run_log(con, "gsc", started, total, prop)
    log(f"Search Console done: {total} search x page rows across three windows.")


def _inspect_targets(con, cfg, limit):
    """Priority pages first (scripts/data/priority-pages.json), then the pages
    with the most impressions, skipping any inspected in the last week."""
    urls = []
    if os.path.exists(PRIORITY_FILE):
        with open(PRIORITY_FILE, encoding="utf-8") as f:
            urls += [p["url"] if isinstance(p, dict) else p for p in json.load(f).get("pages", [])]
    for (page,) in con.execute("SELECT page FROM obs WHERE source='gsc_page' AND metric='impressions' "
                               "GROUP BY page ORDER BY MAX(value) DESC"):
        urls.append(page)
    week_ago = (dt.datetime.now() - dt.timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    fresh = {u for (u,) in con.execute("SELECT url FROM inspect WHERE fetched > ?", (week_ago,))}
    seen, out = set(), []
    for u in urls:
        if u not in seen and u not in fresh:
            seen.add(u)
            out.append(u)
    return out[:limit]


def inspect(cfg, limit=500, urls=None):
    con = db.connect()
    started = db.now()
    prop = resolve_property(cfg)
    targets = urls or _inspect_targets(con, cfg, limit)
    log(f"URL Inspection: {len(targets)} pages (Google allows 2,000 a day)")
    done = 0
    for i, page in enumerate(targets, 1):
        full = cfg["site"].rstrip("/") + page
        try:
            r = http("POST", INSPECT_API, body={"inspectionUrl": full, "siteUrl": prop, "languageCode": "en-US"},
                     headers=_headers(cfg))
        except HttpError as e:
            if e.status == 429:
                log("\nDaily inspection quota reached; the rest carry over to the next run.")
                break
            log(f"\n  {page}: {e}")
            continue
        s = r.get("inspectionResult", {}).get("indexStatusResult", {})
        con.execute("INSERT OR REPLACE INTO inspect VALUES (?,?,?,?,?,?,?,?,?)", (
            page, s.get("verdict"), s.get("coverageState"), s.get("indexingState"), s.get("pageFetchState"),
            s.get("lastCrawlTime"), s.get("googleCanonical"), s.get("userCanonical"), db.now()))
        done += 1
        if i % 20 == 0:
            con.commit()
        print(f"\r  {i}/{len(targets)} inspected", end="", flush=True)
        pause(0.15)
    print()
    con.commit()
    db.run_log(con, "inspect", started, done, prop)
    rows = con.execute("SELECT coverage, COUNT(*) FROM inspect GROUP BY coverage ORDER BY 2 DESC").fetchall()
    for cov, n in rows:
        log(f"  {n:>5}  {cov}")
