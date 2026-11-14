#!/usr/bin/env python3
"""The show: short comedy scenes with SavorScout's own cast, from a script to a finished video.

    python show.py lint <episode.json>              check a script against the show's rules
    python show.py build <episode.json> [--render]  voices, timing, sound, captions -> out/show/<id>/
    python show.py cast                             the cast and their voices

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
  {"end": true}
        the site's name.

HOW IT'S BUILT. Each line is spoken by its character's voice (tts.py; social/show/cast.json sets
voice, speed and pitch). A shot lasts as long as its line plus the pause the script asks for, so
the rhythm is the writer's. The mouth follows the loudness of the voice, captions are timed across
the line a few words at a time, the music drops under speech and stops for silent beats, and the
mix is levelled to -14 LUFS. Then Remotion renders it (social/video/src/Skit.tsx)."""

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


def speak(who, text, work):
    """One line in a character's voice: (mono samples trimmed to the speech, levelled)."""
    c = cast()[who]
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
    x = read_wav(path)
    env = np.abs(x)
    loud = np.where(env > 0.02 * (env.max() + 1e-9))[0]
    if len(loud):
        x = x[max(0, loud[0] - int(0.01 * SR)):min(len(x), loud[-1] + int(0.04 * SR))]
    rms = math.sqrt(float(np.mean(x ** 2)) + 1e-12)
    x = x * (10 ** (-20 / 20) / rms) * float(c.get("gain", 1.0))      # every line at the same level
    return np.clip(x, -0.98, 0.98)


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
    F = facts(ep["campus"])
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
            speech = speak(b["who"], re.sub(r"[*]", "", line), work)
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
            burn_at = int(round(float(b.get("burn", 1.9)) * FPS))
            burn_for = int(round(float(b.get("burn_for", 0.9)) * FPS))
            shot.update(kind="solo", dur=dur, who=b["who"], set=b.get("set", "door"), face=b.get("face", "deadpan"), pose="paper", scan=True,
                        prop={"kind": "plan", **plan, "burnAt": burn_at, "burnFor": burn_for})
            silent.append((t / FPS, (t + burn_at) / FPS))
            events.append(("blink", t / FPS + 0.5, 1.0))
            events.append(("blink", t / FPS + 1.1, 1.0))
            events.append(("burn", (t + burn_at) / FPS - 0.1, 0.55))
        elif b.get("react"):
            dur = int(round(float(b.get("dur", 1.0)) * FPS))
            shot.update(kind="two" if b.get("two") else "solo", dur=dur, who=b["who"], face=b.get("face", "neutral"), pose=b.get("pose", "idle"))
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
                        set=b.get("set", "wide" if two else "dorm" if who == "milo" else "door"))
            if b.get("look"):
                shot["look"] = b["look"]
            if two:
                shot["other"] = b.get("other", {"face": "neutral", "pose": "idle", "look": "right" if who == "scout" else "left"})
            if b.get("enter"):
                shot["enterAt"] = 3
                events.append(("sparkle", t / FPS + 0.05, 1.0))
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
    text = " ".join((b["say"] + " " + b.get("cap", "")) for b in lines).lower()
    if len(re.findall(r"savor\s?scout", text)) < 1:
        P.append("the site's real name is never said")
    if not any("map" in b for b in beats):
        P.append("no map beat: every episode states one real number from SavorScout's data")
    if not any(("read" in b) or b.get("react") or float(b.get("hold", 0)) >= 0.5 for b in beats):
        P.append("no pause: every episode needs one silent beat (a read, a reaction, or a hold of 0.5 s+)")
    if not beats[-1].get("end"):
        P.append("the last beat must be the end card")
    if not any(b.get("chip") for b in beats):
        P.append("the site's name is never shown on screen with a line (chip)")
    words = sum(len(b["say"].split()) for b in lines)
    if not 55 <= words <= 125:
        P.append(f"{words} spoken words; an episode runs 55-125 (about 28-45 seconds)")
    if any("read" in b or b.get("insert") == "plan" for b in beats) and not ep.get("plan"):
        P.append("a beat uses the plan but the episode has no \"plan\"")
    if built:
        sec = built["total"] / FPS
        if not 26 <= sec <= 50:
            P.append(f"runs {sec:.1f} s; the show runs 26-50 s")
        if built["shots"][0]["dur"] > 4.0 * FPS:
            P.append("the opening shot is over 4 seconds; get to the first cut faster")
        longest = max(s["dur"] for s in built["shots"] if s["kind"] in ("solo", "two")) / FPS
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
    json.dump({"id": ep["id"], "campus": ep["campus"], "format": ep.get("format"), "track": track["id"], "seconds": round(C["total"] / FPS, 1),
               "shots": len(C["shots"]), "lines": [{"who": w, "say": s} for w, s in C["said"]]}, open(os.path.join(work, "episode.json"), "w"), indent=1)
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
    elif a[0] == "cast":
        for k, c in cast().items():
            print(f"{c['name']:<6} {c['role']:<40} voice {c['voice']} x{c['speed']} pitch {c['pitch']}\n       {c['persona']}")
    else:
        sys.exit(__doc__)
