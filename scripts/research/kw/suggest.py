"""Search-box suggestions from Google, YouTube, Bing and DuckDuckGo.

What each engine suggests as you type is drawn from what its users actually
typed, most frequent first. It gives no counts, so on its own it says which
phrasings exist and roughly in what order; the volume sources price them.
YouTube's are the closest free view of what people search on video apps,
which is what the TikTok and Shorts posts are written for.

These are the engines' public suggestion endpoints, not official APIs: the
tool asks politely (about a request a second, one engine at a time), backs off
when told to, and gives up on an engine for the run if it keeps refusing.
"""
from . import db
from .common import HttpError, http, log, pause, progress

ENGINES = {
    "google": ("https://suggestqueries.google.com/complete/search",
               lambda q: {"client": "firefox", "hl": "en", "gl": "us", "ie": "utf-8", "oe": "utf-8", "q": q}),
    "youtube": ("https://suggestqueries.google.com/complete/search",
                lambda q: {"client": "firefox", "ds": "yt", "hl": "en", "gl": "us", "q": q}),
    "bing": ("https://api.bing.com/osjson.aspx", lambda q: {"query": q, "market": "en-US"}),
    "ddg": ("https://duckduckgo.com/ac/", lambda q: {"q": q, "type": "list", "kl": "us-en"}),
}
ALPHABET = "abcdefghijklmnopqrstuvwxyz"

# Asked for each campus, with {c} as the campus's main name.
CAMPUS_SEEDS = [
    "restaurants near {c}", "food near {c}", "places to eat near {c}", "best restaurants near {c}",
    "best food near {c}", "cheap food near {c}", "late night food near {c}", "breakfast near {c}",
    "coffee near {c}", "study spots near {c}", "where to eat near {c}", "{c} restaurants", "{c} food",
]
# With a-z after them, for the first `deep` campuses.
CAMPUS_DEEP = ["restaurants near {c} ", "food near {c} "]
GENERIC_SEEDS = [
    "what should i eat", "where should i eat", "what to eat for dinner", "what to eat for lunch",
    "cant decide what to eat", "restaurant picker", "food decider", "random restaurant generator",
    "food near campus", "restaurants near campus", "food near college", "cheap eats", "late night food",
    "college student food", "food open late", "best food near me", "places to eat near me",
]
GENERIC_DEEP = ["food near me ", "places to eat near me ", "restaurants near me ", "cheap food ",
                "late night food ", "where to eat ", "what to eat "]
FOOD_SEEDS = ["{f} near me", "best {f} near", "{f} near campus"]


def fetch(engine, q):
    url, params = ENGINES[engine]
    r = http("GET", url, params=params(q), timeout=15, retries=1)
    if isinstance(r, list) and len(r) > 1 and isinstance(r[1], list):
        return [s for s in r[1] if isinstance(s, str)]
    if isinstance(r, list):  # DuckDuckGo without type=list: [{"phrase": ...}]
        return [x.get("phrase") for x in r if isinstance(x, dict) and x.get("phrase")]
    return []


def plan(seeds, campuses=60, deep=15, foods=60, from_gsc=()):
    """Every (question, campus slug) to ask, in order."""
    out = []
    for i, c in enumerate(seeds["campuses"][:campuses]):
        main = c["names"][0]
        out += [(s.format(c=main), c["slug"]) for s in CAMPUS_SEEDS]
        out += [("restaurants near " + n, c["slug"]) for n in c["names"][1:]]
        if i < deep:
            out += [(s.format(c=main) + ch, c["slug"]) for s in CAMPUS_DEEP for ch in ALPHABET]
    out += [(s, "") for s in GENERIC_SEEDS]
    out += [(s + ch, "") for s in GENERIC_DEEP for ch in ALPHABET]
    for f in seeds["foods"][:foods]:
        out += [(s.format(f=f["words"][0]), "") for s in FOOD_SEEDS]
    # Our own Search Console searches, each asked with a trailing space: what
    # people go on to type after the exact words that already find us.
    out += [(q + " ", "") for q in from_gsc]
    seen, uniq = set(), []
    for q, slug in out:
        k = q.lower()
        if k not in seen:
            seen.add(k)
            uniq.append((q, slug))
    return uniq


def run(seeds, engines=("google",), delay=1.1, **kw):
    con = db.connect()
    started = db.now()
    gsc = [q for (q,) in con.execute(
        "SELECT query FROM obs WHERE source='gsc' AND metric='impressions' AND query!='' "
        "GROUP BY query ORDER BY SUM(value) DESC LIMIT ?", (kw.pop("from_gsc", 100),))]
    questions = plan(seeds, from_gsc=gsc, **kw)
    total = 0
    for engine in engines:
        if engine not in ENGINES:
            log(f"Unknown engine '{engine}'; choose from {', '.join(ENGINES)}")
            continue
        todo = [(q, s) for q, s in questions if db.cache_get(con, f"sg:{engine}:{q.lower()}", max_age_days=30) is None]
        log(f"{engine}: {len(questions)} questions, {len(todo)} not asked in the last 30 days "
            f"(about {len(todo) * delay * 1.1 / 60:.0f} min). Ctrl+C stops and keeps what it has.")
        refusals = 0
        try:
            for i, (q, slug) in enumerate(todo, 1):
                try:
                    got = fetch(engine, q)
                    refusals = 0
                except HttpError as e:
                    refusals += 1
                    if refusals >= 3:
                        log(f"\n{engine} keeps refusing ({e.status}); skipping it for this run.")
                        break
                    pause(30 * refusals)
                    continue
                db.cache_put(con, f"sg:{engine}:{q.lower()}", got)
                for pos, s in enumerate(got, 1):
                    db.put(con, "suggest:" + engine, s, "rank", pos, page="", seed=q.strip(), keep="min")
                    total += 1
                if slug:
                    db.put(con, "suggest_campus", q.strip(), "asked", 1, seed=slug)
                if i % 20 == 0:
                    con.commit()
                    progress(i, len(todo), f"asked, {total} suggestions")
                pause(delay)
        except KeyboardInterrupt:
            log("\nStopped; what was collected is saved.")
            con.commit()
            break
        con.commit()
        print()
    db.run_log(con, "suggest", started, total, ",".join(engines))
    return total
