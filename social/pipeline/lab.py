#!/usr/bin/env python3
"""The video lab: a producer that keeps notes.

It learns what made past videos travel, proposes new ones from SavorScout's
data, balances proven ideas against untested ones, and writes the scripts.

    python lab.py snapshot          add today's numbers to lab/snapshots.jsonl
    python lab.py report            fit the model, write lab/report.md
    python lab.py plan <date>       rank candidates, pick 2 countdowns + 2 experiments
    python lab.py script <date>     write batches/<date>/videos.json + posts.json from the plan
    python lab.py score             score experiments 3+ days old into experiments.json
    python lab.py maps <date>       "slug lat lng [street]" lines for rankmap.py

HOW IT LEARNS. Every posted TikTok becomes a row of features (format, how
famous the schools are, whether the hook names an upset, the #1's margin, how
many schools, posting time, age) and three outcomes (views, average watch,
shares per 1,000 views). A Bayesian linear model estimates each feature's
effect and how sure it is. The data is small, so the priors are skeptical: an
effect has to show up more than once before the model believes it.

HOW IT EXPLORES. Always picking the top prediction would copy one video
forever. Instead it draws one plausible version of the model from its
uncertainty (Thompson sampling) and picks the best ideas under that draw.
Untested formats are uncertain, so they win some draws and get tried; one that
keeps failing narrows to a low estimate and stops being picked. Groupings,
teases, regions and formats used recently are penalized so it varies itself.

TRENDS. A calendar of events (rivalry week, Thanksgiving, finals, bowls) and
lab/trends.json (written by each day's web research: schools or topics in the
news, with a weight and a reason) boost matching ideas.

Every number in a script comes from scripts/data/food-scene.json, and every
headline is checked against those numbers before it is written."""

import datetime as dt
import json
import math
import os
import re
import subprocess
import sys
from zoneinfo import ZoneInfo

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
ROOT = os.path.dirname(SOCIAL)
DATA = os.path.join(ROOT, "scripts", "data")
LAB = os.path.join(SOCIAL, "lab")
BATCHES = os.path.join(SOCIAL, "batches")
SITE = "https://www.savorscout.net"
NY = ZoneInfo("America/New_York")


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


# ---- SavorScout's data ------------------------------------------------------

CAMP = {}
for _f in ("campuses.json", "campuses-more.json"):
    for _c in jload(os.path.join(DATA, _f), []):
        CAMP[_c["s"]] = _c
SCENE = {k[7:]: v for k, v in jload(os.path.join(DATA, "food-scene.json"), {}).get("pages", {}).items()
         if k.startswith("campus/")}
NAMES = jload(os.path.join(HERE, "social-names.json"), {})
RANKINGS = json.loads(subprocess.check_output(
    ["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1])))",
     os.path.join(DATA, "rankings.js")]))

STATES = {"AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
          "CT": "Connecticut", "DE": "Delaware", "DC": "Washington, DC", "FL": "Florida", "GA": "Georgia",
          "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
          "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts",
          "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
          "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
          "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
          "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
          "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
          "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"}

# Short names already used on screen, where the generic rules would read badly.
EXTRA_NAMES = {
    "university-of-alabama-at-birmingham": "UAB", "the-university-of-alabama": "Alabama",
    "metropolitan-state-university-of-denver": "MSU Denver", "university-of-colorado-colorado-springs": "UCCS",
    "university-of-colorado-boulder": "CU Boulder", "colorado-state-university-fort-collins": "Colorado State",
    "university-of-illinois-urbana-champaign": "UIUC", "university-of-illinois-chicago": "UIC",
    "indiana-university-purdue-university-indianapolis": "IU Indianapolis", "indiana-university-bloomington": "Indiana",
    "purdue-university-main-campus": "Purdue", "university-of-south-carolina-columbia": "South Carolina",
    "university-of-georgia": "UGA", "georgia-institute-of-technology-main-campus": "Georgia Tech",
    "university-of-michigan-ann-arbor": "Michigan", "ohio-state-university-main-campus": "Ohio State",
    "university-of-cincinnati-main-campus": "Cincinnati", "ohio-university-main-campus": "Ohio University",
    "kent-state-university-at-kent": "Kent State", "miami-university-oxford": "Miami (Ohio)",
    "the-university-of-texas-at-austin": "UT Austin", "texas-a-and-m-university-college-station": "Texas A&M",
    "louisiana-state-university-and-agricultural-and-mechanical-college": "LSU",
    "tulane-university-of-louisiana": "Tulane", "university-of-washington-seattle-campus": "Washington",
    "arizona-state-university-campus-immersion": "Arizona State", "university-of-missouri-columbia": "Mizzou",
    "university-of-north-carolina-at-chapel-hill": "UNC Chapel Hill", "new-york-university": "NYU",
    "massachusetts-institute-of-technology": "MIT", "california-institute-of-technology": "Caltech",
    "university-of-southern-california": "USC", "university-of-california-los-angeles": "UCLA",
    "university-of-pennsylvania": "Penn", "pennsylvania-state-university-main-campus": "Penn State",
}
RANK_NAMES = {s: n for g in RANKINGS for n, s in g["members"]}


def short(slug):
    for table in (EXTRA_NAMES, RANK_NAMES, NAMES):
        if slug in table:
            return table[slug]
    c = CAMP.get(slug, {})
    n = c.get("n") or slug.replace("-", " ").title()
    n = re.sub(r"\s*-\s*(Main Campus|Campus Immersion)$", "", n)
    n = re.sub(r"^The ", "", n)
    city = c.get("c", "")
    m = re.match(r"^(.*?)\s*-\s*(.+)$", n)
    if m and m.group(2) == city:
        n = m.group(1)
    if city and n.endswith(f" at {city}"):
        n = n[: -len(f" at {city}")]
    n = re.sub(r"^University of ", "", n)
    n = re.sub(r" University$", "", n)
    return n.strip()


NAME2SLUG = {}
for _table in (NAMES, RANK_NAMES, EXTRA_NAMES):
    for _s, _n in _table.items():
        NAME2SLUG[_n.lower()] = _s

OLD_PAC12 = ["university-of-california-los-angeles", "university-of-southern-california", "stanford-university",
             "university-of-california-berkeley", "university-of-oregon", "oregon-state-university",
             "university-of-washington-seattle-campus", "washington-state-university", "university-of-arizona",
             "arizona-state-university-campus-immersion", "university-of-utah", "university-of-colorado-boulder"]
# Household names, for the "famous universities" grouping and the fame score.
TIER3 = ["harvard-university", "stanford-university", "massachusetts-institute-of-technology", "yale-university",
         "princeton-university", "columbia-university-in-the-city-of-new-york", "university-of-pennsylvania",
         "brown-university", "cornell-university", "dartmouth-college", "duke-university", "university-of-chicago",
         "california-institute-of-technology", "northwestern-university", "johns-hopkins-university",
         "new-york-university", "university-of-southern-california", "university-of-california-los-angeles",
         "university-of-california-berkeley", "university-of-michigan-ann-arbor", "ohio-state-university-main-campus",
         "the-university-of-alabama", "the-university-of-texas-at-austin", "university-of-florida",
         "university-of-notre-dame", "university-of-north-carolina-at-chapel-hill",
         "pennsylvania-state-university-main-campus", "university-of-georgia", "clemson-university",
         "louisiana-state-university-and-agricultural-and-mechanical-college", "georgetown-university",
         "texas-a-and-m-university-college-station", "auburn-university", "florida-state-university"]
TIER3 = [s for s in TIER3 if s in SCENE] + [s for s in SCENE if s.startswith("columbia-university") and s not in TIER3][:1]
POWER = {s for g in RANKINGS if g["s"] in ("big-ten", "sec", "acc", "big-12", "ivy-league", "university-of-california")
         for _, s in g["members"]} | set(OLD_PAC12)
FAMOUS_20 = [s for s in TIER3 if s in (
    "harvard-university", "stanford-university", "massachusetts-institute-of-technology", "yale-university",
    "princeton-university", "university-of-pennsylvania", "brown-university", "cornell-university",
    "dartmouth-college", "duke-university", "university-of-chicago", "california-institute-of-technology",
    "northwestern-university", "johns-hopkins-university", "new-york-university", "university-of-southern-california",
    "university-of-california-los-angeles", "university-of-california-berkeley", "university-of-michigan-ann-arbor",
    "georgetown-university") or s.startswith("columbia-university")]

RIVALRIES = [("university-of-michigan-ann-arbor", "ohio-state-university-main-campus", "The Game"),
             ("the-university-of-alabama", "auburn-university", "the Iron Bowl"),
             ("university-of-southern-california", "university-of-california-los-angeles", "the crosstown rivalry"),
             ("the-university-of-texas-at-austin", "texas-a-and-m-university-college-station", "the Lone Star Showdown"),
             ("university-of-florida", "florida-state-university", "the Sunshine Showdown"),
             ("university-of-north-carolina-at-chapel-hill", "duke-university", "the Tobacco Road rivalry"),
             ("university-of-california-berkeley", "stanford-university", "the Big Game"),
             ("university-of-oregon", "oregon-state-university", "the Oregon rivalry"),
             ("university-of-washington-seattle-campus", "washington-state-university", "the Apple Cup"),
             ("harvard-university", "yale-university", "The Game (the other one)"),
             ("university-of-georgia", "georgia-institute-of-technology-main-campus", "Clean, Old-Fashioned Hate"),
             ("clemson-university", "university-of-south-carolina-columbia", "the Palmetto Bowl"),
             ("indiana-university-bloomington", "purdue-university-main-campus", "the Old Oaken Bucket"),
             ("university-of-arizona", "arizona-state-university-campus-immersion", "the Territorial Cup"),
             ("university-of-virginia-main-campus", "virginia-polytechnic-institute-and-state-university", "the Commonwealth Clash"),
             ("university-of-pittsburgh-pittsburgh-campus", "pennsylvania-state-university-main-campus", "the Backyard Brawl")]
RIVALRIES = [r for r in RIVALRIES if r[0] in SCENE and r[1] in SCENE]

# When a candidate's schools or format line up with what's happening, it gets a boost.
CALENDAR = [
    {"start": "2026-11-20", "end": "2026-11-29", "format": "rivalry", "weight": 0.35,
     "why": "rivalry week (The Game, the Iron Bowl and the Apple Cup are Nov 28)"},
    {"start": "2026-11-23", "end": "2026-11-27", "weight": 0.1, "why": "Thanksgiving week: students heading home"},
    {"start": "2026-12-04", "end": "2026-12-06", "kinds": ["conference"], "weight": 0.15,
     "why": "conference championship weekend"},
    {"start": "2026-12-07", "end": "2026-12-18", "weight": 0.1, "why": "finals: students eating near campus at odd hours"},
    {"start": "2026-11-03", "end": "2027-03-15", "keys": ["conf:acc", "conf:big-12", "conf:big-ten", "conf:sec"],
     "weight": 0.05, "why": "college basketball season"},
]

TWO_YEAR = re.compile(r"Community|Technical|Junior|Digital|Online|Global|Medical|Health Science|Graduate|"
                      r"Seminary|System$|Area |Lone Star|Pikes Peak|Front Range|Harold Washington|Lake County", re.I)
FOUR_YEAR_COLLEGE = re.compile(r"^(Boston|Dartmouth|Emerson|Hunter|Brooklyn|Queens|Barnard|Lehman|John Jay|City|Berklee|"
                               r"Ithaca|Babson|Bentley|Spelman|Morehouse|Bard|Davidson|Middlebury|Williams|Amherst|"
                               r"Wellesley|Bowdoin|Oberlin|Vassar|Swarthmore|Pomona|Hamilton|Colby|Bates|Skidmore|"
                               r"Kenyon|Grinnell|Carleton|Macalester|Dickinson|Bryn Mawr|Haverford|Smith|Occidental|"
                               r"Reed|Whitman|Trinity|Simmons) College|^College of |CUNY|Baruch", re.I)


def four_year(slug):
    n = CAMP.get(slug, {}).get("n", "")
    if TWO_YEAR.search(n):
        return False
    if re.search(r"College( System)?$", n) and not FOUR_YEAR_COLLEGE.search(n):
        return False
    return True


def fame(slug):
    if slug in TIER3:
        return 3.0
    if slug in POWER:
        return 2.0
    return 1.5 if CAMP.get(slug, {}).get("sz", 0) >= 5 else 1.0


def fame_by_name(name):
    s = NAME2SLUG.get(name.strip().lower())
    return fame(s) if s else 1.0


# ---- groupings and rankings ---------------------------------------------------

METRICS = {
    "w": {"value": lambda p: p.get("w"), "phrase": "restaurants within a 10-minute walk",
          "of_campus": "restaurants within a 10-minute walk of campus", "label": "places to eat within a 10-minute walk",
          "method": "Places to eat within half a mile of each campus's center, using Overture Maps listings."},
    "street": {"value": lambda p: (p.get("st") or [[None, None]])[0][1], "phrase": "places to eat on one street",
               "of_campus": "places to eat on its busiest food street", "label": None,
               "method": "Places to eat on each campus's busiest street, within a mile of its center, using Overture Maps listings."},
}


def comparable(slug, metric):
    p = SCENE.get(slug)
    if not p or METRICS[metric]["value"](p) is None:
        return False
    return metric != "street" or p.get("r") == 1.0


def ranking(members, metric):
    vals = [(s, METRICS[metric]["value"](SCENE[s])) for s in members]
    vals.sort(key=lambda x: (-x[1], short(x[0])))
    return [(1 + sum(1 for _, w in vals if w > v), s, v) for s, v in vals]


def all_groups():
    out, seen = [], set()
    for g in RANKINGS:
        members = [s for _, s in g["members"]]
        if g["s"] == "university-of-california":
            key, kind, which, head = "system:uc", "system", "Which UC campus", "UC campuses"
            title = desc = f"All {len(members)} UC campuses"
            cta = "Send this to your friend at another UC."
        elif g["noun"] == "university":
            st = {v: k for k, v in STATES.items()}[g["name"]]
            key, kind, which, head = f"state:{st}", "state", f"Which big {g['name']} university", f"Big {g['name']} universities"
            title, desc = f"Big {g['name']} universities", f"The big {g['name']} universities"
            cta = f"Send this to your friend at another {g['name']} school."
        else:
            key, kind, which, head = f"conf:{g['s']}", "conference", f"Which {g['name']} school", f"{g['name']} schools"
            title = desc = f"All {len(members)} {g['name']} schools"
            cta = f"Send this to your friend at another {g['name']} school."
        noun1 = {"system": "UC campus", "state": f"big {g['name']} university"}.get(kind, f"{g['name']} school")
        out.append(dict(key=key, kind=kind, which=which, head=head, title=title, desc=desc, cta=cta, noun1=noun1,
                        members=members, link=f"{SITE}/rankings/{g['s']}/", region=key, place=g["name"] if kind == "state" else None))
        seen.add(key)
    out.append(dict(key="conf:pac12-old", kind="conference", which="Which old Pac-12 school", head="The old Pac-12",
                    title="The 12 schools of the old Pac-12", desc="All 12 schools of the old Pac-12",
                    cta="Send this to your friend at another Pac-12 school.", members=OLD_PAC12, noun1="old Pac-12 school",
                    link=f"{SITE}/rankings/", region="conf:pac12-old"))
    out.append(dict(key="famous:20", kind="famous", which="Which famous university", head="Famous universities",
                    title=f"{len(FAMOUS_20)} famous American universities", desc=f"{len(FAMOUS_20)} famous American universities",
                    cta="Send this to a friend at one of these schools.", members=FAMOUS_20, noun1="school on the list",
                    link=f"{SITE}/rankings/", region="famous"))
    by_state, by_city = {}, {}
    for s, c in CAMP.items():
        if s not in SCENE or not four_year(s):
            continue
        if c.get("sz", 0) >= 4:
            by_state.setdefault(c["r"], []).append(s)
        if c.get("sz", 0) >= 3 and c.get("c"):
            by_city.setdefault((c["c"], c["r"]), []).append(s)
    for st, members in by_state.items():
        key = f"state:{st}"
        if key in seen or len(members) < 4 or st not in STATES:
            continue
        name = "DC" if st == "DC" else "Washington state" if st == "WA" else STATES[st]
        which = "Which big university in Washington state" if st == "WA" else f"Which big {name} university"
        out.append(dict(key=key, kind="state", which=which, head=f"Big {name} universities",
                        title=f"{name} universities with 10,000+ students", desc=f"Every {name} university with 10,000+ students",
                        cta=f"Send this to your friend at another {name} school.", members=members, noun1=f"big {name} university",
                        link=f"{SITE}/campus/{st.lower()}", region=key, place=STATES[st]))
    for (city, st), members in by_city.items():
        if len(members) < 5:
            continue
        out.append(dict(key=f"city:{city}-{st}", kind="city", which=f"Which college in {city}", head=f"{city} colleges",
                        title=f"{city} colleges with 5,000+ students", desc=f"Every {city} college with 5,000+ students",
                        cta=f"Send this to your friend at another {city} college.", members=members, noun1=f"college in {city}", place=city,
                        link=f"{SITE}/campus/{st.lower()}", region=f"state:{st}", check="dense city: look at every map before trusting a count"))
    return out


# ---- what has run before -----------------------------------------------------

GROUP_WORDS = {"Big Ten": "conf:big-ten", "SEC": "conf:sec", "ACC": "conf:acc", "Big 12": "conf:big-12",
               "Ivy League": "conf:ivy-league", "Ivy": "conf:ivy-league", "UC": "system:uc", "Cal State": "system:csu",
               "old Pac-12": "conf:pac12-old"}


def infer_key(v):
    hook = next((s for s in v.get("scenes", []) if s.get("style") == "hook"), {})
    t = hook.get("text", "").replace("*", "")
    metric = "street" if "food street" in t else "w" if "walk" in t else None
    m = re.search(r"Which (?:big )?(.+?) (?:university|school|campus|college)\b", t)
    if not m:   # older wording: "Which Ivy has...", "Big Ten schools ranked by..."
        hit = next((w for w in sorted(GROUP_WORDS, key=len, reverse=True) if re.search(rf"\b{re.escape(w)}\b", t)), None)
        return (GROUP_WORDS[hit], metric) if hit else (None, metric)
    g = m.group(1)
    if g in GROUP_WORDS:
        return GROUP_WORDS[g], metric
    st = {v2: k for k, v2 in STATES.items()}.get(g)
    return (f"state:{st}", metric) if st else (None, metric)


def past_videos():
    rows = []
    for d in sorted(os.listdir(BATCHES)) if os.path.isdir(BATCHES) else []:
        spec = jload(os.path.join(BATCHES, d, "videos.json"))
        if not spec:
            continue
        posts = jload(os.path.join(BATCHES, d, "posts.json"), {})
        at = {p["video"]: p.get("at") for p in posts.get("tiktok", [])}
        for v in spec.get("videos", []):
            lab = v.get("lab", {})
            key, metric = (lab.get("key"), lab.get("metric")) if lab.get("key") else infer_key(v)
            rows.append({"date": spec.get("date", d[:10]), "id": v["id"], "video": v, "at": at.get(v["id"]),
                         "key": key, "metric": metric, "format": lab.get("format") or video_format(v)})
    return rows


def video_format(v):
    scenes = v.get("scenes", [])
    hook = next((s for s in scenes if s.get("style") == "hook"), {})
    if v["id"].endswith("-tell") or hook.get("text", "").lower().startswith("how to tell"):
        return "tip"
    return "countdown" if sum(1 for s in scenes if s.get("style") == "rank") >= 3 else "other"


# ---- features ---------------------------------------------------------------

FEATS = [  # name, kind; "fmt" = untested formats, given a wider prior so they get explored
    ("countdown", "bin"), ("tip", "bin"), ("rivalry", "fmt"), ("guess", "fmt"), ("short", "fmt"), ("part2", "fmt"),
    ("g_conference", "bin"), ("g_system", "bin"), ("g_city", "fmt"), ("g_famous", "fmt"),
    ("fame_mean", "num"), ("tease_fame", "num"), ("named_tease", "bin"), ("log_margin", "num"),
    ("n_schools", "num"), ("metric_street", "fmt"), ("evening", "bin"), ("weekend", "bin"), ("log_age", "num"),
    ("punch", "fmt"), ("loop_end", "fmt"),     # style settings from Lab v2's playbook (lab2.py)
]
SAY = {
    "countdown": "a countdown of named schools (vs. the first week's videos)",
    "tip": "a 'how to tell' tip (vs. the first week's videos)",
    "rivalry": "a two-school rivalry head-to-head", "guess": "a 'guess the campus' video", "short": "a 15-20 second top-3 cut",
    "part2": "a 'part 2' of an earlier hit", "g_conference": "grouping by conference (vs. state)",
    "g_system": "grouping by university system (UC, Cal State)", "g_city": "grouping by city", "g_famous": "a famous-schools grouping",
    "fame_mean": "more famous schools on screen (+1 tier)", "tease_fame": "a more famous school named in the tease (+1 tier)",
    "named_tease": "naming the upset in the hook ('Hint: it's not X')", "log_margin": "a bigger lead for #1 (x2)",
    "n_schools": "one more school in the ranking", "metric_street": "ranking by busiest food street (vs. walkable count)",
    "evening": "posting at 6 or 9 PM (vs. noon or 3 PM)", "weekend": "posting on a weekend", "log_age": "an older video (x2 age)",
    "punch": "punch-in cuts on the map scenes (faster pacing)", "loop_end": "a looping ending (no end card)",
}


def features_of(v, at, fmt, key, metric):
    scenes = v.get("scenes", [])
    hook = next((s for s in scenes if s.get("style") == "hook"), {})
    ranks = [s for s in scenes if s.get("style") == "rank"]
    lists = [s for s in scenes if s.get("style") == "list"]
    kind = key.split(":")[0] if key else ""
    f = {name: 0.0 for name, _ in FEATS}
    f["countdown"] = 1.0 if fmt in ("countdown", "short", "part2") else 0.0
    f["tip"] = 1.0 if fmt == "tip" else 0.0
    for x in ("rivalry", "guess", "short", "part2"):
        f[x] = 1.0 if fmt == x else 0.0
    f["g_conference"] = 1.0 if kind == "conf" else 0.0
    f["g_system"] = 1.0 if kind == "system" else 0.0
    f["g_city"] = 1.0 if kind == "city" else 0.0
    f["g_famous"] = 1.0 if kind == "famous" else 0.0
    slugs = [s["map"] for s in ranks if s.get("map")]
    f["fame_mean"] = float(np.mean([fame(s) for s in slugs])) if slugs else 1.0
    m = re.search(r"it's not (.+?)\.?$", hook.get("sub", ""))
    names = re.split(r" or |, ", m.group(1)) if m else []
    f["named_tease"] = 1.0 if names else 0.0
    f["tease_fame"] = max(fame_by_name(n) for n in names) if names else 0.0
    by_num = {s.get("num"): s.get("count") for s in ranks}
    c1, c2 = by_num.get("1"), by_num.get("2")
    f["log_margin"] = math.log2(max(c1, 1) / max(c2, 1)) if c1 and c2 else 0.0
    f["n_schools"] = float(len(ranks) + sum(len(l.get("rows", [])) for l in lists))
    f["metric_street"] = 1.0 if metric == "street" else 0.0
    if at:
        t = dt.datetime.fromisoformat(at).astimezone(NY)
        f["evening"] = 1.0 if t.hour >= 17 else 0.0
        f["weekend"] = 1.0 if t.weekday() >= 5 else 0.0
    style = v.get("lab", {}).get("style", {})
    f["punch"] = 1.0 if style.get("punch") else 0.0
    f["loop_end"] = 1.0 if style.get("loop_end") else 0.0
    return f


def tiktok_rows():
    """Training rows: every TikTok at least a day old, matched to its script."""
    stats = jload(os.path.join(SOCIAL, "stats.json"), {})
    pulled = dt.datetime.fromisoformat(stats.get("pulled", dt.datetime.now(dt.timezone.utc).isoformat()))
    vids = {r["id"]: r for r in past_videos()}
    snaps = load_snapshots()
    lengths = {}
    if os.path.exists(os.path.join(LAB, "videos.jsonl")):
        for line in open(os.path.join(LAB, "videos.jsonl")):
            if line.strip():
                d = json.loads(line)
                lengths[d["id"]] = d["duration_s"]
    rows = []
    for p in stats.get("posts", []):
        if p.get("service", "").lower() != "tiktok" or p.get("views") is None or not p.get("what"):
            continue
        sent = dt.datetime.fromisoformat(p["sent"].replace("Z", "+00:00"))
        age = (pulled - sent).total_seconds() / 86400
        if age < 1:
            continue
        views, watch, shares = p["views"], p.get("avg_watch_s") or 0, p.get("shares") or 0
        at72 = snap_at(snaps.get(p["what"], []), sent, 3.0)
        if at72:
            views, age = at72, 3.0
        r = vids.get(p["what"])
        f = (features_of(r["video"], r["at"], r["format"], r["key"], r["metric"]) if r
             else {**{n: 0.0 for n, _ in FEATS}, "fame_mean": 1.0})
        f["log_age"] = math.log2(max(age, 0.5))
        rows.append({"id": p["what"], "sent": p["sent"], "views": views, "watch": watch, "shares": shares,
                     "duration": lengths.get(p["what"]), "f": f, "key": r["key"] if r else None,
                     "format": r["format"] if r else "other"})
    # School features only mean something for videos that show schools. For the
    # rest, fill in the average of those that do, so "how famous" is learned
    # among rankings instead of soaking up the difference between formats.
    with_schools = [r for r in rows if r["format"] not in ("tip", "other")]
    for name in SCHOOL_FEATS:
        avg = float(np.mean([r["f"][name] for r in with_schools])) if with_schools else 0.0
        for r in rows:
            if r["format"] in ("tip", "other"):
                r["f"][name] = avg
    return rows


SCHOOL_FEATS = ("fame_mean", "tease_fame", "named_tease", "log_margin", "n_schools")
NOVEL = ("rivalry", "guess", "short", "part2", "g_city", "g_famous", "g_system", "metric_street")


# ---- snapshots ----------------------------------------------------------------

def load_snapshots():
    out = {}
    path = os.path.join(LAB, "snapshots.jsonl")
    if os.path.exists(path):
        for line in open(path):
            try:
                s = json.loads(line)
            except json.JSONDecodeError:
                continue
            out.setdefault(s["id"], []).append(s)
    return out


def snap_at(snaps, sent, days):
    """Views at `days` old, interpolated from snapshots taken within a day of it."""
    pts = []
    for s in snaps:
        age = (dt.datetime.fromisoformat(s["pulled"]) - sent).total_seconds() / 86400
        pts.append((age, s["views"]))
    pts.sort()
    before = [p for p in pts if days - 1 <= p[0] <= days]
    after = [p for p in pts if days <= p[0] <= days + 1]
    if before and after:
        (a0, v0), (a1, v1) = before[-1], after[0]
        return v0 if a1 == a0 else v0 + (v1 - v0) * (days - a0) / (a1 - a0)
    return None


def snapshot():
    stats = jload(os.path.join(SOCIAL, "stats.json"), {})
    path = os.path.join(LAB, "snapshots.jsonl")
    os.makedirs(LAB, exist_ok=True)
    done = set()
    if os.path.exists(path):
        done = {json.loads(l).get("pulled") for l in open(path) if l.strip()}
    if stats.get("pulled") in done:
        print(f"snapshot {stats.get('pulled')} already recorded")
        return
    n = 0
    with open(path, "a") as f:
        for p in stats.get("posts", []):
            if p.get("service", "").lower() == "tiktok" and p.get("what") and p.get("views") is not None:
                f.write(json.dumps({"pulled": stats["pulled"].replace("Z", "+00:00"), "id": p["what"], "sent": p["sent"],
                                    "views": p["views"], "watch": p.get("avg_watch_s"), "shares": p.get("shares")}) + "\n")
                n += 1
    print(f"snapshot: {n} videos at {stats.get('pulled')}")


# ---- the model ----------------------------------------------------------------

def design(rows):
    raw = np.array([[r["f"][n] for n, _ in FEATS] for r in rows], dtype=float)
    mean, std = raw.mean(axis=0), raw.std(axis=0)
    design.lo, design.hi = raw.min(axis=0), raw.max(axis=0)
    for j, (_, kind) in enumerate(FEATS):
        if kind != "num" or std[j] < 1e-9:
            mean[j], std[j] = 0.0, 1.0
    return raw, mean, std


def fit_outcome(rows, y, mean, std, m0=None, sd_over=None):
    """Bayesian linear model. m0 / sd_over: starting beliefs (from the niche) for some features."""
    raw = np.array([[r["f"][n] for n, _ in FEATS] for r in rows], dtype=float)
    X = np.hstack([np.ones((len(rows), 1)), (raw - mean) / std])
    sd = np.array([10.0] + [1.0 if k == "fmt" else 0.6 if k == "bin" else 0.3 for _, k in FEATS])
    for j, v in (sd_over or {}).items():
        sd[j] = v
    m0 = np.zeros(X.shape[1]) if m0 is None else m0
    P = np.diag(1 / sd ** 2)
    s2 = float(np.var(y)) if len(y) > 1 else 1.0
    for _ in range(6):
        S = np.linalg.inv(X.T @ X / s2 + P)
        mu = S @ (X.T @ y / s2 + P @ m0)
        resid = y - X @ mu
        dof = max(1.0, len(y) - float(np.trace(X @ S @ X.T)) / s2)
        s2 = max(0.05, float(resid @ resid) / dof)
    r2 = 1 - float(resid @ resid) / max(1e-9, float(((y - y.mean()) ** 2).sum()))
    return {"mu": mu, "S": S, "s2": s2, "r2": r2}


def fit():
    rows = tiktok_rows()
    if len(rows) < 8:
        sys.exit("not enough videos to learn from yet")
    _, mean, std = design(rows)
    views = np.log1p(np.array([r["views"] for r in rows], dtype=float))
    names = [n for n, _ in FEATS]
    niche = jload(os.path.join(LAB, "niche.json"), {})
    m0, sd_over = np.zeros(1 + len(FEATS)), {}
    for k, v in niche.get("lab_priors", {}).items():
        if k in names:
            m0[1 + names.index(k)], sd_over[1 + names.index(k)] = v["mean"], v["sd"]
    m = {"rows": rows, "mean": mean, "std": std, "lo": design.lo, "hi": design.hi, "niche": niche,
         "views": fit_outcome(rows, views, mean, std, m0, sd_over)}
    wr = [r for r in rows if r["watch"] > 0]
    m["watch"] = fit_outcome(wr, np.array([r["watch"] for r in wr], dtype=float), mean, std)
    cr = [r for r in wr if r.get("duration")]
    m["completion_rows"] = cr
    if len(cr) >= 8:
        m["completion"] = fit_outcome(cr, np.array([r["watch"] / r["duration"] for r in cr], dtype=float), mean, std)
    m["share"] = fit_outcome(rows, np.log(np.array([(r["shares"] + 0.5) / (r["views"] + 1) * 1000 for r in rows])), mean, std)
    return m


def xvec(f, m):
    """Numeric inputs are clamped to what the model has seen: no extrapolating
    a 3-school short or an all-Ivy fame score beyond past videos."""
    raw = np.array([f[n] for n, _ in FEATS], dtype=float)
    for j, (_, kind) in enumerate(FEATS):
        if kind == "num":
            raw[j] = min(max(raw[j], m["lo"][j]), m["hi"][j])
    return np.concatenate([[1.0], (raw - m["mean"]) / m["std"]])


def effects(m, outcome="views"):
    """Plain-English effect of each feature: multiplier (views, shares) or seconds (watch)."""
    o = m[outcome]
    out = []
    for j, (name, kind) in enumerate(FEATS, start=1):
        b, sd = o["mu"][j] / m["std"][j - 1], math.sqrt(o["S"][j, j]) / m["std"][j - 1]
        z = b / sd if sd else 0
        shown = [r for r in m["rows"] if r["format"] not in ("tip", "other")]
        seen = (sum(1 for r in m["rows"] if r["f"][name] == 1.0) if kind != "num"
                else len(shown) if name in SCHOOL_FEATS else len(m["rows"]))
        out.append({"name": name, "b": b, "sd": sd, "z": z, "seen": seen,
                    "sure": "clear" if abs(z) >= 2 else "likely" if abs(z) >= 1 else "unclear"})
    return sorted(out, key=lambda e: -abs(e["z"]))


# ---- candidates -----------------------------------------------------------------

def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def pick_tease(rows):
    """The most famous school that didn't win, if it's at least as famous as the winner."""
    top_fame = fame(rows[0][1])
    rank3 = {s: i for i, s in enumerate(TIER3)}
    losers = [(fame(s), -rank3.get(s, 99), CAMP.get(s, {}).get("sz", 0), r, s) for r, s, v in rows if r > 1]
    if not losers:
        return None
    f, _, _, r, s = max(losers)
    return (s, r) if f >= top_fame and f >= 2 else None


def headline(rows, metric, desc_noun):
    """A one-line fact that is true by construction."""
    of = METRICS[metric]["of_campus"]
    (r1, s1, v1), (r2, s2, v2) = rows[0], rows[1]
    n1, n2 = short(s1), short(s2)
    if r2 == 1:
        return f"{n1} and {n2} are tied for the most {of}, with {v1} each."
    vals = [v for _, _, v in rows]
    if len(vals) >= 4 and v1 > sum(vals[1:4]):
        return f"{n1} has more {of} than {n2}, {short(rows[2][1])} and {short(rows[3][1])} combined."
    if v2 > 0 and v1 > 2 * v2:
        k = int(v1 // v2) if v1 % v2 else int(v1 // v2) - 1
        times = "twice" if k == 2 else f"{['', '', 'two', 'three', 'four', 'five'][k]} times" if k <= 5 else f"{k} times"
        return f"{n1} has more than {times} as many {of} as {n2}."
    if v1 - v2 <= max(2, round(0.08 * v1)):
        return f"{n1} edges out {n2} by {v1 - v2} for the most {of}."
    return f"{n1} has the most {of} of any {desc_noun}. {n2} is {v1 - v2} behind."


def base_features(fmt, kind, shown, tease, margin, n_schools, metric):
    f = {n: 0.0 for n, _ in FEATS}
    f["countdown"] = 1.0 if fmt in ("countdown", "short", "part2") else 0.0
    for x in ("rivalry", "guess", "short", "part2"):
        f[x] = 1.0 if fmt == x else 0.0
    f["g_conference"] = 1.0 if kind == "conference" else 0.0
    f["g_system"] = 1.0 if kind == "system" else 0.0
    f["g_city"] = 1.0 if kind == "city" else 0.0
    f["g_famous"] = 1.0 if kind == "famous" else 0.0
    f["fame_mean"] = float(np.mean([fame(s) for s in shown])) if shown else 1.0
    f["named_tease"] = 1.0 if tease else 0.0
    f["tease_fame"] = fame(tease[0]) if tease else 0.0
    f["log_margin"] = margin
    f["n_schools"] = float(n_schools)
    f["metric_street"] = 1.0 if metric == "street" else 0.0
    f["evening"], f["log_age"] = 0.5, math.log2(3)
    return f


def candidates(date):
    out = []
    groups = all_groups()
    for g in groups:
        for metric in METRICS:
            if not all(comparable(s, metric) for s in g["members"]) or len(g["members"]) < 4:
                continue
            rows = ranking(g["members"], metric)
            if rows[0][2] < 10 or rows[1][2] == rows[0][2] == 0:
                continue
            tease = pick_tease(rows)
            shown = [s for r, s, v in rows[:5]]
            margin = math.log2(max(rows[0][2], 1) / max(rows[1][2], 1))
            noun = g["head"].lower().rstrip("s") if g["kind"] != "state" else "big " + g["head"].split(" ", 1)[1].lower()[:-1]
            base = dict(group=g, metric=metric, rows=rows, tease=tease, key=g["key"], kind=g["kind"],
                        head=headline(rows, metric, g["noun1"]))
            out.append(dict(base, format="countdown", id=f"{g['key']}|{metric}|countdown",
                            f=base_features("countdown", g["kind"], shown, tease, margin, len(rows), metric)))
            out.append(dict(base, format="short", id=f"{g['key']}|{metric}|short",
                            f=base_features("short", g["kind"], [s for _, s, _ in rows[:3]], tease, margin, 3, metric)))
    for a, b, label in RIVALRIES:
        rows = ranking([a, b], "w")
        if rows[0][2] == rows[1][2]:
            continue
        margin = math.log2(max(rows[0][2], 1) / max(rows[1][2], 1))
        out.append(dict(format="rivalry", id=f"rivalry:{a}|{b}", key=f"rivalry:{a}|{b}", kind="rivalry", metric="w",
                        rows=rows, tease=None, label=label, group=None,
                        f=base_features("rivalry", "", [a, b], None, margin, 2, "w")))
    rounds = []
    for s in TIER3:
        p, c = SCENE.get(s), CAMP.get(s, {})
        if not p or p.get("w", 0) < 40:
            continue
        pool = [o for o in POWER | set(TIER3) if o != s and o in SCENE and CAMP.get(o, {}).get("r") == c.get("r")]
        pool = sorted(pool, key=lambda o: (-fame(o), short(o)))[:2]
        if len(pool) == 2:
            rounds.append([(1, s, p["w"])] + [(0, o, SCENE[o]["w"]) for o in pool])
    for a in rounds:
        for b in rounds:
            sa, sb = a[0][1], b[0][1]
            if sa >= sb or CAMP[sa]["r"] == CAMP[sb]["r"]:
                continue
            third = next((r for r in rounds if r[0][1] > sb and CAMP[r[0][1]]["r"] not in (CAMP[sa]["r"], CAMP[sb]["r"])), None)
            if not third:
                continue
            sc = third[0][1]
            out.append(dict(format="guess", id=f"guess:{sa}|{sb}|{sc}", key=f"guess:{sa}|{sb}|{sc}", kind="guess", metric="w",
                            rows=a, rounds=[a, b, third], tease=None, group=None,
                            f=base_features("guess", "", [sa, sb, sc], None, 0.0, 9, "w")))
    best = past_hits()
    for g in groups:
        if g["key"] in best and comparable_all(g, "street"):
            rows = ranking(g["members"], "street")
            tease = pick_tease(rows)
            margin = math.log2(max(rows[0][2], 1) / max(rows[1][2], 1))
            out.append(dict(format="part2", id=f"{g['key']}|street|part2", key=g["key"], kind=g["kind"], metric="street",
                            rows=rows, tease=tease, group=g,
                            head=headline(rows, "street", g["noun1"]),
                            f=base_features("part2", g["kind"], [s for _, s, _ in rows[:5]], tease, margin, len(rows), "street")))
    return out


def comparable_all(g, metric):
    return all(comparable(s, metric) for s in g["members"])


def past_hits(min_views=1500):
    stats = jload(os.path.join(SOCIAL, "stats.json"), {})
    views = {p["what"]: p.get("views") or 0 for p in stats.get("posts", []) if p.get("service", "").lower() == "tiktok"}
    return {r["key"] for r in past_videos() if r["key"] and views.get(r["id"], 0) >= min_views}


def adjustments(c, date, history):
    """Novelty penalties and trend boosts, in log-views. Returns (total, reasons) or None to exclude."""
    d = dt.date.fromisoformat(date)
    adj, why = 0.0, []
    for h in history:
        age = (d - dt.date.fromisoformat(h["date"])).days
        if age < 0 or age > 14:
            continue
        if h["key"] and h["key"] == c["key"]:
            if h["metric"] == c["metric"] and c["format"] != "part2":
                return None
            if c["format"] != "part2":
                adj -= 0.25
                why.append(f"same grouping {age}d ago (-0.25)")
        if age <= 3 and c.get("group") and h["key"] and h["key"].split(":")[0] == "state" and c["group"]["region"] == h["key"]:
            adj -= 0.15
            why.append("same state in the last 3 days (-0.15)")
        if age <= 2 and c["format"] not in ("countdown",) and h["format"] == c["format"]:
            adj -= 0.2
            why.append(f"{c['format']} used {age}d ago (-0.2)")
        tease = c.get("tease")
        if tease and age <= 7:
            hook = next((s for s in h["video"].get("scenes", []) if s.get("style") == "hook"), {})
            if short(tease[0]) in hook.get("sub", ""):
                adj -= 0.3
                why.append(f"teased {short(tease[0])} {age}d ago (-0.3)")
    for e in CALENDAR:
        if not (e["start"] <= date <= e["end"]):
            continue
        if ("format" in e and e["format"] != c["format"]) or ("kinds" in e and c["kind"] not in e["kinds"]) \
                or ("keys" in e and c["key"] not in e["keys"]):
            continue
        adj += e["weight"]
        why.append(f"{e['why']} (+{e['weight']})")
    trends = jload(os.path.join(LAB, "trends.json"), {})
    text = " ".join(short(s) for _, s, _ in c["rows"]) + " " + c["key"]
    for t in trends.get("boost", []) if trends.get("date", date) >= (d - dt.timedelta(days=2)).isoformat() else []:
        if re.search(t["match"], text, re.I):
            adj += float(t.get("weight", 0.15))
            why.append(f"in the news: {t.get('why', t['match'])} (+{t.get('weight', 0.15)})")
    return adj, why


def plan(date, seed=None, draws=300):
    m = fit()
    rng = np.random.default_rng(seed if seed is not None else int(date.replace("-", "")))
    history = past_videos()
    o = m["views"]
    cands = []
    for c in candidates(date):
        a = adjustments(c, date, history)
        if a is None:
            continue
        c["adj"], c["adj_why"] = a
        x = xvec(c["f"], m)
        c["x"] = x
        c["pred"] = float(x @ o["mu"])
        c["pred_sd"] = float(math.sqrt(x @ o["S"] @ x))
        cands.append(c)
    betas = rng.multivariate_normal(o["mu"], o["S"], size=draws)
    X = np.array([c["x"] for c in cands])
    adj = np.array([c["adj"] for c in cands])
    scores = X @ betas.T + adj[:, None]
    # What counts as new: formats, groupings and metrics seen in fewer than 3 videos.
    untested = {n for n, k in FEATS if n in NOVEL and sum(1 for r in m["rows"] if r["f"][n] == 1.0) < 3}
    for c in cands:
        nov = {n for n in untested if c["f"][n] == 1.0}
        if c["format"] == "part2":
            nov.discard("metric_street")          # a part 2 is defined by its new metric
        c["novel"] = sorted(nov)
    is_cd = np.array([c["format"] == "countdown" and not c["novel"] for c in cands])
    is_ex = np.array([len(c["novel"]) == 1 for c in cands])
    for i, c in enumerate(cands):
        pool = is_cd if is_cd[i] else is_ex
        if not pool.any():
            c["win_rate"] = 0.0
            continue
        top = np.sort(scores[pool], axis=0)[-5:, :].min(axis=0)
        c["win_rate"] = float((scores[i] >= top).mean())
    s = scores[:, 0]
    chosen, used_keys, used_tops, used_kinds, used_novel = [], set(), set(), set(), set()
    for slot, pool, strict in (("proven", is_cd, True), ("proven", is_cd, False), ("experiment", is_ex, True)):
        order = sorted([i for i in range(len(cands)) if pool[i]], key=lambda i: -s[i])
        picked = sum(1 for c in chosen if c["slot"] == slot)
        if picked >= 2:
            continue
        for i in order:
            c = cands[i]
            top = c["rows"][0][1]
            if c["key"] in used_keys or top in used_tops:
                continue
            if slot == "proven" and strict and c["kind"] in used_kinds:
                continue
            if slot == "experiment" and set(c["novel"]) & used_novel:
                continue
            c["sample"], c["slot"] = float(s[i]), slot
            chosen.append(c)
            used_keys.add(c["key"]), used_tops.add(top), used_kinds.add(c["kind"])
            used_novel.update(c["novel"] + (["metric_street"] if c["format"] == "part2" else []))
            picked += 1
            if picked == 2:
                break
    cd = [c for c in chosen if c["slot"] == "proven"]
    ex = [c for c in chosen if c["slot"] == "experiment"]
    chosen = [x for pair in zip(cd, ex) for x in pair] + cd[len(ex):] + ex[len(cd):]
    ranked = sorted(cands, key=lambda c: -c["pred"])
    return m, chosen, ranked


def why_text(c, m):
    o = m["views"]
    contrib = [(FEATS[j - 1][0], float(c["x"][j] * o["mu"][j])) for j in range(1, len(FEATS) + 1)]
    contrib = [k for k in sorted(contrib, key=lambda t: -abs(t[1])) if abs(k[1]) > 0.05 and k[0] != "log_age"][:3]
    parts = [f"{'+' if v > 0 else '-'} {SAY[n]}" for n, v in contrib]
    return "; ".join(parts + c["adj_why"])


def describe(c):
    if c["format"] == "rivalry":
        return f"rivalry: {short(c['rows'][0][1])} vs {short(c['rows'][1][1])}"
    if c["format"] == "guess":
        return "guess the campus: " + ", ".join(short(r[0][1]) for r in c["rounds"])
    g = c["group"]
    t = f", tease {short(c['tease'][0])} ({ordinal(c['tease'][1])})" if c.get("tease") else ""
    return f"{c['format']}: {g['title']} by {c['metric']} (#1 {short(c['rows'][0][1])} {c['rows'][0][2]}{t})"


def cmd_plan(date):
    m, chosen, ranked = plan(date)
    out = {"date": date, "videos_learned_from": len(m["rows"]), "r2_views": round(m["views"]["r2"], 2), "chosen": [], "top": []}
    for c in chosen:
        out["chosen"].append(slim(c, m))
    for c in ranked[:15]:
        out["top"].append(slim(c, m))
    jsave(os.path.join(LAB, f"plan-{date}.json"), out)
    print(f"learned from {len(m['rows'])} videos (views R^2 {m['views']['r2']:.2f})\n\nchosen for {date}:")
    for c in out["chosen"]:
        print(f"  {c['slot'] or '':<10} {c['what']}  [new: {', '.join(c['new']) or 'nothing'}]\n            predicted {c['views_mid']:,} views (80%: {c['views_lo']:,}-{c['views_hi']:,}), "
              f"wins {c['win_rate']:.0%} of draws\n            why: {c['why']}")
    print("\nhighest predicted overall:")
    for c in out["top"][:8]:
        print(f"  {c['views_mid']:>6,}  {c['what']}")
    return out


def slim(c, m):
    lo, mid, hi = (math.expm1(c["pred"] + z * c["pred_sd"]) for z in (-1.28, 0, 1.28))
    return {"id": c["id"], "format": c["format"], "slot": c.get("slot"), "new": c.get("novel", []), "what": describe(c), "views_mid": int(mid), "views_lo": int(lo),
            "views_hi": int(hi), "win_rate": round(c.get("win_rate", 0), 3), "why": why_text(c, m)}


# ---- scripts ------------------------------------------------------------------

Q_CAMPUS = ["university campus autumn", "college students walking campus", "students on campus lawn"]


def rank_scene(c, i, num, label=None):
    r, s, v = c["rows"][i]
    p = SCENE[s]
    street = (p.get("st") or [[None]])[0][0]
    ties = [short(t) for rr, t, _ in c["rows"] if rr == r and t != s]
    sub = f"Busiest food street: {street}" if street else "Within half a mile of campus"
    if c["metric"] == "street":
        sub = "Within a mile of campus"
    if ties and num:
        sub = f"Tied with {' and '.join(ties)} for {ordinal(r)}. " + sub
    sc = {"beats": 8 if num == "1" else 7, "style": "rank", "num": num, "text": short(s), "count": v, "sub": sub, "map": s,
          "label": label or METRICS[c["metric"]]["label"] or f"places to eat on {street}"}
    return sc


ACRONYMS = {"washington-state-university": "WSU", "university-of-kansas": "KU", "kansas-state-university": "K-State",
            "university-of-houston": "UH", "university-of-houston-downtown": "UH-Downtown",
            "university-of-houston-clear-lake": "UH-Clear Lake", "oklahoma-state-university-main-campus": "Oklahoma State"}


def tease_name(slug, g):
    """'Hint: it's not Kansas' reads as the state in a Kansas ranking: say KU, or the University of Kansas."""
    n = short(slug)
    place = (g or {}).get("place")
    if place and place.lower() in n.lower():
        if slug in ACRONYMS:
            return ACRONYMS[slug]
        full = re.sub(r"\s*-\s*(Main Campus|Campus Immersion)$", "", CAMP.get(slug, {}).get("n", n))
        return "the " + full if full.startswith("University of ") else full
    return n


def style_for(vid, date):
    """Lab v2's settings for one video. One video in four flips one setting, so our own results can
    confirm or overrule what the niche suggests."""
    import random
    try:
        import lab2
        k = lab2.knobs()
    except Exception:
        k = {"shot_target_s": None, "hook_beats": 4, "loop_end": False}
    rng = random.Random(f"{date}:{vid}")
    shot = float(k.get("shot_target_s") or 6.0)
    punch, loop = shot < 5.0, bool(k.get("loop_end"))
    if rng.random() < 0.25:            # a real test: punch-ins every ~2 s, or none at all
        if rng.random() < 0.5:
            punch = not punch
            shot = 2.0 if punch else shot
        else:
            loop = not loop
    return {"punch": punch, "loop_end": loop, "hook_beats": int(k.get("hook_beats") or 4), "shot_target_s": shot}


def apply_style(spec, style):
    """Punch-ins to reach the target shot length, the hook length, and an optional looping ending."""
    scenes = spec["scenes"]
    if scenes and scenes[0]["style"] == "hook" and spec["lab"]["format"] in ("countdown", "short", "part2"):
        scenes[0]["beats"] = style["hook_beats"]
    used_punch = False
    if style["punch"]:
        for sc in scenes:
            if sc["style"] == "rank":
                n = int((sc["beats"] * 0.75) // style["shot_target_s"]) - 1
                if n > 0:
                    sc["punch"] = [round((i + 1) / (n + 1), 3) for i in range(n)]
                    used_punch = True
    used_loop = False
    if style["loop_end"] and spec["lab"]["format"] in ("countdown", "short", "part2") and scenes[-1]["style"] == "end":
        scenes.pop()                       # end on #1's map, which is also the opening frame: a seamless loop
        scenes[-1]["beats"] += 2
        used_loop = True
    spec["lab"]["style"] = {"punch": used_punch, "loop_end": used_loop, "hook_beats": scenes[0]["beats"],
                            "shot_target_s": style["shot_target_s"]}
    return spec


def video_spec(c, vid):
    return apply_style(_video_spec(c, vid), style_for(vid, c.get("date", "")))


def _video_spec(c, vid):
    g, metric, rows = c.get("group"), c["metric"], c["rows"]
    phrase = METRICS[metric]["phrase"]
    if c["format"] in ("countdown", "short", "part2"):
        q = "busiest *food street?*" if metric == "street" else f"most *{phrase}?*"
        if metric == "street":
            hook_text = f"{'Part 2: w' if c['format'] == 'part2' else 'W'}{g['which'][1:]} has the {q}"
        else:
            hook_text = f"{g['which']} has the {q}"
        sub = f"Hint: it's not {tease_name(c['tease'][0], g)}." if c.get("tease") else "Guess before it shows."
        scenes = [{"beats": 4, "style": "hook", "map": rows[0][1], "text": hook_text, "sub": sub}]
        top_n = min(3 if c["format"] == "short" else 5, len(rows))
        while top_n < len(rows) and top_n < 7 and rows[top_n][0] <= top_n:   # keep ties together
            top_n += 1
        rest = rows[top_n:]
        if rest and c["format"] != "short":
            scenes.append({"beats": max(4, min(16, len(rest) + 2)), "style": "list", "title": g["title"],
                           "rows": [[str(r), short(s), str(v)] for r, s, v in reversed(rest)], "q": Q_CAMPUS})
        for i in reversed(range(top_n)):
            scenes.append(rank_scene(c, i, str(rows[i][0])))
        end = {"beats": 6, "style": "end", "text": "Did we rank your school right? *Comment below.*", "sub": g["cta"]}
        if rest and c["format"] != "short":
            end["reuse"] = 1
        else:
            end["q"] = Q_CAMPUS
        scenes.append(end)
        source = g["link"]
    elif c["format"] == "rivalry":
        (_, w, vw), (_, l, vl) = rows
        scenes = [{"beats": 4, "style": "hook", "map": w,
                   "text": f"{short(rows[0][1])} vs {short(rows[1][1])}: which campus has more *restaurants within a 10-minute walk?*",
                   "sub": "Comment your guess before it shows."},
                  dict(rank_scene(c, 1, ""), beats=11), dict(rank_scene(c, 0, ""), beats=12),
                  {"beats": 8, "style": "cap", "text": margin_line(short(w), vw, vl), "q": Q_CAMPUS},
                  {"beats": 7, "style": "cap", "text": streets_line(w, l), "q": Q_CAMPUS},
                  {"beats": 7, "style": "end", "text": "Which rivalry should we settle next? *Comment below.*",
                   "sub": f"Send this to a {short(l)} fan.", "reuse": 3}]
        scenes[0]["beats"] = 7
        source = f"{SITE}/campus/{w}/"
    else:  # guess, two rounds
        scenes = []
        for k, rnd in enumerate(c["rounds"]):
            ans = rnd[0]
            opts = sorted(rnd, key=lambda r: short(r[1]))
            letter = "ABC"[[o[1] for o in opts].index(ans[1])]
            rows_ = [["ABC"[i], short(o[1]), ""] for i, o in enumerate(opts)]
            if k == 0:
                scenes.append({"beats": 6, "style": "hook", "map": ans[1],
                               "text": f"Guess the campus: *{ans[2]:,} restaurants within a 10-minute walk.*",
                               "sub": "Three rounds. Answers on screen."})
                scenes.append({"beats": 7, "style": "list", "title": "Round 1: is it...", "rows": rows_, "q": Q_CAMPUS})
            else:
                scenes.append({"beats": 8, "style": "list",
                               "title": f"Round {k + 1}: {ans[2]:,} restaurants within a 10-minute walk. Is it...", "rows": rows_, "q": Q_CAMPUS})
            scenes.append(dict(rank_scene({**c, "rows": [ans]}, 0, ""), text=f"{letter}: {short(ans[1])}", beats=10))
        scenes.append({"beats": 7, "style": "end", "text": "How many did you get? *Comment your score.*",
                       "sub": "Which campus should we hide next?", "reuse": 1})
        source = f"{SITE}/campus/{c['rounds'][0][0][1]}/"
    return {"id": vid, "mood": "upbeat", "source": source, "scenes": scenes,
            "lab": {"key": c["key"], "metric": metric, "format": c["format"], "candidate": c["id"]}}


def streets_line(w, l):
    sw, sl = ((SCENE[x].get("st") or [[None, 0]])[0] for x in (w, l))
    return (f"Busiest food streets: *{sw[0]}* ({sw[1]} places) vs. *{sl[0]}* ({sl[1]})"
            if sw[0] and sl[0] else "Every count is places to eat within half a mile of campus.")


def margin_line(w, vw, vl):
    """The rivalry's closing line, true by construction."""
    if vl > 0 and vw > 2 * vl:
        k = int(vw // vl) if vw % vl else int(vw // vl) - 1
        times = "twice" if k == 2 else f"{k} times"
        return f"{w} has more than *{times} as many.*"
    return f"{w} wins by *{vw - vl}.*"


def hashtags(slugs):
    tags = []
    for s in slugs[:3]:
        t = re.sub(r"[^a-z0-9]", "", short(s).lower())
        if t and f"#{t}" not in tags:
            tags.append(f"#{t}")
    return " ".join(tags + ["#collegelife", "#collegefood"])


def posts_for(c, vid):
    rows, metric, g = c["rows"], c["metric"], c.get("group")
    of = METRICS[metric]["of_campus"]
    method = METRICS[metric]["method"]
    if c["format"] in ("countdown", "short", "part2"):
        tease = c.get("tease")
        lead = f"{tease_name(tease[0], g)} is {ordinal(tease[1])}" if tease else f"{short(rows[1][1])} is {ordinal(rows[1][0])}"
        lead = lead[0].upper() + lead[1:]
        q = (f"{g['which']} has the busiest food street?" if metric == "street"
             else f"{g['which']} has the most {METRICS[metric]['phrase']}?")
        lst = "\n".join(f"{r}. {short(s)}: {v}" for r, s, v in rows[:14])
        inline = ", ".join(f"{short(s)} {v}" for r, s, v in rows[:14])
        more = "" if len(rows) <= 14 else f" (top 14 of {len(rows)})"
        tiktok = f"{lead} 👀 {q} {g['cta']}\n\n{hashtags([s for _, s, _ in rows])}"
        x = [f"{c['head']}\n\n{g['desc']}{more}:", lst, f"{method}\n\nLook up any campus, with the closest places first: {g['link']}"]
        threads = [f"{c['head']} {g['desc']}{more}:\n\n{inline}.\n\nDid your campus land where you expected?",
                   f"Look up any campus, with the closest places first: {g['link']}"]
        card = {"type": "ranking", "title": f"{g['head']} ranked by *{'their busiest food street' if metric == 'street' else METRICS[metric]['phrase']}*",
                "subtitle": f"{g['desc']}. " + ("Places to eat on one street, within a mile." if metric == "street" else "Places to eat within half a mile."),
                "rows": [[str(r), short(s), v] for r, s, v in rows[:12]], "source": "Data: Overture Maps"}
        topic = g["head"].replace("Big ", "").replace(" universities", "").replace(" schools", "").replace(" campuses", "")
    elif c["format"] == "rivalry":
        (_, w, vw), (_, l, vl) = rows
        tiktok = (f"{short(rows[0][1])} vs {short(rows[1][1])} 👀 Which campus has more restaurants within a 10-minute walk? "
                  f"Comment your guess before it shows.\n\n{hashtags([w, l])}")
        x = [f"{short(w)} has {vw} {of}. {short(l)} has {vl}.", f"{method}\n\nLook up any campus: {SITE}/campus/{w}/"]
        threads = [f"{short(w)} has {vw} {of}. {short(l)} has {vl}.\n\nWhich rivalry should we settle next?", f"Look up any campus: {SITE}/campus/{w}/"]
        card = {"type": "ranking", "title": f"{short(w)} vs {short(l)}: *restaurants within a 10-minute walk*",
                "subtitle": "Places to eat within half a mile of each campus.", "rows": [["1", short(w), vw], ["2", short(l), vl]],
                "source": "Data: Overture Maps"}
        topic = "College Football"
    else:
        qs, answers = [], []
        for rnd in c["rounds"]:
            ans, opts = rnd[0], sorted(rnd, key=lambda r: short(r[1]))
            names = [short(o[1]) for o in opts]
            qs.append(f"{ans[2]:,} restaurants within a 10-minute walk: {names[0]}, {names[1]} or {names[2]}?")
            answers.append(f"{short(ans[1])} ({ans[2]:,}); " + ", ".join(f"{short(o[1])} has {o[2]:,}" for o in rnd[1:]))
        all_slugs = [o[1] for rnd in c["rounds"] for o in rnd]
        tiktok = f"Guess the campus 👀 Three rounds, from {len(qs)} states. Comment your score.\n\n{hashtags(all_slugs)}"
        x = ["Guess the campus, three rounds:\n\n" + "\n".join(f"{i + 1}. {q}" for i, q in enumerate(qs)),
             "Answers:\n" + "\n".join(f"{i + 1}. {a}" for i, a in enumerate(answers)) + f"\n\n{SITE}/campus/{c['rounds'][0][0][1]}/"]
        threads = ["Guess the campus, three rounds:\n\n" + "\n".join(f"{i + 1}. {q}" for i, q in enumerate(qs)) + "\n\nAnswers in the reply.",
                   " ".join(f"{i + 1}. {a}." for i, a in enumerate(answers)) + f" {SITE}/campus/{c['rounds'][0][0][1]}/"]
        card = {"type": "ranking", "title": "Guess the campus: *restaurants within a 10-minute walk*",
                "subtitle": "Places to eat within half a mile of each campus.",
                "rows": [[str(i + 1), short(sl), v] for i, (_, sl, v) in enumerate(sorted([o for rnd in c["rounds"] for o in rnd], key=lambda r: -r[2])[:8])],
                "source": "Data: Overture Maps"}
        topic = "College"
    return {"tiktok": tiktok, "x": x, "threads": threads, "card": card, "topic": topic}


def slot_times(date):
    cfg = jload(os.path.join(SOCIAL, "config.json"), {})
    rng = np.random.default_rng(int(date.replace("-", "")) + 7)
    day = dt.date.fromisoformat(date)

    def at(hm):
        h, mi = map(int, hm.split(":"))
        t = dt.datetime(day.year, day.month, day.day, h, mi, tzinfo=NY) + dt.timedelta(minutes=int(rng.integers(-3, 4)))
        return t.isoformat(timespec="seconds")
    return {k: [at(x) for x in cfg["slots"][k]] for k in ("tiktok", "twitter", "threads")}


def cmd_script(date, force=False, out_dir=None):
    out_dir = out_dir or os.path.join(BATCHES, date)
    testing = out_dir != os.path.join(BATCHES, date)
    if os.path.exists(os.path.join(out_dir, "videos.json")) and not force:
        sys.exit(f"{out_dir}/videos.json already exists (use --force to overwrite)")
    m, chosen, _ = plan(date)
    times = slot_times(date)
    videos, posts = [], {"tiktok": [], "twitter": [], "threads": [], "cards": {}}
    exps = jload(os.path.join(SOCIAL, "experiments.json"), {})
    for i, c in enumerate(chosen[:4]):
        base = re.sub(r"[^a-z0-9]+", "-", (c["group"]["key"].split(":")[1] if c.get("group") else c["key"].split(":")[0]
                                           + "-" + short(c["rows"][0][1])).lower()).strip("-")
        vid = f"{base}-{c['format']}"[:40]
        c["date"] = date
        spec = video_spec(c, vid)
        p = posts_for(c, vid)
        videos.append(spec)
        posts["tiktok"].append({"video": vid, "at": times["tiktok"][i], "text": p["tiktok"]})
        posts["twitter"].append({"id": f"x-{vid}", "at": times["twitter"][i], "card": vid, "thread": p["x"]})
        posts["threads"].append({"id": f"t-{vid}", "at": times["threads"][i], "card": vid, "topic": p["topic"], "thread": p["threads"]})
        posts["cards"][vid] = p["card"]
        if c.get("slot") == "experiment":
            exps.setdefault("results", []).append({"date": date, "video": vid, "experiment": "+".join(c["novel"]) or c["format"],
                                                   "what": describe(c), "status": "posted", "predicted": slim(c, m)["views_mid"]})
    jsave(os.path.join(out_dir, "videos.json"), {"date": date, "videos": videos})
    jsave(os.path.join(out_dir, "posts.json"), posts)
    if not testing:
        jsave(os.path.join(SOCIAL, "experiments.json"), exps)
    problems = check_posts(posts)
    print(f"wrote {out_dir}/videos.json and posts.json: " + ", ".join(v["id"] for v in videos))
    print("\n".join(problems) if problems else "length checks passed")
    print("Now read every line as a first-time viewer, fix wording, then build as usual.")


def check_posts(posts):
    problems = []
    for p in posts["twitter"]:
        for t in p["thread"]:
            if len(t) > 280:
                problems.append(f"{p['id']}: X post is {len(t)} characters (max 280)")
    for p in posts["threads"]:
        if len(p["thread"][0]) > 500:
            problems.append(f"{p['id']}: Threads post is {len(p['thread'][0])} characters (max 500)")
    return problems


def cmd_maps(date):
    spec = jload(os.path.join(BATCHES, date, "videos.json"), {})
    seen = {}
    for v in spec.get("videos", []):
        street_metric = v.get("lab", {}).get("metric") == "street"
        for s in v["scenes"]:
            slug = s.get("map")
            if slug and slug not in seen and slug in CAMP:
                street = (SCENE.get(slug, {}).get("st") or [[None]])[0][0] if street_metric and s.get("style") == "rank" else None
                seen[slug] = f"{slug} {CAMP[slug]['lat']} {CAMP[slug]['lng']}" + (f' "{street}"' if street else "")
    print("\n".join(seen.values()))


# ---- scoring experiments and the report --------------------------------------

def cmd_score():
    exps = jload(os.path.join(SOCIAL, "experiments.json"), {})
    stats = jload(os.path.join(SOCIAL, "stats.json"), {})
    by = {p["what"]: p for p in stats.get("posts", []) if p.get("service", "").lower() == "tiktok" and p.get("what")}
    pulled = dt.datetime.fromisoformat(stats["pulled"].replace("Z", "+00:00"))
    changed = 0
    for r in exps.get("results", []):
        p = by.get(r.get("video"))
        if r.get("status") != "posted" or not p:
            continue
        age = (pulled - dt.datetime.fromisoformat(p["sent"].replace("Z", "+00:00"))).total_seconds() / 86400
        if age < 3:
            continue
        v, w = p.get("views") or 0, p.get("avg_watch_s") or 0
        r.update(views=v, watch_s=w, shares=p.get("shares") or 0, scored=stats["pulled"][:10],
                 status="promote" if v >= 1000 and w >= 9 else "drop" if v < 500 else "retry")
        changed += 1
        print(f"{r['video']}: {v:,} views, {w}s -> {r['status']}")
    jsave(os.path.join(SOCIAL, "experiments.json"), exps)
    print(f"scored {changed} experiment(s)")


def cmd_report():
    m = fit()
    rows = m["rows"]
    lines = ["# What the lab has learned", "",
             f"Learned from **{len(rows)} TikToks** posted {min(r['sent'] for r in rows)[:10]} to {max(r['sent'] for r in rows)[:10]}. "
             f"The model explains about {m['views']['r2']:.0%} of the differences in views (in-sample, so treat it as a guide). "
             "Multipliers below are on views; \"clear\" means the data shows it repeatedly, \"likely\" means it leans that way, "
             "\"unclear\" means not enough evidence yet.", ""]
    recent = [r for r in rows if r["sent"] >= (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=8)).isoformat()]
    if recent:
        v = [r["views"] for r in recent]
        lines += [f"**Last 7 days:** {len(v)} videos, median {int(np.median(v)):,} views, "
                  f"{sum(x >= 1000 for x in v)} of {len(v)} at 1,000+.", ""]
    names = [n for n, _ in FEATS]
    i, j = 1 + names.index("countdown"), 1 + names.index("tip")
    o = m["views"]
    d = float(o["mu"][i] - o["mu"][j])
    dsd = math.sqrt(max(1e-12, o["S"][i, i] + o["S"][j, j] - 2 * o["S"][i, j]))
    lines += ["## What drives views", "",
              f"- **Countdown vs. 'how to tell' tip: x{math.exp(d):.1f} views** "
              f"({'clear' if abs(d / dsd) >= 2 else 'likely' if abs(d / dsd) >= 1 else 'unclear'})"]
    for e in effects(m, "views"):
        if e["name"] == "log_age" or e["seen"] == 0:
            continue
        lines.append(f"- {SAY[e['name']]}: **x{math.exp(e['b']):.2f}** views ({e['sure']}, seen in {e['seen']} videos)")
    for label, outcome, unit in (("watch time", "watch", "s"), ("shares", "share", "x")):
        lines += ["", f"## What drives {label}", ""]
        for e in effects(m, outcome)[:5]:
            if e["name"] == "log_age" or e["seen"] == 0:
                continue
            val = f"{e['b']:+.1f} s" if unit == "s" else f"x{math.exp(e['b']):.2f}"
            lines.append(f"- {SAY[e['name']]}: **{val}** ({e['sure']})")
    if "completion" in m:
        cr = m["completion_rows"]
        lines += ["", "## What drives completion (share of the video watched)", "",
                  f"Median completion: **{np.median([r['watch'] / r['duration'] for r in cr]):.0%}** "
                  f"of the video, across {len(cr)} videos with a known length.", ""]
        for e in effects(m, "completion")[:6]:
            if e["name"] == "log_age" or e["seen"] == 0:
                continue
            lines.append(f"- {SAY[e['name']]}: **{e['b'] * 100:+.1f} points** ({e['sure']})")
    nic = m.get("niche") or {}
    platforms = nic.get("platforms") or ({"youtube": nic} if nic.get("effects") else {})
    for pname, pdata in platforms.items():
        label = {"tiktok": "TikTok", "youtube": "YouTube Shorts"}.get(pname, pname)
        how = ("views compared after controlling for each creator's followers" if pname == "tiktok"
               else "views compared with each channel's own average, so big channels don't drown out the signal")
        lines += ["", f"## What works in the niche: {label} ({pdata['videos']:,} videos, {pdata['channels']:,} accounts, {nic.get('date', '')})",
                  "", how[0].upper() + how[1:] + ".", ""]
        for name, e in sorted(pdata["effects"].items(), key=lambda kv: -abs(kv[1]["z"]))[:10]:
            sure = "clear" if abs(e["z"]) >= 2 else "likely" if abs(e["z"]) >= 1 else "unclear"
            lines.append(f"- {e['says']}: **x{e['mult']:.2f}** ({sure}, {e['seen']} videos)")
    if platforms:
        lines += ["", "The lab starts from these (both platforms combined, the more certain one counting for more) where its own "
                  "features match: " + ", ".join(SAY[k] for k in nic.get("lab_priors", {}) if k in SAY) +
                  ". Our own results then overrule them."]
    untested = [SAY[n] for n, k in FEATS if k in ("fmt", "bin") and n not in ("tip",)
                and sum(1 for r in rows if r["f"][n] not in (0, 0.0)) < 3]
    lines += ["", "## Not tested enough yet (the lab will try these)", ""] + [f"- {u}" for u in untested]
    exps = jload(os.path.join(SOCIAL, "experiments.json"), {}).get("results", [])
    if exps:
        lines += ["", "## Experiments", ""]
        for r in exps[-12:]:
            res = f"{r.get('views', '?'):,} views, {r.get('watch_s', '?')}s" if r.get("views") is not None else "waiting for 3 days of numbers"
            lines.append(f"- {r['date']} {r['experiment']}: {r['what']} -> **{r['status']}** ({res}; predicted {r.get('predicted', '?'):,})")
    lines += ["", "_Written by social/pipeline/lab.py. Regenerated every daily run._"]
    jsave_text(os.path.join(LAB, "report.md"), "\n".join(lines) + "\n")
    print("\n".join(lines))


def jsave_text(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    cmd = args[0]
    if cmd == "snapshot":
        snapshot()
    elif cmd == "report":
        cmd_report()
    elif cmd == "plan":
        cmd_plan(args[1])
    elif cmd == "script":
        cmd_script(args[1], force="--force" in args, out_dir=args[args.index("--out") + 1] if "--out" in args else None)
    elif cmd == "score":
        cmd_score()
    elif cmd == "maps":
        cmd_maps(args[1])
    else:
        sys.exit(__doc__)
