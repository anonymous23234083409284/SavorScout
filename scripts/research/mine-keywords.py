#!/usr/bin/env python3
"""Ask Google what people type, and turn the answers into page patterns.

Google's search box suggests completions as you type ("food near ucla" ->
"food near ucla open late"). Those suggestions are real searches, ranked by
how often they are made. This asks for them across the campuses and foods in
seeds.json, writes every suggestion to keywords.csv, then replaces the campus
and food in each one with {campus} and {food}, so patterns.csv shows which
phrasings recur across many campuses. A pattern that turns up for 30 campuses
is a page template or a title wording worth having. One that turns up once is
probably about that campus alone.

Suggestions say what people type and in what order of popularity, not how
many times. For volumes use Search Console (our own queries) and the free
keyword tools in Bing Webmaster Tools or Google Ads Keyword Planner.

Run it on your own computer. Python 3.8 or later, nothing to install:

    python3 scripts/research/mine-keywords.py

It takes about 40 minutes with the defaults, pauses between requests so
Google is not hammered, and keeps a cache, so stopping it (Ctrl+C) or being
rate-limited loses nothing: run it again and it picks up where it stopped.
Rebuild seeds.json with `node scripts/research/make-seeds.js [count]`.
"""
import argparse
import csv
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ENDPOINT = "https://suggestqueries.google.com/complete/search"
ALPHABET = "abcdefghijklmnopqrstuvwxyz"

# Asked for every campus, with {c} as the campus's main name.
CAMPUS_SEEDS = [
    "food near {c}", "restaurants near {c}", "places to eat near {c}",
    "best food near {c}", "cheap food near {c}", "late night food near {c}",
    "where to eat near {c}", "breakfast near {c}", "coffee near {c}",
    "{c} food", "{c} restaurants",
]
# Asked with a-z after them, for the first --deep campuses only.
CAMPUS_DEEP = ["food near {c} ", "{c} food "]

# Asked once each, not tied to a campus: how people search for a pick, and
# for the foods the guides cover.
GENERIC_SEEDS = [
    "what should i eat", "where should i eat", "what to eat for dinner",
    "what to eat for lunch", "cant decide what to eat", "restaurant picker",
    "food decider", "random restaurant generator", "food near campus",
    "food near college", "cheap eats", "late night food", "college student food",
    "food open late", "best food near me",
]
GENERIC_DEEP = ["food near me ", "cheap food ", "late night food ",
                "where to eat ", "what to eat "]
FOOD_SEEDS = ["{f} near me", "best {f} near", "{f} near campus"]


def fetch(query, timeout=10):
    """The completions Google offers for `query`, most popular first."""
    url = ENDPOINT + "?" + urllib.parse.urlencode(
        {"client": "firefox", "hl": "en", "gl": "us", "ie": "utf-8", "oe": "utf-8", "q": query})
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=timeout) as res:
        charset = res.headers.get_content_charset() or "utf-8"
        data = json.loads(res.read().decode(charset, "replace"))
    return [s for s in data[1] if isinstance(s, str)]


class Miner:
    def __init__(self, cache_file, delay):
        self.cache_file = cache_file
        self.delay = delay
        self.cache = {}
        if os.path.exists(cache_file):
            with open(cache_file, encoding="utf-8") as f:
                self.cache = json.load(f)
        self.asked = 0

    def save(self):
        tmp = self.cache_file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.cache, f)
        os.replace(tmp, self.cache_file)

    def suggest(self, query):
        query = query.lower()
        if query in self.cache:
            return self.cache[query]
        # Back off when Google pushes back; after three refusals in a row,
        # stop cleanly so a later run resumes from the cache.
        for wait in (60, 180, 600, None):
            try:
                result = fetch(query)
                break
            except (urllib.error.URLError, OSError, ValueError) as e:
                code = getattr(e, "code", None)
                if wait is None:
                    self.save()
                    sys.exit(f"\nGoogle keeps refusing ({code or e}). Progress is saved; "
                             "run this again in an hour or two and it carries on.")
                print(f"\n  refused ({code or e}); waiting {wait // 60} min", flush=True)
                time.sleep(wait)
        self.cache[query] = result
        self.asked += 1
        if self.asked % 25 == 0:
            self.save()
        time.sleep(self.delay * random.uniform(0.7, 1.6))
        return result


def word_re(phrases):
    """One regex matching any of `phrases` as whole words, longest first."""
    alts = sorted({p.lower() for p in phrases if p}, key=len, reverse=True)
    if not alts:
        return None
    return re.compile(r"(?<![\w])(" + "|".join(re.escape(a) for a in alts) + r")(?![\w])")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--seeds", default=os.path.join(HERE, "seeds.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "out"),
                    help="folder for keywords.csv, patterns.csv and the cache")
    ap.add_argument("--campuses", type=int, default=60, help="how many campuses from seeds.json")
    ap.add_argument("--deep", type=int, default=15,
                    help="how many of those also get the a-z expansion (52 requests each)")
    ap.add_argument("--delay", type=float, default=1.2, help="average seconds between requests")
    ap.add_argument("--no-generic", action="store_true", help="campus queries only")
    args = ap.parse_args()

    with open(args.seeds, encoding="utf-8") as f:
        seeds = json.load(f)
    campuses = seeds["campuses"][: args.campuses]
    foods = seeds["foods"]
    os.makedirs(args.out, exist_ok=True)
    miner = Miner(os.path.join(args.out, "cache.json"), args.delay)

    # (seed, campus slug or "") for every request, in order.
    plan = []
    for i, c in enumerate(campuses):
        main_name = c["names"][0]
        plan += [(s.format(c=main_name), c["slug"]) for s in CAMPUS_SEEDS]
        plan += [("food near " + n, c["slug"]) for n in c["names"][1:]]
        if i < args.deep:
            plan += [(s.format(c=main_name) + ch, c["slug"]) for s in CAMPUS_DEEP for ch in ALPHABET]
    if not args.no_generic:
        plan += [(s, "") for s in GENERIC_SEEDS]
        plan += [(s + ch, "") for s in GENERIC_DEEP for ch in ALPHABET]
        plan += [(s.format(f=f), "") for f in foods for s in FOOD_SEEDS]

    todo = sum(1 for q, _ in plan if q.lower() not in miner.cache)
    print(f"{len(plan)} queries, {todo} not asked yet "
          f"(about {todo * args.delay * 1.15 / 60:.0f} min). Ctrl+C stops and keeps progress.")

    rows = {}  # suggestion -> row; the first seed that found it wins
    try:
        for n, (seed, slug) in enumerate(plan, 1):
            for pos, s in enumerate(miner.suggest(seed)):
                key = (s.lower(), slug)
                if key not in rows:
                    rows[key] = {"query": s.lower(), "seed": seed.strip(), "campus": slug, "position": pos + 1}
            if n % 10 == 0 or n == len(plan):
                print(f"\r  {n}/{len(plan)}  {len(rows)} suggestions", end="", flush=True)
    except KeyboardInterrupt:
        print("\nStopped. Writing what there is so far.")
    miner.save()
    print()

    # Patterns: the campus (any of its names), its city and the food become
    # placeholders, so the same phrasing for different campuses lines up.
    by_slug = {c["slug"]: c for c in campuses}
    any_campus = word_re([n for c in campuses for n in c["names"]])
    food_re = word_re(foods)
    pats = defaultdict(lambda: {"campuses": set(), "count": 0, "pos": [], "examples": []})
    for r in rows.values():
        q = r["query"]
        c = by_slug.get(r["campus"])
        if c:
            q = word_re(c["names"]).sub("{campus}", q)
            if c.get("city"):
                q = word_re([c["city"]]).sub("{city}", q)
        if any_campus:
            q = any_campus.sub("{campus}", q)  # a suggestion naming another school
        if food_re:
            q = food_re.sub("{food}", q)
        q = re.sub(r"(\{campus\}\s*)+", "{campus} ", q).strip()
        r["pattern"] = q
        p = pats[q]
        if r["campus"]:
            p["campuses"].add(r["campus"])
        p["count"] += 1
        p["pos"].append(r["position"])
        if len(p["examples"]) < 3:
            p["examples"].append(r["query"])

    kw_file = os.path.join(args.out, "keywords.csv")
    with open(kw_file, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["query", "pattern", "campus", "seed", "position"])
        w.writeheader()
        for r in sorted(rows.values(), key=lambda r: (r["campus"], r["seed"], r["position"])):
            w.writerow(r)

    ranked = sorted(pats.items(), key=lambda kv: (-len(kv[1]["campuses"]), -kv[1]["count"], kv[0]))
    pat_file = os.path.join(args.out, "patterns.csv")
    with open(pat_file, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["pattern", "campuses", "times_seen", "avg_position", "examples"])
        for pat, p in ranked:
            w.writerow([pat, len(p["campuses"]), p["count"],
                        round(sum(p["pos"]) / len(p["pos"]), 1), " | ".join(p["examples"])])

    print(f"{len(rows)} suggestions -> {kw_file}")
    print(f"{len(pats)} patterns    -> {pat_file}\n")
    print("Most widespread campus patterns:")
    shown = 0
    for pat, p in ranked:
        if "{campus}" in pat and len(p["campuses"]) > 1:
            print(f"  {len(p['campuses']):>3} campuses  {pat}")
            shown += 1
            if shown == 25:
                break
    print("\nUpload keywords.csv and patterns.csv to Claude to turn them into titles and pages.")


if __name__ == "__main__":
    main()
