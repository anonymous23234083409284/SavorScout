#!/usr/bin/env python3
"""The signals crawler: better data for the video lab.

    python crawl.py record [date ...]   save rendered video lengths to lab/videos.jsonl (all batches if no date)
    python crawl.py youtube [--dry] [--weekly]   crawl short-form videos in SavorScout's niche (YouTube
                                        Data API); --weekly skips it if the last crawl is under 7 days old
    python crawl.py niche               learn what works in the niche -> lab/niche.json
                                        (crawl.py youtube --weekly --and-learn does both)
    python crawl.py status              what has been collected so far

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
- TikTok is not crawled: its terms forbid scraping, and it has no public data
  API for other creators' videos. YouTube Shorts is the closest stand-in: the
  same vertical format, length and swipe-away behaviour.

RULES
- Public video metadata only. No comments, no viewer data.
- Raw API responses live in lab/crawl/ (git-ignored) and are deleted after 30
  days, as YouTube's API policies require. Only the learned, aggregate findings
  (lab/niche.json) are kept.
- The API key is never in this code or the repo: it sits in the cloud
  environment's network secrets for www.googleapis.com (header X-Goog-Api-Key)
  and the proxy adds it to each request.
- Quota: a search costs 100 units, a video or channel lookup 1 unit per 50.
  The free daily quota is 10,000 units; a full crawl uses about 2,500."""

import datetime as dt
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
        print(f"would search {len(queries)} queries (~{100 * len(queries) + 2 * len(queries)} quota units):")
        print("  " + "\n  ".join(queries))
        return
    found = {}
    for q in queries:
        res = yt("search", {"part": "snippet", "type": "video", "videoDuration": "short", "q": q, "maxResults": 50,
                            "order": "viewCount", "publishedAfter": since, "regionCode": "US", "relevanceLanguage": "en"})
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
        m = re.match(r"youtube-(\d{4}-\d{2}-\d{2})\.jsonl$", name)
        if m and m.group(1) < cutoff:
            os.remove(os.path.join(CRAWL, name))


def load_youtube():
    """Latest record per video across the kept crawls."""
    best = {}
    if os.path.isdir(CRAWL):
        for name in sorted(os.listdir(CRAWL)):
            if name.startswith("youtube-") and name.endswith(".jsonl"):
                for line in open(os.path.join(CRAWL, name)):
                    if line.strip():
                        r = json.loads(line)
                        best[r["id"]] = r
    return list(best.values())


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


def niche():
    rows = [r for r in load_youtube() if r["views"] > 0 and r["ch_videos"] > 0 and r["ch_views"] > 0]
    if len(rows) < 60:
        sys.exit(f"only {len(rows)} usable videos; run `crawl.py youtube` first")
    now = dt.datetime.now(dt.timezone.utc)
    names = [n for n, _, _ in TRAITS] + ["emoji", "title_words"] + [n for n, *_ in DURATIONS]
    says = {n: s for n, _, s in TRAITS} | {"emoji": "an emoji in the title", "title_words": "one more word in the title"} \
        | {n: f"{s} long (vs. 40-60 seconds)" for n, _, _, s in DURATIONS}
    F = np.array([[traits_of(r)[n] for n in names] for r in rows])
    age = np.array([max(1.0, (now - dt.datetime.fromisoformat(r["published"].replace("Z", "+00:00"))).days) for r in rows])
    subs = np.array([r["ch_subs"] for r in rows], dtype=float)
    # Outperformance: views against the channel's own average, controlling for age and size.
    y = np.log1p([r["views"] for r in rows]) - np.log1p([r["ch_views"] / r["ch_videos"] for r in rows])
    ctrl = np.column_stack([np.log2(age), np.log10(subs + 1)])
    ctrl = (ctrl - ctrl.mean(axis=0)) / (ctrl.std(axis=0) + 1e-9)
    wcol = names.index("title_words")
    F[:, wcol] = F[:, wcol] - F[:, wcol].mean()
    X = np.hstack([np.ones((len(rows), 1)), F, ctrl])
    prior = np.array([10.0] + [0.5] * len(names) + [1.0, 1.0])
    mu, S = bayes(X, y, prior)
    effects = {}
    for j, n in enumerate(names, start=1):
        b, sd = float(mu[j]), float(math.sqrt(S[j, j]))
        effects[n] = {"says": says[n], "mult": round(math.exp(b), 3), "b": round(b, 4), "sd": round(sd, 4),
                      "z": round(b / sd, 2) if sd else 0.0, "seen": int(F[:, j - 1].astype(bool).sum())}

    def diff(a, c):
        return {"b": effects[a]["b"] - effects[c]["b"], "sd": math.sqrt(effects[a]["sd"] ** 2 + effects[c]["sd"] ** 2)}
    # Starting beliefs for the lab's matching features (log-views per unit). Widened, so our own data can overrule them.
    mapping = {"named_tease": effects["surprise"], "guess": effects["guess"], "rivalry": effects["versus"],
               "part2": effects["part2"], "short": diff("dur_le20", "dur_20_40")}   # our short (15-20 s) vs our usual (30-40 s)
    priors = {k: {"mean": round(float(v["b"]), 4), "sd": round(max(0.35, 2.0 * float(v["sd"])), 4)} for k, v in mapping.items()}
    out = {"date": now.date().isoformat(), "videos": len(rows), "channels": len({r["channel"] for r in rows}),
           "target": "log views minus log of the channel's average views per video, controlling for age and channel size",
           "effects": effects, "lab_priors": priors}
    jsave(os.path.join(LAB, "niche.json"), out)
    print(f"niche: learned from {len(rows)} videos on {out['channels']} channels\n")
    for n, e in sorted(effects.items(), key=lambda kv: -abs(kv[1]["z"])):
        sure = "clear" if abs(e["z"]) >= 2 else "likely" if abs(e["z"]) >= 1 else "unclear"
        print(f"  x{e['mult']:<5} {e['says']} ({sure}, {e['seen']} videos)")
    top = sorted(rows, key=lambda r: -(math.log1p(r["views"]) - math.log1p(r["ch_views"] / r["ch_videos"])))[:10]
    print("\nbiggest outperformers (kept only in the git-ignored crawl cache):")
    for r in top:
        print(f"  {r['views']:>10,} views, {r['views'] / (r['ch_views'] / r['ch_videos']):5.1f}x channel avg, {r['duration_s']}s  {r['title'][:80]}")


def status():
    ys = load_youtube()
    n = niche_info = jload(os.path.join(LAB, "niche.json"), {})
    print(f"own video lengths: {len(durations())}")
    print(f"youtube cache: {len(ys)} videos from {len({r['channel'] for r in ys})} channels "
          f"(oldest crawl kept {KEEP_DAYS} days)")
    print(f"niche model: {n.get('videos', 0)} videos, learned {n.get('date', 'never')}" if niche_info else "niche model: not yet")


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
    elif a[0] == "niche":
        niche()
    elif a[0] == "status":
        status()
    else:
        sys.exit(__doc__)
