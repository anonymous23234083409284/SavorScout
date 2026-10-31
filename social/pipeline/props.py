"""Turn a job (combos.js entry), its map and its clips into the video's props.

Text is fitted here with the same font files the video renders with, so a long
name ("Tadashi Japanese Restaurant") gets a smaller size or a balanced second
line instead of running off the frame.
"""
import os, re
from PIL import ImageFont

FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "video", "public", "fonts")
BLACK = os.path.join(FONT_DIR, "InterDisplay-Black.otf")
TIMING = {"hook": 75, "spot": 90, "outro": 105}   # frames at 30 fps; transitions land on 120 BPM beats
SITE = "savorscout.net"
NBSP = "\u00a0"   # keeps a campus name ("Penn State") on one line
CREDITS = "Footage: Pexels · Map data © OpenStreetMap contributors, Overture Maps"

_fonts = {}


def width(text, size, tracking=-0.022):
    f = _fonts.get(size) or _fonts.setdefault(size, ImageFont.truetype(BLACK, size))
    return f.getlength(text) + tracking * size * len(text)


def fit_one(text, max_w, hi, lo, tracking):
    for size in range(hi, lo - 1, -2):
        if width(text, size, tracking) <= max_w:
            return size
    return lo


def fit_name(name, max_w=930, hi=118, hi_two=100, lo=62, single_min=92):
    """(size, lines): one line if it fits at a readable size, else two balanced
    lines, a little smaller so the block above the map keeps its height."""
    one = fit_one(name, max_w, hi, single_min, -0.022)
    if width(name, one) <= max_w:
        return one, [name]
    words = name.split()
    if len(words) == 1:
        return fit_one(name, max_w, hi, lo, -0.022), [name]
    best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        for size in range(hi_two, lo - 1, -2):
            if max(width(a, size), width(b, size)) <= max_w:
                cand = (size, -abs(width(a, size) - width(b, size)), [a, b])
                if best is None or cand[:2] > best[:2]:
                    best = cand
                break
    return (best[0], best[2]) if best else (lo, [name])


def head_noun(job):
    special = {"coffee": "Coffee", "sandwiches": "Sandwiches", "deli": "Deli food", "bakery": "Bakeries",
               "ice-cream": "Ice cream", "bbq": "BBQ", "fried-chicken": "Fried chicken"}
    if job["food"] in special:
        return special[job["food"]]
    t = job["foodTitle"]
    return t[0] + t[1:].lower()


def clean_street(st):
    st = re.sub(r"\s+(Ste|Suite|Unit|Fl|Floor|Rm|Room|Bldg)\b.*$", "", st, flags=re.I)
    st = re.sub(r"\s*#\s*\w+$", "", st)
    return st.strip().rstrip(",")


def build(job, map_meta, map_src, clip_srcs, audio_src):
    n = len(map_meta["spots"])
    short = job["campus"]["short"]
    big = head_noun(job)
    line = "you can walk to"
    gap = 0.26
    line_size = 120
    while line_size > 70:
        words_w = sum(width(w, line_size, -0.02) for w in line.split()) + gap * line_size * (len(line.split()) - 1)
        if words_w <= 930:
            break
        line_size -= 2
    spots = []
    for s in map_meta["spots"]:
        size, lines = fit_name(s["name"])
        spots.append({**s, "street": clean_street(s.get("street", "")), "nameSize": size, "nameLines": lines})
    more = job["count"] - n
    return {
        "campus": short,
        "count": job["count"],
        "nounPlural": job["foodNoun"],
        "hook": {
            "kicker": short.upper(),
            "big": big,
            "bigSize": fit_one(big, 940, 250, 120, -0.025),
            "line": line,
            "lineSize": line_size,
            "sub": f"{job['count']} spots within a mile · {n} closest",
        },
        "outro": {
            "more": f"+{more} more",
            "moreSize": fit_one(f"+{more} more", 930, 170, 100, -0.03),
            "line": f"{job['foodNoun']} within a mile of {short.replace(' ', NBSP)}",
            "site": SITE,
            "follow": "Follow for your campus next",
        },
        "map": {**{k: map_meta[k] for k in ("width", "height", "scale", "campus", "labels", "attribution")},
                "src": map_src, "spots": spots},
        "clips": clip_srcs,
        "audio": audio_src,
        "timing": TIMING,
        "credits": CREDITS,
    }


def duration_frames(props):
    t = props["timing"]
    return t["hook"] + len(props["map"]["spots"]) * t["spot"] + t["outro"]
