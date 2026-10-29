"""Reddit: how students phrase food questions about their own campus.

Searches each campus's subreddit for food threads through Reddit's official
API and keeps two things: the thread titles that are questions about food
("best late night food near campus?"), and the short phrases that recur
across several campuses' subreddits ("open past midnight", "big portions").
Recurrence across campuses is the signal; one subreddit's in-joke is not.

Needs a Reddit app (reddit.com/prefs/apps, type "script") for its client id
and secret. Reddit has been tightening who gets API access, so a new app may
need approval first.
"""
import re
from collections import Counter, defaultdict

from . import db
from .common import HttpError, http, log, pause, progress

FOODY = re.compile(r"\b(food|eat|eats|eating|restaurant|restaurants|lunch|dinner|breakfast|brunch|late night|"
                   r"cheap|coffee|cafe|pizza|tacos?|sushi|ramen|pho|boba|wings|burgers?|bbq|halal|vegan|"
                   r"vegetarian|spot|spots|places?|dining|takeout|delivery|bakery|dessert)\b", re.I)
STOP = set("a an the and or of to in on at for with near is are was be it this that my me i we you your our "
           "any some what where which who how best good there here do does can should would anyone".split())
QUERIES = ["food", "restaurant", "where to eat", "late night", "cheap eats"]


def _token(cfg):
    r = http("POST", "https://www.reddit.com/api/v1/access_token", form={"grant_type": "client_credentials"},
             auth=(cfg["reddit_client_id"], cfg["reddit_client_secret"]),
             headers={"User-Agent": cfg["reddit_user_agent"]})
    return r["access_token"]


def _get(cfg, tok, path, **params):
    return http("GET", "https://oauth.reddit.com" + path, params=dict(params, raw_json=1),
                headers={"Authorization": "bearer " + tok, "User-Agent": cfg["reddit_user_agent"]})


def _subreddit(cfg, tok, campus):
    """The campus's own subreddit: the most-subscribed result whose name or
    title carries one of the campus's names."""
    names = [n.lower() for n in campus["names"]]
    r = _get(cfg, tok, "/subreddits/search", q=campus["names"][0], limit=8)
    best = None
    for ch in r.get("data", {}).get("children", []):
        d = ch.get("data", {})
        hay = " ".join([d.get("display_name", ""), d.get("title", ""), d.get("public_description", "")]).lower()
        if any(n in hay or n.replace(" ", "") in hay for n in names):
            if not best or (d.get("subscribers") or 0) > (best.get("subscribers") or 0):
                best = d
    return best.get("display_name") if best and (best.get("subscribers") or 0) >= 500 else None


def _phrases(title):
    words = re.findall(r"[a-z0-9']+", title.lower())
    out = set()
    for n in (2, 3, 4):
        for i in range(len(words) - n + 1):
            g = words[i:i + n]
            if g[0] in STOP or g[-1] in STOP:
                continue
            gram = " ".join(g)
            if FOODY.search(gram):
                out.add(gram)
    return out


def run(cfg, seeds, campuses=40):
    con = db.connect()
    started = db.now()
    tok = _token(cfg)
    spread = defaultdict(set)
    count = Counter()
    titles = 0
    todo = seeds["campuses"][:campuses]
    for i, c in enumerate(todo, 1):
        try:
            sub = _subreddit(cfg, tok, c)
        except HttpError as e:
            log(f"\n  {c['slug']}: {e}")
            continue
        if not sub:
            progress(i, len(todo), "campuses")
            continue
        seen = set()
        for q in QUERIES:
            try:
                r = _get(cfg, tok, f"/r/{sub}/search", q=q, restrict_sr=1, sort="relevance", t="all", limit=100)
            except HttpError as e:
                log(f"\n  r/{sub}: {e}")
                break
            for ch in r.get("data", {}).get("children", []):
                d = ch.get("data", {})
                t = (d.get("title") or "").strip()
                if not t or d.get("id") in seen or not FOODY.search(t):
                    continue
                seen.add(d.get("id"))
                titles += 1
                if t.endswith("?") or re.match(r"(?i)(where|what|best|any|anyone|recommend|good)\b", t):
                    db.put(con, "reddit", t[:160], "score", d.get("score") or 0, page="", seed=c["slug"])
                for p in _phrases(t):
                    spread[p].add(c["slug"])
                    count[p] += 1
            pause(1.1)
        progress(i, len(todo), f"campuses, {titles} food threads")
    db.clear(con, "reddit_phrase")
    for p, subs in spread.items():
        if len(subs) >= 2:
            db.put(con, "reddit_phrase", p, "campuses", len(subs))
            db.put(con, "reddit_phrase", p, "mentions", count[p])
    con.commit()
    db.run_log(con, "reddit", started, titles)
