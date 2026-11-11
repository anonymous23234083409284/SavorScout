#!/usr/bin/env python3
"""Competitor tracking: what works and what flops for the TikTok accounts closest to ours.

    python compete.py discover ["q"..]  search our niche (or these queries) and propose accounts to watch
    python compete.py validate h1 h2..  is each account active and mostly in our niche? (before adding it)
    python compete.py watch             show the watchlist (social/competitors.json; edit it to add or drop)
    python compete.py pull [--weekly]   each watched account's latest videos, numbers only
    python compete.py footage           measure each account's hits, flops and typical videos; frame strips
    python compete.py analyze           hits vs. flops within each account -> lab/compete.json + lab/compete-report.md
    python compete.py weekly            pull if a week has passed, then footage and analyze

WHY WITHIN-ACCOUNT. A search for the most-liked food videos only ever shows hits, and comparing a
2M-follower account with a 20K one mostly measures audience size. Comparing each account's videos
with its own typical video holds the audience, the creator and the style fixed, so whatever
separates its hits from its flops is the content: the hook, the topic, the pacing, the length.

METHOD
- Score: a video's views against its account's typical video (the median, on a log scale), after a
  pooled within-account allowance for age. Videos under 3 days old aren't judged yet. "Hit" = 2x
  the account's typical views or more; "flop" = half or less.
- Caption, length, sound and posting-day features: within-account differences (each account
  compared with itself), pooled across accounts, with a two-level bootstrap (resample accounts,
  then videos inside each) and a count of how many accounts agree in direction. One account can't
  carry a finding.
- Footage (vision.py) for each account's top 3, bottom 3 and 2 typical videos: the hit-minus-flop
  difference inside each account, then how many accounts agree.
- A frame strip (0, 1, 2.5, 4, 6, 10 s) of each measured video for the weekly expert review
  (review.py lays them out per account, hits above flops).

RULES. Public creator accounts with 5,000+ followers, chosen by the owner and named in the watchlist.
Numbers of public videos only: no comments, follower lists or profile details beyond the follower
count. Footage is downloaded, measured, reduced to a small frame strip, and deleted (Apify's copy
too). Captions, opening lines and strips stay in git-ignored folders and are deleted after 30 days;
nothing of theirs is reused in our videos, and committed reports describe patterns in our own words.
About $0.20 a week (results $0.003 each, downloads +$0.0013), checked against Apify's monthly cap
first (crawl.spendable)."""

import datetime as dt
import json
import math
import os
import re
import sys
from collections import defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
LAB = os.path.join(SOCIAL, "lab")
CRAWL = os.path.join(LAB, "crawl")
WATCH = os.path.join(SOCIAL, "competitors.json")
PACK = os.path.join(SOCIAL, "out", "review", "compete")
sys.path.insert(0, HERE)
import crawl  # noqa: E402
import lab2  # noqa: E402

ACTOR = "clockworks~free-tiktok-scraper"
MIN_FOLLOWERS = 5_000
FIRST_PULL = 25                           # videos on an account's first pull; then ~9 days of its posting a week
SETTLED_DAYS = 3.0
RESULT_USD, DOWNLOAD_USD = 0.003, 0.0043 + 0.001   # a result; a re-fetched video with download (+ transfer)
HIT, FLOP = math.log(2), -math.log(2)

DISCOVER_QUERIES = ["college food ranking", "ranking college dining halls", "best food near campus", "college town food",
                    "rating college food", "colleges ranked", "best restaurants near college", "college food review",
                    "cheap eats near campus", "food tier list", "states ranked by food", "food map"]
COLLEGE = re.compile(r"\b(college|colleges|campus|universit(y|ies)|dining halls?|dorms?|students?|freshm[ae]n|uni|"
                     r"sorority|frat|ucla|usc|nyu|harvard|stanford|berkeley|michigan|ohio state|texas a&m|ut austin|"
                     r"big ten|sec|ivy)\b", re.I)
FOOD = re.compile(r"food|eat|restaurant|dining|pizza|burger|taco|sushi|ramen|coffee|cafe|bakery|dessert|brunch|"
                  r"chicken|bbq|noodle|boba|menu|meal|snack|wings|sandwich|bagel|dumpling|pho|curry|steak|fries", re.I)
RANKISH = re.compile(r"\b(rank|ranked|ranking|tier|top \d+|rating|rated|rate|best|worst|vs\.?|versus|map)\b", re.I)

SPOTS = re.compile(r"\b(spots?|places?|restaurants?|where to eat|near|hidden gems?|must[- ]try|cheap eats|food tour|eat(ing)? through)\b|📍", re.I)


def on_niche(r):
    """Is this one video in our niche: college food, college or food rankings, or where-to-eat?"""
    t = f"{r.get('text', '')} {r.get('tags', '')}"
    food, college, rank = bool(FOOD.search(t)), bool(COLLEGE.search(t)), bool(RANKISH.search(t))
    return (college and (food or rank)) or (food and rank) or (food and bool(SPOTS.search(t)))


# Caption features on top of Lab v2's hook archetypes (question, POV, "I tried", ranking, number, ...).
CAPTION = lab2.HOOKS + [
    ("college", COLLEGE.pattern, "a college angle"),
    ("list", r"\b(top \d+|\d+ (best|places|spots|things|foods|restaurants|dishes))\b", "a numbered list"),
    ("review", r"\b(review|honest|worth it|overrated|underrated)\b", "a review / verdict"),
    ("chain", r"\b(mcdonald'?s?|chick-?fil-?a|chipotle|taco bell|wendy'?s|starbucks|costco|trader joe'?s|in-n-out|"
              r"subway|domino'?s|popeyes|kfc|panda express|crumbl|shake shack|raising cane'?s|five guys)\b", "a famous chain"),
    ("versus", r"\b(vs\.?|versus)\b", "a head-to-head"),
]
SAY = {k: s for k, _, s in CAPTION} | {
    "shorter_than_usual": "shorter than the account's usual length", "longer_caption": "a longer caption than usual",
    "original_sound": "an original sound (voice or own audio) rather than a song", "weekend": "posted on a weekend",
    "voice": "someone talking (spoken captions found)",
}
VISION = [("first_cut_s", "time to the first cut", "s"), ("cuts_first_3s", "cuts in the first 3 seconds", ""),
          ("median_shot_s", "median shot length", "s"), ("cuts_per_s", "cuts per second", ""),
          ("motion_first_1s", "movement in the first second", ""), ("hook_words", "words on the first frame", ""),
          ("hook_brightness", "brightness of the first frame", ""), ("hook_colorfulness", "colour in the first frame", ""),
          ("hook_face_area", "size of a face in the first frame", ""), ("text_share", "time with on-screen text", ""),
          ("face_share", "time with a face on screen", ""), ("zoom_in_share", "time zooming in", ""),
          ("camera_moving_share", "time the camera moves", ""), ("loop_similarity", "how closely the end matches the start", ""),
          ("duration_s", "length", "s"), ("spoken_words_3s", "words spoken in the first 3 seconds", ""),
          ("speech_wps", "speaking pace (words a second)", "")]
# Loudness is left out on purpose: downloaded files don't always carry the sound viewers hear (a song
# added in TikTok's editor can be missing), so their loudness isn't comparable with our renders.
VSAY = {n: s for n, s, _ in VISION}
VUNIT = {n: u for n, _, u in VISION}


def jload(path, default=None):
    return crawl.jload(path, default)


def now():
    return dt.datetime.now(dt.timezone.utc)


def ts(s):
    return dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))


# ---- the watchlist -------------------------------------------------------------------------

def watchlist():
    return [a for a in jload(WATCH, {}).get("accounts", []) if a.get("handle") and not a.get("paused")]


def show_watch():
    W = watchlist()
    if not W:
        print(f"no accounts yet: run `compete.py discover`, then add handles to {WATCH}")
    for a in W:
        print(f"@{a['handle']:<26} {a.get('label', '')}  [{a.get('kind', '')}]")


def discover(fresh=True, queries=None, per=10):
    """Search the niche, then rank the accounts behind the results: how much of what they post is
    college food or food rankings, how big they are, how well their niche videos do. The list is
    private (it quotes captions); the owner picks from it into competitors.json."""
    queries = queries or DISCOVER_QUERIES
    path = os.path.join(CRAWL, f"discover-{dt.datetime.now().strftime('%Y-%m-%d-%H%M%S')}.jsonl")
    if fresh:
        budget = crawl.spendable("compete")
        n = len(queries) * per
        if budget is not None and budget < n * RESULT_USD:
            sys.exit(f"discover: needs ${n * RESULT_USD:.2f}, only ${budget:.2f} spendable this week")
        items = crawl.apify_async(ACTOR, {"searchQueries": queries, "searchSection": "/video", "resultsPerPage": per,
                                          "shouldDownloadVideos": False, "shouldDownloadCovers": False,
                                          "shouldDownloadSlideshowImages": False, "shouldDownloadAvatars": False,
                                          "downloadSubtitlesOptions": "NEVER_DOWNLOAD_SUBTITLES"}, max_usd=n * RESULT_USD + 0.05)
        os.makedirs(CRAWL, exist_ok=True)
        with open(path, "w") as f:
            for it in items:
                r = crawl.parse_tiktok(it, "discover")
                if r:
                    r.update({"handle": (it.get("authorMeta") or {}).get("name"), "url": it.get("webVideoUrl"),
                              "query": it.get("searchQuery"), "lang": it.get("textLanguage")})
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
    rows = []
    for name in sorted(os.listdir(CRAWL)):
        if name.startswith("discover-") and name.endswith(".jsonl"):
            rows += [json.loads(l) for l in open(os.path.join(CRAWL, name)) if l.strip()]
    acc = defaultdict(list)
    for r in rows:
        if r.get("handle"):
            acc[r["handle"]].append(r)
    watched = {a["handle"].lower() for a in watchlist()}
    out = []
    for h, R in acc.items():
        fans = max(r.get("followers") or 0 for r in R)
        text = [f"{r.get('text', '')} {r.get('tags', '')}" for r in R]
        college = sum(1 for t in text if COLLEGE.search(t) and FOOD.search(t))
        ranking = sum(1 for t in text if RANKISH.search(t) and FOOD.search(t))
        if fans < MIN_FOLLOWERS or not (college or ranking):
            continue
        out.append({"handle": h, "followers": fans, "videos": len(R), "college_food": college, "food_ranking": ranking,
                    "best_views": max(r["plays"] for r in R), "watched": h.lower() in watched,
                    "queries": sorted({r.get("query") for r in R if r.get("query")}),
                    "captions": [t[:140] for t in text[:3]]})
    out.sort(key=lambda a: (-(2 * a["college_food"] + a["food_ranking"] + 0.5 * len(a["queries"])), -a["followers"]))
    crawl.jsave(os.path.join(CRAWL, "candidates.json"), out)
    for a in out[:30]:
        print(f"{'*' if a['watched'] else ' '} @{a['handle']:<26} {a['followers']:>9,} fans  college-food {a['college_food']}  "
              f"ranking {a['food_ranking']}  best {a['best_views']:>10,}  | {a['captions'][0][:70]}")
    print(f"\n{len(out)} candidates -> {os.path.join(CRAWL, 'candidates.json')} (private: it quotes captions)")
    return out


def validate(handles, per=12, max_usd=None):
    """Before an account joins the watchlist: is it active, and is most of what it posts in our niche?
    (One matching video in a search proves nothing; their latest videos do.) The pull is kept, so an
    account that joins already has its history."""
    cost = len(handles) * per * RESULT_USD
    budget = crawl.spendable("compete") if max_usd is None else max_usd
    if budget is not None and cost > budget:
        sys.exit(f"validate: needs ${cost:.2f}, ${budget:.2f} spendable")
    rows = pull_profiles(handles, per)
    save_pull(rows)
    by = defaultdict(list)
    for r in rows:
        by[r["handle"].lower()].append(r)
    out = []
    for h in handles:
        R = by.get(h.lower(), [])
        if not R:
            print(f"  @{h:<24} nothing came back (private, renamed or no videos)")
            continue
        last = max(ts(r["created"]) for r in R if r.get("created"))
        share = sum(on_niche(r) for r in R) / len(R)
        days = (now() - last).days
        ok = share >= 0.5 and days <= 45 and max(r.get("followers") or 0 for r in R) >= MIN_FOLLOWERS
        out.append({"handle": h, "videos": len(R), "niche_share": round(share, 2), "days_since_post": days,
                    "followers": max(r.get("followers") or 0 for r in R), "median_views": int(np.median([r["plays"] for r in R])),
                    "passes": ok})
        print(f"{'PASS' if ok else '    '} @{h:<24} {out[-1]['followers']:>9,} fans  niche {share:.0%}  last post {days}d ago  "
              f"median {out[-1]['median_views']:,} views ({len(R)} videos)")
    crawl.jsave(os.path.join(CRAWL, "validated.json"), out)
    return out


# ---- pulling their videos ------------------------------------------------------------------

def pull_profiles(handles, per):
    items = crawl.apify_async(ACTOR, {"profiles": handles, "resultsPerPage": per, "profileScrapeSections": ["videos"],
                                      "profileSorting": "latest", "excludePinnedPosts": True,
                                      "shouldDownloadVideos": False, "shouldDownloadCovers": False,
                                      "shouldDownloadSlideshowImages": False, "shouldDownloadAvatars": False,
                                      "downloadSubtitlesOptions": "NEVER_DOWNLOAD_SUBTITLES"},
                              max_usd=len(handles) * per * RESULT_USD + 0.03)
    rows = []
    for it in items:
        r = crawl.parse_tiktok(it, "compete")
        handle = (it.get("authorMeta") or {}).get("name")
        if r and handle:
            r.update({"handle": handle, "url": it.get("webVideoUrl") or f"https://www.tiktok.com/@{handle}/video/{r['id']}",
                      "lang": it.get("textLanguage")})
            rows.append(r)
    return rows


def save_pull(rows):
    if not rows:
        return None
    os.makedirs(CRAWL, exist_ok=True)
    out = os.path.join(CRAWL, f"compete-{dt.datetime.now().strftime('%Y-%m-%d-%H%M%S')}.jsonl")
    with open(out, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    crawl.purge()
    print(f"compete: {len(rows)} videos from {len({r['handle'] for r in rows})} accounts -> {out}")
    return out


def load_rows():
    """Latest numbers per video across the kept pulls."""
    best = {}
    if os.path.isdir(CRAWL):
        for name in sorted(os.listdir(CRAWL)):
            if re.match(r"compete-\d{4}-\d{2}-\d{2}.*\.jsonl$", name):
                for line in open(os.path.join(CRAWL, name)):
                    if line.strip():
                        r = json.loads(line)
                        best[r["id"]] = r
    return list(best.values())


def pull_sizes():
    """Videos to pull per account this week: enough to reach back ~9 days of its posting, so every
    video is seen at least once after it has settled (3+ days) without paying for older ones again."""
    rows = load_rows()
    by = defaultdict(list)
    for r in rows:
        if r.get("created"):
            by[(r.get("handle") or "").lower()].append(ts(r["created"]))
    sizes = {}
    for a in watchlist():
        dates = sorted(by.get(a["handle"].lower(), []))
        if not dates:
            sizes[a["handle"]] = FIRST_PULL
            continue
        span = max(7.0, (dates[-1] - dates[0]).total_seconds() / 86400)
        per_week = 7 * len(dates) / span
        sizes[a["handle"]] = int(np.clip(math.ceil(per_week * 9 / 7) + 1, 3, 14))
    return sizes


def pull(weekly=False, max_usd=None):
    W = watchlist()
    if not W:
        print("compete: no watchlist yet; skipping")
        return False
    if weekly and not crawl.due("compete"):
        print("compete: pulled within the last 7 days; skipping")
        return False
    sizes = pull_sizes()
    cost = sum(sizes.values()) * RESULT_USD
    budget = crawl.spendable("compete") if max_usd is None else max_usd
    if budget is not None and cost > budget:
        scale = budget / cost          # keep every account, fewer videos each
        sizes = {h: max(3, int(n * scale)) for h, n in sizes.items()}
        print(f"compete: budget ${budget:.2f} < ${cost:.2f}; pulling fewer videos per account")
    groups = defaultdict(list)
    for h, n in sizes.items():
        groups[n].append(h)
    rows = []
    for per, handles in sorted(groups.items()):
        print(f"compete: latest {per} videos of {', '.join('@' + h for h in handles)}")
        rows += pull_profiles(handles, per)
    if not rows:
        print("compete: nothing came back")
        return False
    save_pull(rows)
    return True


# ---- scoring -------------------------------------------------------------------------------

def scored():
    """Each watched account's videos with z = log views vs. the account's typical video (age-allowed)."""
    watched = {a["handle"].lower(): a for a in watchlist()}
    by = defaultdict(list)
    for r in load_rows():
        h = (r.get("handle") or "").lower()
        if h not in watched or not r.get("created") or not r.get("plays"):
            continue
        r = dict(r)
        r["age"] = max(0.25, (ts(r.get("crawled") or now().isoformat()) - ts(r["created"])).total_seconds() / 86400)
        r["y"] = math.log1p(r["plays"])
        r["settled"] = r["age"] >= SETTLED_DAYS
        by[h].append(r)
    xs, ys = [], []
    for R in by.values():
        S = [r for r in R if r["settled"]]
        if len(S) >= 5:
            la, y = np.log([r["age"] for r in S]), np.array([r["y"] for r in S])
            xs += list(la - la.mean())
            ys += list(y - y.mean())
    slope = float(np.clip(np.dot(xs, ys) / max(1e-9, float(np.dot(xs, xs))), 0.0, 0.35)) if len(xs) >= 10 else 0.0
    out = {}
    for h, R in by.items():
        S = [r for r in R if r["settled"]]
        if len(S) < 5:
            continue
        typical = float(np.median([r["y"] - slope * math.log(r["age"]) for r in S]))
        lens = [float(r["duration_s"]) for r in S if r.get("duration_s")]
        med_len = float(np.median(lens)) if lens else None
        caps = [len((r.get("text") or "").split()) for r in S]
        med_cap = float(np.median(caps)) if caps else 0
        for r in R:
            r["z"] = r["y"] - slope * math.log(r["age"]) - typical
            r["x_typical"] = math.exp(r["z"])
            r["feat"] = caption_features(r, med_len, med_cap)
        out[h] = {"account": watched[h], "videos": sorted(R, key=lambda r: -r["z"]), "typical_views": int(math.exp(np.median([r["y"] for r in S]))),
                  "median_length": med_len}
    return out, slope


def caption_features(r, med_len, med_cap):
    text = f"{r.get('text', '')} {r.get('tags', '')}".lower()
    f = {k: bool(re.search(rx, text)) for k, rx, _ in CAPTION}
    d = float(r.get("duration_s") or 0)
    f["shorter_than_usual"] = bool(med_len and d and d < med_len * 0.85)
    f["longer_caption"] = len((r.get("text") or "").split()) > med_cap * 1.5 + 2
    f["original_sound"] = bool(r.get("music_original"))
    f["weekend"] = ts(r["created"]).weekday() >= 5
    return f


# ---- footage -------------------------------------------------------------------------------

def picks(S, k=3, typical=2):
    """An account's settled videos worth looking at: top k, bottom k and the typical ones."""
    S = [r for r in S if r["settled"] and 6 <= float(r.get("duration_s") or 0) <= 180]
    if len(S) < 6:
        return []
    S = sorted(S, key=lambda r: -r["z"])
    chosen = S[:k] + S[-k:]
    middle = sorted(S[k:-k], key=lambda r: abs(r["z"]))[:typical]
    return chosen + middle


def footage(limit=70, max_usd=None):
    data, _ = scored()
    vis = crawl.vision_rows()
    want = {}
    for h, d in data.items():
        for r in picks(d["videos"]):
            v = vis.get(r["id"], {})
            if "error" in v or not v.get("duration_s") or not os.path.exists(os.path.join(crawl.STRIPS, f"{r['id']}.jpg")):
                want[r["id"]] = r["url"]
    want = dict(list(want.items())[:limit])
    if not want:
        print("compete footage: everything picked is already measured")
        return {}
    cost = len(want) * DOWNLOAD_USD
    budget = crawl.spendable("compete") if max_usd is None else max_usd
    if budget is not None and cost > budget:
        want = dict(list(want.items())[: int(budget / DOWNLOAD_USD)])
        print(f"compete footage: budget ${budget:.2f}; fetching {len(want)}")
    if not want:
        return {}
    return fetch(want)


def fetch(urls):
    """Re-fetch specific public videos with their footage: measure, strip, opening line; delete."""
    items = crawl.apify_async(ACTOR, {"postURLs": list(urls.values()), "shouldDownloadVideos": True,
                                      "downloadSubtitlesOptions": "DOWNLOAD_SUBTITLES", "shouldDownloadCovers": False,
                                      "shouldDownloadSlideshowImages": False, "shouldDownloadAvatars": False},
                              max_usd=len(urls) * 0.0045 + 0.03)
    media, spoken = {}, {}
    for it in items:
        vid = str(it.get("id") or "")
        u = (it.get("mediaUrls") or [None])[0]
        if vid and u and str(u).startswith("https://api.apify.com/"):
            media[vid] = u
        links = (it.get("videoMeta") or {}).get("subtitleLinks") or []
        en = next((l for l in links if str(l.get("language", "")).lower().startswith(("en", "eng"))), None)
        if vid and en and str(en.get("downloadLink", "")).startswith("https://api.apify.com/"):
            spoken[vid] = en["downloadLink"]
    crawl.analyze_footage(media, strips=True)
    hooks = []
    for vid, link in spoken.items():
        try:
            words = vtt_words(crawl.apify_get(link, raw=True).decode("utf-8", "replace"))
        except Exception:
            continue
        finally:
            try:
                import urllib.request
                urllib.request.urlopen(urllib.request.Request(link, method="DELETE", headers={"Authorization": "Bearer placeholder"}), timeout=30).close()
            except Exception:
                pass
        if words:
            first3 = [w for t, w in words if t < 3.0]
            span = max(1.0, words[-1][0] - words[0][0])
            hooks.append({"id": vid, "spoken_hook": " ".join(w for t, w in words if t < 4.0)[:200],
                          "spoken_words_3s": len(first3), "speech_wps": round(len(words) / span, 2),
                          "first_spoken_s": round(words[0][0], 2)})
    if hooks:
        path = os.path.join(CRAWL, f"spoken-{dt.date.today().isoformat()}.jsonl")   # private, purged at 30 days
        with open(path, "a") as f:
            for h in hooks:
                f.write(json.dumps(h, ensure_ascii=False) + "\n")
        with open(os.path.join(CRAWL, "vision.jsonl"), "a") as f:   # numbers only (no words) next to the footage
            for h in hooks:
                f.write(json.dumps({"id": h["id"], "spoken_words_3s": h["spoken_words_3s"], "speech_wps": h["speech_wps"],
                                    "first_spoken_s": h["first_spoken_s"]}) + "\n")
    print(f"fetched {len(media)} videos ({len(hooks)} with spoken captions)")
    return media


def vtt_words(vtt):
    """(start second, word) for each word of a WebVTT caption file, words spread across each cue."""
    out = []
    for m in re.finditer(r"(\d+):(\d\d):(\d\d)[.,](\d+)\s*-->\s*(\d+):(\d\d):(\d\d)[.,](\d+)[^\n]*\n(.*?)(?:\n\s*\n|\Z)", vtt, re.S):
        a = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]) + float("0." + m[4])
        b = int(m[5]) * 3600 + int(m[6]) * 60 + int(m[7]) + float("0." + m[8])
        words = re.sub(r"<[^>]+>", " ", m[9]).split()
        for i, w in enumerate(words):
            out.append((a + (b - a) * i / max(1, len(words)), w))
    return out


def private_hooks():
    out = {}
    if os.path.isdir(CRAWL):
        for name in sorted(os.listdir(CRAWL)):
            if name.startswith("spoken-"):
                for line in open(os.path.join(CRAWL, name)):
                    if line.strip():
                        h = json.loads(line)
                        out[h["id"]] = h
    return out


# ---- analysis ------------------------------------------------------------------------------

def sure_of(pooled, lo90, hi90, lo99, hi99, agree, n_acc, n_videos=99):
    """About 20 features are tested at once, so 'clear' needs the 99% interval to exclude no effect,
    4+ accounts with 75% agreeing and enough videos; 'likely' needs the 90% interval or broad agreement."""
    share = agree / n_acc if n_acc else 0
    if n_acc >= 4 and (lo99 > 0 or hi99 < 0) and share >= 0.75 and n_videos >= 8:
        return "clear"
    if (lo90 > 0 or hi90 < 0) or (n_acc >= 3 and share >= 0.7 and abs(pooled) >= math.log(1.25)):
        return "likely"
    return "unclear"


def within_binary(data, key, rng, B=2000):
    """Pooled within-account difference in z (has the feature vs. not), weighted by group sizes."""
    groups = []
    for h, d in data.items():
        S = [r for r in d["videos"] if r["settled"]]
        g1 = np.clip([r["z"] for r in S if r["feat"].get(key)], -2.5, 2.5)
        g0 = np.clip([r["z"] for r in S if not r["feat"].get(key)], -2.5, 2.5)
        if len(g1) >= 2 and len(g0) >= 2:
            groups.append((h, np.array(g1), np.array(g0)))
    if len(groups) < 2:
        return None

    def pooled(G, resample=False):
        num = den = 0.0
        for _, g1, g0 in G:
            if resample:
                g1, g0 = rng.choice(g1, len(g1)), rng.choice(g0, len(g0))
            w = len(g1) * len(g0) / (len(g1) + len(g0))
            num += w * (g1.mean() - g0.mean())
            den += w
        return num / den
    est = pooled(groups)
    boots = [pooled([groups[i] for i in rng.integers(0, len(groups), len(groups))], True) for _ in range(B)]
    lo, hi, lo99, hi99 = np.quantile(boots, [0.05, 0.95, 0.005, 0.995])
    per = [g1.mean() - g0.mean() for _, g1, g0 in groups]
    agree = sum(1 for p in per if np.sign(p) == np.sign(est))
    n_with = int(sum(len(g1) for _, g1, _ in groups))
    return {"x": round(math.exp(est), 2), "ci90": [round(math.exp(lo), 2), round(math.exp(hi), 2)], "accounts": len(groups),
            "agree": agree, "videos_with": n_with, "sure": sure_of(est, lo, hi, lo99, hi99, agree, len(groups), n_with)}


def within_vision(data, vis, key, rng, B=2000):
    """Inside each account: median of the feature among its top-3 videos minus among its bottom-3."""
    per = []
    for h, d in data.items():
        M = [r for r in d["videos"] if r["settled"] and vis.get(r["id"], {}).get(key) is not None]
        if len(M) < 4:
            continue
        M.sort(key=lambda r: -r["z"])
        k = min(3, len(M) // 2)
        top = [float(vis[r["id"]][key]) for r in M[:k]]
        bot = [float(vis[r["id"]][key]) for r in M[-k:]]
        per.append((h, float(np.median(top)), float(np.median(bot))))
    if len(per) < 2:
        return None
    diffs = np.array([t - b for _, t, b in per])
    est = float(np.median(diffs))
    boots = [float(np.median(rng.choice(diffs, len(diffs)))) for _ in range(B)]
    lo, hi, lo99, hi99 = np.quantile(boots, [0.05, 0.95, 0.005, 0.995])
    agree = int(sum(1 for x in diffs if np.sign(x) == np.sign(est) and x != 0))
    # Footage comes from 3 hits and 3 flops per account, so it needs broad agreement, not just an interval.
    sure = "unclear" if est == 0 else sure_of(est, lo, hi, lo99, hi99, agree, len(per), 6 * len(per))
    if sure != "unclear" and agree / len(per) < 0.7:
        sure = "unclear"
    return {"hits": round(float(np.median([t for _, t, _ in per])), 3), "flops": round(float(np.median([b for _, _, b in per])), 3),
            "diff": round(est, 3), "ci90": [round(float(lo), 3), round(float(hi), 3)], "accounts": len(per), "agree": agree,
            "sure": sure}


def analyze():
    data, slope = scored()
    if len(data) < 2:
        sys.exit("compete: need at least 2 watched accounts with 5+ settled videos; run `compete.py pull`")
    rng = np.random.default_rng(11)
    vis = crawl.vision_rows()
    keys = [k for k, _, _ in CAPTION] + ["shorter_than_usual", "longer_caption", "original_sound", "weekend"]
    caps = {k: within_binary(data, k, rng) for k in keys}
    caps = {k: v for k, v in caps.items() if v}
    foot = {n: within_vision(data, vis, n, rng) for n, _, _ in VISION}
    foot = {k: v for k, v in foot.items() if v}
    accounts = []
    for h, d in sorted(data.items(), key=lambda kv: -kv[1]["typical_views"]):
        S = [r for r in d["videos"] if r["settled"]]
        span = max(1.0, (max(ts(r["created"]) for r in d["videos"]) - min(ts(r["created"]) for r in d["videos"])).days)
        measured = [vis[r["id"]] for r in S if r["id"] in vis and "error" not in vis[r["id"]] and vis[r["id"]].get("duration_s")]
        face = float(np.median([m.get("face_share") or 0 for m in measured])) if measured else None
        text = float(np.median([m.get("text_share") or 0 for m in measured])) if measured else None
        style = None if face is None else "on-camera person" if face >= 0.5 else "text over footage" if (text or 0) >= 0.5 else "footage / voiceover"
        accounts.append({"handle": d["account"]["handle"], "label": d["account"].get("label"), "kind": d["account"].get("kind"),
                         "followers": max(r.get("followers") or 0 for r in d["videos"]), "settled_videos": len(S),
                         "typical_views": d["typical_views"], "hit_share": round(sum(1 for r in S if r["z"] >= HIT) / len(S), 2),
                         "flop_share": round(sum(1 for r in S if r["z"] <= FLOP) / len(S), 2),
                         "best_x": round(max(r["x_typical"] for r in S), 1), "posts_per_week": round(7 * len(d["videos"]) / span, 1),
                         "median_length_s": d["median_length"], "style": style, "measured": len(measured)})
    eng = engagement(data)
    ours = lab2.our_latest()
    hits_pool = [vis[r["id"]] for d in data.values() for r in d["videos"] if r["settled"] and r["z"] >= HIT and r["id"] in vis]
    vs_ours = {}
    for n, _, _ in VISION:
        vals = [float(v[n]) for v in hits_pool if v.get(n) is not None]
        if len(vals) >= 5 and n in ours:
            vs_ours[n] = {"ours": ours[n], "their_hits": lab2.q(vals)}
    out = {"date": dt.date.today().isoformat(), "accounts": accounts, "age_slope": round(slope, 3),
           "videos": sum(a["settled_videos"] for a in accounts), "captions": caps, "footage": foot, "vs_ours": vs_ours,
           "engagement": eng,
           "ours_from": ours.get("date")}
    crawl.jsave(os.path.join(LAB, "compete.json"), out)
    write_report(out)
    print(open(os.path.join(LAB, "compete-report.md")).read())
    return out


def engagement(data):
    """Shares, saves and likes per 1,000 views: their hits, their typical and flop videos, and ours.
    Shares are how a video travels beyond followers, so this is the mechanism, not just a score."""
    def per_k(R, key):
        vals = [1000 * (r.get(key) or 0) / max(1, r["plays"]) for r in R]
        return round(float(np.median(vals)), 1) if vals else None
    hits = [r for d in data.values() for r in d["videos"] if r["settled"] and r["z"] >= HIT]
    rest = [r for d in data.values() for r in d["videos"] if r["settled"] and r["z"] < HIT]
    out = {"their_hits": {k: per_k(hits, k) for k in ("shares", "saves", "likes", "comments")} | {"n": len(hits)},
           "their_others": {k: per_k(rest, k) for k in ("shares", "saves", "likes", "comments")} | {"n": len(rest)}}
    stats = jload(os.path.join(SOCIAL, "stats.json"), {})
    mine = [p for p in stats.get("posts", []) if p.get("service", "").lower() == "tiktok" and (p.get("views") or 0) >= 200]
    if mine:
        out["ours"] = {k: round(float(np.median([1000 * (p.get(k) or 0) / p["views"] for p in mine])), 1)
                       for k in ("shares", "likes", "comments")} | {"n": len(mine)}
    return out


def vnum(n, x):
    if n in ("text_share", "face_share", "zoom_in_share", "camera_moving_share"):
        return f"{x:.0%}"
    if n in ("cuts_per_s", "loop_similarity", "motion_first_1s", "hook_face_area", "speech_wps"):
        return f"{x:.2f}"
    if n in ("hook_words", "cuts_first_3s", "hook_brightness", "hook_colorfulness", "spoken_words_3s"):
        return f"{x:.0f}"
    return f"{x:.1f}{VUNIT.get(n, '')}"


def write_report(c):
    L = ["# Competitors: what separates their hits from their flops", "",
         f"{len(c['accounts'])} accounts closest to ours, {c['videos']} of their videos old enough to judge (3+ days). "
         "Every video is compared with **its own account's typical video**, so audience size drops out: a hit is 2x the "
         "account's typical views or more, a flop half or less. Findings pool the accounts and count how many agree; "
         "\"clear\" = the 99% interval excludes no effect and 4+ accounts, 75% of them, agree (about 20 features are "
         "tested, so a looser bar would find chance patterns); \"likely\" = the 90% interval does, or most accounts agree.", "",
         "## The accounts", "", "| account | followers | typical views | hits | flops | best | posts/week | length | style |",
         "|---|---:|---:|---:|---:|---:|---:|---:|---|"]
    for a in c["accounts"]:
        L.append(f"| {a['label'] or a['handle']} | {a['followers']:,} | {a['typical_views']:,} | {a['hit_share']:.0%} | "
                 f"{a['flop_share']:.0%} | {a['best_x']}x | {a['posts_per_week']} | "
                 f"{(a['median_length_s'] or 0):.0f}s | {a['style'] or '?'} |")
    L += ["", "## Captions and choices (within each account)", ""]
    for k, v in sorted(c["captions"].items(), key=lambda kv: (kv[1]["sure"] != "clear", kv[1]["sure"] != "likely", -abs(math.log(kv[1]["x"])))):
        if v["sure"] == "unclear" and abs(math.log(v["x"])) < math.log(1.3):
            continue
        L.append(f"- {SAY.get(k, k).capitalize()}: **x{v['x']:.2f}** the account's typical views "
                 f"(90% {v['ci90'][0]:.2f}-{v['ci90'][1]:.2f}; same direction in {v['agree']} of {v['accounts']} accounts; {v['sure']})")
    L += ["", "## Footage: their top 3 vs. bottom 3 videos (inside each account)", ""]
    for n, v in sorted(c["footage"].items(), key=lambda kv: (kv[1]["sure"] != "clear", kv[1]["sure"] != "likely")):
        L.append(f"- {VSAY[n].capitalize()}: hits {vnum(n, v['hits'])}, flops {vnum(n, v['flops'])} "
                 f"(higher in the hits for {v['agree']} of {v['accounts']} accounts; {v['sure']})" if v["diff"] > 0 else
                 f"- {VSAY[n].capitalize()}: hits {vnum(n, v['hits'])}, flops {vnum(n, v['flops'])} "
                 f"(lower in the hits for {v['agree']} of {v['accounts']} accounts; {v['sure']})")
    e = c.get("engagement") or {}
    if e.get("their_hits"):
        L += ["", "## Engagement per 1,000 views (medians)", "", "| | videos | shares | likes | comments | saves |", "|---|---:|---:|---:|---:|---:|"]
        for label, k in (("their hits", "their_hits"), ("their other videos", "their_others"), ("ours (200+ views)", "ours")):
            v = e.get(k)
            if v:
                L.append(f"| {label} | {v['n']} | {v.get('shares')} | {v.get('likes')} | {v.get('comments')} | {v.get('saves', '-')} |")
    if c["vs_ours"]:
        L += ["", f"## Us vs. their hits (our {c['ours_from']} videos)", ""]
        for n, v in c["vs_ours"].items():
            L.append(f"- {VSAY[n].capitalize()}: ours **{vnum(n, v['ours'])}**, their hits {vnum(n, v['their_hits'][1])} "
                     f"(middle half {vnum(n, v['their_hits'][0])} to {vnum(n, v['their_hits'][2])})")
    L += ["", "_Written by social/pipeline/compete.py. Their footage is measured and deleted; frame strips and captions "
          "stay private (social/out/review/compete/) for 30 days._"]
    with open(os.path.join(LAB, "compete-report.md"), "w") as f:
        f.write("\n".join(L) + "\n")


def weekly():
    """Pull if a week has passed, measure the new hits and flops, analyze, save the private data."""
    try:
        if not crawl.vision_rows():
            crawl.sync("down")               # after a container restart, bring the history back first
    except Exception as e:
        print(f"sync: skipped ({e})")
    fresh = False
    try:
        fresh = pull(weekly=True)
        if fresh:
            footage(limit=12)
    except crawl.NoAccess as e:
        print(f"compete: skipped ({e})")
    data, _ = scored()
    if len(data) >= 2:
        analyze()
    if fresh:
        try:
            crawl.sync("up")
        except Exception as e:
            print(f"sync: skipped ({e})")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    cap = float(a[a.index("--max-usd") + 1]) if "--max-usd" in a else None   # owner's one-off override (first pull)
    try:
        if a[0] == "discover":
            qs = [q for q in a[1:] if not q.startswith("--") and q != str(cap)]
            discover(fresh="--cached" not in a, queries=qs or None, per=8 if qs else 10)
        elif a[0] == "validate":
            validate([h.lstrip("@") for h in a[1:] if not h.startswith("--") and h != str(cap)], max_usd=cap)
        elif a[0] == "watch":
            show_watch()
        elif a[0] == "pull":
            pull(weekly="--weekly" in a, max_usd=cap)
        elif a[0] == "footage":
            footage(max_usd=cap)
        elif a[0] == "analyze":
            analyze()
        elif a[0] == "weekly":
            weekly()
        else:
            sys.exit(__doc__)
    except crawl.NoAccess as e:
        sys.exit(str(e))
