#!/usr/bin/env python3
"""Lab v2: what makes food short-form work, measured from the footage, turned into settings.

    python lab2.py analyze          learn from the niche footage -> lab/playbook.json + lab/lab2-report.md
    python lab2.py check <date>     score our rendered videos against the playbook (run after render)
    python lab2.py knobs            the production settings the scripter applies right now

DATA. Public TikTok food videos from the last 3 months (crawl.py), each with
its footage measured by vision.py: pacing, transitions, motion, the opening
frame, on-screen text, faces, loops, loudness. Quality filters: English or
unlabelled, 6-180 seconds, at least 500 followers, no ads, sponsored posts,
pinned posts or slideshows (dropped at crawl). Performance is a breakout:
views after allowing for followers and age, so a small creator's hit counts
as much as a big one's.

ANALYSIS.
1. Winners vs. losers: the top 30% of breakouts against the bottom 30% on
   every feature, with a bootstrap 90% interval on the difference.
2. Effects: one Bayesian model of views on all features at once, controlling
   for followers and age, so pace and length can't take credit for each other.
3. Sweet spots: for the settings we control (shot length, first cut, length,
   words on the opening frame), the range where breakouts run highest.
4. Producibility: the targets come from videos we could make (no on-camera
   person carrying the video) whenever there are enough of them.
5. Hooks and topics: caption archetypes and food topics that over-index among
   winners; topics are matched to SavorScout's dish guides.

OUTPUT. lab/playbook.json (targets, settings, hooks, topics) and a plain
report. lab.py's scripter reads the settings (punch-ins to reach the target
shot length, the hook length, loop endings) and records them on each video,
so our own results confirm or overrule the niche."""

import datetime as dt
import json
import math
import os
import re
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
LAB = os.path.join(SOCIAL, "lab")
CRAWL = os.path.join(LAB, "crawl")
DATA = os.path.join(os.path.dirname(SOCIAL), "scripts", "data")
sys.path.insert(0, HERE)

FEATS = [  # name, how the report says it, unit
    ("median_shot_s", "median shot length", "s"), ("cuts_per_s", "cuts per second", ""),
    ("first_cut_s", "time to the first cut", "s"), ("cuts_first_3s", "cuts in the first 3 seconds", ""),
    ("gradual_share", "share of transitions that are dissolves or fades", ""),
    ("motion", "movement between cuts", ""), ("motion_first_1s", "movement in the first second", ""),
    ("camera_moving_share", "time the camera is moving", ""), ("zoom_in_share", "time spent zooming in", ""),
    ("hook_words", "words on screen in the first frame", ""), ("hook_question", "a question on screen at the start", ""),
    ("hook_face", "a face in the first frame", ""), ("hook_brightness", "brightness of the first frame", ""),
    ("hook_colorfulness", "colour in the first frame", ""), ("text_share", "time with on-screen text", ""),
    ("face_share", "time with a face on screen", ""), ("loop_similarity", "how closely the end matches the start", ""),
    ("duration_s", "length", "s"), ("lufs", "loudness", " LUFS"), ("original_sound", "an original sound (vs. a song)", ""),
]
BINARY = {"hook_question", "hook_face", "original_sound"}
SAY = {n: s for n, s, _ in FEATS}
UNIT = {n: u for n, _, u in FEATS}

HOOKS = [
    ("question", r"^\W*(which|what|who|where|how|why|is|are|do|does|can|would|should)\b|\?", "opens with a question"),
    ("pov", r"\bpov\b", "a POV line"),
    ("i_tried", r"\bi (tried|tested|ate|went|found|ranked|rated|spent)\b", "'I tried / I ranked...'"),
    ("ranking", r"\b(rank|ranking|ranked|tier|rating|rated|top \d+|#\d+)\b", "a ranking or rating"),
    ("number", r"\b\d+\b", "a number"),
    ("you", r"\b(you|your)\b", "talks to 'you'"),
    ("superlative", r"\b(most|best|worst|cheapest|biggest|only)\b", "a superlative"),
    ("surprise", r"\b(not|never|nobody|stop|don't|wrong|actually|secret)\b", "a surprise or warning"),
    ("price", r"\$\d|\b\d+ ?dollars?\b|\bcheap\b|\bbudget\b|\bfree\b", "a price or budget angle"),
    ("place", r"\b(nyc|new york|la|los angeles|chicago|austin|miami|houston|seattle|boston|texas|london|city)\b", "a named place"),
]


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


def q(v):
    return [round(float(x), 3) for x in np.quantile(v, [0.25, 0.5, 0.75])]


# ---- data ----------------------------------------------------------------------------

def niche_rows():
    import crawl
    meta = {r["id"]: r for r in crawl.load_youtube("tiktok")}
    # Rows for one video merge (a later strip or spoken-caption row adds to its measurement).
    vis = {k: v for k, v in crawl.vision_rows().items() if "error" not in v and v.get("duration_s")}
    now = dt.datetime.now(dt.timezone.utc)
    out = []
    for vid, v in vis.items():
        m = meta.get(vid)
        if not m or not m.get("created") or not m.get("plays"):
            continue
        if not 6 <= v.get("duration_s", 0) <= 180 or (m.get("followers") or 0) < 500:
            continue
        if m.get("lang") not in (None, "", "en", "un"):
            continue
        age = max(1.0, (now - dt.datetime.fromisoformat(str(m["created"]).replace("Z", "+00:00"))).days)
        f = {n: (float(v[n]) if v.get(n) is not None else None) for n, _, _ in FEATS if n in v}
        f["hook_face"] = 1.0 if (v.get("hook_faces") or 0) > 0 else 0.0
        f["hook_question"] = 1.0 if v.get("hook_question") else 0.0
        f["original_sound"] = 1.0 if m.get("music_original") else 0.0
        out.append({"id": vid, "y": math.log1p(m["plays"]), "age": age, "followers": m["followers"], "f": f,
                    "producible": (v.get("hook_face_area") or 0) < 0.04 and (v.get("face_share") or 0) < 0.5,
                    "text": f"{m.get('text', '')} {m.get('tags', '')}".lower(), "plays": m["plays"]})
    return out


def add_breakout(R):
    X = np.column_stack([np.ones(len(R)), np.log2([r["age"] for r in R]), np.log10([r["followers"] + 1 for r in R])])
    y = np.array([r["y"] for r in R])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    for r, e in zip(R, y - X @ beta):
        r["breakout"] = float(e)


# ---- analysis ------------------------------------------------------------------------

def profile(R, name, rng):
    pts = [(r["f"].get(name), r["breakout"]) for r in R if r["f"].get(name) is not None]
    if len(pts) < 20:
        return None
    v, b = np.array([p[0] for p in pts]), np.array([p[1] for p in pts])
    W, L = v[b >= np.quantile(b, 0.7)], v[b <= np.quantile(b, 0.3)]
    stat = np.mean if name in BINARY else np.median
    boots = [stat(rng.choice(W, len(W))) - stat(rng.choice(L, len(L))) for _ in range(1000)]
    lo, hi = np.quantile(boots, [0.05, 0.95])
    return {"winners": q(W) if name not in BINARY else round(float(W.mean()), 3),
            "losers": q(L) if name not in BINARY else round(float(L.mean()), 3),
            "diff": round(float(stat(W) - stat(L)), 4), "ci90": [round(float(lo), 4), round(float(hi), 4)],
            "sure": "clear" if lo > 0 or hi < 0 else "unclear", "n": len(v)}


def joint_effects(R):
    names = [n for n, _, _ in FEATS if sum(1 for r in R if r["f"].get(n) is not None) >= 0.6 * len(R)]
    M = np.array([[r["f"].get(n) for n in names] for r in R], dtype=float)
    med = np.nanmedian(M, axis=0)
    M = np.where(np.isnan(M), med, M)
    mu_f, sd_f = M.mean(axis=0), M.std(axis=0) + 1e-9
    Z = (M - mu_f) / sd_f
    C = np.column_stack([np.log2([r["age"] for r in R]), np.log10([r["followers"] + 1 for r in R])])
    C = (C - C.mean(axis=0)) / (C.std(axis=0) + 1e-9)
    X = np.hstack([np.ones((len(R), 1)), Z, C])
    y = np.array([r["y"] for r in R])
    P = np.diag(1 / np.array([10.0] + [0.4] * len(names) + [1.0, 1.0]) ** 2)
    s2 = float(np.var(y)) or 1.0
    for _ in range(6):
        S = np.linalg.inv(X.T @ X / s2 + P)
        mu = S @ X.T @ y / s2
        res = y - X @ mu
        s2 = max(0.05, float(res @ res) / max(1.0, len(y) - float(np.trace(X @ S @ X.T)) / s2))
    out = {}
    for j, n in enumerate(names, start=1):
        b, sd = float(mu[j]), float(math.sqrt(S[j, j]))
        out[n] = {"per_sd": round(math.exp(b), 3), "sd_units": round(float(sd_f[j - 1]), 3), "z": round(b / sd, 2),
                  "sure": "clear" if abs(b / sd) >= 2 else "likely" if abs(b / sd) >= 1 else "unclear"}
    return out


def sweet_spot(R, name, bins=5, min_n=6):
    pts = sorted((r["f"][name], r["breakout"]) for r in R if r["f"].get(name) is not None)
    if len(pts) < bins * min_n:
        return None
    edges = np.quantile([p[0] for p in pts], np.linspace(0, 1, bins + 1))
    best, table = None, []
    for i in range(bins):
        sel = [b for v, b in pts if edges[i] <= v <= edges[i + 1]]
        if len(sel) >= min_n:
            m = float(np.mean(sel))
            table.append([round(float(edges[i]), 2), round(float(edges[i + 1]), 2), round(m, 3), len(sel)])
            if best is None or m > best[2]:
                best = table[-1]
    return {"range": best[:2], "mean_breakout": best[2], "n": best[3], "bins": table} if best else None


def lift_table(R, patterns):
    hi, lo = np.quantile([r["breakout"] for r in R], [0.7, 0.3])
    W = [r for r in R if r["breakout"] >= hi]
    L = [r for r in R if r["breakout"] <= lo]
    out = []
    for key, rx, say in patterns:
        w = sum(1 for r in W if re.search(rx, r["text"]))
        l = sum(1 for r in L if re.search(rx, r["text"]))
        if w + l >= 4:
            out.append({"pattern": key, "says": say, "lift": round(((w + 1) / (len(W) + 2)) / ((l + 1) / (len(L) + 2)), 2),
                        "winners": w, "losers": l})
    return sorted(out, key=lambda x: -x["lift"])


def topics(R):
    guides = jload(os.path.join(DATA, "food-scene.json"), {}).get("guides", {})
    vocab = {g.replace("-", " "): g for g in guides} | {g.split("-")[0]: g for g in guides}
    extra = ["smash burger", "birria", "boba", "matcha", "crumbl", "costco", "trader joe", "dumpling", "hot pot",
             "korean bbq", "wings", "fried chicken", "steak", "brunch", "bagel", "croissant", "dessert", "noodles"]
    pats = [(t, rf"\b{re.escape(t)}s?\b", vocab.get(t) or "") for t in sorted(set(list(vocab) + extra)) if len(t) >= 3]
    rows = lift_table(R, [(t, rx, g) for t, rx, g in pats])
    return [{"topic": r["pattern"], "guide": r["says"] or None, "lift": r["lift"], "winners": r["winners"],
             "losers": r["losers"]} for r in rows if r["winners"] >= 3][:15]


def analyze():
    R = niche_rows()
    if len(R) < 40:
        sys.exit(f"only {len(R)} niche videos with measured footage; run `crawl.py tiktok` first (needs ~40+)")
    add_breakout(R)
    rng = np.random.default_rng(7)
    prod = [r for r in R if r["producible"]]
    base = prod if len(prod) >= 40 else R
    prof = {n: profile(base, n, rng) for n, _, _ in FEATS}
    prof = {k: v for k, v in prof.items() if v}
    eff = joint_effects(R)
    spots = {n: sweet_spot(base, n) for n in ("median_shot_s", "first_cut_s", "duration_s", "hook_words", "cuts_first_3s")}
    ours = our_latest()

    def step(feature, current, target, n_band):
        """Move from what we do now toward the niche target only as far as the evidence allows:
        a small step on thin or unclear evidence, the full step once it's clear and well sampled."""
        sure = eff.get(feature, {}).get("sure") or prof.get(feature, {}).get("sure") or "unclear"
        w = min(1.0, n_band / 40) * {"clear": 1.0, "likely": 0.6}.get(sure, 0.3)
        return (current + w * (target - current) if current is not None else target), round(w, 2), sure
    sp = spots.get("median_shot_s")
    shot, w_shot, s_shot = step("median_shot_s", ours.get("median_shot_s"), float(np.mean(sp["range"])) if sp else 2.5, sp["n"] if sp else 0)
    fc = spots.get("first_cut_s")
    first, w_first, s_first = step("first_cut_s", ours.get("first_cut_s"), float(np.mean(fc["range"])) if fc else 3.0, fc["n"] if fc else 0)
    knobs = {
        "shot_target_s": round(float(np.clip(shot, 1.0, 6.0)), 2),
        "first_cut_by_s": round(float(np.clip(first, 1.0, 6.0)), 2),
        "length_s": [round(float(x), 1) for x in spots["duration_s"]["range"]] if spots.get("duration_s") else [20, 40],
        "hook_words_max": int(prof["hook_words"]["winners"][2]) if "hook_words" in prof else 12,
        "loop_end": bool("loop_similarity" in prof and prof["loop_similarity"]["diff"] > 0 and prof["loop_similarity"]["sure"] == "clear"),
        "transitions": "hard cuts" if prof.get("gradual_share", {}).get("winners", [0, 0, 0])[1] < 0.2 else "mix in dissolves",
        "evidence": {"shot": {"niche_sweet_spot": sp["range"] if sp else None, "weight": w_shot, "sure": s_shot},
                     "first_cut": {"niche_sweet_spot": fc["range"] if fc else None, "weight": w_first, "sure": s_first}},
    }
    hooks = lift_table(R, HOOKS)
    out = {"date": dt.date.today().isoformat(), "videos": len(R), "producible": len(prod),
           "targets_from": "producible videos" if base is prod else "all videos (too few producible ones yet)",
           "profiles": prof, "effects": eff, "sweet_spots": spots, "knobs": knobs, "ours": ours,
           "hooks": hooks, "topics": topics(R)}
    jsave(os.path.join(LAB, "playbook.json"), out)
    write_report(out)
    print(open(os.path.join(LAB, "lab2-report.md")).read())


# ---- our own videos --------------------------------------------------------------------

def our_features(date):
    """vision.py on our rendered videos for a date, cached in lab/our-vision.jsonl."""
    import vision
    path = os.path.join(LAB, "our-vision.jsonl")
    have = {}
    if os.path.exists(path):
        for line in open(path):
            if line.strip():
                d = json.loads(line)
                have[(d["date"], d["id"])] = d
    root = os.path.join(SOCIAL, "out", "batches", date)
    vids = sorted(f[:-4] for f in os.listdir(root) if f.endswith(".mp4")) if os.path.isdir(root) else []
    out = []
    for vid in vids:
        if (date, vid) not in have:
            have[(date, vid)] = {"date": date, "id": vid, **vision.analyze(os.path.join(root, vid + ".mp4"))}
        out.append(have[(date, vid)])
    with open(path, "w") as f:
        for d in sorted(have.values(), key=lambda d: (d["date"], d["id"])):
            f.write(json.dumps(d) + "\n")
    return out


def our_latest():
    root = os.path.join(SOCIAL, "out", "batches")
    dates = sorted(d for d in os.listdir(root) if re.match(r"\d{4}-\d{2}-\d{2}$", d)) if os.path.isdir(root) else []
    for d in reversed(dates):
        feats = our_features(d)
        if feats:
            keys = ["median_shot_s", "first_cut_s", "cuts_first_3s", "duration_s", "hook_words", "loop_similarity",
                    "gradual_share", "zoom_in_share", "lufs"]
            return {"date": d, **{k: round(float(np.median([f[k] for f in feats if f.get(k) is not None])), 3)
                                  for k in keys if any(f.get(k) is not None for f in feats)}}
    return {}


def check(date):
    pb = jload(os.path.join(LAB, "playbook.json"))
    if not pb:
        sys.exit("no playbook yet: run `lab2.py analyze`")
    k, prof = pb["knobs"], pb["profiles"]
    results = []
    for f in our_features(date):
        issues = []
        if f["median_shot_s"] > k["shot_target_s"] * 1.5:
            issues.append(f"shots run {f['median_shot_s']:.1f} s; winners cut about every {k['shot_target_s']:.1f} s")
        if f["first_cut_s"] > k["first_cut_by_s"] * 1.6:
            issues.append(f"first cut at {f['first_cut_s']:.1f} s; winners cut by {k['first_cut_by_s']:.1f} s")
        lo, hi = k["length_s"]
        if not lo * 0.8 <= f["duration_s"] <= hi * 1.2:
            issues.append(f"{f['duration_s']:.0f} s long; breakouts cluster at {lo:.0f}-{hi:.0f} s")
        if f["hook_words"] > k["hook_words_max"] + 3:
            issues.append(f"{f['hook_words']} words on the opening frame; winners use {k['hook_words_max']} or fewer")
        if k.get("loop_end") and (f.get("loop_similarity") or 0) < prof.get("loop_similarity", {}).get("winners", [0])[0]:
            issues.append(f"ending doesn't loop back to the start (similarity {f['loop_similarity']:.2f})")
        if f.get("lufs") is not None and not -17 <= f["lufs"] <= -8:
            issues.append(f"loudness {f['lufs']:.1f} LUFS; most food videos sit between -16 and -9")
        if f.get("silent_start"):
            issues.append("starts silent")
        results.append({"id": f["id"], "score": max(0, 100 - 15 * len(issues)), "issues": issues})
    jsave(os.path.join(LAB, f"check-{date}.json"), {"date": date, "videos": results})
    for r in results:
        print(f"{r['id']:<28} {r['score']:>3}/100  " + ("; ".join(r["issues"]) if r["issues"] else "matches the playbook"))
    return results


def knobs():
    """What the scripter applies now. Without a playbook, today's pacing is kept."""
    pb = jload(os.path.join(LAB, "playbook.json"), {})
    k = pb.get("knobs") or {}
    return {"shot_target_s": k.get("shot_target_s"), "hook_beats": max(3, min(4, round((k.get("first_cut_by_s") or 3.0) / 0.75))),
            "loop_end": bool(k.get("loop_end")), "length_s": k.get("length_s") or [25, 40]}


# ---- report ------------------------------------------------------------------------------

SHARES = {"gradual_share", "camera_moving_share", "zoom_in_share", "text_share", "face_share"}


def num(name, x):
    if name in SHARES:
        return f"{x:.0%}"
    if name in ("cuts_per_s", "loop_similarity", "motion", "motion_first_1s"):
        return f"{x:.2f}"
    if name in ("hook_words", "cuts_first_3s", "hook_brightness", "hook_colorfulness"):
        return f"{x:.0f}"
    return f"{x:.1f}{UNIT.get(name, '')}"


def fmt(name, v):
    if isinstance(v, list):
        return f"{num(name, v[1])} (middle half {num(name, v[0])} to {num(name, v[2])})"
    return f"{v:.0%} of videos" if name in BINARY else num(name, v)


def write_report(pb):
    L = ["# Lab v2: what works in food short-form", "",
         f"From **{pb['videos']} recent TikTok food videos** with their footage measured "
         f"({pb['producible']} of them the kind we can make). Targets come from {pb['targets_from']}. "
         "Winners are the top 30% of breakouts (views after allowing for followers and age), losers the bottom 30%. "
         "\"Clear\" means the 90% interval on the difference excludes zero.", "",
         "## Production settings now in use", ""]
    k = pb["knobs"]
    ev = k.get("evidence", {})
    L += [f"- **Shot length target: {k['shot_target_s']} s.** Map scenes get punch-ins to reach it. "
          f"(Niche sweet spot {ev.get('shot', {}).get('niche_sweet_spot')}; moved {ev.get('shot', {}).get('weight', 0):.0%} of the way "
          f"there because the evidence is {ev.get('shot', {}).get('sure', 'unclear')}.)",
          f"- **First cut by: {k['first_cut_by_s']} s.** (Niche sweet spot {ev.get('first_cut', {}).get('niche_sweet_spot')}; "
          f"moved {ev.get('first_cut', {}).get('weight', 0):.0%} of the way.)",
          f"- **Length: {k['length_s'][0]:g}-{k['length_s'][1]:g} s** is where breakouts cluster.",
          f"- **Opening frame: {k['hook_words_max']} words or fewer.**",
          f"- **Loop endings: {'yes' if k['loop_end'] else 'not yet (no clear evidence)'}.** Transitions: {k['transitions']}.", ""]
    ours = pb.get("ours") or {}
    if ours:
        L += [f"## Us vs. winners (our {ours['date']} videos)", ""]
        for n in ("median_shot_s", "first_cut_s", "cuts_first_3s", "duration_s", "hook_words", "loop_similarity", "lufs"):
            p = pb["profiles"].get(n)
            if p and n in ours:
                L.append(f"- {SAY[n].capitalize()}: ours **{num(n, ours[n])}**, winners {fmt(n, p['winners'])}")
        L.append("")
    L += ["## Winners vs. losers", ""]
    for n, p in sorted(pb["profiles"].items(), key=lambda kv: kv[1]["sure"] != "clear"):
        L.append(f"- {SAY[n].capitalize()}: winners {fmt(n, p['winners'])}, losers {fmt(n, p['losers'])} "
                 f"({p['sure']}, {p['n']} videos)")
    L += ["", "## All at once (effect of one standard deviation more, other features held equal)", ""]
    for n, e in sorted(pb["effects"].items(), key=lambda kv: -abs(kv[1]["z"]))[:10]:
        L.append(f"- {SAY[n].capitalize()} (+{num(n, e['sd_units'])}): **x{e['per_sd']:.2f} views** ({e['sure']})")
    L += ["", "## Sweet spots", ""]
    for n, s in pb["sweet_spots"].items():
        if s:
            L.append(f"- {SAY[n].capitalize()}: **{num(n, s['range'][0])} to {num(n, s['range'][1])}** ({s['n']} videos in the best band)")
    if pb["hooks"]:
        L += ["", "## Caption hooks that over-index among winners", ""]
        L += [f"- {h['says']}: x{h['lift']:.2f} ({h['winners']} winners, {h['losers']} losers)" for h in pb["hooks"][:8]]
    if pb["topics"]:
        L += ["", "## Food topics that over-index among winners", ""]
        L += [f"- {t['topic']}: x{t['lift']:.2f}" + (f" (SavorScout guide: /food/{t['guide']})" if t["guide"] else "")
              for t in pb["topics"][:10]]
    L += ["", "_Written by social/pipeline/lab2.py from the weekly crawl. Footage is measured and deleted; only numbers are kept._"]
    with open(os.path.join(LAB, "lab2-report.md"), "w") as f:
        f.write("\n".join(L) + "\n")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "analyze":
        analyze()
    elif a[0] == "check":
        check(a[1])
    elif a[0] == "knobs":
        print(json.dumps(knobs(), indent=1))
    else:
        sys.exit(__doc__)
