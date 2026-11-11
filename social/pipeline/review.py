#!/usr/bin/env python3
"""Evidence pack for an expert review: what a strategist needs to judge what works, in one place,
from three angles: our own videos, our competitors' hits and flops, and the wider food niche.

    python review.py [n]              write social/out/review/ (our top and bottom n countdowns, default 4)
    python review.py --backfill-niche re-fetch frame strips for the niche's top and bottom breakouts
                                      (only needed for footage measured before strips existed; ~$0.09)

OURS (committed numbers, our own frames)
- table.md: every TikTok with views, average watch, completion (watch / length), shares per 1,000
  views, age, format, grouping, hook and tease, best first, plus medians by format and grouping.
- strips-top.png / strips-bottom.png: our best and worst countdowns at 0, 1, 2.5, 4, 6 and 10 s.

COMPETITORS (compete.py; private, deleted after 30 days)
- compete/sheet-<account>.jpg: each watched account's top videos above its bottom ones, the same
  six moments, labelled with views against the account's own typical video.
- compete/hits.jpg / compete/flops.jpg: the biggest over- and under-performers across accounts.
- compete/index.md: those videos with their captions, opening lines (TikTok's captions of what's
  said) and links, for watching the real thing.

NICHE (crawl.py + Lab v2; private, deleted after 30 days)
- niche-top.jpg / niche-bottom.jpg: the biggest and smallest breakouts (views after allowing for
  followers and age) among recent food videos, with strips.

The daily run reads the pack once a week with lab2-report.md and compete-report.md and writes
social/lab/expert-review.md: what works and what doesn't, for them and for us, why, how sure, and
what to change. Its conclusions feed the lab (trends.json boosts, experiments) and the report."""

import datetime as dt
import json
import math
import os
import subprocess
import sys
import textwrap

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


FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
PACK_C = os.path.join(OUT, "compete")
COLORS = {"HIT": (0, 120, 0), "ABOVE": (40, 120, 40), "TYPICAL": (90, 90, 90), "BELOW": (170, 60, 60), "FLOP": (190, 0, 0)}


def font(size, bold=False):
    from PIL import ImageFont
    try:
        return ImageFont.truetype(BOLD if bold else FONT, size)
    except Exception:
        return ImageFont.load_default()


def strip_of(vid):
    import crawl
    path = os.path.join(crawl.STRIPS, f"{vid}.jpg")
    return path if os.path.exists(path) else None


def sheet(rows, out_path, title):
    """rows: [(strip path, [label lines], tag)]. A label column, then the strip of six moments."""
    from PIL import Image, ImageDraw
    WL, WS, H = 300, 1080, 320
    img = Image.new("RGB", (WL + WS, 46 + H * max(1, len(rows))), "white")
    d = ImageDraw.Draw(img)
    d.text((10, 10), title[:110], fill="black", font=font(20, True))
    for i, (strip, lines, tag) in enumerate(rows):
        y = 46 + i * H
        d.rectangle([0, y, WL - 1, y + H - 1], outline=(215, 215, 215))
        d.text((10, y + 8), lines[0], fill=COLORS.get(tag, (0, 0, 0)), font=font(22, True))
        yy = y + 42
        for line in lines[1:]:
            for w in textwrap.wrap(line, 31) or [""]:
                if yy > y + H - 22:
                    break
                d.text((10, yy), w, fill=(30, 30, 30), font=font(15))
                yy += 20
            yy += 4
        if strip:
            s_img = Image.open(strip).convert("RGB")
            if s_img.width != WS:
                s_img = s_img.resize((WS, int(s_img.height * WS / s_img.width)))
            img.paste(s_img, (WL, y))
    img.save(out_path, quality=85)


def tag_of(z):
    return "HIT" if z >= math.log(2) else "ABOVE" if z > 0.1 else "FLOP" if z <= -math.log(2) else "BELOW" if z < -0.1 else "TYPICAL"


def competitor_pack(k=3):
    """Sheets of each watched account's best and worst videos (with strips), plus an index."""
    import compete
    data, _ = compete.scored()
    if not data:
        return 0
    spoken = compete.private_hooks()
    os.makedirs(PACK_C, exist_ok=True)
    idx = ["# Competitors' hits and flops (private)", "",
           "Their captions and opening lines are theirs: this file stays out of git and is deleted after 30 days. "
           "\"x typical\" = views against the account's own typical video.", ""]
    pool = []

    def label(r, h):
        x, sp = r["x_typical"], spoken.get(r["id"], {}).get("spoken_hook")
        lines = [f"{tag_of(r['z'])} {x:.1f}x typical", f"@{h}", f"{r['plays']:,} views, {float(r.get('duration_s') or 0):.0f}s, {r['age']:.0f}d old",
                 (r.get("text") or "")[:110].replace("\n", " ")]
        if sp:
            lines.append(f"says: {sp[:90]}")
        return lines
    for h, d in data.items():
        S = [r for r in d["videos"] if r["settled"] and strip_of(r["id"])]
        if not S:
            continue
        top = [r for r in S if r["z"] > 0][:k]
        bottom = [r for r in S if r["z"] < 0][-k:]
        rows = [(strip_of(r["id"]), label(r, h), tag_of(r["z"])) for r in top + bottom]
        acc = d["account"]
        sheet(rows, os.path.join(PACK_C, f"sheet-{h.replace('.', '_')}.jpg"),
              f"@{h} ({acc.get('label', '')}): typical {d['typical_views']:,} views. Best above, worst below.")
        idx += [f"## @{h}: {acc.get('label', '')} (typical {d['typical_views']:,} views)", "",
                "| | x typical | views | length | caption | opening line | link |", "|---|---:|---:|---:|---|---|---|"]
        for r in top + bottom:
            sp = spoken.get(r["id"], {}).get("spoken_hook", "")
            idx.append(f"| {tag_of(r['z'])} | {r['x_typical']:.1f} | {r['plays']:,} | {float(r.get('duration_s') or 0):.0f}s | "
                       f"{(r.get('text') or '')[:120].replace('|', '/').replace(chr(10), ' ')} | {sp[:100].replace('|', '/')} | {r.get('url', '')} |")
        idx.append("")
        pool += [(r, h) for r in S]
    pool.sort(key=lambda p: -p[0]["z"])
    if pool:
        sheet([(strip_of(r["id"]), label(r, h), tag_of(r["z"])) for r, h in pool[:8]], os.path.join(PACK_C, "hits.jpg"),
              "Competitors: the biggest hits against their own account's typical video")
        sheet([(strip_of(r["id"]), label(r, h), tag_of(r["z"])) for r, h in pool[-8:]], os.path.join(PACK_C, "flops.jpg"),
              "Competitors: the biggest flops against their own account's typical video")
    with open(os.path.join(PACK_C, "index.md"), "w") as f:
        f.write("\n".join(idx) + "\n")
    return len(data)


def niche_rows_ranked():
    import lab2
    R = lab2.niche_rows()
    if len(R) < 10:
        return []
    lab2.add_breakout(R)
    return sorted(R, key=lambda r: -r["breakout"])


def niche_pack(n=8):
    R = [r for r in niche_rows_ranked() if strip_of(r["id"])]
    if len(R) < 4:
        return 0

    def rows(sel):
        out = []
        for r in sel:
            x = math.exp(r["breakout"])
            tag = "HIT" if x >= 2 else "FLOP" if x <= 0.5 else "ABOVE" if x > 1 else "BELOW"
            out.append((strip_of(r["id"]), [f"{x:.1f}x expected", f"{r['plays']:,} views", f"{r['followers']:,} followers, {r['f'].get('duration_s', 0):.0f}s",
                                            "we could make this" if r["producible"] else "a person on camera carries it",
                                            r["text"][:100]], tag))
        return out
    half = min(n, len(R) // 2)
    sheet(rows(R[:half]), os.path.join(OUT, "niche-top.jpg"), "Food niche: the biggest breakouts (views after allowing for followers and age)")
    sheet(rows(R[-half:]), os.path.join(OUT, "niche-bottom.jpg"), "Food niche: the smallest breakouts")
    return len(R)


def backfill_niche(n=8):
    """Strips for the niche's top and bottom breakouts that were measured before strips existed."""
    import compete
    import crawl
    R = niche_rows_ranked()
    want = [r["id"] for r in R[:n] + R[-n:] if not strip_of(r["id"])]
    if not want:
        print("niche strips: all present")
        return
    urls = crawl.recent_urls(want)
    print(f"niche strips: {len(want)} missing, {len(urls)} still findable on Apify")
    if urls:
        compete.fetch(urls)


def main(n=4):
    os.makedirs(OUT, exist_ok=True)
    R = rows()
    with open(os.path.join(OUT, "table.md"), "w") as f:
        f.write(table(R) + "\n")
    cds = [r for r in R if r["format"] == "countdown" and r["age"] >= 1.5]
    strip([(r["id"], r["date"], r["views"]) for r in cds[:n]], os.path.join(OUT, "strips-top.png"))
    strip([(r["id"], r["date"], r["views"]) for r in cds[-n:]], os.path.join(OUT, "strips-bottom.png"))
    print(f"ours: {OUT}/table.md, strips-top.png, strips-bottom.png ({len(R)} videos)")
    for name, fn in (("competitors", competitor_pack), ("niche", niche_pack)):
        try:
            got = fn()
            print(f"{name}: {got} {'accounts' if name == 'competitors' else 'videos with strips'}" if got else f"{name}: no data yet")
        except Exception as e:                    # the pack still builds from what exists
            print(f"{name}: skipped ({e})")


if __name__ == "__main__":
    if "--backfill-niche" in sys.argv:
        backfill_niche()
    else:
        main(int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 4)
