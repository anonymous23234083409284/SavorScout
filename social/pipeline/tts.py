#!/usr/bin/env python3
"""Voiceover for the videos: an open-source voice (Kokoro) reads each scene's line.

    python tts.py check                 is the voice available here?
    python tts.py say "text" out.wav    one line, to listen to

Why a voice: the competitor map countdowns that pull 4K-25K views on ~16K followers all talk from
the first frame, while ours were silent and static for 5-6 seconds (social/lab/expert-review.md).

The engine runs in its own Python environment (kokoro-onnx + onnxruntime) beside two model files
(kokoro-v1.0.onnx, voices-v1.0.bin), so it can't disturb the pipeline's own packages. Point
SAVORSCOUT_TTS_PYTHON at that environment's python and SAVORSCOUT_TTS_DIR at the model folder;
otherwise ~/.local/share/savorscout-tts/ (then ~/.cache/savorscout-tts/) is used. When neither is there, videos are built exactly
as before, without a voice, and the build says so: a missing voice never breaks a batch."""

import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get("SAVORSCOUT_TTS_VOICE", "af_heart")
SPEED = float(os.environ.get("SAVORSCOUT_TTS_SPEED", "1.2"))

# Names a text-to-speech engine would misread: spoken the way students say them.
SAY_AS = {"UMass": "You Mass", "UChicago": "U Chicago", "UConn": "You Conn", "UPenn": "U Penn", "CU Boulder": "C U Boulder",
          "Texas A&M": "Texas A and M", "A&M": "A and M", "UC ": "U C ", "UH-": "U H ", "St.": "Saint", "SUNY": "Soo-nee",
          "CUNY": "Kyoo-nee"}
KEEP_WORDS = {"SUNY", "CUNY", "NASA"}


def speakable(text):
    """The line as the voice should read it: no markup, acronyms spelled out, units spoken."""
    t = re.sub(r"[*_]", "", text)
    for k, v in SAY_AS.items():
        t = t.replace(k, v)
    t = re.sub(r"\b10-minute\b", "ten-minute", t)
    t = re.sub(r"#\s?(\d+)", r"number \1", t)
    t = t.replace("&", " and ")
    # MIT, NYU, UCLA, GW, BU -> letter by letter.
    t = re.sub(r"\b([A-Z]{2,5})\b", lambda m: m.group(1) if m.group(1) in KEEP_WORDS else " ".join(m.group(1)), t)
    return re.sub(r"\s+", " ", t).strip()


def engine():
    """(python, model dir) for the voice, or None when it isn't installed here."""
    bases = [os.path.expanduser("~/.local/share/savorscout-tts"), os.path.expanduser("~/.cache/savorscout-tts")]
    if os.environ.get("SAVORSCOUT_TTS_DIR"):
        bases.insert(0, os.environ["SAVORSCOUT_TTS_DIR"])
    for d in bases:
        py = os.environ.get("SAVORSCOUT_TTS_PYTHON") or os.path.join(d, "venv", "bin", "python")
        if os.path.exists(py) and all(os.path.exists(os.path.join(d, f)) for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin")):
            return py, d
    return None


WORKER = r"""
import json, sys
import soundfile as sf
from kokoro_onnx import Kokoro
job = json.load(sys.stdin)
k = Kokoro(job["dir"] + "/kokoro-v1.0.onnx", job["dir"] + "/voices-v1.0.bin")
out = []
for line in job["lines"]:
    audio, sr = k.create(line["text"], voice=job["voice"], speed=job["speed"], lang="en-us")
    sf.write(line["out"], audio, sr)
    out.append({"out": line["out"], "seconds": len(audio) / sr})
print(json.dumps(out))
"""


def synth(texts, cache_dir, voice=VOICE, speed=SPEED):
    """Speak each text (cached by wording and voice). Returns [(wav path, seconds)], or None without
    an engine."""
    eng = engine()
    if not eng:
        return None
    os.makedirs(cache_dir, exist_ok=True)
    meta_path = os.path.join(cache_dir, "voice-cache.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    paths, todo = [], []
    for t in texts:
        spoken = speakable(t)
        key = hashlib.sha1(f"{voice}|{speed}|{spoken}".encode()).hexdigest()[:16]
        path = os.path.join(cache_dir, f"say-{key}.wav")
        paths.append((path, key))
        if key not in meta or not os.path.exists(path):
            todo.append({"text": spoken, "out": path, "key": key})
    if todo:
        job = {"dir": eng[1], "voice": voice, "speed": speed, "lines": [{"text": x["text"], "out": x["out"]} for x in todo]}
        r = subprocess.run([eng[0], "-c", WORKER], input=json.dumps(job), capture_output=True, text=True, timeout=900)
        if r.returncode != 0:
            raise RuntimeError(f"voice failed: {r.stderr[-400:]}")
        done = {d["out"]: d["seconds"] for d in json.loads(r.stdout.strip().splitlines()[-1])}
        for x in todo:
            meta[x["key"]] = {"seconds": done[x["out"]], "text": x["text"]}
        json.dump(meta, open(meta_path, "w"), indent=1)
    return [(p, meta[k]["seconds"]) for p, k in paths]


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "check":
        e = engine()
        print(f"voice ready: python {e[0]}, models {e[1]}, voice {VOICE}" if e else "no voice installed (videos build without one)")
    elif a[0] == "say" and len(a) >= 3:
        res = synth([a[1]], os.path.dirname(os.path.abspath(a[2])) or ".")
        if not res:
            sys.exit("no voice installed")
        os.replace(res[0][0], a[2])
        print(f"{a[2]}: {res[0][1]:.2f}s  ({speakable(a[1])})")
    else:
        sys.exit(__doc__)
