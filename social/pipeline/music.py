"""SavorScout's soundtrack library: original tracks, and the rotation through them.

Tracks are synthesised here, so nothing needs a license and nothing can be
claimed as someone else's recording. Three styles, each with a real
arrangement (intro, groove, a break, the groove again) about 64 seconds long,
so a 30 to 60 second video never hears a loop restart:

  lofi   lo-fi hip hop, 82-90 BPM: electric piano, dusty swung drums, vinyl
  house  deep house, 120 BPM: pumping chords, four-on-the-floor
  disco  nu-disco and funk, 116-118 BPM: plucked guitar chops, octave bass, strings

Any track added to the library by hand (an .m4a or .mp3 plus its BPM in
library.json) rotates the same way. Videos cut on the beat using each track's
`bpm` and `offset` (seconds to the first downbeat).

    python music.py build <dir> [count]     # synthesise a library into <dir>
"""
import json, math, os, subprocess, sys
import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, os.path.dirname(__file__))
from audio import SR, bp, clap, hat, hp, hz, kick, lp, place, reverb, saw  # noqa: E402

LENGTH = 64.0

PROGS = {
    "lofi": [[(2, "m9"), (7, "dom9"), (0, "M9"), (9, "m7")], [(0, "M9"), (9, "m9"), (2, "m9"), (7, "dom9")],
             [(5, "M9"), (4, "m7"), (2, "m9"), (0, "M9")], [(9, "m9"), (5, "M9"), (0, "M9"), (7, "dom9")]],
    "house": [[(0, "m9"), (8, "M7"), (3, "M7"), (10, "add9")], [(0, "m9"), (5, "m7"), (10, "add9"), (3, "M9")],
              [(0, "m9"), (0, "m9"), (5, "m9"), (5, "m9")], [(0, "m7"), (10, "add9"), (8, "M7"), (7, "m7")]],
    "disco": [[(0, "m7"), (5, "m7"), (0, "m7"), (7, "m7")], [(0, "M7"), (9, "m7"), (5, "M7"), (7, "dom9")],
              [(0, "m9"), (3, "M7"), (8, "M7"), (7, "m7")], [(5, "M7"), (4, "m7"), (2, "m7"), (0, "M7")]],
}
CHORDS = {"m9": [0, 3, 7, 10, 14], "m7": [0, 3, 7, 10], "M7": [0, 4, 7, 11], "M9": [0, 4, 7, 11, 14],
          "add9": [0, 4, 7, 14], "dom9": [0, 4, 10, 14]}
MOOD = {"lofi": "cozy", "house": "groove", "disco": "upbeat"}


def ep_note(f, n, vel=1.0, bright=1.0):
    """Electric piano: two-operator FM with a decaying index and a little tremolo."""
    t = np.arange(n) / SR
    index = (2.2 * bright) * np.exp(-t * 6) + 0.25
    mod = np.sin(2 * np.pi * f * t)
    tone = np.sin(2 * np.pi * f * t + index * mod)
    tone += 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
    env = np.minimum(1, t * 250) * (0.65 * np.exp(-t * 1.6) + 0.35 * np.exp(-t * 0.5))
    trem = 1 - 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 4.6 * t))
    return tone * env * trem * vel


def pluck(f, n, rng, damp=0.996, bright=0.55):
    """Karplus-Strong string: noise through a tuned, damped delay loop."""
    N = max(2, int(round(SR / f)))
    burst = np.zeros(n)
    exc = rng.uniform(-1, 1, N)
    exc = lp(exc, 1500 + 6000 * bright) if N > 12 else exc
    burst[:N] = exc
    a = np.zeros(N + 2)
    a[0] = 1.0
    a[N] = -0.5 * damp
    a[N + 1] = -0.5 * damp
    return lfilter([1.0], a, burst)


def vinyl(n, rng):
    hiss = lp(rng.standard_normal(n), 3500) * 0.012
    pops = np.zeros(n)
    idx = rng.integers(0, n, size=int(n / SR * 9))
    pops[idx] = rng.uniform(0.15, 0.6, len(idx)) * rng.choice([-1, 1], len(idx))
    return hiss + hp(lp(pops, 6000), 900) * 0.25


def soft_kick(rng):
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t * 32)
    return np.tanh(1.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9))


def dusty_snare(rng):
    n = int(0.32 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.6
    noise = bp(rng.standard_normal(n), 900, 6000) * np.exp(-t * 17)
    return lp(body + noise, 6500) * 0.7


def voicing(root, kind, lo=50, hi=74):
    notes = [root + i for i in CHORDS[kind]]
    out = []
    for m in notes:
        while m < lo:
            m += 12
        while m > hi:
            m -= 12
        out.append(m)
    return sorted(set(out))


def master(mix, lowpass=None):
    mix = hp(mix.T, 30).T
    if lowpass:
        mix = lp(mix.T, lowpass).T
    rms = np.sqrt(np.mean(mix ** 2)) + 1e-9
    mix *= 10 ** (-16 / 20) / rms
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    mix *= 10 ** (-1 / 20) / (np.max(np.abs(mix)) + 1e-9)
    return mix


def lofi(seed):
    rng = np.random.default_rng(seed)
    bpm = [82, 84, 86, 88, 90][seed % 5]
    beat = 60 / bpm; bar = 4 * beat; step = beat / 4
    n = int((LENGTH + 2) * SR)
    tonic = [60, 62, 57, 65, 58][seed % 5]
    prog = PROGS["lofi"][(seed // 5) % 4]
    drums, ep, bass = np.zeros(n), np.zeros((n, 2)), np.zeros(n)
    K, S = soft_kick(rng), dusty_snare(rng)
    bars = int(LENGTH / bar) + 1
    swing = 0.6
    for b in range(bars):
        off, kind = prog[b % 4]
        root = tonic + off
        t0 = b * bar
        intro = b == 0
        brk = b % 8 == 7          # every eighth bar the drums drop out for a breath
        for s in range(16):
            ts = t0 + s * step + (step * (swing - 0.5) * 2 if s % 2 else 0)
            if not intro and not brk:
                if s in (0, 7, 10) or (s == 14 and b % 2):
                    place(drums, K, ts, 0.8 if s == 0 else 0.55)
                if s in (4, 12):
                    place(drums, S, ts + rng.normal(0, 0.004), 0.75)
            if s % 2 == 0 and not intro:
                place(drums, hat(rng), ts, (0.32 if s % 4 == 2 else 0.2) * (0.7 + 0.5 * rng.random()))
        # Chords on beat 1 and the "and" of 2, humanised.
        vs = voicing(root, kind)
        for hit, length, vel in ((0.0, 1.6, 1.0), (1.5 * beat, 1.2, 0.7)):
            for i, m in enumerate(vs):
                L = int(length * bar / 2 * SR)
                note = ep_note(hz(m), L, vel * 0.16, bright=0.8)
                at = t0 + hit + i * 0.012 + rng.normal(0, 0.006)
                pan = 0.35 + 0.3 * (i / max(1, len(vs) - 1))
                place(ep[:, 0], note, at, 1 - pan); place(ep[:, 1], note, at, pan)
        if not intro:
            for at, m in ((0, root - 24), (2.5 * beat, root - 24 + (7 if b % 2 else 0))):
                L = int(0.9 * beat * SR); tt = np.arange(L) / SR
                tone = np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(4 * np.pi * hz(m) * tt)
                place(bass, tone * np.minimum(1, tt * 300) * np.exp(-tt * 2.5), t0 + at, 0.55)
        # A sparse melody over the second half.
        if b >= 8 and not brk:
            scale = [0, 2, 4, 7, 9, 12, 14]
            for s in rng.choice([2, 6, 9, 11, 14], size=2, replace=False):
                m = tonic + 12 + int(rng.choice(scale))
                L = int(0.7 * SR)
                note = ep_note(hz(m), L, 0.09, bright=1.2)
                at = t0 + s * step
                place(ep[:, 0], note, at, 0.45); place(ep[:, 1], note, at, 0.55)
    drums = np.tanh(1.4 * lp(drums, 7000))
    mix = np.stack([drums, drums], 1) * 0.75 + reverb(ep, rng, wet=0.28) + np.stack([lp(bass, 320)] * 2, 1) * 0.8
    v = vinyl(n, rng)
    mix += np.stack([v, v], 1)
    return master(mix[: int(LENGTH * SR)], lowpass=9500), bpm


def house(seed):
    from audio import music
    mix, info = music(LENGTH, seed)
    return master(mix), 120


def disco(seed):
    rng = np.random.default_rng(seed)
    bpm = [116, 118, 117][seed % 3]
    beat = 60 / bpm; bar = 4 * beat; step = beat / 4
    n = int((LENGTH + 2) * SR)
    tonic = [57, 60, 62, 55, 59][seed % 5]
    prog = PROGS["disco"][(seed // 5) % 4]
    drums, gtr, bass, strings = np.zeros(n), np.zeros((n, 2)), np.zeros(n), np.zeros((n, 2))
    K, C = kick(), clap(rng)
    bars = int(LENGTH / bar) + 1
    kicks = []
    chop = [s for s in range(16) if s % 2 == 1 or s in (0, 6, 10)]
    for b in range(bars):
        off, kind = prog[b % 4]
        root = tonic + off
        while root > tonic + 6:
            root -= 12
        t0 = b * bar
        brk = b % 8 == 7
        for s in range(16):
            ts = t0 + s * step
            if s % 4 == 0 and not brk:
                place(drums, K, ts, 0.7); kicks.append(ts)
            if s in (4, 12):
                place(drums, C, ts, 0.75)
            if s % 4 == 2:
                place(drums, hat(rng, open_=True), ts, 0.42)
            place(drums, hat(rng), ts, 0.13 * (0.6 + 0.6 * rng.random()))
            # Octave disco bass on the eighths.
            if s % 2 == 0 and not brk:
                m = root - 24 + (12 if s % 4 == 2 else 0)
                L = int(step * 1.8 * SR)
                v = pluck(hz(m), L, rng, damp=0.994, bright=0.35)
                place(bass, np.tanh(2.0 * v) * np.exp(-np.arange(L) / SR * 6), ts, 0.5)
            # Muted guitar chops.
            if s in chop:
                vs = voicing(root + 12, kind, 60, 79)
                for i, m in enumerate(vs[:4]):
                    L = int(0.16 * SR)
                    v = pluck(hz(m), L, rng, damp=0.97, bright=0.8) * np.exp(-np.arange(L) / SR * 22)
                    at = ts + i * 0.004
                    place(gtr[:, 0], v, at, 0.62); place(gtr[:, 1], v, at, 0.38)
        # String pad swelling over the bar.
        L = int((bar + 0.3) * SR); tt = np.arange(L) / SR
        env = np.minimum(1, tt / 0.6) * np.minimum(1, np.maximum(0, (bar + 0.3 - tt)) / 0.3)
        for i, m in enumerate(voicing(root, kind, 55, 76)):
            for det, pan in ((-0.08, 0.25), (0.08, 0.75)):
                v = lp(saw(hz(m + det), L, 5000, phase=rng.random() * 6), 2200) * env * 0.045
                place(strings[:, 0], v, t0, 1 - pan); place(strings[:, 1], v, t0, pan)
    duck = np.ones(n)
    for kt in kicks:
        i = int(kt * SR); L = min(n - i, int(0.25 * SR))
        if L > 0:
            duck[i:i + L] = np.minimum(duck[i:i + L], 1 - 0.45 * np.exp(-np.arange(L) / SR / 0.08))
    mix = (np.stack([drums] * 2, 1) * 0.85 + np.stack([lp(bass, 900) * duck] * 2, 1) * 0.9
           + reverb(gtr, rng, wet=0.18) * 0.9 + reverb(strings * duck[:, None], rng, wet=0.35))
    return master(mix[: int(LENGTH * SR)]), bpm


STYLES = {"lofi": lofi, "house": house, "disco": disco}


def write_track(style, seed, out_dir):
    pcm, bpm = STYLES[style](seed)
    tid = f"{style}-{seed:03d}"
    wav = os.path.join(out_dir, tid + ".wav")
    import wave
    with wave.open(wav, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((pcm * 32767).astype(np.int16).tobytes())
    m4a = os.path.join(out_dir, tid + ".m4a")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "192k", m4a], check=True)
    os.remove(wav)
    return {"id": tid, "file": tid + ".m4a", "title": f"SavorScout {style} {seed}", "style": style,
            "mood": MOOD[style], "bpm": bpm, "offset": 0.0, "seconds": LENGTH,
            "license": "Original, synthesised by social/pipeline/music.py. Owned by SavorScout.",
            "last_used": None}


def build(out_dir, count=12):
    os.makedirs(out_dir, exist_ok=True)
    lib_path = os.path.join(out_dir, "library.json")
    lib = json.load(open(lib_path)) if os.path.exists(lib_path) else {"tracks": []}
    have = {t["id"] for t in lib["tracks"]}
    order = ["lofi", "disco", "house"]
    k = 0
    while sum(1 for t in lib["tracks"] if t["license"].startswith("Original")) < count:
        style = order[k % 3]
        seed = 101 + k
        k += 1
        if f"{style}-{seed:03d}" in have:
            continue
        lib["tracks"].append(write_track(style, seed, out_dir))
        print("made", lib["tracks"][-1]["id"], flush=True)
    json.dump(lib, open(lib_path, "w"), indent=1)
    return lib


def pick(lib, mood=None):
    """The least recently used track, of a mood if asked; marks it used."""
    pool = [t for t in lib["tracks"] if mood is None or t["mood"] == mood] or lib["tracks"]
    t = min(pool, key=lambda t: (t["last_used"] or "", t["id"]))
    return t


if __name__ == "__main__":
    if sys.argv[1] == "build":
        build(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 12)
