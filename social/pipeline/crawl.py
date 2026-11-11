#!/usr/bin/env python3
"""The signals crawler: better data for the video lab.

    python crawl.py record [date ...]   save rendered video lengths to lab/videos.jsonl (all batches if no date)
    python crawl.py youtube [--dry] [--weekly]   crawl short-form videos in SavorScout's niche (YouTube
                                        Data API); --weekly skips it if the last crawl is under 7 days old
    python crawl.py tiktok [--weekly]   public TikTok videos in the niche, through an Apify actor
    python crawl.py weekly              both crawls if due (each skips quietly without its key), then learn
    python crawl.py niche               learn what works in the niche -> lab/niche.json
                                        (crawl.py youtube --weekly --and-learn does both)
    python crawl.py status              what has been collected so far
    python crawl.py sync up|down        save / restore the private lab data (lab/crawl/, review strips) in
                                        a named Apify store, so a container restart doesn't lose it

SOURCES
- Our own videos. The render manifests give each video's exact length, so the
  lab can learn completion rate (average watch / length), the number TikTok
  leans on most, instead of raw seconds watched.
- Short-form videos in our niche, from the official YouTube Data API v3:
  college rankings, campus food, "which college", rivalries, guess-games, food
  rankings. For each: title, length, views, likes, comments, age, and the
  channel's size and average views, so a video can be judged against its own
  channel ("did this hook beat this channel's normal?") rather than against
  channels with ten times the audience.
- Public TikTok videos in the niche, through an Apify actor (the owner's
  choice; Apify runs it on its own servers and never uses SavorScout's TikTok
  login). TikTok's terms forbid scraping, so this is a gray area rather than
  clearly allowed; the guardrails below keep it small and impersonal. The
  actor, hashtags and budget are set in lab/crawl-config.json.

RULES
- Public video numbers only. No comments and no viewer data. A creator's
  handle is stored only as a short one-way code (to group their videos),
  with their follower count; nothing else about them. (Competitor accounts
  the owner chooses to follow are the exception: compete.py names them.)
- Footage is downloaded only to be measured (vision.py) and reduced to one
  small frame strip for the weekly review; the file is deleted right after,
  Apify's copy too. Nothing of anyone else's is reused in our videos.
- Raw API responses and strips live in git-ignored folders (lab/crawl/,
  out/review/strips/) and are deleted after 30 days, as YouTube's API
  policies require. Only the learned, aggregate findings are committed.
- Keys are never in this code or the repo: they sit in the cloud environment's
  network secrets (www.googleapis.com, header X-Goog-Api-Key; api.apify.com,
  Authorization: Bearer) and the proxy adds them to each request.
- Apify's free plan is $5 of usage a month. Before each run the crawler reads
  Apify's own meter and splits what's left over the weeks left in the cycle:
  competitor tracking (compete.py, ~$0.20 a week) goes first, the niche search
  gets the rest (up to tiktok_max_results), and the last $0.25 is never spent.
- Quota: a search costs 100 units, a video or channel lookup 1 unit per 50.
  The free daily quota is 10,000 units; a full crawl (each search run twice,
  most-viewed and newest, so the data includes flops as well as hits) uses
  about 4,700."""

import datetime as dt
import hashlib
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
LAB = os.path.join(SOCIAL, "lab")
CRAWL = os.path.join(LAB, "crawl")
STRIPS = os.path.join(SOCIAL, "out", "review", "strips")   # frame strips for the weekly review (git-ignored)
API = "https://www.googleapis.com/youtube/v3/"
KEEP_DAYS = 30

QUERIES = [
    "which college has the best food", "college food ranking", "ranking colleges", "college ranking",
    "campus food tour", "college town food", "dining hall ranking", "dining hall review",
    "best food near campus", "college rivalry", "guess the college", "guess the university",
    "college students food", "food street", "ranking fast food", "food tier list", "every restaurant ranked",
    "university ranking", "big ten schools", "sec schools", "ivy league", "college town", "college student budget food",
]

FAMOUS = ["harvard", "stanford", "mit", "yale", "princeton", "columbia", "nyu", "ucla", "usc", "berkeley",
          "michigan", "ohio state", "alabama", "texas", "florida", "notre dame", "duke", "unc", "penn state",
          "georgia", "lsu", "clemson", "oregon", "auburn", "texas a&m", "cornell", "brown", "dartmouth", "upenn",
          "northwestern", "georgetown", "vanderbilt", "uchicago", "caltech", "johns hopkins"]

# Hook and format traits read from a title, with a plain-English name for the report.
TRAITS = [
    ("question", r"\?|^(which|what|who|where|how|why|can|do|does|is|are|would)\b", "asks a question"),
    ("superlative", r"\b(most|best|worst|least|top|biggest|cheapest|hardest|easiest|richest|craziest)\b", "a superlative (most, best, worst)"),
    ("ranking", r"\b(rank(ed|ing|s)?|tier list|top \d+|#\d+|number \d+)\b", "says it's a ranking or tier list"),
    ("number", r"\d", "has a number"),
    ("college", r"\b(college|university|campus|dorm|dining hall|freshman|student)s?\b", "about college or campus"),
    ("famous", r"\b(" + "|".join(re.escape(n) for n in FAMOUS) + r")\b", "names a famous school"),
    ("surprise", r"\b(not|isn't|wasn't|never|nobody|no one|wrong|actually|surprising|shocking|didn't|won't)\b", "a surprise or upset ('it's not...')"),
    ("guess", r"\b(guess|quiz|can you)\b", "a guessing game"),
    ("versus", r"\b(vs\.?|versus)\b", "a head-to-head ('X vs Y')"),
    ("part2", r"\bpart\s*(2|two|ii)\b", "a part 2"),
    ("pov", r"\bpov\b", "a POV hook"),
    ("you", r"\b(you|your)\b", "talks to 'you'"),
    ("food", r"\b(food|eat|eating|restaurant|pizza|burger|taco|sushi|ramen|chicken|coffee|boba|dining)\b", "about food"),
]
DURATIONS = [("dur_le20", 0, 20, "20 seconds or less"), ("dur_20_40", 20, 40, "20 to 40 seconds"),
             ("dur_over60", 60, 10_000, "over a minute")]   # baseline: 40 to 60 seconds, the most common
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")


def jload(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def jsave(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")


# ---- our own videos: exact lengths ------------------------------------------------

def record(dates=None):
    """Length of every rendered video, from out/batches/<date>/manifest.json."""
    path = os.path.join(LAB, "videos.jsonl")
    have = {}
    if os.path.exists(path):
        for line in open(path):
            if line.strip():
                r = json.loads(line)
                have[r["id"]] = r
    root = os.path.join(SOCIAL, "out", "batches")
    dates = dates or (sorted(os.listdir(root)) if os.path.isdir(root) else [])
    added = 0
    for d in dates:
        m = jload(os.path.join(root, d, "manifest.json"))
        if not m:
            continue
        vids = m if isinstance(m, list) else m.get("videos", m)
        items = vids.items() if isinstance(vids, dict) else [(v.get("id"), v) for v in vids]
        for vid, v in items:
            if not isinstance(v, dict):
                continue
            scenes = (v.get("props") or {}).get("scenes") or []
            if not scenes:
                continue
            secs = round((scenes[-1]["from"] + scenes[-1]["dur"]) / 30, 1)
            if have.get(vid, {}).get("duration_s") != secs:
                have[vid] = {"id": vid, "date": d[:10], "duration_s": secs}
                added += 1
    os.makedirs(LAB, exist_ok=True)
    with open(path, "w") as f:
        for r in sorted(have.values(), key=lambda r: (r["date"], r["id"])):
            f.write(json.dumps(r) + "\n")
    print(f"video lengths: {len(have)} known, {added} new or changed")


def durations():
    path = os.path.join(LAB, "videos.jsonl")
    out = {}
    if os.path.exists(path):
        for line in open(path):
            if line.strip():
                r = json.loads(line)
                out[r["id"]] = r["duration_s"]
    return out


# ---- YouTube ----------------------------------------------------------------------

class NoAccess(Exception):
    pass


def yt(endpoint, params):
    url = API + endpoint + "?" + urllib.parse.urlencode(params)
    # The proxy replaces this placeholder with the key saved in the environment's network secrets.
    req = urllib.request.Request(url, headers={"X-Goog-Api-Key": os.environ.get("YOUTUBE_API_KEY", "placeholder")})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        if e.code in (400, 401, 403):
            raise NoAccess(f"YouTube API refused the request ({e.code}): {body}")
        raise
    except urllib.error.URLError as e:
        raise NoAccess(f"can't reach www.googleapis.com ({e.reason}): add the host and key to the environment")


def iso_seconds(d):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
    if not m:
        return None
    days, h, mi, s = (int(x or 0) for x in m.groups())
    return days * 86400 + h * 3600 + mi * 60 + s


def chunks(xs, n=50):
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def crawl_youtube(dry=False, weekly=False):
    if weekly and os.path.isdir(CRAWL):
        recent = (dt.date.today() - dt.timedelta(days=7)).isoformat()
        if any(re.match(r"youtube-(\d{4}-\d{2}-\d{2})", n) and n[8:18] >= recent for n in os.listdir(CRAWL)):
            print("youtube: crawled within the last 7 days; skipping (drop --weekly to force)")
            return False
    cfg = jload(os.path.join(LAB, "crawl-config.json"), {})
    queries = cfg.get("queries", QUERIES)
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=cfg.get("since_days", 120))).strftime("%Y-%m-%dT%H:%M:%SZ")
    if dry:
        print(f"would search {len(queries)} queries twice, most-viewed and newest (~{200 * len(queries) + 4 * len(queries)} quota units):")
        print("  " + "\n  ".join(queries))
        return
    found = {}
    # Two passes per search: the most-viewed, and simply the newest. Sorting by views alone
    # would show mostly hits, and you can't learn what works without the flops.
    for q in queries:
        for order in ("viewCount", "date"):
            res = yt("search", {"part": "snippet", "type": "video", "videoDuration": "short", "q": q, "maxResults": 50,
                                "order": order, "publishedAfter": since, "regionCode": "US", "relevanceLanguage": "en"})
            for it in res.get("items", []):
                vid = it.get("id", {}).get("videoId")
                if vid and vid not in found:
                    found[vid] = q
    videos, channels = [], {}
    for ids in chunks(list(found)):
        res = yt("videos", {"part": "snippet,contentDetails,statistics", "id": ",".join(ids)})
        videos.extend(res.get("items", []))
    for ids in chunks(sorted({v["snippet"]["channelId"] for v in videos})):
        res = yt("channels", {"part": "statistics", "id": ",".join(ids)})
        for c in res.get("items", []):
            channels[c["id"]] = c.get("statistics", {})
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    rows = []
    for v in videos:
        sn, st, cd = v.get("snippet", {}), v.get("statistics", {}), v.get("contentDetails", {})
        ch = channels.get(sn.get("channelId"), {})
        secs = iso_seconds(cd.get("duration"))
        if secs is None or secs > 180:
            continue
        rows.append({"id": v["id"], "q": found.get(v["id"]), "title": sn.get("title", ""),
                     "tags": " ".join(re.findall(r"#\w+", sn.get("description", "")))[:200],
                     "channel": sn.get("channelId"), "published": sn.get("publishedAt"), "duration_s": secs,
                     "views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0) or 0),
                     "comments": int(st.get("commentCount", 0) or 0),
                     "ch_subs": int(ch.get("subscriberCount", 0) or 0), "ch_views": int(ch.get("viewCount", 0) or 0),
                     "ch_videos": int(ch.get("videoCount", 0) or 0), "crawled": now})
    os.makedirs(CRAWL, exist_ok=True)
    out = os.path.join(CRAWL, f"youtube-{now[:10]}.jsonl")
    with open(out, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    purge()
    print(f"youtube: {len(rows)} short videos from {len({r['channel'] for r in rows})} channels -> {out}")
    return True


def purge():
    if not os.path.isdir(CRAWL):
        return
    cutoff = (dt.date.today() - dt.timedelta(days=KEEP_DAYS)).isoformat()
    for name in os.listdir(CRAWL):
        m = re.match(r"[a-z-]+-(\d{4}-\d{2}-\d{2})(?:-\d+)?\.jsonl$", name)   # vision.jsonl holds numbers only
        if m and m.group(1) < cutoff:
            os.remove(os.path.join(CRAWL, name))
    if os.path.isdir(STRIPS):
        old = dt.datetime.now().timestamp() - KEEP_DAYS * 86400
        for name in os.listdir(STRIPS):
            if os.path.getmtime(os.path.join(STRIPS, name)) < old:
                os.remove(os.path.join(STRIPS, name))


def load_youtube(prefix="youtube"):
    """Latest record per video across the kept crawls."""
    best = {}
    if os.path.isdir(CRAWL):
        for name in sorted(os.listdir(CRAWL)):
            if name.startswith(prefix + "-") and name.endswith(".jsonl"):
                for line in open(os.path.join(CRAWL, name)):
                    if line.strip():
                        r = json.loads(line)
                        best[r["id"]] = r
    return list(best.values())


# ---- TikTok, through Apify ----------------------------------------------------------

TIKTOK_DEFAULTS = {
    "tiktok_actor": "clockworks~free-tiktok-scraper",   # priced per result: $0.003, +$0.0013 per add-on
    # All food short-form, searched within the last 3 months and sorted by most liked: recent, proven
    # videos rather than all-time hashtag hits. Six topics a week, rotating through the list.
    "tiktok_queries": ["food ranking", "best food in", "restaurant review", "fast food review", "street food",
                       "food tier list", "cheap eats", "must try food", "hidden gem restaurant", "best pizza",
                       "best burger", "taco tour", "ramen review", "sushi review", "dessert ranking",
                       "food facts", "food spots", "rating every", "college food", "dining hall",
                       "late night food", "food map", "best restaurants in", "food challenge"],
    "tiktok_queries_per_week": 6,
    "tiktok_max_results": 100,          # ~$0.69 a week with the date filter, sorting and video download
    "tiktok_download_videos": True,     # for footage analysis; each file is deleted right after it's measured
}


def apify(actor, payload, timeout=300):
    url = (f"https://api.apify.com/v2/acts/{urllib.parse.quote(actor, safe='~')}/run-sync-get-dataset-items"
           f"?timeout={timeout}&clean=true&format=json")
    # The proxy replaces this placeholder with the token saved in the environment's network secrets.
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + os.environ.get("APIFY_TOKEN", "placeholder")})
    try:
        with urllib.request.urlopen(req, timeout=timeout + 60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        if e.code in (400, 401, 402, 403, 404):
            raise NoAccess(f"Apify refused the run ({e.code}): {body}")
        raise
    except urllib.error.URLError as e:
        raise NoAccess(f"can't reach api.apify.com ({e.reason}): add the Apify token to the environment")


def dig(obj, path):
    for k in path.split("."):
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj


def first(item, *paths, default=None):
    for p in paths:
        v = dig(item, p)
        if v not in (None, ""):
            return v
    return default


def parse_tiktok(item, source):
    """One public TikTok video, keeping only what the analysis needs (actors name fields differently)."""
    vid = first(item, "id", "videoId", "aweme_id")
    plays = first(item, "playCount", "stats.playCount", "statistics.playCount", "views")
    if not vid or plays is None:
        return None
    # Ads and sponsored posts are paid reach; slideshows aren't videos; pinned posts are chosen hits.
    if any(item.get(k) is True for k in ("isAd", "isSponsored", "isSlideshow", "isPinned")):
        return None
    created = first(item, "createTimeISO", "createTime", "create_time")
    if isinstance(created, (int, float)) or (isinstance(created, str) and created.isdigit()):
        created = dt.datetime.fromtimestamp(int(created), dt.timezone.utc).isoformat()
    tags = first(item, "hashtags", "challenges", default=[]) or []
    tags = [t.get("name") or t.get("title") if isinstance(t, dict) else str(t) for t in tags]
    author = str(first(item, "authorMeta.name", "author.uniqueId", "authorMeta.id", "author.id", default=""))
    music_original = first(item, "musicMeta.musicOriginal", "music.original")
    return {"id": str(vid), "source": source, "text": str(first(item, "text", "desc", "description", default=""))[:300],
            "tags": " ".join(f"#{t}" for t in tags if t)[:200],
            "duration_s": first(item, "videoMeta.duration", "video.duration", "duration"),
            "plays": int(plays), "likes": int(first(item, "diggCount", "stats.diggCount", "likes", default=0) or 0),
            "shares": int(first(item, "shareCount", "stats.shareCount", "shares", default=0) or 0),
            "comments": int(first(item, "commentCount", "stats.commentCount", "comments", default=0) or 0),
            "saves": int(first(item, "collectCount", "stats.collectCount", "saves", default=0) or 0),
            "created": created, "followers": int(first(item, "authorMeta.fans", "author.followerCount",
                                                         "authorStats.followerCount", default=0) or 0),
            "author": hashlib.sha1(author.encode()).hexdigest()[:12] if author else None,
            "music_original": music_original if isinstance(music_original, bool) else None,
            "music": str(first(item, "musicMeta.musicName", "music.title", default=""))[:80],
            "crawled": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}


def due(prefix, days=7):
    if not os.path.isdir(CRAWL):
        return True
    recent = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    return not any(n.startswith(prefix + "-") and n[len(prefix) + 1:len(prefix) + 11] >= recent for n in os.listdir(CRAWL))


def apify_async(actor, payload, max_wait=1500, max_usd=None):
    """Start a run, wait for it, return its items: long runs (video downloads) outlast one HTTP request.
    max_usd caps what Apify may charge for the run (it stops there), on top of the budget check."""
    import time
    url = f"https://api.apify.com/v2/acts/{urllib.parse.quote(actor, safe='~')}/runs"
    if max_usd is not None:
        url += f"?maxTotalChargeUsd={max(0.01, round(max_usd, 2))}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer placeholder"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            run = json.load(r)["data"]
    except urllib.error.HTTPError as e:
        raise NoAccess(f"Apify refused the run ({e.code}): {e.read().decode('utf-8', 'replace')[:300]}")
    except urllib.error.URLError as e:
        raise NoAccess(f"can't reach api.apify.com ({e.reason})")
    start = time.time()
    while run["status"] in ("READY", "RUNNING") and time.time() - start < max_wait:
        time.sleep(15)
        run = apify_get(f"https://api.apify.com/v2/actor-runs/{run['id']}")["data"]
    if run["status"] != "SUCCEEDED":
        raise NoAccess(f"Apify run {run['id']} ended {run['status']}")
    items = apify_get(f"https://api.apify.com/v2/datasets/{run['defaultDatasetId']}/items?clean=true&format=json")
    print(f"apify run {run['id']}: {len(items)} items, ${run.get('usageTotalUsd') or 0:.2f}")
    return items


RESERVE_USD = 0.25        # never spend the last 25 cents: a run that hits the cap stops halfway
COMPETE_WEEKLY_USD = 0.20 # what competitor tracking (compete.py) needs a week; it goes first
SEARCH_RESULT_USD = 0.008 # one niche search result: $0.003 + date filter, sorting, download ($0.0013 each) + transfer


def apify_budget():
    """(dollars left in this billing cycle, weeks left in it) from Apify's own meter, or (None, None)."""
    try:
        d = apify_get("https://api.apify.com/v2/users/me/limits")["data"]
        left = float(d["limits"]["maxMonthlyUsageUsd"]) - float(d["current"]["monthlyUsageUsd"])
        end = dt.datetime.fromisoformat(d["monthlyUsageCycle"]["endAt"].replace("Z", "+00:00"))
        weeks = max(1, math.ceil((end - dt.datetime.now(dt.timezone.utc)).total_seconds() / (7 * 86400)))
        return left, weeks
    except Exception:
        return None, None


def spendable(kind):
    """What a run of this kind may spend now: what's left, spread over the weeks left in the cycle.
    Competitor tracking comes first; the niche search gets the rest of the week's share."""
    left, weeks = apify_budget()
    if left is None:
        return None
    week = (left - RESERVE_USD) / weeks
    if kind == "compete":
        return max(0.0, min(left - RESERVE_USD, week + 0.10))
    return max(0.0, min(left - RESERVE_USD - COMPETE_WEEKLY_USD, week - COMPETE_WEEKLY_USD))


STORE = "savorscout-lab"   # a private, named key-value store in the owner's Apify account


def sync(direction):
    """Keep the private lab data (lab/crawl/ and the review strips) in a named Apify key-value store, so
    a container restart doesn't wipe the history the labs learn from. It never goes into git.
    'down' restores what's missing (and merges .jsonl files line by line); 'up' saves everything."""
    import io
    import tarfile
    req = urllib.request.Request(f"https://api.apify.com/v2/key-value-stores?name={STORE}", method="POST",
                                 headers={"Authorization": "Bearer placeholder"})
    with urllib.request.urlopen(req, timeout=60) as r:
        url = f"https://api.apify.com/v2/key-value-stores/{json.load(r)['data']['id']}/records/lab-data.tgz"
    if direction == "up":
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for root in (CRAWL, STRIPS):
                if os.path.isdir(root):
                    tar.add(root, arcname=os.path.relpath(root, SOCIAL))
        req = urllib.request.Request(url, data=buf.getvalue(), method="PUT",
                                     headers={"Authorization": "Bearer placeholder", "Content-Type": "application/gzip"})
        urllib.request.urlopen(req, timeout=300).close()
        print(f"sync: saved {len(buf.getvalue()) / 1e6:.1f} MB of lab data to the private Apify store '{STORE}'")
        return
    try:
        data = apify_get(url, raw=True)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("sync: nothing saved yet")
            return
        raise
    restored = merged = 0
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        for m in tar.getmembers():
            name = m.name.replace("\\", "/")
            if not m.isfile() or ".." in name.split("/") or name.startswith("/") or \
                    not (name.startswith("lab/crawl/") or name.startswith("out/review/strips/")):
                continue
            dest = os.path.join(SOCIAL, name)
            blob = tar.extractfile(m).read()
            if not os.path.exists(dest):
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(blob)
                restored += 1
            elif dest.endswith(".jsonl"):        # union of lines: saved first, then anything only local
                saved = [l for l in blob.decode("utf-8").splitlines() if l.strip()]
                local = [l for l in open(dest, encoding="utf-8").read().splitlines() if l.strip()]
                seen = set(saved)
                combined = saved + [l for l in local if l not in seen]
                if combined != local:
                    with open(dest, "w", encoding="utf-8") as f:
                        f.write("\n".join(combined) + "\n")
                    merged += 1
    print(f"sync: restored {restored} files, merged {merged} from the private Apify store '{STORE}'")


def apify_get(url, raw=False):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer placeholder"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read() if raw else json.load(r)


def crawl_tiktok(weekly=False):
    if weekly and not due("tiktok"):
        print("tiktok: crawled within the last 7 days; skipping")
        return False
    cfg = {**TIKTOK_DEFAULTS, **jload(os.path.join(LAB, "crawl-config.json"), {})}
    qs, k = cfg["tiktok_queries"], cfg["tiktok_queries_per_week"]
    week = dt.date.today().isocalendar()[1]
    queries = [qs[(week * k + i) % len(qs)] for i in range(k)]
    cap, budget = cfg["tiktok_max_results"], spendable("search")
    if budget is not None:
        cap = min(cap, int(budget / SEARCH_RESULT_USD))
        if cap < 30:
            print(f"tiktok: skipped this week to stay inside Apify's monthly budget (${budget:.2f} spendable)")
            return False
    per = max(1, cap // len(queries))
    print(f"tiktok: searching {', '.join(queries)} ({per} each" + (f", ${budget:.2f} spendable)" if budget is not None else ")"))
    items = apify_async(cfg["tiktok_actor"], {
        "searchQueries": queries, "searchSection": "/video", "videoSearchSorting": "MOST_LIKED",
        "videoSearchDateFilter": "LAST_3_MONTHS", "resultsPerPage": per,
        "shouldDownloadVideos": bool(cfg["tiktok_download_videos"]), "shouldDownloadCovers": False,
        "shouldDownloadSlideshowImages": False, "shouldDownloadAvatars": False,
        "downloadSubtitlesOptions": "NEVER_DOWNLOAD_SUBTITLES"}, max_usd=budget)
    if not isinstance(items, list):
        raise NoAccess(f"unexpected Apify response: {str(items)[:200]}")
    if items:
        print("first item's fields (check the parser matches this actor):", ", ".join(sorted(items[0])[:40]))
    rows, seen, media = [], set(), {}
    for it in items[:cap]:
        r = parse_tiktok(it, "search")
        if r and r["id"] not in seen:
            seen.add(r["id"])
            r["lang"] = it.get("textLanguage")
            rows.append(r)
            urls = it.get("mediaUrls") or []
            # Footage only for videos the analysis can use (Lab v2 looks at 6-180 s).
            if urls and str(urls[0]).startswith("https://api.apify.com/") and 6 <= float(r["duration_s"] or 0) <= 180:
                media[r["id"]] = urls[0]
    os.makedirs(CRAWL, exist_ok=True)
    out = os.path.join(CRAWL, f"tiktok-{dt.datetime.now().strftime('%Y-%m-%d-%H%M')}.jsonl")
    with open(out, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    purge()
    missing = sum(1 for r in rows if not r["duration_s"] or not r["created"])
    print(f"tiktok: {len(rows)} videos -> {out}" + (f" ({missing} missing length or date)" if missing else ""))
    if media:
        analyze_footage(media, strips=True)
    return True


def _analyze_one(args):
    """Download one video, measure it, keep a frame strip for the review, delete the file.
    Only the numbers (and the small strip, for 30 days) survive."""
    vid, url, strip_path, measure = args
    import tempfile
    import vision
    path = os.path.join(tempfile.gettempdir(), f"lab-{vid}.mp4")
    try:
        with open(path, "wb") as f:
            f.write(apify_get(url, raw=True))
        feats = vision.analyze(path) if measure else {}
        feats.pop("hook_text", None)        # keep word counts, not other people's words
        if strip_path:
            try:
                vision.strip(path, strip_path)
                feats["strip"] = os.path.relpath(strip_path, SOCIAL)
            except Exception as e:
                feats["strip_error"] = str(e)[:120]
        return vid, feats
    except Exception as e:                   # one bad file shouldn't stop the batch
        return vid, {"error": str(e)[:200]}
    finally:
        if os.path.exists(path):
            os.remove(path)
        try:                                 # and drop Apify's copy too
            urllib.request.urlopen(urllib.request.Request(url, method="DELETE",
                                   headers={"Authorization": "Bearer placeholder"}), timeout=30).close()
        except Exception:
            pass


def recent_urls(ids, runs=15):
    """Public URLs of videos in Apify's retained datasets (kept 7 days), to re-fetch their footage.
    The crawl files don't store URLs (they'd name the creator)."""
    want, out = {str(i) for i in ids}, {}
    actor = {**TIKTOK_DEFAULTS, **jload(os.path.join(LAB, "crawl-config.json"), {})}["tiktok_actor"]
    for run in apify_get(f"https://api.apify.com/v2/acts/{actor}/runs?desc=1&limit={runs}")["data"]["items"]:
        if run["status"] != "SUCCEEDED" or not want - set(out):
            continue
        try:
            items = apify_get(f"https://api.apify.com/v2/datasets/{run['defaultDatasetId']}/items?clean=true&format=json&fields=id,webVideoUrl")
        except Exception:
            continue
        for it in items:
            if str(it.get("id")) in want and it.get("webVideoUrl"):
                out[str(it["id"])] = it["webVideoUrl"]
    return out


def resume_footage():
    """Measure the footage of the latest Apify run's videos that haven't been measured yet (recovery)."""
    cfg = {**TIKTOK_DEFAULTS, **jload(os.path.join(LAB, "crawl-config.json"), {})}
    run = apify_get(f"https://api.apify.com/v2/acts/{cfg['tiktok_actor']}/runs?desc=1&limit=1")["data"]["items"][0]
    items = apify_get(f"https://api.apify.com/v2/datasets/{run['defaultDatasetId']}/items?clean=true&format=json")
    media = {}
    for it in items:
        r = parse_tiktok(it, "search")
        urls = it.get("mediaUrls") or []
        if r and urls and str(urls[0]).startswith("https://api.apify.com/") and 6 <= float(r["duration_s"] or 0) <= 180:
            media[r["id"]] = urls[0]
    analyze_footage(media, strips=True)


def vision_rows():
    """Everything known about each fetched video. Later rows add to earlier ones (a strip, spoken-caption
    numbers, a re-measurement); a failed attempt never hides a good measurement. A row counts as
    measured only if it has duration_s."""
    out, path = {}, os.path.join(CRAWL, "vision.jsonl")
    if os.path.exists(path):
        for line in open(path):
            if line.strip():
                d = json.loads(line)
                prev = out.get(d["id"], {})
                if "error" in d:
                    out[d["id"]] = prev or d
                else:
                    out[d["id"]] = {**{k: v for k, v in prev.items() if k != "error"}, **d}
    return out


def analyze_footage(media, workers=3, strips=False):
    """Measure each video once; with strips=True also keep a frame strip (re-fetched videos that were
    measured before only get the strip)."""
    from concurrent.futures import ProcessPoolExecutor
    path = os.path.join(CRAWL, "vision.jsonl")
    have = {k: v for k, v in vision_rows().items() if v.get("duration_s")}
    todo = []
    for v, u in media.items():
        sp = os.path.join(STRIPS, f"{v}.jpg") if strips else None
        need_measure = v not in have
        need_strip = bool(sp) and not os.path.exists(sp)
        if need_measure or need_strip:
            todo.append((v, u, sp if need_strip else None, need_measure))
    print(f"footage: {len(todo)} videos to fetch ({workers} at a time; each file deleted after)")
    ok = 0
    os.makedirs(CRAWL, exist_ok=True)
    with ProcessPoolExecutor(workers) as ex, open(path, "a") as out:
        for vid, feats in ex.map(_analyze_one, todo):
            out.write(json.dumps({"id": vid, "analyzed": dt.date.today().isoformat(), **feats}) + "\n")
            ok += "error" not in feats
    print(f"footage: {ok} of {len(todo)} done -> {path}" + (f" (strips in {STRIPS})" if strips else ""))


# ---- what works in the niche ------------------------------------------------------

def traits_of(r):
    text = f"{r['title']} {r.get('tags', '')}".lower()
    f = {name: 1.0 if re.search(rx, text) else 0.0 for name, rx, _ in TRAITS}
    f["emoji"] = 1.0 if EMOJI.search(r["title"]) else 0.0
    f["title_words"] = float(len(r["title"].split()))
    for name, lo, hi, _ in DURATIONS:
        f[name] = 1.0 if lo < r["duration_s"] <= hi else 0.0
    return f


def bayes(X, y, prior_sd):
    P = np.diag(1 / prior_sd ** 2)
    s2 = float(np.var(y)) or 1.0
    for _ in range(6):
        S = np.linalg.inv(X.T @ X / s2 + P)
        mu = S @ X.T @ y / s2
        resid = y - X @ mu
        dof = max(1.0, len(y) - float(np.trace(X @ S @ X.T)) / s2)
        s2 = max(0.05, float(resid @ resid) / dof)
    return mu, S


def platform_rows(platform):
    """Rows in one shape for both platforms: text, length, outcome y, and controls (age, size)."""
    now = dt.datetime.now(dt.timezone.utc)

    def age(iso):
        return max(1.0, (now - dt.datetime.fromisoformat(str(iso).replace("Z", "+00:00"))).days)
    rows = []
    if platform == "youtube":
        for r in load_youtube("youtube"):
            if r["views"] > 0 and r["ch_videos"] > 0 and r["ch_views"] > 0:
                # Views against the channel's own average: did this video beat its channel's normal?
                rows.append({"text": f"{r['title']} {r.get('tags', '')}", "title": r["title"], "duration_s": r["duration_s"],
                             "y": math.log1p(r["views"]) - math.log1p(r["ch_views"] / r["ch_videos"]),
                             "age": age(r["published"]), "size": r["ch_subs"], "group": r["channel"],
                             "views": r["views"], "extra": {}})
    else:
        for r in load_youtube("tiktok"):
            if r.get("plays") and r.get("duration_s") and r.get("created") and r.get("followers") \
                    and float(r["duration_s"]) <= 180:   # longer videos are a different format
                # No per-creator average is public, so views are compared after controlling for followers.
                rows.append({"text": f"{r['text']} {r.get('tags', '')}", "title": r["text"], "duration_s": float(r["duration_s"]),
                             "y": math.log1p(r["plays"]), "age": age(r["created"]), "size": r.get("followers", 0),
                             "group": r.get("author"), "views": r["plays"],
                             "extra": {"original_sound": 1.0 if r.get("music_original") else 0.0,
                                       "hashtags_n": float(len(r.get("tags", "").split()))}})
    return rows


def fit_platform(rows, extra_names):
    names = [n for n, _, _ in TRAITS] + ["emoji", "title_words"] + [n for n, *_ in DURATIONS] + extra_names
    says = {n: s for n, _, s in TRAITS} | {"emoji": "an emoji in the caption", "title_words": "one more word in the caption",
                                            "original_sound": "an original sound (vs. a song)",
                                            "hashtags_n": "one more hashtag"} \
        | {n: f"lasting {s} (vs. 40-60 seconds)" for n, _, _, s in DURATIONS}
    F = []
    for r in rows:
        t = traits_of({"title": r["title"], "tags": r["text"][len(r["title"]):], "duration_s": r["duration_s"]})
        t.update(r["extra"])
        F.append([t.get(n, 0.0) for n in names])
    F = np.array(F, dtype=float)
    for n in ("title_words", "hashtags_n"):
        if n in names:
            j = names.index(n)
            F[:, j] -= F[:, j].mean()
    ctrl = np.column_stack([np.log2([r["age"] for r in rows]), np.log10(np.array([r["size"] for r in rows], dtype=float) + 1)])
    ctrl = (ctrl - ctrl.mean(axis=0)) / (ctrl.std(axis=0) + 1e-9)
    X = np.hstack([np.ones((len(rows), 1)), F, ctrl])
    mu, S = bayes(X, np.array([r["y"] for r in rows]), np.array([10.0] + [0.5] * len(names) + [1.0, 1.0]))
    effects = {}
    for j, n in enumerate(names, start=1):
        b, sd = float(mu[j]), float(math.sqrt(S[j, j]))
        effects[n] = {"says": says[n], "mult": round(math.exp(b), 3), "b": round(b, 4), "sd": round(sd, 4),
                      "z": round(b / sd, 2) if sd else 0.0, "seen": int(np.count_nonzero(F[:, j - 1]))}
    return effects


def niche():
    platforms = {}
    for platform, extra in (("tiktok", ["original_sound", "hashtags_n"]), ("youtube", [])):
        rows = platform_rows(platform)
        if len(rows) < 60:
            if rows:
                print(f"{platform}: only {len(rows)} usable videos, not enough to learn from yet")
            continue
        effects = fit_platform(rows, extra)
        platforms[platform] = {"videos": len(rows), "channels": len({r["group"] for r in rows}), "effects": effects}
        print(f"{platform}: learned from {len(rows)} videos on {platforms[platform]['channels']} accounts")
        for n, e in sorted(effects.items(), key=lambda kv: -abs(kv[1]["z"]))[:8]:
            sure = "clear" if abs(e["z"]) >= 2 else "likely" if abs(e["z"]) >= 1 else "unclear"
            print(f"  x{e['mult']:<5} {e['says']} ({sure}, {e['seen']} videos)")
        top = sorted(rows, key=lambda r: -r["y"])[:5]
        print("  top performers (kept only in the git-ignored crawl cache):")
        for r in top:
            print(f"    {r['views']:>10,} views, {r['duration_s']:.0f}s  {r['title'][:70]}")
    if not platforms:
        sys.exit("not enough crawled videos yet: run `crawl.py weekly` once a key or token is in place")

    def combined(trait, minus=None):
        """Inverse-variance average across platforms: the more certain platform counts for more."""
        num = den = 0.0
        for p in platforms.values():
            e = p["effects"]
            b, v = e[trait]["b"], e[trait]["sd"] ** 2
            if minus:
                b, v = b - e[minus]["b"], v + e[minus]["sd"] ** 2
            num, den = num + b / v, den + 1 / v
        return num / den, math.sqrt(1 / den)
    mapping = {"named_tease": ("surprise", None), "guess": ("guess", None), "rivalry": ("versus", None),
               "part2": ("part2", None), "short": ("dur_le20", "dur_20_40")}   # our short (15-20 s) vs our usual (30-40 s)
    priors = {}
    for k, (trait, minus) in mapping.items():
        b, sd = combined(trait, minus)
        # Widened, so our own results can overrule the niche.
        priors[k] = {"mean": round(b, 4), "sd": round(max(0.35, 2.0 * sd), 4)}
    out = {"date": dt.date.today().isoformat(), "platforms": platforms, "lab_priors": priors,
           "videos": sum(p["videos"] for p in platforms.values()),
           "channels": sum(p["channels"] for p in platforms.values())}
    jsave(os.path.join(LAB, "niche.json"), out)
    print(f"\nlab starting beliefs: " + ", ".join(f"{k} x{math.exp(v['mean']):.2f}" for k, v in priors.items()))


def status():
    ys, ts = load_youtube("youtube"), load_youtube("tiktok")
    n = jload(os.path.join(LAB, "niche.json"), {})
    print(f"own video lengths: {len(durations())}")
    print(f"youtube cache: {len(ys)} videos from {len({r['channel'] for r in ys})} channels")
    print(f"tiktok cache: {len(ts)} videos from {len({r.get('author') for r in ts})} accounts (raw crawls kept {KEEP_DAYS} days)")
    print(f"niche model: {n.get('videos', 0)} videos, learned {n.get('date', 'never')}" if n else "niche model: not yet")


def weekly():
    """Both crawls if they're due; a missing key or token just skips that source. Then learn."""
    try:
        sync("down")                         # after a container restart, bring the history back first
    except Exception as e:
        print(f"sync: skipped ({e})")
    fresh = False
    for name, run in (("youtube", lambda: crawl_youtube(weekly=True)), ("tiktok", lambda: crawl_tiktok(weekly=True))):
        try:
            fresh = bool(run()) or fresh
        except NoAccess as e:
            print(f"{name}: skipped ({e})")
    if fresh:
        niche()
        try:
            sync("up")
        except Exception as e:
            print(f"sync: skipped ({e})")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "record":
        record(a[1:] or None)
    elif a[0] == "youtube":
        try:
            if crawl_youtube(dry="--dry" in a, weekly="--weekly" in a) and "--and-learn" in a:
                niche()
        except NoAccess as e:
            sys.exit(str(e))
    elif a[0] == "tiktok":
        try:
            if crawl_tiktok(weekly="--weekly" in a) and "--and-learn" in a:
                niche()
        except NoAccess as e:
            sys.exit(str(e))
    elif a[0] == "footage":
        resume_footage()
    elif a[0] == "weekly":
        weekly()
    elif a[0] == "niche":
        niche()
    elif a[0] == "status":
        status()
    elif a[0] == "sync" and len(a) > 1 and a[1] in ("up", "down"):
        sync(a[1])
    else:
        sys.exit(__doc__)
