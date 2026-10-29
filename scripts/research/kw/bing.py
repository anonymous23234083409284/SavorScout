"""Bing Webmaster Tools: Bing's searches for our site, and Bing search volumes.

Two things Google does not give for free:
  - Search volume. Bing's keyword research reports how many times a search
    was made on Bing, for any search, not only ones that found us. Bing is a
    smaller engine than Google, so the numbers are smaller, but they are
    counts of real searches and the order between phrasings carries over.
  - A second view of our own traffic (Bing also feeds DuckDuckGo, Yahoo and
    the AI assistants that search with it).

Needs a free API key: Bing Webmaster Tools > Settings (gear) > API access >
API Key, after adding and verifying the site (it can import from Search
Console in one click).
"""
import datetime as dt
import re

from . import db
from .common import HttpError, http, log, path_of, pause, progress

API = "https://ssl.bing.com/webmaster/api.svc/json/"


def call(cfg, method, **params):
    r = http("GET", API + method, params=dict(params, apikey=cfg["bing_api_key"]))
    return r.get("d") if isinstance(r, dict) else r


def _get(row, *names):
    """Bing's field names, case-insensitively, since its docs and responses disagree."""
    low = {k.lower(): v for k, v in row.items()}
    for n in names:
        if n.lower() in low:
            return low[n.lower()]
    return None


def _date(v):
    """'/Date(1316156400000-0700)/' -> '2011-09-16'."""
    m = re.search(r"\((-?\d+)", str(v or ""))
    return dt.datetime.utcfromtimestamp(int(m.group(1)) / 1000).strftime("%Y-%m-%d") if m else ""


def pull_site(cfg):
    """Our own Bing searches: per search, per page, and search x page for the top pages."""
    con = db.connect()
    started = db.now()
    site = cfg["bing_site_url"]
    total = 0
    for method, src in (("GetQueryStats", "bing_site"), ("GetPageStats", "bing_page")):
        rows = call(cfg, method, siteUrl=site) or []
        agg = {}
        for r in rows:
            key = (_get(r, "Query") or "").strip()
            a = agg.setdefault(key, [0, 0, 0.0])
            imp = _get(r, "Impressions") or 0
            a[0] += imp
            a[1] += _get(r, "Clicks") or 0
            a[2] += (_get(r, "AvgImpressionPosition") or 0) * imp
        db.clear(con, src)
        for key, (imp, clk, posw) in agg.items():
            if src == "bing_site":
                q, page = key, ""
            else:
                q, page = "", path_of(key, cfg["site"])
            db.put(con, src, q, "impressions", imp, page=page)
            db.put(con, src, q, "clicks", clk, page=page)
            if imp:
                db.put(con, src, q, "position", round(posw / imp, 1), page=page)
        log(f"Bing {method}: {len(agg)} rows")
        total += len(agg)
    con.commit()
    # Which of our pages each Bing search lands on, for the 100 busiest pages.
    top = con.execute("SELECT page FROM obs WHERE source='bing_page' AND metric='impressions' "
                      "ORDER BY value DESC LIMIT 100").fetchall()
    db.clear(con, "bing_site_page")
    for i, (page,) in enumerate(top, 1):
        try:
            rows = call(cfg, "GetPageQueryStats", siteUrl=site, page=cfg["site"].rstrip("/") + page) or []
        except HttpError as e:
            log(f"\n  GetPageQueryStats {page}: {e}")
            continue
        agg = {}
        for r in rows:
            q = (_get(r, "Query") or "").strip()
            a = agg.setdefault(q, [0, 0])
            a[0] += _get(r, "Impressions") or 0
            a[1] += _get(r, "Clicks") or 0
        for q, (imp, clk) in agg.items():
            db.put(con, "bing_site_page", q, "impressions", imp, page=page)
            db.put(con, "bing_site_page", q, "clicks", clk, page=page)
        progress(i, len(top), "pages")
        pause(0.4)
    con.commit()
    db.run_log(con, "bing_site", started, total, site)


def _window():
    end = dt.date.today() - dt.timedelta(days=2)
    start = end - dt.timedelta(days=182)
    return start, end


def volumes(cfg, keywords, related_for=()):
    """Bing search counts for `keywords`, and Bing's related searches for the
    `related_for` seeds. Stored as monthly averages over the last six months."""
    con = db.connect()
    started = db.now()
    start, end = _window()
    months = (end - start).days / 30.4
    period = f"{start}..{end}"
    args = dict(country=cfg.get("bing_country") or "us", language=cfg.get("bing_language") or "en-US",
                startDate=start.strftime("%Y-%m-%dT00:00:00"), endDate=end.strftime("%Y-%m-%dT00:00:00"))
    done, fails = 0, 0
    todo = [k for k in keywords if not db.cache_get(con, "bing_kw:" + k, max_age_days=30)]
    log(f"Bing keyword volumes: {len(todo)} searches to look up ({len(keywords) - len(todo)} cached)")
    for i, kw in enumerate(todo, 1):
        try:
            r = call(cfg, "GetKeyword", q=kw, **args) or {}
        except HttpError as e:
            fails += 1
            if fails == 3 and done == 0:
                log(f"\nBing refused the keyword lookups: {e}\nCheck the API key and bing_country/bing_language.")
                break
            continue
        imp = _get(r, "Impressions") or 0
        broad = _get(r, "BroadImpressions") or 0
        db.put(con, "bing_kw", kw, "volume", round(imp / months, 1), period=period)
        db.put(con, "bing_kw", kw, "broad_volume", round(broad / months, 1), period=period)
        db.cache_put(con, "bing_kw:" + kw, [imp, broad])
        done += 1
        if i % 25 == 0:
            con.commit()
        progress(i, len(todo), "searches")
        pause(0.35)
    con.commit()
    for i, seed in enumerate(related_for, 1):
        try:
            rows = call(cfg, "GetRelatedKeywords", q=seed, **args) or []
        except HttpError as e:
            log(f"  related for '{seed}': {e}")
            continue
        for r in rows:
            q = (_get(r, "Query") or "").strip()
            if not q:
                continue
            db.put(con, "bing_kw", q, "volume", round((_get(r, "Impressions") or 0) / months, 1), period=period, seed=seed)
            db.put(con, "bing_kw", q, "broad_volume", round((_get(r, "BroadImpressions") or 0) / months, 1),
                   period=period, seed=seed)
        progress(i, len(related_for), "related lookups")
        pause(0.5)
    con.commit()
    db.run_log(con, "bing_kw", started, done)
