#!/usr/bin/env python3
"""The show: short comedy scenes with SavorScout's own cast, from a script to a finished video.

    python show.py lint <episode.json>              check a script against the show's rules
    python show.py build <episode.json> [--render]  voices, timing, sound, captions -> out/show/<id>/
    python show.py cast                             the cast and their voices
    python show.py lines <episode.json>             each character's lines as one ElevenLabs prompt
    python show.py takes <episode.json> <who> <audio file>   cut that recording into the lines
    python show.py bank [list|lint]                 the script bank (social/show/bank/*.txt): list it, or check every script
    python show.py bank make <script id> [campus slug] [date]   turn a bank script into an episode file
    python show.py batch <batch id> <episode.json>... [--day YYYY-MM-DD]
                                                    put built episodes in a batch that make_day.py
                                                    publish/verify can post (e.g. batch id 2026-11-16s)

WHAT AN EPISODE IS. A script (social/show/gold/*.json for the hand-written ones) is a campus and
a list of beats. social/show/BIBLE.md says how to write one; this file turns it into a video:

  {"who": "milo", "say": "It's *Tuesday.*", "face": "panic", "pose": "headgrab"}
        a line. *stars* colour a word in the caption. Optional: "cap" (caption text when it
        differs from what's spoken), "look", "two" (both in frame), "enter" (Scout arrives),
        "other" (the listener's face in a two-shot), "fx" (["shake"], ["cold"]), "punch" (a word:
        the camera jumps in when it's said), "hold" (seconds of pause after the line), "title"
        (the label at the top of the opening shot), "chip" (show the site's name), "sfx".
  {"insert": "balance", "amount": "$4.12", "rows": [[what, cost], ...], "dur": 1.4}
        a close-up of a prop: the visual gag. Also "insert": "plan".
  {"who": "scout", "read": "plan", "dur": 3.4, "burn": 1.9}
        the silent verdict: Scout reads the plan and it burns. The music stops for it.
  {"who": "milo", "react": true, "face": "shock", "dur": 1.0}
        a silent reaction shot.
  {"map": "w", "who": "scout", "say": "There are {w} places to eat within a 10-minute walk of you."}
        the real map of the campus and the real number. {w}, {n}, {campus}, {street}, {street_n},
        {pizza}, {coffee} are filled from SavorScout's data, so a script can't state a wrong one.
  {"meme": {"q": "shocked cat"}, "who": "narrator", "say": "...", "top": "me checking my balance"}
        a meme cut in full-frame (klipy.py finds it; or {"file": "path"}), with a line over it.
  {"end": true}
        the site's name.

VOICES. Two engines. ElevenLabs is the performance (shock, panic, sarcasm): `show.py lines` prints
one prompt per character, with the acting directions ("act", and "voice" when the spoken text needs
capitals for emphasis) and a pause between lines; generate it once with the ElevenLabs connector
(model eleven_v4, the voice in cast.json, one take), download it, and `show.py takes` cuts it into
the lines and keeps them in social/show/takes/<id>/. Any line without a take is read by the local
voice (tts.py), so an episode always builds.

HOW IT'S BUILT. Each line is spoken by its character's voice (tts.py; social/show/cast.json sets
voice, speed and pitch). A shot lasts as long as its line plus the pause the script asks for, so
the rhythm is the writer's. The mouth follows the loudness of the voice, captions are timed across
the line a few words at a time, the music drops under speech and stops for silent beats, and the
mix is levelled to -14 LUFS. Then Remotion renders it (social/video/src/Skit.tsx)."""

import hashlib
import json
import math
import os
import re
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
SHOW = os.path.join(SOCIAL, "show")
VIDEO = os.path.join(SOCIAL, "video")
OUT = os.path.join(SOCIAL, "out", "show")
MAPS = os.path.join(SOCIAL, "out", "maps")
MEMES = os.path.join(SOCIAL, "out", "memes")
TAKES = os.path.join(SHOW, "takes")
sys.path.insert(0, HERE)
import audio  # noqa: E402
import tts  # noqa: E402

FPS = 30
SR = audio.SR
LEAD, TAIL = 2, 4                 # frames of air before and after a spoken line
STAT_LABEL = {"w": "places to eat within a 10-minute walk", "n": "places to eat within a mile",
              "street_n": "places to eat on {street}", "pizza": "pizza places within a mile",
              "coffee": "coffee shops within a mile"}
BANNED = ["foodie", "yummy", "nom nom", "delish", "taco 'bout", "lettuce", "nacho average", "you won't believe", "game changer",
          "hidden gem", "mouth-watering", "mouthwatering", "tasty treat", "bussin", "no cap", "slay", "rizz", "let's dive in",
          "best restaurant", "cheapest", "open now"]


def jload(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def cast():
    return {k: v for k, v in jload(os.path.join(SHOW, "cast.json"), {}).items() if not k.startswith("_")}


# ---- the facts a script may state -----------------------------------------------------------

def facts(slug):
    """Everything Scout is allowed to say about a campus, from SavorScout's own data."""
    import lab
    p = lab.SCENE.get(slug)
    if not p:
        sys.exit(f"no data for campus {slug}")
    top = {name.lower(): n for name, _, n in p.get("top", [])}
    st = (p.get("st") or [[None, None]])[0]
    return {"slug": slug, "campus": lab.short(slug), "w": p.get("w"), "n": p.get("n"), "street": st[0], "street_n": st[1],
            "pizza": top.get("pizza"), "coffee": p.get("cof") or top.get("coffee"), "local": p.get("loc"),
            "lat": lab.CAMP[slug]["lat"], "lng": lab.CAMP[slug]["lng"]}


def fill(text, F):
    def sub(m):
        v = F.get(m.group(1))
        if v is None:
            raise KeyError(f"the script uses {{{m.group(1)}}}, which {F['campus']} has no data for")
        return f"{v:,}" if isinstance(v, int) else str(v)
    return re.sub(r"\{(\w+)\}", sub, text)


# ---- voices ---------------------------------------------------------------------------------

def read_wav(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def line_key(who, text):
    """Names a recorded line: the character and the words (so a rewritten line needs a new take)."""
    words = re.sub(r"[^a-z0-9 ]", "", text.lower())
    return f"{who}-{hashlib.sha1(' '.join(words.split()).encode()).hexdigest()[:10]}"


def take_for(ep_id, who, text):
    d = os.path.join(TAKES, ep_id)
    hit = [f for f in (os.listdir(d) if os.path.isdir(d) else []) if line_key(who, text) in f]
    return os.path.join(d, sorted(hit)[0]) if hit else None


def level(x, c):
    env = np.abs(x)
    loud = np.where(env > 0.02 * (env.max() + 1e-9))[0]
    if len(loud):
        x = x[max(0, loud[0] - int(0.01 * SR)):min(len(x), loud[-1] + int(0.04 * SR))]
    rms = math.sqrt(float(np.mean(x ** 2)) + 1e-12)
    return np.clip(x * (10 ** (-20 / 20) / rms) * float(c.get("gain", 1.0)), -0.98, 0.98)


def spoken_lines(ep):
    """[(who, the text as spoken, the ElevenLabs text with its acting direction)] in script order."""
    F = facts(ep["campus"]) if ep.get("campus") else {"campus": ""}
    out = []
    for b in ep["beats"]:
        if b.get("say"):
            text = re.sub(r"[*]", "", fill(b["say"], F))
            out.append((b["who"], text, ((b.get("act") or "") + " " + fill(b.get("voice") or text, F)).strip()))
    return out


def print_lines(ep):
    C = cast()
    for who in dict.fromkeys(w for w, _, _ in spoken_lines(ep)):
        mine = [(t, v) for w, t, v in spoken_lines(ep) if w == who]
        todo = [v for t, v in mine if not take_for(ep["id"], who, t)]
        e = C[who].get("eleven") or {}
        if not e:
            print(f"\n=== {C[who]['name']}: {len(mine)} lines, read by the local voice (free): nothing to generate ===")
            continue
        print(f"\n=== {C[who]['name']}: {len(mine)} lines, {len(todo)} without a take. ElevenLabs voice {e.get('name')} ({e.get('voice_id')}), model eleven_v4, one take ===")
        if todo:
            prompt = "\n[long pause]\n".join(v for _, v in mine)        # single newlines: every character is paid for
            print(prompt)
            print(f"--- {len(prompt)} characters. Then: python show.py takes <episode.json> {who} <downloaded audio>")


def split_take(path, n):
    """Cut one recording of n lines at its n-1 longest silences. Returns [samples]."""
    x = read_wav(path)
    hop = int(0.02 * SR)
    env = np.array([math.sqrt(float(np.mean(x[i:i + hop] ** 2)) + 1e-12) for i in range(0, len(x) - hop, hop)])
    quiet = env < max(env.max() * 0.035, 1e-4)
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet):
                runs.append((i, j))
            i = j
        else:
            i += 1
    cuts = sorted(sorted(runs, key=lambda r: r[0] - r[1])[:n - 1])
    if len(cuts) < n - 1:
        sys.exit(f"found {len(cuts) + 1} lines in the recording, the script has {n}")
    edges = [0] + [k for a, b in cuts for k in (a, b)] + [len(env)]
    return [x[edges[2 * k] * hop:edges[2 * k + 1] * hop] for k in range(n)], [(b - a) * 0.02 for a, b in cuts]


def store_takes(ep, who, audio):
    mine = list(dict.fromkeys(t for w, t, _ in spoken_lines(ep) if w == who))
    parts, gaps = split_take(audio, len(mine))
    d = os.path.join(TAKES, ep["id"])
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.split("-", 1)[-1].startswith(who + "-"):
            os.remove(os.path.join(d, f))
    print(f"{who}: {len(parts)} lines; pauses between them {min(gaps):.2f}-{max(gaps):.2f} s" if gaps else f"{who}: 1 line")
    for k, (text, x) in enumerate(zip(mine, parts)):
        out = os.path.join(d, f"{k + 1:02d}-{line_key(who, text)}.mp3")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "96k", out],
                       input=(np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)
        rate = len(text) / max(0.1, len(x) / SR)
        print(f"  {len(x) / SR:5.2f} s  {rate:4.1f} ch/s {'  <-- check this cut' if not 5 <= rate <= 28 else ''}  {text}")


def speak(who, text, work, ep_id=None):
    """One line in a character's voice: (mono samples trimmed to the speech, levelled). A recorded
    take (ElevenLabs) wins; otherwise the local voice reads it."""
    c = cast()[who]
    take = take_for(ep_id, who, text) if ep_id else None
    if take:
        return level(read_wav(take), c)
    res = tts.synth([text], os.path.join(work, "voice"), voice=c["voice"], speed=float(c.get("speed", 1.0)))
    if not res:
        return None
    path = res[0][0]
    pitch = float(c.get("pitch", 1.0))
    if abs(pitch - 1.0) > 0.005:          # raise the pitch, keep the length
        shifted = path[:-4] + f"-p{int(round(pitch * 100))}.wav"
        if not os.path.exists(shifted):
            sr = int(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", path],
                                    capture_output=True, text=True).stdout.strip() or 24000)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-af",
                            f"asetrate={int(sr * pitch)},aresample={sr},atempo={1 / pitch:.5f}", shifted], check=True)
        path = shifted
    return level(read_wav(path), c)                    # every line at the same level


def meme_file(spec, pub):
    """A meme for a beat, as a file Remotion can play: {"file": path} or {"q": search words,
    "kind": "gifs"|"clips"|"static-memes"|"stickers", "pick": 0} through klipy.py. Returns
    (file name in the episode's public folder, is video, width, height, credit)."""
    import klipy
    if spec.get("file"):
        src, credit = spec["file"] if os.path.isabs(spec["file"]) else os.path.join(SOCIAL, spec["file"]), spec.get("credit", "")
    else:
        src, credit = klipy.get(spec["q"], MEMES, kind=spec.get("kind", "gifs"), pick=int(spec.get("pick", 0)))
    if not src or not os.path.exists(src):
        return None
    video = not src.lower().endswith((".jpg", ".jpeg", ".png"))
    name = "meme-" + hashlib.sha1(open(src, "rb").read()).hexdigest()[:8] + (".mp4" if video else os.path.splitext(src)[1].lower())
    dst = os.path.join(pub, name)
    if not os.path.exists(dst):
        if video:                                      # gif, webp or mp4 -> an even-sized h264 clip
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-stream_loop", "3", "-i", src, "-t", "8", "-an", "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", dst], check=True)
        else:
            subprocess.run(["cp", src, dst], check=True)
    w, h = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", dst],
                          capture_output=True, text=True).stdout.strip().split(",")[:2]
    return name, video, int(w), int(h), credit


def mouth_shape(x, frames, lead):
    """How open the mouth is on each frame of the shot (0..1), from the loudness of the line."""
    hop = SR // FPS
    env = [math.sqrt(float(np.mean(x[i * hop:(i + 1) * hop] ** 2)) + 1e-12) for i in range(max(1, len(x) // hop))]
    top = np.percentile(env, 92) + 1e-9
    out, prev = [0.0] * frames, 0.0
    for i, e in enumerate(env):
        v = min(1.0, (e / top) ** 0.7)
        v = v if v > prev else prev * 0.55 + v * 0.45                    # opens fast, closes softer
        prev = v
        if lead + i < frames:
            out[lead + i] = round(0.0 if v < 0.12 else v, 2)
    return out


# ---- captions -------------------------------------------------------------------------------

def caption_words(text):
    """[(word, highlighted)] with *stars* marking the highlight (they can span several words)."""
    out, hl = [], False
    for tok in text.split():
        starts = tok.startswith("*")
        ends = tok.rstrip(".,!?—:;").endswith("*") or tok.endswith("*")
        if starts:
            hl = True
        out.append((tok.replace("*", ""), hl))
        if ends:
            hl = False
    return out


def chunk(words, max_words=3, max_chars=15):
    """A few words at a time, breaking where a speaker would."""
    out, cur = [], []
    for w in words:
        n = sum(len(x[0]) for x in cur) + len(cur) + len(w[0])
        if cur and (len(cur) >= max_words or n > max_chars):
            out.append(cur)
            cur = []
        cur.append(w)
        if re.search(r"[.!?—:]$", w[0]) or (w[0].endswith(",") and len(cur) >= 2):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def captions(text, speech_frames, lead, total):
    words = caption_words(text)
    groups = chunk(words)
    weight = lambda w: len(re.sub(r"\W", "", w[0])) + 2 + (5 if re.search(r"[.!?—:]$", w[0]) else 2 if w[0].endswith(",") else 0)
    tot = sum(weight(w) for w in words) or 1
    caps, acc = [], 0
    for g in groups:
        a = lead + int(round(speech_frames * acc / tot))
        acc += sum(weight(w) for w in g)
        caps.append({"a": a, "b": 0, "w": [{"t": t, "hl": bool(h)} for t, h in g]})
    for i, c in enumerate(caps):
        c["b"] = caps[i + 1]["a"] if i + 1 < len(caps) else total
    return caps


# ---- sound ----------------------------------------------------------------------------------

def stereo(x):
    return x if x.ndim == 2 else np.stack([x, x], 1)


def sfx(name, rng):
    t = lambda sec: np.arange(int(sec * SR)) / SR
    if name == "pop":
        return audio.pop()
    if name == "thump":
        return audio.impact(rng) * 0.7
    if name == "whoosh":
        return audio.whoosh(rng, 0.35)
    if name == "ding":
        return audio.ding()
    if name == "sparkle":                     # Scout arrives
        x = np.zeros(int(0.7 * SR))
        for k, f in enumerate((1568, 1976, 2349, 3136)):
            tt = t(0.4)
            n = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) * 0.22
            i = int(k * 0.07 * SR)
            x[i:i + len(n)] += n[:len(x) - i]
        return stereo(x)
    if name == "sad":                         # two falling notes
        x = np.zeros(int(0.9 * SR))
        for k, f in enumerate((392, 311)):
            tt = t(0.42)
            n = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 5) * np.minimum(1, tt * 60) * 0.24
            i = int(k * 0.34 * SR)
            x[i:i + len(n)] += n[:len(x) - i]
        return stereo(x)
    if name == "burn":                        # a soft rush of fire and a crackle
        tt = t(1.5)
        rush = audio.lp(rng.standard_normal(len(tt)), 900) * np.sin(np.pi * np.clip(tt / 1.5, 0, 1)) ** 1.5 * 0.5
        crack = np.zeros(len(tt))
        for _ in range(42):
            i = int(rng.uniform(0.05, 1.3) * SR)
            crack[i:i + 60] += rng.uniform(0.3, 1.0) * np.exp(-np.arange(60) / 9.0) * rng.choice([-1, 1])
        return stereo(rush + audio.hp(crack, 1800) * 0.35)
    if name == "blink":
        tt = t(0.05)
        return stereo(np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 90) * 0.12)
    raise KeyError(name)


def mix(track_path, total_frames, voices, events, quiet, silent, out_path, seed):
    """voices: [(samples, start s)], events: [(sfx name, start s, gain)], quiet: speech spans (music
    ducked), silent: spans where the music stops (the comic pause)."""
    import reel
    total_s = total_frames / FPS
    n = int(total_s * SR)
    rng = np.random.default_rng(seed)
    music = reel.decode(track_path, total_s)
    if len(music) < n:
        music = np.concatenate([music, np.zeros((n - len(music), 2))])
    music = music[:n]
    fade = int(0.8 * SR)
    music[-fade:] *= np.linspace(1, 0, fade)[:, None]
    g = reel.duck(n, quiet, depth=0.22, ramp_s=0.1)
    if silent:
        g = np.minimum(g, reel.duck(n, silent, depth=0.0, ramp_s=0.18))
    v = np.zeros((n, 2))
    for x, at in voices:
        i = int(at * SR)
        a, b = max(0, i), min(n, i + len(x))
        if b > a:
            v[a:b] += x[a - i:b - i, None]
    fxb = np.zeros((n, 2))
    for name, at, gain in events:
        x = sfx(name, rng)
        i = int(at * SR)
        a, b = max(0, i), min(n, i + len(x))
        if b > a:
            fxb[a:b] += gain * x[a - i:b - i]
    out = music * 0.3 * g[:, None] + v + fxb * 0.8          # the music sits under the voices even in the gaps
    out *= 10 ** (-1 / 20) / (np.max(np.abs(out)) + 1e-9)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp = out_path + ".raw.wav"
    with wave.open(tmp, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.2:LRA=11", "-ar", str(SR), "-ac", "2", out_path],
                   check=True)
    os.remove(tmp)


# ---- the map --------------------------------------------------------------------------------

def campus_map(F, mile=False):
    """The campus's map (built once and kept in out/maps): (map.json contents, path of map.png)."""
    d = os.path.join(MAPS, F["slug"] + ("@mile" if mile else ""))
    if not os.path.exists(os.path.join(d, "map.json")):
        os.makedirs(d, exist_ok=True)
        print(f"building the map for {F['campus']} (about a minute)")
        subprocess.run([sys.executable, os.path.join(HERE, "rankmap.py"), F["slug"], str(F["lat"]), str(F["lng"]), d] + (["--mile"] if mile else []),
                       check=True, capture_output=True)
    return json.load(open(os.path.join(d, "map.json"))), os.path.join(d, "map.png")


# ---- script -> shots ------------------------------------------------------------------------

def compile_episode(ep, work):
    F = facts(ep["campus"]) if ep.get("campus") else {"campus": ""}
    pub_rel = f"show/{ep['id']}"
    pub = os.path.join(VIDEO, "public", pub_rel)
    os.makedirs(pub, exist_ok=True)
    shots, voices, events, quiet, silent = [], [], [], [], []
    t = 0                                              # frames
    said = []
    plan = ep.get("plan")
    for i, b in enumerate(ep["beats"]):
        shot = {"from": t}
        speech, dur = None, 0
        if b.get("say"):
            line = fill(b["say"], F)
            speech = speak(b["who"], re.sub(r"[*]", "", line), work, ep["id"])
            if speech is None:
                sys.exit("no voice installed here (python tts.py check): the show needs its voices")
            frames = int(math.ceil(len(speech) / SR * FPS))
            dur = LEAD + frames + TAIL + int(round(float(b.get("hold", 0)) * FPS))
            cap_text = fill(b.get("cap") or b["say"], F)
            said.append((b["who"], line))
        if b.get("end"):
            dur = int(round(float(b.get("dur", 1.5)) * FPS))
            shot.update(kind="end", dur=dur)
            events.append(("ding", t / FPS + 0.1, 0.8))
        elif "meme" in b:                              # a reaction clip or picture, full-frame
            got = meme_file(b["meme"], pub)
            if not got:
                sys.exit(f"no meme found for {b['meme']} (python klipy.py search ...)")
            dur = max(dur, int(round(float(b.get("dur", 1.6)) * FPS)))
            shot.update(kind="meme", dur=dur, meme={"src": f"{pub_rel}/{got[0]}", "video": got[1], "w": got[2], "h": got[3], "top": b.get("top", ""), "credit": got[4]})
            events.append(("pop", t / FPS, 0.9))
        elif "insert" in b:                            # a close-up; a line can run over it
            dur = max(int(round(float(b.get("dur", 1.4)) * FPS)), dur if speech is not None else 0)
            if b["insert"] == "balance":
                prop = {"kind": "balance", "amount": b["amount"], "rows": b.get("rows", [])}
            else:
                prop = {"kind": "plan", **plan}
            shot.update(kind="insert", dur=dur, prop=prop)
            events.append(("pop", t / FPS, 0.9))
            if b.get("sfx"):
                events.append((b["sfx"], t / FPS + 0.15, 1.0))
        elif "read" in b:                              # the silent verdict
            dur = int(round(float(b.get("dur", 3.4)) * FPS))
            burns = b.get("burn", 1.9) is not False      # "burn": false = it only reads (the next line can burn it)
            burn_at = int(round(float(b.get("burn", 1.9)) * FPS)) if burns else dur
            burn_for = int(round(float(b.get("burn_for", 0.9)) * FPS))
            prop = {"kind": "plan", **plan}
            if burns:
                prop.update(burnAt=burn_at, burnFor=burn_for)
                events.append(("burn", (t + burn_at) / FPS - 0.1, 0.55))
            shot.update(kind="solo", dur=dur, who=b["who"], set=b.get("set", "door"), face=b.get("face", "deadpan"), pose="paper", scan=True, prop=prop)
            silent.append((t / FPS, (t + burn_at) / FPS))
            events.append(("blink", t / FPS + 0.5, 1.0))
            events.append(("blink", t / FPS + 1.1, 1.0))
        elif b.get("react"):
            dur = int(round(float(b.get("dur", 1.0)) * FPS))
            shot.update(kind="two" if b.get("two") else "solo", dur=dur, who=b["who"], face=b.get("face", "neutral"), pose=b.get("pose", "idle"),
                        set=b.get("set") or ep.get("set") or ("wide" if b.get("two") else "door" if b["who"] == "scout" else "dorm"))
            if b.get("two"):
                shot["left"], shot["right"] = (ep.get("cast") or ["milo", "scout"])[:2]
            if b.get("quiet", True):
                silent.append((t / FPS, (t + dur) / FPS))
        elif "map" in b:
            stat = b["map"]
            m, png = campus_map(F, mile=stat in ("n", "street_n", "pizza", "coffee"))
            name = f"map-{F['slug']}.png"
            if not os.path.exists(os.path.join(pub, name)):
                subprocess.run(["cp", png, os.path.join(pub, name)], check=True)
            dur = max(dur, int(3.2 * FPS))
            shot.update(kind="map", dur=dur, who=b.get("who", "scout"), face=b.get("face", "smug"),
                        map={**{k: m[k] for k in ("width", "height", "campus", "radius", "dots", "attribution")}, "src": f"{pub_rel}/{name}",
                             "count": F[stat], "label": fill(STAT_LABEL[stat], F), "place": F["campus"]})
            events.append(("whoosh", t / FPS - 0.12, 0.7))
            events.append(("ding", t / FPS + 1.7, 0.7))
        else:
            who = b["who"]
            two = bool(b.get("two"))
            shot.update(kind="two" if two else "solo", dur=dur, who=who, face=b.get("face", "neutral"), pose=b.get("pose", "idle"),
                        set=b.get("set") or ep.get("set") or ("wide" if two else "door" if who == "scout" else "dorm"))
            if two:
                shot["left"], shot["right"] = (ep.get("cast") or ["milo", "scout"])[:2]
            if b.get("look"):
                shot["look"] = b["look"]
            if two:
                shot["other"] = b.get("other", {"face": "neutral", "pose": "idle", "look": "right" if who == shot["right"] else "left"})
            if b.get("enter"):
                shot["enterAt"] = 3
                events.append(("sparkle", t / FPS + 0.05, 1.0))
            if b.get("holds") == "plan":               # still holding the plan while speaking; "burn": seconds in
                shot["prop"] = {"kind": "plan", **plan}
                if b.get("burn") is not None:
                    shot["prop"].update(burnAt=int(round(float(b["burn"]) * FPS)), burnFor=int(round(float(b.get("burn_for", 0.9)) * FPS)))
                    events.append(("burn", t / FPS + float(b["burn"]) - 0.1, 0.5))
            if b.get("fx"):
                shot["fx"] = b["fx"]
                if "shake" in b["fx"]:
                    events.append(("thump", t / FPS, 0.55))
        if speech is not None:
            shot["mouth"] = mouth_shape(speech, shot["dur"], LEAD)
            if shot["kind"] != "map":
                shot["caps"] = captions(cap_text, frames, LEAD, shot["dur"])
                if b.get("punch"):
                    hit = next((c["a"] for c in shot["caps"] if any(b["punch"].lower() in w["t"].lower() for w in c["w"])), None)
                    if hit is not None:
                        shot["punchAt"] = hit
                        events.append(("thump", (t + hit) / FPS, 0.5))
            voices.append((speech, (t + LEAD) / FPS))
            quiet.append(((t + LEAD) / FPS, (t + LEAD + frames) / FPS))
            if b.get("sfx"):
                events.append((b["sfx"], t / FPS, 1.0))
        if b.get("title"):
            shot["title"] = b["title"]
        if b.get("chip"):
            shot["chip"] = True
        shots.append(shot)
        t += shot["dur"]
    return {"shots": shots, "total": t, "voices": voices, "events": events, "quiet": quiet, "silent": silent, "facts": F, "said": said,
            "pub_rel": pub_rel, "pub": pub}


# ---- the rules ------------------------------------------------------------------------------

def lint(ep, built=None):
    """The checks any script must pass before it's made. Returns a list of problems."""
    P = []
    beats = ep.get("beats", [])
    lines = [b for b in beats if b.get("say")]
    if not lines:
        return ["no spoken lines"]
    first = beats[0]
    if not first.get("say") or len(first["say"].split()) > 9:
        P.append("the opening must be a spoken line of 9 words or fewer that states the problem (the hook is the problem)")
    for b in lines:
        n = len(b["say"].split())
        if n > 16:
            P.append(f"line too long ({n} words; 16 at most, most under 9): {b['say'][:50]}")
        if re.search(r"\b[A-Z]{2,}\b", re.sub(r"\{\w+\}", "", b["say"])) and not re.search(r"\b(UC|NYU|MIT|UCLA|USC|LSU|BYU|TCU|SMU|UNC|UVA|GW|BU|OK)\b", b["say"]):
            P.append(f"a word in capitals would be spelled out by the voice; use *stars* for emphasis: {b['say'][:50]}")
        low = (b["say"] + " " + b.get("cap", "")).lower()
        for bad in BANNED:
            if bad in low:
                P.append(f"'{bad}' is on the corny list (BIBLE.md): {b['say'][:50]}")
    if any(b.get("who") == "narrator" and not ("meme" in b or "insert" in b or "map" in b) for b in lines):
        P.append("a narrator line needs something on screen: put it on a meme, an insert or the map")
    text = " ".join((b["say"] + " " + b.get("cap", "")) for b in lines).lower()
    if len(re.findall(r"savor\s?scout", text)) < 1:
        P.append("the site's real name is never said")
    if ep.get("format", "rescue") == "rescue" and not any("map" in b for b in beats):
        P.append("no map beat: a Rescue states one real number from SavorScout's data")
    if any(re.search(r"\d", re.sub(r"\{\w+\}|10-minute", "", b["say"])) for b in lines if b.get("who") == "scout"):
        P.append("Scout says a number that isn't a data slot ({w}, {n}, ...): numbers about places must come from the data")
    if not any(("read" in b) or b.get("react") or float(b.get("hold", 0)) >= 0.5 for b in beats):
        P.append("no pause: every episode needs one silent beat (a read, a reaction, or a hold of 0.5 s+)")
    if not beats[-1].get("end"):
        P.append("the last beat must be the end card")
    if not any(b.get("chip") for b in beats):
        P.append("the site's name is never shown on screen with a line (chip)")
    words = sum(len(b["say"].split()) for b in lines)
    if not 35 <= words <= 125:
        P.append(f"{words} spoken words; an episode runs 35-125 (about 18-45 seconds)")
    if any("read" in b or b.get("insert") == "plan" for b in beats) and not ep.get("plan"):
        P.append("a beat uses the plan but the episode has no \"plan\"")
    if built:
        sec = built["total"] / FPS
        if not 15 <= sec <= 50:
            P.append(f"runs {sec:.1f} s; the show runs 15-50 s")
        if built["shots"][0]["dur"] > 4.0 * FPS:
            P.append("the opening shot is over 4 seconds; get to the first cut faster")
        longest = max([s["dur"] for s in built["shots"] if s["kind"] in ("solo", "two", "meme")] or [0]) / FPS
        if longest > 6.5:
            P.append(f"a shot runs {longest:.1f} s; cut or split lines so no shot passes 6.5 s")
    return P


def build(path, render=False):
    import music
    ep = jload(path)
    if not ep:
        sys.exit(f"can't read {path}")
    problems = lint(ep)
    work = os.path.join(OUT, ep["id"])
    os.makedirs(work, exist_ok=True)
    C = compile_episode(ep, work)
    problems = lint(ep, C)
    lib_dir = ep.get("sounds") or "/tmp/sounds"
    lib = jload(os.path.join(lib_dir, "library.json"))
    if not lib:
        sys.exit(f"no soundtrack library in {lib_dir} (python make_day.py sounds {lib_dir})")
    track = next((x for x in lib["tracks"] if x["id"] == ep.get("track")), None) or music.pick(lib, ep.get("music", "cozy"))
    mix(os.path.join(lib_dir, track["file"]), C["total"], C["voices"], C["events"], C["quiet"], C["silent"],
        os.path.join(C["pub"], "audio.wav"), seed=abs(hash(ep["id"])) % 100000)
    props = {"shots": C["shots"], "audio": f"{C['pub_rel']}/audio.wav", "total": C["total"], "site": "savorscout.net",
             "credits": "Map data © OpenStreetMap contributors, Overture Maps", "tagline": ep.get("tagline", "every place to eat near your campus")}
    out_mp4 = os.path.abspath(os.path.join(work, ep["id"] + ".mp4"))
    manifest = os.path.join(work, "manifest.json")
    json.dump({"videos": [{"id": ep["id"], "composition": "Skit", "props": props, "crf": 21, "out": out_mp4}]}, open(manifest, "w"))
    json.dump({"id": ep["id"], "campus": ep.get("campus"), "format": ep.get("format"), "track": track["id"], "seconds": round(C["total"] / FPS, 1),
               "shots": len(C["shots"]), "voice": "elevenlabs" if os.path.isdir(os.path.join(TAKES, ep["id"])) else "local", "lines": [{"who": w, "say": s} for w, s in C["said"]]}, open(os.path.join(work, "episode.json"), "w"), indent=1)
    print(f"{ep['id']}: {C['total'] / FPS:.1f} s, {len(C['shots'])} shots, {len(C['said'])} lines, track {track['id']}")
    t = 0
    for s in C["shots"]:
        label = s["kind"] + (f" {s.get('who', '')}" if s.get("who") else "")
        txt = " ".join(w["t"] for c in s.get("caps", []) for w in c["w"])
        print(f"  {s['from'] / FPS:5.1f}s  {s['dur'] / FPS:4.1f}s  {label:<12} {txt[:70]}")
    print("lint: " + ("; ".join(problems) if problems else "passes the show's rules"))
    print("manifest:", manifest)
    if render:
        env = dict(os.environ)
        env.setdefault("REMOTION_BROWSER", "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell")
        subprocess.run(["node", os.path.join(VIDEO, "render.mjs"), manifest], cwd=VIDEO, check=True, env=env)
        print("video:", out_mp4)
    return manifest, problems


# ---- the script bank ------------------------------------------------------------------------
# social/show/bank/*.txt holds ready scripts in a short form (the header of each file explains it).
# A bank script names no campus: `bank make` turns one into an episode for any campus.

BANK = os.path.join(SHOW, "bank")
WHO = {"M": "milo", "S": "scout", "J": "june", "T": "theo", "N": "narrator"}
FACES = {"neutral", "panic", "shock", "deadpan", "smug", "happy", "sad", "squint", "plead", "determined"}
POSES = {"idle", "headgrab", "armsup", "point", "shrug", "phone", "paper", "chin", "facepalm", "present"}
ACT_FACE = {"panick": "panic", "shock": "shock", "shout": "shock", "deadpan": "deadpan", "flat": "deadpan", "calm": "neutral", "sarcas": "smug", "smug": "smug",
            "excit": "happy", "happy": "happy", "proud": "smug", "sad": "sad", "tired": "sad", "annoy": "squint", "suspic": "squint", "plead": "plead",
            "whisper": "squint", "determin": "determined", "gasp": "shock", "trembl": "panic", "cheer": "happy", "serious": "determined", "nervous": "panic"}


def bank_scripts():
    out = {}
    for name in sorted(os.listdir(BANK)) if os.path.isdir(BANK) else []:
        if not name.endswith(".txt"):
            continue
        cur = None
        for raw in open(os.path.join(BANK, name)):
            line = raw.rstrip("\n")
            if line.startswith("=="):
                f = [x.strip() for x in line[2:].split("|")]
                cur = {"id": f[0], "format": f[1], "cast": [c.strip() for c in f[2].split(",")], "set": f[3] or None, "title": f[4], "caption": f[5], "lines": [], "file": name}
                out[cur["id"]] = cur
            elif cur is not None and line.strip() and not line.startswith("#"):
                cur["lines"].append(line.strip())
    return out


def bank_episode(sc, campus=None):
    """A bank script as an episode (the same thing a hand-written gold script is)."""
    beats = []
    for line in sc["lines"]:
        head, _, text = line.partition(">")
        tok, text = head.split(), text.strip()
        holds = re.findall(r"\bhold=[\d.]+", line)          # hold=0.6 may sit anywhere on the line
        text = re.sub(r"\s*\bhold=[\d.]+", "", text)
        act = " ".join(re.findall(r"\[[^\]]+\]", text))
        text = re.sub(r"\s*\[[^\]]+\]", "", text).strip()
        if tok[0] == "!":                                   # ! S deadpan 1.2   a silent reaction
            beats.append({"who": WHO[tok[1]], "react": True, "face": next((t for t in tok if t in FACES), "deadpan"), "dur": float(next((t for t in tok if re.fullmatch(r"[\d.]+", t)), 1.2))})
            continue
        b = {}
        if tok[0] == "MAP":                                 # MAP w S > line
            b["map"], tok = tok[1], tok[2:]
        elif tok[0] == "MEME":                              # MEME search words | text above | N > line
            parts = [x.strip() for x in head[4:].split("|")]
            b["meme"] = {"q": parts[0]}
            if len(parts) > 2 and parts[1]:
                b["top"] = parts[1]
            tok = parts[-1].split()
        b["who"] = WHO[tok[0]]
        caps = re.findall(r"\b[A-Z]{3,}\b", re.sub(r"\{\w+\}", "", text))
        say = text
        for w in caps:                                      # a shouted word: capitals for ElevenLabs and the caption only
            say = say.replace(w, w.lower())
        b["say"] = re.sub(r"[*]", "", say)
        if caps:
            b["voice"] = re.sub(r"[*]", "", text)
        if "*" in text or caps:
            cap = text
            for w in caps:
                cap = cap if f"*{w}" in cap else cap.replace(w, f"*{w}*", 1)
            b["cap"] = cap
        if act:
            b["act"] = act
        if "map" not in b and "meme" not in b:
            b["face"] = next((t for t in tok if t in FACES), None) or next((v for k, v in ACT_FACE.items() if k in act.lower()), "neutral")
            b["pose"] = next((t for t in tok if t in POSES), "idle")
            if "2" in tok:
                b["two"] = True
            if "shake" in tok:
                b["fx"] = ["shake"]
            if "cam" in tok:
                b["look"] = "cam"
        if holds:
            b["hold"] = float(holds[-1][5:])
        beats.append(b)
    spoken = [b for b in beats if b.get("say")]
    if spoken:
        spoken[0]["title"] = sc["title"]
        spoken[0].setdefault("fx", []).append("cold")
        spoken[-1]["chip"] = True
        if spoken[-1].get("who") != "narrator":
            spoken[-1]["look"] = "cam"
    seen = set()
    for b in beats:                                         # the first time the second character speaks, show them together
        w = b.get("who")
        if w and w != "narrator" and "map" not in b and "meme" not in b and not b.get("react") and w not in seen:
            seen.add(w)
            if len(seen) == 2 and w in sc["cast"][:2]:
                b["two"] = True
    beats.append({"end": True})
    ep = {"id": sc["id"], "format": sc["format"], "bank": sc["id"], "cast": sc["cast"], "music": "cozy",
          "caption": sc["caption"] + "\n\n#collegelife #collegefood #relatable " + ("#skit" if "narrator" not in sc["cast"] else "#fyp"), "beats": beats}
    # every episode gets its own soundtrack (the owner's rule: no two videos in a day share one);
    # change "track" in the episode file if two of a day's episodes land on the same one
    lib = (jload("/tmp/sounds/library.json") or {}).get("tracks", [])
    calm = [t["id"] for t in lib if t.get("mood") == "cozy"] or [t["id"] for t in lib]
    if calm:
        ep["track"] = calm[int(hashlib.sha1((sc["id"] + (campus or "")).encode()).hexdigest(), 16) % len(calm)]
    if sc["set"]:
        ep["set"] = sc["set"]
    if campus:
        import lab
        ep["campus"] = campus
        ep["id"] = f"{sc['id']}-{re.sub(r'[^a-z0-9]+', '-', lab.short(campus).lower()).strip('-')}"
    return ep


def bank_cmd(a):
    scripts = bank_scripts()
    if not a or a[0] == "list":
        used = {}
        for f in os.listdir(os.path.join(SHOW, "episodes")) if os.path.isdir(os.path.join(SHOW, "episodes")) else []:
            e = jload(os.path.join(SHOW, "episodes", f)) or {}
            if e.get("bank"):
                used[e["bank"]] = used.get(e["bank"], 0) + 1
        for sc in scripts.values():
            words = sum(len(re.sub(r"\[[^\]]+\]", "", l.partition(">")[2]).split()) for l in sc["lines"])
            needs = "campus" if any("{" in l for l in sc["lines"]) else "-"
            print(f"{sc['id']:<26} {sc['format']:<10} {','.join(sc['cast']):<12} {words:>3}w  {needs:<6} made {used.get(sc['id'], 0)}x  {sc['title']}")
        print(len(scripts), "scripts")
    elif a[0] == "lint":
        bad = 0
        for sc in scripts.values():
            needs = any("{" in l for l in sc["lines"])
            probs = lint(bank_episode(sc, "new-york-university" if needs else None))
            if probs:
                bad += 1
                print(sc["id"], "->", "; ".join(probs))
        print(f"{len(scripts) - bad} of {len(scripts)} scripts pass")
        sys.exit(1 if bad else 0)
    elif a[0] == "make" and len(a) > 1:
        import datetime as dt
        sc = scripts.get(a[1]) or sys.exit(f"no script {a[1]} in the bank (python show.py bank list)")
        campus = next((x for x in a[2:] if not re.fullmatch(r"\d{4}-\d\d-\d\d", x)), None)
        if any("{" in l for l in sc["lines"]) and not campus:
            sys.exit("this script states a number: give a campus slug")
        ep = bank_episode(sc, campus)
        date = next((x for x in a[2:] if re.fullmatch(r"\d{4}-\d\d-\d\d", x)), dt.date.today().isoformat())
        out = os.path.join(SHOW, "episodes", f"{date}-{ep['id']}.json")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        json.dump(ep, open(out, "w"), indent=1, ensure_ascii=False)
        probs = lint(ep)
        print(out, "|", "; ".join(probs) if probs else "passes the show's rules")


def batch(batch_id, paths, day=None):
    """Hand built episodes to the publisher: batches/<id>/ (videos.json, posts.json) and
    out/batches/<id>/ (reels.json, the videos), the layout make_day.py publish and verify read.
    The batch id is the day plus a letter (2026-11-16s) so it sits beside that day's other batch.
    The labs skip these videos (videos.json lists none); the show keeps its own record."""
    import datetime as dt
    import random
    day = day or batch_id[:10]
    wdir, out = os.path.join(SOCIAL, "batches", batch_id), os.path.join(SOCIAL, "out", "batches", batch_id)
    os.makedirs(wdir, exist_ok=True)
    os.makedirs(out, exist_ok=True)
    cfg = jload(os.path.join(SOCIAL, "config.json"), {})
    times = (cfg.get("slots") or {}).get("tiktok") or ["12:15", "15:15", "18:15", "21:15"]
    from zoneinfo import ZoneInfo
    tz = ZoneInfo(cfg.get("timezone", "America/New_York"))
    rng = random.Random(batch_id)
    reels, shows, tiktok = [], [], []
    for k, path in enumerate(paths):
        ep = jload(path)
        rec = jload(os.path.join(OUT, ep["id"], "episode.json"))
        mp4 = os.path.join(OUT, ep["id"], ep["id"] + ".mp4")
        if not rec or not os.path.exists(mp4):
            sys.exit(f"{ep['id']} isn't built and rendered yet (python show.py build {path} --render)")
        if not ep.get("caption"):
            sys.exit(f"{ep['id']} has no \"caption\" (the TikTok text: the viewer's own situation, no pitch; FORMATS.md section 4)")
        subprocess.run(["cp", mp4, os.path.join(out, ep["id"] + ".mp4")], check=True)
        reels.append({"id": ep["id"], "track": rec["track"], "composition": "Skit", "props": {"scenes": []}})
        shows.append({"id": ep["id"], "script": os.path.relpath(path, SOCIAL), "format": ep.get("format"), "seconds": rec["seconds"], "voice": rec.get("voice")})
        hh, mm = map(int, str(times[k % len(times)]).split(":")[:2])
        at = dt.datetime.fromisoformat(day).replace(hour=hh, minute=mm, tzinfo=tz) + dt.timedelta(minutes=rng.randint(0, int(cfg.get("jitter_minutes", 6))))
        tiktok.append({"video": ep["id"], "at": at.isoformat(), "text": ep["caption"]})
    json.dump({"videos": reels}, open(os.path.join(out, "reels.json"), "w"), indent=1)
    json.dump({"date": day, "videos": [], "show": shows}, open(os.path.join(wdir, "videos.json"), "w"), indent=1)
    json.dump({"tiktok": tiktok, "twitter": [], "threads": [], "cards": {}}, open(os.path.join(wdir, "posts.json"), "w"), indent=1, ensure_ascii=False)
    print(f"batch {batch_id}: {len(reels)} episodes for {day}")
    for p in tiktok:
        print(f"  {p['at']}  {p['video']}: {p['text'][:70]}")
    print(f"check: python make_day.py publish {batch_id} <sounds dir> --dry-run    then publish and: python make_day.py verify {batch_id}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "lint" and len(a) > 1:
        probs = lint(jload(a[1]) or {})
        print("\n".join(probs) if probs else "passes the show's rules")
        sys.exit(1 if probs else 0)
    elif a[0] == "build" and len(a) > 1:
        build(a[1], render="--render" in a)
    elif a[0] == "lines" and len(a) > 1:
        print_lines(jload(a[1]))
    elif a[0] == "takes" and len(a) > 3:
        store_takes(jload(a[1]), a[2], a[3])
    elif a[0] == "bank":
        bank_cmd(a[1:])
    elif a[0] == "batch" and len(a) > 2:
        day = a[a.index("--day") + 1] if "--day" in a else None
        batch(a[1], [x for i, x in enumerate(a[2:]) if x != "--day" and a[2:][i - 1] != "--day"], day)
    elif a[0] == "cast":
        for k, c in cast().items():
            print(f"{c['name']:<6} {c['role']:<40} voice {c['voice']} x{c['speed']} pitch {c['pitch']}\n       {c['persona']}")
    else:
        sys.exit(__doc__)
