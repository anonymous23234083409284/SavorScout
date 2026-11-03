"""Build a creator-style short from a written script (social/batches/<date>/videos.json).

A script is a list of scenes, each with a length in beats, a caption style and
the words, plus Pexels searches for its footage (or a ranking map). This file
turns it into Remotion props for the "Reel" composition:

  * picks the soundtrack (music.py's least recently used track of the mood)
    and lays every scene on its beat grid, so each cut lands on a beat
  * fetches and trims footage per scene (clips.py), never reusing a clip
  * fits every caption with the real font (no overflow, balanced lines)
  * mixes the track with a few effects and fades it out at the end

    python reel.py <videos.json> <sounds dir> <rank maps dir> [video id]
"""
import json, os, random, re, shutil, subprocess, sys, wave
import numpy as np
from PIL import ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audio, clips, music  # noqa: E402

FPS = 30
VIDEO = os.path.join(HERE, "..", "video")
FONTS = os.path.join(VIDEO, "public", "fonts")
BLACK = os.path.join(FONTS, "InterDisplay-Black.otf")
SEMI = os.path.join(FONTS, "Inter-SemiBold.otf")
BOLD = os.path.join(FONTS, "Inter-Bold.otf")
READ_WPS = 3.2            # words per second a viewer reads comfortably
CRF = 21                  # x264 quality: TikTok re-encodes uploads, so finer than this only costs megabytes
STYLE = {                 # font, largest size, smallest size, max width, max lines
    "hook": (BLACK, 120, 72, 900, 4),
    "cap": (BLACK, 92, 60, 880, 4),
    "item": (BLACK, 132, 80, 900, 2),
    "word": (BLACK, 170, 96, 900, 1),
    "small": (SEMI, 54, 40, 820, 3),
    "end": (BLACK, 100, 64, 880, 3),
    "rank": (BLACK, 128, 80, 900, 1),
    "sub": (SEMI, 44, 34, 820, 3),
}
_fonts = {}


def font(path, size):
    k = (path, size)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(path, size)
    return _fonts[k]


def words_of(text):
    """'It gets dark at *5pm* now.' -> [{'t': 'It'}, ..., {'t': '5pm', 'hl': True}, {'t': 'now.'}]"""
    out, hl = [], False
    for tok in re.split(r"(\*)", text):
        if tok == "*":
            hl = not hl
            continue
        for w in tok.split():
            if out and re.fullmatch(r"[.,;:!?)\u2019'\"]+", w):
                out[-1]["t"] += w            # "taste" + "." stays one word, no gap before the period
            else:
                out.append({"t": w, **({"hl": True} if hl else {})})
    return out


def width(words, path, size, tracking):
    f = font(path, size)
    text = " ".join(w["t"] for w in words)
    return f.getlength(text) + tracking * size * len(text)


def fit(text, style, prefix=""):
    """Wrap and size a caption: the largest size whose balanced wrap fits."""
    path, hi, lo, max_w, max_lines = STYLE[style]
    tracking = -0.02 if path == BLACK else 0.0
    ws = words_of(text)
    if prefix:
        ws = [{"t": prefix, "hl": True}] + ws
    for size in range(hi, lo - 1, -2):
        lines = wrap(ws, path, size, tracking, max_w)
        if lines and len(lines) <= max_lines:
            return {"size": size, "lines": balance(lines, path, size, tracking, max_w)}
    return {"size": lo, "lines": wrap(ws, path, lo, tracking, max_w) or [ws]}


def wrap(ws, path, size, tracking, max_w):
    lines, cur = [], []
    for w in ws:
        if width(cur + [w], path, size, tracking) <= max_w or not cur:
            if not cur and width([w], path, size, tracking) > max_w:
                return None
            cur.append(w)
        else:
            lines.append(cur)
            cur = [w]
    if cur:
        lines.append(cur)
    return lines


def balance(lines, path, size, tracking, max_w):
    """Even out a greedy wrap so the last line isn't a lonely word."""
    if len(lines) < 2:
        return lines
    flat = [w for l in lines for w in l]
    n = len(lines)
    best, best_score = lines, None
    def rec(start, k, acc):
        nonlocal best, best_score
        if k == 1:
            line = flat[start:]
            if not line or width(line, path, size, tracking) > max_w:
                return
            cand = acc + [line]
            ws = [width(l, path, size, tracking) for l in cand]
            score = max(ws) - min(ws)
            if best_score is None or score < best_score:
                best, best_score = cand, score
            return
        for end in range(start + 1, len(flat) - k + 2):
            line = flat[start:end]
            if width(line, path, size, tracking) > max_w:
                break
            rec(end, k - 1, acc + [line])
    if len(flat) <= 16:
        rec(0, n, [])
    return best


def list_size(rows, row_w=860, rank_w=70, gaps=52):
    """The largest type size at which every row's name fits beside its rank and value (ListScene in Reel.tsx)."""
    for size in range(64, 35, -2):
        if all(width(words_of(r[1]), BLACK, size, -0.015) + width(words_of(r[2]), BLACK, size, 0) + rank_w + gaps <= row_w
               for r in rows):                  # a row may carry a 4th item, a small line under the name
            return size
    print("warning: a list row is too long to fit; shorten the longest name", file=sys.stderr)
    return 36


def reading_beats(scene, fpb):
    text = " ".join([scene.get("text", ""), scene.get("sub", "")] + [" ".join(r) for r in scene.get("rows", [])])
    n = len(re.sub(r"[*]", "", text).split())
    need_s = n / READ_WPS + 0.5
    return int(np.ceil(need_s * FPS / fpb))


def decode(path, seconds):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-t", f"{seconds:.3f}", "-f", "s16le",
                          "-ac", "2", "-ar", str(audio.SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float64) / 32768


def mix_audio(track_path, scenes, total_frames, out_path, rng):
    total_s = total_frames / FPS
    music_pcm = decode(track_path, total_s)
    n = int(total_s * audio.SR)
    if len(music_pcm) < n:
        music_pcm = np.concatenate([music_pcm, np.zeros((n - len(music_pcm), 2))])
    music_pcm = music_pcm[:n]
    fade = int(1.2 * audio.SR)
    music_pcm[-fade:] *= np.linspace(1, 0, fade)[:, None]
    sfx = np.zeros_like(music_pcm)

    def put(x, at, g):
        i = int(at * audio.SR); a, b = max(0, i), min(n, i + len(x))
        if b > a:
            sfx[a:b] += g * x[a - i:b - i]
    for i, s in enumerate(scenes):
        t = s["from"] / FPS
        if i == 1:
            put(audio.whoosh(rng), t - 0.3, 0.5)
        if s["style"] in ("item", "rank", "word"):
            put(audio.pop(), t + 0.05, 0.35 if s["style"] == "word" else 0.5)
        if s["style"] == "list":
            for r in range(len(s["list"]["rows"])):
                put(audio.pop() * 0.5, t + s["rowAt"][r] / FPS, 0.25)
        if s["style"] == "end":
            put(audio.ding(), t + 0.2, 0.8)
    out = music_pcm * 0.92 + sfx * 0.6
    out *= 10 ** (-1 / 20) / (np.max(np.abs(out)) + 1e-9)
    with wave.open(out_path, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(audio.SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


def build(video, date, lib, sounds_dir, rank_dir, work, used_clips, seed, key=None):
    """Props for one scripted video, with its files staged under video/public."""
    rng = random.Random(seed)
    # "track" pins a soundtrack (a rebuild keeps the one already picked); otherwise least recently used.
    track = next(t for t in lib["tracks"] if t["id"] == video["track"]) if video.get("track") else music.pick(lib, video["mood"])
    track["last_used"] = date
    fpb = FPS * 60 / track["bpm"]
    rel = f"reel/{key or date}/{video['id']}"
    pub = os.path.join(VIDEO, "public", rel)
    os.makedirs(pub, exist_ok=True)
    scenes, beat = [], 0
    raw_by_scene = {}
    for i, sc in enumerate(video["scenes"]):
        beats = max(sc["beats"], reading_beats(sc, fpb) if sc["style"] not in ("word", "rank") else 0)
        start, end = round(beat * fpb), round((beat + beats) * fpb)
        beat += beats
        dur = end - start
        out = {"from": start, "dur": dur, "style": sc["style"], "zoom": ["in", "out"][i % 2]}
        if sc["style"] == "rank":
            m = json.load(open(os.path.join(rank_dir, sc["map"], "map.json")))
            shutil.copy(os.path.join(rank_dir, sc["map"], "map.png"), os.path.join(pub, f"rank-{sc['map']}.png"))
            out["map"] = {**m, "src": f"{rel}/rank-{sc['map']}.png"}
            out["rank"] = {"num": sc.get("num", ""), "name": fit(sc["text"], "rank"), "count": sc["count"],
                           "sub": fit(sc["sub"], "sub"), **{k: sc[k] for k in ("label", "suffix") if k in sc}}
        else:
            if "reuse" in sc:
                cm = raw_by_scene[sc["reuse"]]
                out["reuseOf"] = sc["reuse"]
            elif sc.get("clip"):                # a Pexels id picked by eye from the previews
                cm = clips.by_id(sc["clip"])
                used_clips.add(cm["id"])
            else:
                cm = clips.pick_queries(sc["q"], used_clips, dur / FPS + 0.5, rng, top=5)
                used_clips.add(cm["id"])
            raw_by_scene[i] = cm
            path = os.path.join(pub, f"s{i:02d}.mp4")
            clips.prepare(cm, path, dur / FPS + 0.25, os.path.join(work, "pexels-cache"),
                          start=sc.get("clip_from") if "reuse" not in sc else None)
            out["src"] = f"{rel}/s{i:02d}.mp4"
            out["clip"] = {"id": cm["id"], "by": cm["by"], "url": cm["url"], "query": cm["query"]}
            if sc["style"] == "list":
                rows = sc["rows"]
                out["list"] = {"title": sc["title"], "rows": rows, "size": list_size(rows)}
                gap = (dur - 10) / (len(rows) + 1)
                out["rowAt"] = [int(6 + gap * r) for r in range(len(rows))]
            else:
                prefix = f"{sc['num']}." if sc.get("num") else ""
                out["caption"] = fit(sc["text"], sc["style"], prefix)
                if sc.get("sub"):
                    out["sub"] = fit(sc["sub"], "sub")
        scenes.append(out)
    total = scenes[-1]["from"] + scenes[-1]["dur"]
    shutil.copy(os.path.join(sounds_dir, track["file"]), os.path.join(work, track["file"]))
    mix_audio(os.path.join(sounds_dir, track["file"]), scenes, total, os.path.join(pub, "audio.wav"), np.random.default_rng(seed))
    return {"id": video["id"], "props": {"scenes": scenes, "audio": f"{rel}/audio.wav", "total": total,
                                         "bpm": track["bpm"], "site": "savorscout.net",
                                         "credits": "Footage: Pexels · Map data © OpenStreetMap contributors, Overture Maps"},
            "track": track["id"]}


def batch_date(spec):
    """The day a batch posts (older scripts called it "week")."""
    return spec.get("date") or spec["week"]


def batch_key(spec):
    """The batch's folder name: its date, or "batch" when a day has a second one (2026-11-02b)."""
    return spec.get("batch") or batch_date(spec)


def work_dir(spec):
    return os.path.join(HERE, "..", "out", "batches", batch_key(spec))


def captions(sc):
    """The fitted text fields of one scene (what build() stores beside the footage)."""
    out = {}
    if sc["style"] == "rank":
        out["rank"] = {"num": sc.get("num", ""), "name": fit(sc["text"], "rank"), "count": sc["count"], "sub": fit(sc["sub"], "sub"),
                       **{k: sc[k] for k in ("label", "suffix") if k in sc}}
    elif sc["style"] == "list":
        out["list"] = {"title": sc["title"], "rows": sc["rows"], "size": list_size(sc["rows"])}
    else:
        out["caption"] = fit(sc["text"], sc["style"], f"{sc['num']}." if sc.get("num") else "")
        if sc.get("sub"):
            out["sub"] = fit(sc["sub"], "sub")
    return out


def refit(spec, work):
    """Re-fit every caption from the script without touching footage, timing or audio."""
    reels = json.load(open(os.path.join(work, "reels.json")))
    by_id = {v["id"]: v for v in spec["videos"]}
    for r in reels["videos"]:
        for sc_spec, sc in zip(by_id[r["id"]]["scenes"], r["props"]["scenes"]):
            if sc["style"] == "rank":
                sc["rank"] = {**sc["rank"], **captions(sc_spec)["rank"]}
            else:
                sc.update(captions(sc_spec))
    json.dump(reels, open(os.path.join(work, "reels.json"), "w"), indent=1)
    manifest = {"videos": [{"id": b["id"], "composition": "Reel", "props": b["props"], "crf": CRF,
                            "out": os.path.abspath(os.path.join(work, b["id"] + ".mp4"))} for b in reels["videos"]]}
    json.dump(manifest, open(os.path.join(work, "manifest.json"), "w"))


def repick(spec, work, vid, fixes, seed=7, spec_path=None):
    """Swap the footage of chosen scenes ({scene index: [queries] or a Pexels id}) after a visual review.

    The rejected clip is remembered, so it can never come back; timing, captions
    and audio are untouched. A Pexels id is also pinned in the script
    (`"clip"`), so rebuilding after a wording change keeps it.
    """
    reels = json.load(open(os.path.join(work, "reels.json")))
    used_path = os.path.join(work, "used-clips.json")
    used = set(json.load(open(used_path)))
    rejected_path = os.path.join(work, "rejected-clips.json")
    rejected = set(json.load(open(rejected_path))) if os.path.exists(rejected_path) else set()
    rng = random.Random(seed)
    r = next(v for v in reels["videos"] if v["id"] == vid)
    for i, queries in fixes.items():
        sc = r["props"]["scenes"][int(i)]
        rejected.add(sc["clip"]["id"])
        if isinstance(queries, int):            # a clip chosen by eye from the previews
            cm = clips.by_id(queries)
            next(v for v in spec["videos"] if v["id"] == vid)["scenes"][int(i)]["clip"] = queries
        else:
            cm = clips.pick_queries(queries, used | rejected, sc["dur"] / FPS + 0.5, rng, top=6)
        used.add(cm["id"])
        clips.prepare(cm, os.path.join(VIDEO, "public", sc["src"]), sc["dur"] / FPS + 0.25, os.path.join(work, "pexels-cache"))
        sc["clip"] = {"id": cm["id"], "by": cm["by"], "url": cm["url"], "query": cm["query"]}
        # An end scene that reused this clip keeps showing the old one; point it at the new file too.
        for other in r["props"]["scenes"]:
            if other["style"] == "end" and other.get("reuseOf") == int(i):
                clips.prepare(cm, os.path.join(VIDEO, "public", other["src"]), other["dur"] / FPS + 0.25, os.path.join(work, "pexels-cache"))
        print(vid, i, cm["query"], cm["id"], cm["by"], flush=True)
    json.dump(sorted(used), open(used_path, "w"))
    json.dump(sorted(rejected), open(rejected_path, "w"))
    if spec_path:
        json.dump(spec, open(spec_path, "w"), indent=1, ensure_ascii=False)
    json.dump(reels, open(os.path.join(work, "reels.json"), "w"), indent=1)
    manifest = {"videos": [{"id": b["id"], "composition": "Reel", "props": b["props"], "crf": CRF,
                            "out": os.path.abspath(os.path.join(work, b["id"] + ".mp4"))} for b in reels["videos"]]}
    json.dump(manifest, open(os.path.join(work, "manifest.json"), "w"))


if __name__ == "__main__":
    if sys.argv[1] == "repick":
        spec = json.load(open(sys.argv[2]))
        repick(spec, work_dir(spec), sys.argv[3], json.loads(sys.argv[4]), spec_path=sys.argv[2])
        sys.exit()
    if sys.argv[1] == "refit":
        spec = json.load(open(sys.argv[2]))
        refit(spec, work_dir(spec))
        sys.exit()
    spec = json.load(open(sys.argv[1]))
    sounds, ranks = sys.argv[2], sys.argv[3]
    only = sys.argv[4] if len(sys.argv) > 4 else None
    lib = json.load(open(os.path.join(sounds, "library.json")))
    work = work_dir(spec)
    os.makedirs(work, exist_ok=True)
    used = set(json.load(open(os.path.join(work, "used-clips.json")))) if os.path.exists(os.path.join(work, "used-clips.json")) else set()
    out = []
    for k, v in enumerate(spec["videos"]):
        if only and v["id"] != only:
            continue
        b = build(v, batch_date(spec), lib, sounds, ranks, work, used, seed=1000 + k, key=batch_key(spec))
        out.append(b)
        print(v["id"], b["track"], b["props"]["total"], "frames", flush=True)
    json.dump(sorted(used), open(os.path.join(work, "used-clips.json"), "w"))
    json.dump(lib, open(os.path.join(sounds, "library.json"), "w"), indent=1)
    if only and os.path.exists(os.path.join(work, "reels.json")):   # one video rebuilt: keep the others
        kept = {v["id"]: v for v in json.load(open(os.path.join(work, "reels.json")))["videos"]}
        kept.update({b["id"]: b for b in out})
        out = [kept[v["id"]] for v in spec["videos"] if v["id"] in kept]
    json.dump({"videos": out}, open(os.path.join(work, "reels.json"), "w"), indent=1)
    # The renderer's manifest: one entry per video, rendered with the Reel composition.
    manifest = {"videos": [{"id": b["id"], "composition": "Reel", "props": b["props"], "crf": CRF,
                            "out": os.path.abspath(os.path.join(work, b["id"] + ".mp4"))} for b in out]}
    json.dump(manifest, open(os.path.join(work, "manifest.json"), "w"))
