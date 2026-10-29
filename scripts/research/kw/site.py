"""Our site, as the tool sees it: which page should answer which search.

Every search the sources find is matched against the site model in seeds.json:
the campus it names (by any of the names students use, "apu" as well as
"azusa pacific university"), the city, the food, the situation or diet. That
gives three things:

  pattern   the search with the specifics swapped out, "breakfast near
            {campus}", so the same phrasing for 80 campuses adds up to one row
  target    the page that should rank for it, "/campus/azusa-pacific-university"
            or the campus x cuisine page when one exists
  modifiers the words left once the place and the food are taken out ("cheap",
            "late night", "open now") — what the searcher wants on top, and
            what the page's title and headings can be checked for
"""
import html as htmlmod
import os
import re
from collections import defaultdict

from . import db
from .common import REPO, HttpError, http, pause

# Short names that are also everyday words; matching them would put "fit" or
# "uno" on a campus page.
COMMON_WORDS = {"fit", "mac", "art", "uno", "ace", "bay", "pit", "sun", "one", "sac", "cal", "mit", "usa",
                "eat", "bar", "ice", "tea", "hot", "dog"}
MEALS = {"breakfast", "brunch", "lunch", "dinner"}
DECIDE = re.compile(r"\b(what should i eat|where should i eat|what to eat|where to eat|cant decide|can't decide|"
                    r"restaurant picker|food decider|food picker|random restaurant|random food|food generator|"
                    r"restaurant generator|help me choose)\b")
# Phrases kept whole when they are what the searcher adds.
PHRASES = ["late night", "open now", "open late", "open 24 hours", "24 hour", "24/7", "dine in", "take out",
           "takeout", "study spot", "study spots", "date night", "outdoor seating", "student discount",
           "student discounts", "gluten free", "fast food", "sit down", "all you can eat", "happy hour",
           "food truck", "food trucks", "walking distance", "within walking distance", "cheap eats",
           "near campus", "off campus", "on campus", "dining hall", "meal plan", "delivery"]
BASE = set("restaurants restaurant food foods places place to eat eating near nearby me best good the in at around "
           "by for of a an and spots spot options close closest campus college university near-by top "
           "what where which who how why when is are can do does should will any there i my we some get".split())
QUESTION = re.compile(r"^(what|where|which|who|how|why|when|is|are|can|do|does|should|will|any)\b")
LOCAL = re.compile(r"\b(near|nearby|close to|around|open now|open late|delivery|takeout|in town|walking distance)\b")
NAV = re.compile(r"\b(dining hall|meal plan|dining services|menu|menus|hours|login|portal|careers|jobs|"
                 r"employment|bookstore|parking|map|address|phone)\b")


def norm(s):
    s = (s or "").lower().replace("&", " and ").replace("’", "'")
    s = re.sub(r"[-_/]", " ", s)
    s = re.sub(r"[^a-z0-9' ]+", " ", s).replace("'", "")
    return re.sub(r"\s+", " ", s).strip()


def _alt(words):
    words = sorted({w for w in words if w}, key=len, reverse=True)
    if not words:
        return None
    return re.compile(r"(?<![a-z0-9])(" + "|".join(re.escape(w) for w in words) + r")(?![a-z0-9])")


class Site:
    def __init__(self, seeds):
        self.origin = seeds["site"]
        self.campus = {c["slug"]: c for c in seeds["campuses"]}
        self.campus_names = defaultdict(set)
        for c in seeds["campuses"]:
            for n in c["names"]:
                k = norm(n)
                if len(k) < 2 or k in COMMON_WORDS:
                    continue
                self.campus_names[k].add(c["slug"])
                if k.startswith("university of "):
                    self.campus_names["the " + k].add(c["slug"])
        self.campus_re = _alt(self.campus_names)
        self.states = {norm(n): code for code, n in seeds.get("states", {}).items()}
        self.state_codes = {code.lower(): code for code in seeds.get("states", {})}
        self.state_re = _alt(list(self.states) + list(self.state_codes))
        self.city_names = defaultdict(list)
        for c in seeds["cities"]:
            self.city_names[norm(c["name"])].append(c)
        self.city_re = _alt(self.city_names)
        self.food_words = {}
        for f in seeds["foods"]:
            for w in f["words"]:
                self.food_words.setdefault(norm(w), f["slug"])
        self.food_re = _alt(self.food_words)
        self.guide_words = {}
        for g in seeds["guides"]:
            for w in g["words"]:
                self.guide_words.setdefault(norm(w), g["path"])
        self.guide_re = _alt(self.guide_words)
        self.niche = set(seeds["niche"])
        self.phrase_re = _alt([norm(p) for p in PHRASES])

    # -- matching -------------------------------------------------------------

    def _states_in(self, t):
        out = set()
        if self.state_re:
            for m in self.state_re.finditer(t):
                w = m.group(1)
                out.add(self.states.get(w) or self.state_codes.get(w))
        return out

    def match(self, query):
        """Entities in a search: campus, city, food, guide, with their spans."""
        t = norm(query)
        res = {"text": t, "campus": None, "campus_name": None, "ambiguous": [], "city": None,
               "food": None, "food_word": None, "guide": None, "spans": []}
        states = self._states_in(t)
        best = None
        if self.campus_re:
            for m in self.campus_re.finditer(t):
                if not best or len(m.group(1)) > len(best.group(1)):
                    best = m
        if best:
            slugs = sorted(self.campus_names[best.group(1)])
            if len(slugs) > 1:
                # "isu" names several schools; a state or town in the search settles it.
                narrowed = [s for s in slugs if self.campus[s]["state"] in states
                            or norm(self.campus[s]["city"]) in t]
                slugs = narrowed if len(narrowed) == 1 else slugs
            if len(slugs) == 1:
                res["campus"], res["campus_name"] = slugs[0], best.group(1)
                res["spans"].append(("{campus}", best.start(1), best.end(1)))
            else:
                res["ambiguous"] = slugs
        rest = self._blank(t, res["spans"])
        if not res["campus"] and self.city_re:
            for m in self.city_re.finditer(rest):
                cands = self.city_names[m.group(1)]
                after = rest[m.end(1):m.end(1) + 16]
                st = self._states_in(after.strip()[:15]) & {c["state"] for c in cands}
                before = rest[max(0, m.start(1) - 9):m.start(1)]
                pick = None
                if st:
                    pick = next(c for c in cands if c["state"] in st)
                elif re.search(r"\b(in|near|around|downtown|of)\s$", before) or " " in m.group(1) or cands[0]["pop"] >= 300000:
                    pick = cands[0]  # largest of that name
                if pick:
                    end = m.end(1)
                    sm = re.match(r"\s*,?\s*(" + "|".join(re.escape(x) for x in
                                  [pick["state"].lower(), norm(dict((v, k) for k, v in self.states.items()).get(pick["state"], "zz"))]) + r")(?![a-z0-9])", rest[end:])
                    if sm:
                        end += sm.end(0)
                    res["city"] = pick["slug"]
                    res["spans"].append(("{city}", m.start(1), end))
                    break
        rest = self._blank(t, res["spans"])
        if self.food_re:
            fm = None
            for m in self.food_re.finditer(rest):
                if not fm or len(m.group(1)) > len(fm.group(1)):
                    fm = m
            if fm:
                res["food"], res["food_word"] = self.food_words[fm.group(1)], fm.group(1)
                if fm.group(1) not in MEALS:
                    res["spans"].append(("{food}", fm.start(1), fm.end(1)))
        rest = self._blank(t, res["spans"])
        if self.guide_re:
            gm = self.guide_re.search(rest)
            if gm:
                res["guide"] = self.guide_words[gm.group(1)]
        return res

    @staticmethod
    def _blank(t, spans):
        chars = list(t)
        for _, a, b in spans:
            for i in range(a, b):
                chars[i] = " "
        return "".join(chars)

    def pattern(self, m):
        t = m["text"]
        for label, a, b in sorted(m["spans"], key=lambda s: -s[1]):
            t = t[:a] + label + t[b:]
        return re.sub(r"\s+", " ", t).strip()

    def target(self, m):
        if m["campus"]:
            if m["food"] and f"{m['campus']}/{m['food']}" in self.niche:
                return f"/campus/{m['campus']}/{m['food']}"
            return f"/campus/{m['campus']}"
        if m["city"]:
            return f"/eat/{m['city']}"
        if m["food"] and m["food_word"] not in MEALS:
            return f"/food/{m['food']}"
        if m["guide"]:
            return m["guide"]
        if m["food"]:
            return f"/food/{m['food']}"
        t = m["text"]
        if DECIDE.search(t) or re.search(r"\bnear me\b", t):
            return "/"
        if re.search(r"\b(campus|college|university|students?)\b", t):
            return "/campus/"
        return ""

    def modifiers(self, m):
        """What the searcher adds beyond the place and the food."""
        t = self._blank(m["text"], m["spans"])
        mods = []
        if self.phrase_re:
            for pm in self.phrase_re.finditer(t):
                mods.append(pm.group(1))
            t = self.phrase_re.sub(" ", t)
        mods += [w for w in t.split() if w not in BASE and not w.isdigit() and len(w) > 1
                 and w not in self.state_codes and w not in self.states]
        return mods

    @staticmethod
    def intent(m):
        t = m["text"]
        if NAV.search(t) and not LOCAL.search(t):
            return "navigational"
        if QUESTION.search(t):
            return "question"
        if LOCAL.search(t) or t.endswith(" near me") or m["campus"] or m["city"]:
            return "local"
        return "general"

    # -- page facts -----------------------------------------------------------

    def page_file(self, path):
        build = os.path.join(REPO, "build")
        if not os.path.isdir(build):
            return None
        p = path.strip("/")
        cand = os.path.join(build, "index.html") if not p else (
            os.path.join(build, p, "index.html") if path.endswith("/") else os.path.join(build, p + ".html"))
        return cand if os.path.exists(cand) else None

    def load_pages(self, con, paths, live=True, max_live=400):
        """Title, h1, h2s and description of each page: from a local build
        when there is one, else from the live site (cached a week)."""
        fetched = 0
        for path in paths:
            row = con.execute("SELECT fetched FROM pages WHERE url=?", (path,)).fetchone()
            f = self.page_file(path)
            if row and not f:
                continue
            if f:
                with open(f, encoding="utf-8") as fh:
                    text = fh.read()
            elif live and fetched < max_live:
                try:
                    text = http("GET", self.origin.rstrip("/") + path, timeout=20, retries=1)
                except HttpError:
                    continue
                fetched += 1
                pause(0.25)
                if not isinstance(text, str):
                    continue
            else:
                continue
            g = lambda rx: htmlmod.unescape(re.sub(r"<[^>]+>", "", (re.search(rx, text, re.S) or [None, ""])[1] or "")).strip()
            h2 = " | ".join(htmlmod.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<h2[^>]*>(.*?)</h2>", text, re.S))
            con.execute("INSERT OR REPLACE INTO pages VALUES (?,?,?,?,?,?)", (
                path, g(r"<title>(.*?)</title>"), g(r"<h1[^>]*>(.*?)</h1>"), h2[:4000],
                g(r'<meta name="description" content="(.*?)"'), db.now()))
        con.commit()

    def page_words(self, con, path):
        row = con.execute("SELECT title, h1, h2 FROM pages WHERE url=?", (path,)).fetchone()
        if not row:
            return None
        return set(norm(" ".join(x or "" for x in row)).split())
