#!/usr/bin/env python3
"""Countdown voiceovers recorded with ElevenLabs (the social-media voice), instead of the local voice.

    python cdvoice.py lines <date>                 one prompt per countdown: generate each ONCE with the
                                                   ElevenLabs connector (eleven_v4, the voice below, one take)
    python cdvoice.py cut <date> <video id> <audio file>   cut that recording into the video's lines

Then build as usual: reel.py uses a recorded line wherever one exists for the exact words, and the local
voice for anything else (so a reworded line falls back safely). Takes live in social/show/takes/cd-<date>-<id>/.

Cost: a countdown is about 350-500 characters. Check account_get_usage first; with fewer than 1,500
characters left, skip this and let the local voice read the countdowns."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import show

VOICE = {"voice_id": "TX3LPaxmHKxFdv7VOQHJ", "name": "Liam - Energetic, Social Media Creator", "model": "eleven_v4"}
WHO = "countdown"


def videos(date):
    return json.load(open(os.path.join(show.SOCIAL, "batches", date, "videos.json")))["videos"]


def folder(date, vid):
    return os.path.join(show.TAKES, f"cd-{date}-{vid}")


def take(date, vid, text):
    """(path, seconds) of the recorded line for these exact words, or None."""
    d = folder(date, vid)
    if not os.path.isdir(d):
        return None
    k = show.line_key(WHO, text)
    hit = sorted(f for f in os.listdir(d) if k in f)
    if not hit:
        return None
    p = os.path.join(d, hit[0])
    return p, len(show.read_wav(p)) / show.SR


def prompt(v):
    out = []
    for i, sc in enumerate(s for s in v["scenes"] if s.get("say")):
        tag = "[excited] " if i == 0 else "[dramatically] " if sc["say"].lower().startswith(("and number one", "number one")) else ""
        out.append(tag + sc["say"])
    return "\n[long pause]\n".join(out)


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 2 and a[0] == "lines":
        for v in videos(a[1]):
            p = prompt(v)
            print(f"=== {v['id']}: voice {VOICE['name']} ({VOICE['voice_id']}), {VOICE['model']}, one take, {len(p)} characters ===\n{p}\n")
    elif len(a) == 4 and a[0] == "cut":
        v = next(x for x in videos(a[1]) if x["id"] == a[2])
        texts = [s["say"] for s in v["scenes"] if s.get("say")]
        parts, gaps = show.split_take(a[3], len(texts))
        d = folder(a[1], a[2]); os.makedirs(d, exist_ok=True)
        import subprocess, numpy as np
        for k, (t, x) in enumerate(zip(texts, parts)):
            out = os.path.join(d, f"{k + 1:02d}-{show.line_key(WHO, t)}.wav")
            x = show.level(x, {"gain": 1.0})
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(show.SR), "-ac", "1", "-i", "-", out],
                           input=(np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)
            print(f"  {len(x) / show.SR:5.2f} s  {t}")
    else:
        sys.exit(__doc__)
