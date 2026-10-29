"""The keyword database: one SQLite file holding everything every source said.

One row per observation: which source said it, about which search (and which
of our pages, where the source knows), what it measured, and for what period.
Search Console impressions for "food near apu" on /campus/azusa-pacific-
university, Google Ads' monthly volume for "restaurants near ucla", the rank
Google's autocomplete gave a suggestion: all the same shape, so a search can
be lined up across every source with one query, and every number in the
report can be traced back to where it came from.

Runs add to it rather than replace it, so pulling Search Console every few
weeks builds a history.
"""
import json
import os
import sqlite3
import time

from .common import DB_FILE, OUT

SCHEMA = """
CREATE TABLE IF NOT EXISTS obs (
  source  TEXT NOT NULL,             -- gsc, gsc_page, bing_site, bing_kw, ads, suggest:google, trends, reddit ...
  query   TEXT NOT NULL,             -- the search, lower case; '' for page-only rows
  page    TEXT NOT NULL DEFAULT '',  -- our path, where the source ties the search to a page
  metric  TEXT NOT NULL,             -- impressions, clicks, position, volume, rank, ...
  value   REAL,
  period  TEXT NOT NULL DEFAULT '',  -- '2025-07-01..2026-10-27', '2026-09', 'last28', ...
  seed    TEXT NOT NULL DEFAULT '',  -- what was asked to find it (suggestions, ideas, Reddit)
  fetched TEXT,
  PRIMARY KEY (source, query, page, metric, period)
);
CREATE INDEX IF NOT EXISTS obs_query ON obs(query);
CREATE INDEX IF NOT EXISTS obs_page ON obs(page);
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, fetched TEXT);
CREATE TABLE IF NOT EXISTS inspect (
  url TEXT PRIMARY KEY, verdict TEXT, coverage TEXT, indexing TEXT, fetch_state TEXT,
  last_crawl TEXT, google_canonical TEXT, user_canonical TEXT, fetched TEXT
);
CREATE TABLE IF NOT EXISTS pages (
  url TEXT PRIMARY KEY, title TEXT, h1 TEXT, h2 TEXT, description TEXT, fetched TEXT
);
CREATE TABLE IF NOT EXISTS runs (source TEXT, started TEXT, finished TEXT, rows INTEGER, note TEXT);
"""


def now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def connect():
    os.makedirs(OUT, exist_ok=True)
    con = sqlite3.connect(DB_FILE)
    con.executescript(SCHEMA)
    return con


def put(con, source, query, metric, value, page="", period="", seed="", keep="replace"):
    """Record one observation. keep='min' keeps the lower value (best rank)."""
    query = (query or "").strip().lower()
    if keep == "min":
        con.execute(
            "INSERT INTO obs VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(source,query,page,metric,period) "
            "DO UPDATE SET value=MIN(value, excluded.value), fetched=excluded.fetched",
            (source, query, page, metric, value, period, seed, now()))
    else:
        con.execute("INSERT OR REPLACE INTO obs VALUES (?,?,?,?,?,?,?,?)",
                    (source, query, page, metric, value, period, seed, now()))


def clear(con, source, period=None):
    """Drop a source's rows before re-pulling a window, so stale rows do not linger."""
    if period is None:
        con.execute("DELETE FROM obs WHERE source=?", (source,))
    else:
        con.execute("DELETE FROM obs WHERE source=? AND period=?", (source, period))


def cache_get(con, key, max_age_days=None):
    row = con.execute("SELECT value, fetched FROM cache WHERE key=?", (key,)).fetchone()
    if not row:
        return None
    if max_age_days is not None:
        age = time.time() - time.mktime(time.strptime(row[1], "%Y-%m-%d %H:%M:%S"))
        if age > max_age_days * 86400:
            return None
    return json.loads(row[0])


def cache_put(con, key, value):
    con.execute("INSERT OR REPLACE INTO cache VALUES (?,?,?)", (key, json.dumps(value), now()))


def run_log(con, source, started, rows, note=""):
    con.execute("INSERT INTO runs VALUES (?,?,?,?,?)", (source, started, now(), rows, note))
    con.commit()
