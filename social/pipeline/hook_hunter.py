#!/usr/bin/env python3
"""hook_hunter: find short, scripted TikTok formats that massively outperformed their account,
and keep their spoken scripts so we can study the structure (skits and no-face videos).

    python hook_hunter.py hunt [--budget 0.90] [--per 20] [--triggers 12]
    python hook_hunter.py profile <handle> [--n 20] [--budget 0.15]
    python hook_hunter.py keywords [--refresh]
    python hook_hunter.py budget

HOW IT WORKS
1. Keyword engine. hooks.json holds the spoken hook triggers ("everything you know about",
   "nobody talks about", ...) and how each has scored. `keywords --refresh` (and `hunt`, once a
   week) asks Claude (claude-opus-5-5, ANTHROPIC_API_KEY) for 5 fresh variations of the
   highest scorers.
2. Scraper. Each trigger is searched with Apify's clockworks/tiktok-scraper, subtitles on,
   videos off (shouldDownloadSubtitles=True, shouldDownloadVideos=False).
3. Strict filter. A video is dropped unless it is 12-35 seconds long, has 50,000+ views, has
   at least 5x as many views as its author has followers (playCount / authorMeta.fans), and has
   25+ spoken words.
4. Clean output. Subtitle timestamps are stripped, videos already in seen_videos.json are
   skipped, survivors are ranked by outlier ratio and the top 50 go to weekly_formats.json.
   Videos that pass everything except length (36-90 s: most two-person skits) are kept apart
   in near_misses.json; all_formats.json is every video that ever passed.

`profile` pulls one account's newest videos with their scripts, unfiltered, for a case study.

MONEY. Every run is capped (max_total_charge_usd) and the tool never spends past the Apify
plan's monthly limit: `budget` shows what is left. APIFY_TOKEN is read from the environment; in
the SavorScout cloud environment the network proxy supplies the token, so a placeholder works.

WHAT TO DO WITH THE SCRIPTS. They are other people's words: study the structure (hook, turn,
payoff, length, where the plug sits) and write our own lines. Never paste a script, a caption
or footage into our videos. The data folder is private (git-ignored)."""

import argparse
import datetime as dt
import json
import math
import os
import re
import statistics
import sys
import urllib.request
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
CONFIG = os.path.join(SOCIAL, "hooks.json")                       # triggers and their scores (committed)
DATA = os.path.join(SOCIAL, "lab", "crawl", "hooks")              # scripts and history (private)
ACTOR = "clockworks/tiktok-scraper"
ACTOR_MIN_CAP = 0.50                                   # that actor's smallest allowed max cost per run
FALLBACK_ACTOR = "clockworks/free-tiktok-scraper"      # same scraper and input, accepts small caps
USD_PER_RESULT = 0.005                                 # rough price of one result with subtitles; sizes a run to its budget
MODEL = "claude-opus-5-5"
TOKEN = os.environ.get("APIFY_TOKEN", "placeholder")

DEFAULT_TRIGGERS = [
    "everything you know about", "nobody talks about", "the dark side of", "pov you're broke in college",
    "things nobody tells you about college", "the real reason", "i tested every", "stop doing this",
    "how to eat for free in college", "college students be like", "me trying to decide where to eat",
    "when the dining hall closes", "this is your sign to", "here's why you're always broke",
    "the worst part about being a student", "if you live in a dorm",
]
FILTER = {"min_seconds": 12, "max_seconds": 35, "min_views": 50_000, "min_outlier": 5.0, "min_words": 25}
KEEP = 50


def jload(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def jsave(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


def config():
    c = jload(CONFIG, {})
    c.setdefault("triggers", list(DEFAULT_TRIGGERS))
    c.setdefault("scores", {})
    c.setdefault("generated", [])
    return c


# ---- Apify ------------------------------------------------------------------------------------

def client():
    from apify_client import ApifyClient
    return ApifyClient(TOKEN)


def plain(x):
    return x.model_dump() if hasattr(x, "model_dump") else dict(x)


def remaining_usd(c=None):
    """What the Apify plan has left this billing cycle."""
    lim = plain((c or client()).user().limits())
    return float(lim["limits"]["max_monthly_usage_usd"]) - float(lim["current"]["monthly_usage_usd"]), lim["monthly_usage_cycle"]["end_at"]


def run_scraper(c, run_input, max_usd):
    """One capped run of the scraper; returns its items."""
    base = {"shouldDownloadVideos": False, "shouldDownloadSubtitles": True, "downloadSubtitlesOptions": "DOWNLOAD_SUBTITLES",
            "shouldDownloadCovers": False, "shouldDownloadSlideshowImages": False, "shouldDownloadAvatars": False}
    left, _ = remaining_usd(c)
    cap = round(min(max_usd, left - 0.03), 2)
    if cap < 0.02:
        print(f"Apify has ${left:.2f} left this cycle: not enough to run.")
        return []
    actor = ACTOR
    if cap < ACTOR_MIN_CAP:                    # the main actor refuses a cap under $0.50; what a run really costs is
        if left - 0.03 >= ACTOR_MIN_CAP:       # set by how many results it returns, so raise the ceiling when there is room
            cap = ACTOR_MIN_CAP
        else:                                  # otherwise use its twin, which takes small caps
            actor = FALLBACK_ACTOR
    run = c.actor(actor).call(run_input={**base, **run_input}, max_total_charge_usd=Decimal(str(cap)), logger=None)
    run = plain(run) if run is not None else {}
    ds = run.get("default_dataset_id") or run.get("defaultDatasetId")
    items = list(c.dataset(ds).iterate_items()) if ds else []
    after, _ = remaining_usd(c)
    print(f"  run {run.get('status')}: {len(items)} items, ${left - after:.3f} spent (cap ${cap:.2f}), ${after:.2f} left")
    return items


# ---- subtitles --------------------------------------------------------------------------------

def strip_timestamps(text):
    """SRT or WebVTT -> the spoken words only, with repeated rolling lines removed."""
    out = []
    for line in text.replace("\r", "").split("\n"):
        s = line.strip()
        if not s or s.upper().startswith(("WEBVTT", "NOTE", "STYLE", "KIND:", "LANGUAGE:")) or s.isdigit() or "-->" in s:
            continue
        s = re.sub(r"<[^>]+>|\{[^}]+\}", "", s).strip()           # inline tags and positions
        if s and (not out or s != out[-1]):
            out.append(s)
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def fetch(url):
    headers = {"User-Agent": "hook-hunter"}
    if url.startswith("https://api.apify.com/"):
        headers["Authorization"] = "Bearer " + TOKEN
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def script_of(item):
    """The English spoken script of a scraped video, or ''."""
    links = (item.get("videoMeta") or {}).get("subtitleLinks") or []
    links = sorted(links, key=lambda l: (not str(l.get("language", "")).lower().startswith("en"), "asr" not in str(l.get("source", "")).lower()))
    for l in links[:2]:
        if not str(l.get("language", "")).lower().startswith("en"):
            continue
        for key in ("downloadLink", "tiktokLink"):
            if l.get(key):
                try:
                    words = strip_timestamps(fetch(l[key]))
                    if words:
                        return words
                except Exception:
                    continue
    return ""


# ---- the filter -------------------------------------------------------------------------------

def measure(item):
    a, v = item.get("authorMeta") or {}, item.get("videoMeta") or {}
    views, fans = int(item.get("playCount") or 0), int(a.get("fans") or 0)
    return {"id": str(item.get("id") or ""), "url": item.get("webVideoUrl") or "", "author": a.get("name") or "", "fans": fans, "views": views,
            "likes": int(item.get("diggCount") or 0), "shares": int(item.get("shareCount") or 0), "comments": int(item.get("commentCount") or 0),
            "saves": int(item.get("collectCount") or 0), "seconds": int(v.get("duration") or 0), "outlier_ratio": round(views / max(fans, 1), 1),
            "posted": (item.get("createTimeISO") or "")[:10], "caption": (item.get("text") or "")[:300], "trigger": item.get("searchQuery") or item.get("input") or ""}


def reject_reason(m, f=FILTER):
    """Why a video fails the metadata filter (None = it passes). Words are checked after the script is read."""
    if not f["min_seconds"] <= m["seconds"] <= f["max_seconds"]:
        return "length"
    if m["views"] < f["min_views"]:
        return "views"
    if m["outlier_ratio"] < f["min_outlier"]:
        return "outlier"
    return None


def first_line(script, n=14):
    s = re.split(r"(?<=[.!?])\s", script)[0]
    return " ".join(s.split()[:n])


# ---- commands ---------------------------------------------------------------------------------

def hunt(budget, per, n_triggers):
    cfg = config()
    week = dt.date.today().isocalendar()
    if cfg.get("refreshed_week") != [week[0], week[1]]:
        fresh_variations(cfg)
    c = client()
    left, _ = remaining_usd(c)
    budget = min(budget, left - 0.03)
    if budget < 0.05:
        sys.exit(f"Apify has ${left:.2f} left this cycle; nothing to spend.")
    # best-scoring triggers first, then the ones never tried
    score = lambda t: cfg["scores"].get(t, {}).get("score", 0.5)
    triggers = sorted(cfg["triggers"], key=lambda t: -score(t))[:n_triggers]
    seen = jload(os.path.join(DATA, "seen_videos.json"), {})
    per = max(5, min(per, int(budget / USD_PER_RESULT / max(1, len(triggers)))))     # the result count is what a run costs
    print(f"hunting {len(triggers)} triggers x {per} results, budget ${budget:.2f}")
    items = run_scraper(c, {"searchQueries": triggers, "searchSection": "/video", "resultsPerPage": per}, budget)
    today = dt.date.today().isoformat()
    why, kept, near, per_trigger = {}, [], [], {}
    for it in items:
        m = measure(it)
        if not m["id"]:
            continue
        t = per_trigger.setdefault(m["trigger"], {"results": 0, "ratios": []})
        t["results"] += 1
        if m["id"] in seen:
            why["seen before"] = why.get("seen before", 0) + 1
            continue
        r = reject_reason(m)
        if not r:
            m["script"] = script_of(it)
            m["words"] = len(m["script"].split())
            if m["words"] < FILTER["min_words"]:
                r = "no subtitles" if not m["words"] else "words"
        seen[m["id"]] = {"first_seen": today, "kept": not r, "why": r or ""}
        if r:
            why[r] = why.get(r, 0) + 1
            # a near miss: right on views and outlier ratio, only too long (most two-person skits run 40-90 s)
            if r == "length" and FILTER["max_seconds"] < m["seconds"] <= 90 and m["views"] >= FILTER["min_views"] and m["outlier_ratio"] >= FILTER["min_outlier"]:
                m["script"] = script_of(it)
                m["words"] = len(m["script"].split())
                if m["words"] >= FILTER["min_words"]:
                    m["hook"] = first_line(m["script"])
                    near.append(m)
            continue
        m["hook"] = first_line(m["script"])
        t["ratios"].append(m["outlier_ratio"])
        kept.append(m)
    for name, t in per_trigger.items():                           # how each trigger did, for next week's keyword engine
        s = cfg["scores"].setdefault(name, {"runs": 0, "results": 0, "survivors": 0, "score": 0.0})
        s["runs"] += 1
        s["results"] += t["results"]
        s["survivors"] += len(t["ratios"])
        s["best_ratio"] = max([s.get("best_ratio", 0)] + t["ratios"])
        s["score"] = round(0.5 * s["score"] + sum(math.log10(r) for r in t["ratios"]), 2)
        s["last_run"] = today
    old = [x for x in jload(os.path.join(DATA, "weekly_formats.json"), {}).get("formats", []) if x["id"] not in {k["id"] for k in kept}]
    kept.sort(key=lambda m: -m["outlier_ratio"])
    wk = jload(os.path.join(DATA, "weekly_formats.json"), {})                     # a second run in the same week adds to the week's list
    same_week = wk.get("week") == [week[0], week[1]]
    this_week = sorted(kept + [x for x in (wk.get("formats", []) if same_week else []) if x["id"] not in {k["id"] for k in kept}], key=lambda m: -m["outlier_ratio"])
    jsave(os.path.join(DATA, "weekly_formats.json"), {"week_of": today, "week": [week[0], week[1]], "filter": FILTER,
                                                     "scraped": len(items) + (wk.get("scraped", 0) if same_week else 0), "rejected_this_run": why,
                                                     "formats": this_week[:KEEP]})
    if old or kept:                                               # everything that ever passed, newest first
        jsave(os.path.join(DATA, "all_formats.json"), {"formats": kept + old})
    if near:
        was = [x for x in jload(os.path.join(DATA, "near_misses.json"), {}).get("formats", []) if x["id"] not in {k["id"] for k in near}]
        jsave(os.path.join(DATA, "near_misses.json"), {"note": "passed views, outlier ratio and words but ran 36-90 s: longer skits worth studying",
                                                     "formats": sorted(near + was, key=lambda m: -m["outlier_ratio"])})
    jsave(os.path.join(DATA, "seen_videos.json"), seen)
    jsave(CONFIG, cfg)
    print(f"{len(items)} scraped, {len(kept)} passed the filter, {len(near)} near misses (36-90 s) kept in near_misses.json; rejected: {why}")
    for m in kept[:12]:
        print(f"  {m['outlier_ratio']:>8.0f}x  {m['views']:>10,} views  {m['seconds']:>2}s  @{m['author']:<20} {m['hook'][:70]}")
    print("saved:", os.path.join(DATA, "weekly_formats.json"))


def profile(handle, n, budget):
    c = client()
    handle = handle.lstrip("@")
    items = run_scraper(c, {"profiles": [handle], "resultsPerPage": n, "profileScrapeSections": ["videos"], "profileSorting": "latest"}, budget)
    rows = []
    for it in items[:n]:
        m = measure(it)
        m["script"] = script_of(it)
        m["words"] = len(m["script"].split())
        m["hook"] = first_line(m["script"]) if m["script"] else ""
        rows.append(m)
    if not rows:
        sys.exit("nothing came back for @" + handle)
    med = statistics.median(r["views"] for r in rows)
    for r in rows:
        r["vs_account_median"] = round(r["views"] / max(med, 1), 2)
    rows.sort(key=lambda r: -r["views"])
    out = os.path.join(DATA, f"profile_{handle}.json")
    jsave(out, {"handle": handle, "pulled": dt.date.today().isoformat(), "median_views": med, "videos": rows})
    print(f"@{handle}: {len(rows)} videos, median {med:,.0f} views, {sum(1 for r in rows if r['script'])} with a script")
    for r in rows:
        print(f"  {r['views']:>10,}  {r['vs_account_median']:>5.1f}x  {r['seconds']:>3}s  {r['words']:>3}w  {(r['hook'] or r['caption'])[:80]}")
    print("saved:", out)


def fresh_variations(cfg, n=5):
    """Ask Claude for n new hook triggers modelled on the best scorers. Needs ANTHROPIC_API_KEY."""
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("keyword engine: no ANTHROPIC_API_KEY set, so no fresh variations this week (the current list is used as is)")
        return []
    import anthropic
    ranked = sorted(cfg["triggers"], key=lambda t: -cfg["scores"].get(t, {}).get("score", 0))
    best = [{"trigger": t, **{k: cfg["scores"].get(t, {}).get(k, 0) for k in ("survivors", "best_ratio", "score")}} for t in ranked[:10]]
    prompt = (
        "We search TikTok for short scripted videos (12-35 seconds, comedy skits and no-face explainers) that got far more views "
        "than their creator has followers, then study how they are built. Each search uses a spoken hook trigger: the first few "
        "words a creator says. Below is how our current triggers scored (survivors = videos that passed a strict filter; "
        "best_ratio = the best views-to-followers ratio found).\n\n"
        f"Scores: {json.dumps(best)}\n\nAll current triggers (do not repeat these): {json.dumps(cfg['triggers'])}\n\n"
        f"Write {n} new triggers likely to surface more such videos: 2-7 words, lowercase, phrased the way people actually open a "
        "video out loud. Lean toward what scored best, vary the angle (student life, being broke, food decisions, confessions, "
        "contrarian claims), and avoid anything that needs a specific brand or person."
    )
    try:
        response = anthropic.Anthropic().beta.messages.create(
            model=MODEL, max_tokens=16000, thinking={"type": "adaptive"},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",       # a declined request is retried on a fallback model
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": {
                "type": "object", "properties": {"triggers": {"type": "array", "items": {"type": "string"}}},
                "required": ["triggers"], "additionalProperties": False}}},
            messages=[{"role": "user", "content": prompt}])
    except anthropic.AuthenticationError:
        print("keyword engine: the Anthropic API key was rejected")
        return []
    except anthropic.RateLimitError:
        print("keyword engine: rate limited, try again later")
        return []
    except anthropic.APIStatusError as e:
        print(f"keyword engine: API error {e.status_code}: {e.message}")
        return []
    except anthropic.APIConnectionError:
        print("keyword engine: can't reach the Anthropic API")
        return []
    if response.stop_reason == "refusal":
        print("keyword engine: the request was declined")
        return []
    text = next((b.text for b in response.content if b.type == "text"), "{}")
    new = [t.strip().lower() for t in json.loads(text).get("triggers", []) if t.strip() and t.strip().lower() not in cfg["triggers"]][:n]
    cfg["triggers"] += new
    cfg["generated"].append({"date": dt.date.today().isoformat(), "triggers": new})
    week = dt.date.today().isocalendar()
    cfg["refreshed_week"] = [week[0], week[1]]
    jsave(CONFIG, cfg)
    print("keyword engine: added", new)
    return new


def keywords(refresh):
    cfg = config()
    if refresh:
        fresh_variations(cfg)
    print(f"{'trigger':<46} runs  results  survivors  best ratio  score")
    for t in sorted(cfg["triggers"], key=lambda t: -cfg["scores"].get(t, {}).get("score", 0)):
        s = cfg["scores"].get(t, {})
        print(f"{t:<46} {s.get('runs', 0):>4}  {s.get('results', 0):>7}  {s.get('survivors', 0):>9}  {s.get('best_ratio', 0):>10.0f}  {s.get('score', 0):>5.2f}")
    if not os.path.exists(CONFIG):
        jsave(CONFIG, cfg)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hunt", help="search the triggers, filter, save weekly_formats.json")
    h.add_argument("--budget", type=float, default=0.9, help="most this run may cost, in USD")
    h.add_argument("--per", type=int, default=20, help="results per trigger")
    h.add_argument("--triggers", type=int, default=12, help="how many triggers to search (best scorers first)")
    p = sub.add_parser("profile", help="one account's newest videos with scripts, unfiltered")
    p.add_argument("handle")
    p.add_argument("--n", type=int, default=20)
    p.add_argument("--budget", type=float, default=0.15)
    k = sub.add_parser("keywords", help="show the triggers and their scores")
    k.add_argument("--refresh", action="store_true", help="ask Claude for 5 fresh variations now")
    sub.add_parser("budget", help="what the Apify plan has left this cycle")
    a = ap.parse_args()
    if a.cmd == "hunt":
        hunt(a.budget, a.per, a.triggers)
    elif a.cmd == "profile":
        profile(a.handle, a.n, a.budget)
    elif a.cmd == "keywords":
        keywords(a.refresh)
    else:
        left, end = remaining_usd()
        print(f"Apify: ${left:.2f} left until {str(end)[:10]}")
