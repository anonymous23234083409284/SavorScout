#!/usr/bin/env python3
"""Evidence pack for an expert review: what a strategist needs to judge what works, in one place.

    python review.py [n]      write social/out/review/: table.md + strips of our top and bottom n videos

The pack has three parts:
- table.md: every TikTok with views, average watch, completion (watch / length), shares per 1,000
  views, its age, format and grouping, hook, tease and caption lead, best first, plus the same
  numbers grouped by format and grouping kind (where the patterns show).
- strips-top.png / strips-bottom.png: frames of our best and worst countdowns at 0, 1, 2.5, 4,
  6 and 10 seconds, so the openings can be compared by eye.
- Lab v2's playbook summary (social/lab/lab2-report.md) for the niche view.

The daily run reads the pack once a week and writes social/lab/expert-review.md: what works,
what doesn't, why, how sure, and what to test next. Its conclusions feed the lab (trends.json
boosts, experiments) and the owner's report."""

import datetime as dt
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
OUT = os.path.join(SOCIAL, "out", "review")
sys.path.insert(0, HERE)
import lab  # noqa: E402

TIMES = [0.0, 1.0, 2.5, 4.0, 6.0, 10.0]


def rows():
    stats = json.load(open(os.path.join(SOCIAL, "stats.json")))
    pulled = dt.datetime.fromisoformat(stats["pulled"].replace("Z", "+00:00"))
    vids = {r["id"]: r for r in lab.past_videos()}
    lengths = {}
    path = os.path.join(SOCIAL, "lab", "videos.jsonl")
    if os.path.exists(path):
        for line in open(path):
            if line.strip():
                d = json.loads(line)
                lengths[d["id"]] = d["duration_s"]
    out = []
    for p in stats["posts"]:
        if p.get("service", "").lower() != "tiktok" or p.get("what") not in vids:
            continue
        v = vids[p["what"]]
        hook = next((s for s in v["video"]["scenes"] if s.get("style") == "hook"), {})
        posts = lab.jload(os.path.join(SOCIAL, "batches", v["date"], "posts.json"), {})
        cap = next((t["text"] for t in posts.get("tiktok", []) if t["video"] == p["what"]), "")
        views, watch = p.get("views") or 0, p.get("avg_watch_s") or 0
        dur = lengths.get(p["what"])
        age = (pulled - dt.datetime.fromisoformat(p["sent"].replace("Z", "+00:00"))).total_seconds() / 86400
        kind = (v["key"] or "").split(":")[0] or "-"
        out.append({"id": p["what"], "date": v["date"], "format": v["format"], "kind": kind, "views": views, "watch": watch,
                    "completion": watch / dur if dur else None, "shares_k": 1000 * (p.get("shares") or 0) / max(views, 1),
                    "age": age, "hook": hook.get("text", "").replace("*", ""), "tease": hook.get("sub", ""),
                    "caption": cap.split("\n")[0], "duration": dur})
    return sorted(out, key=lambda r: -r["views"])


def table(R):
    L = ["| views | video | age (days) | format | grouping | watch | completion | shares/1k | hook | tease |",
         "|---:|---|---:|---|---|---:|---:|---:|---|---|"]
    for r in R:
        c = f"{r['completion']:.0%}" if r["completion"] else "?"
        L.append(f"| {r['views']:,} | {r['id']} | {r['age']:.1f} | {r['format']} | {r['kind']} | {r['watch']:.1f}s | {c} | "
                 f"{r['shares_k']:.1f} | {r['hook'][:60]} | {r['tease']} |")
    L += ["", "| group | videos | median views | median completion | median shares/1k |", "|---|---:|---:|---:|---:|"]
    for label, key in (("format", "format"), ("grouping", "kind")):
        for g in sorted({r[key] for r in R}):
            sel = [r for r in R if r[key] == g]
            comp = [r["completion"] for r in sel if r["completion"]]
            L.append(f"| {label}: {g} | {len(sel)} | {int(np.median([r['views'] for r in sel])):,} | "
                     f"{(np.median(comp) if comp else 0):.0%} | {np.median([r['shares_k'] for r in sel]):.1f} |")
    return "\n".join(L)


def strip(video_ids, out_png):
    from PIL import Image, ImageDraw
    W, H = 120, 213
    sheet = Image.new("RGB", (W * len(TIMES) + 150, H * len(video_ids)), "white")
    d = ImageDraw.Draw(sheet)
    for i, (vid, date, views) in enumerate(video_ids):
        mp4 = os.path.join(SOCIAL, "out", "batches", date, vid + ".mp4")
        d.text((4, i * H + 6), f"{vid[:20]}\n{views:,} views", fill="black")
        if not os.path.exists(mp4):
            continue
        for j, t in enumerate(TIMES):
            png = os.path.join(OUT, "f.png")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", mp4, "-frames:v", "1", "-vf", f"scale={W}:{H}", png])
            if os.path.exists(png):
                sheet.paste(Image.open(png), (150 + j * W, i * H))
                d.text((150 + j * W + 3, i * H + 3), f"{t:g}s", fill="yellow")
    sheet.save(out_png)


def main(n=4):
    os.makedirs(OUT, exist_ok=True)
    R = rows()
    with open(os.path.join(OUT, "table.md"), "w") as f:
        f.write(table(R) + "\n")
    cds = [r for r in R if r["format"] == "countdown" and r["age"] >= 1.5]
    strip([(r["id"], r["date"], r["views"]) for r in cds[:n]], os.path.join(OUT, "strips-top.png"))
    strip([(r["id"], r["date"], r["views"]) for r in cds[-n:]], os.path.join(OUT, "strips-bottom.png"))
    print(f"evidence pack: {OUT}/table.md, strips-top.png, strips-bottom.png ({len(R)} videos)")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 4)
