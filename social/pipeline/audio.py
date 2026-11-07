"""The soundtrack: an original deep-house groove plus sound effects on the cuts.

Everything is synthesised here, so there is nothing to license and no track
can be flagged as someone else's. The groove runs at 120 BPM, which puts every
cut in props.TIMING on a beat. Each video gets its own key, chords and stab
pattern from its seed, so a day's four videos do not sound identical.

    write(path, timing, n_spots, seed)
"""
import math, wave
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 120
BEAT = 60 / BPM
STEP = BEAT / 4          # sixteenth note
BAR = BEAT * 4
FPS = 30
POP_AT = 36              # frame within a spot when its pin lands (MapCard.tsx POP_AT)

CHORDS = {"m9": [0, 3, 7, 10, 14], "m7": [0, 3, 7, 10], "M7": [0, 4, 7, 11], "add9": [0, 4, 7, 14], "M9": [0, 4, 7, 11, 14]}
PROGRESSIONS = [
    [(0, "m9"), (8, "M7"), (3, "M7"), (10, "add9")],
    [(0, "m9"), (5, "m7"), (10, "add9"), (3, "M9")],
    [(0, "m9"), (0, "m9"), (5, "m9"), (5, "m9")],
    [(0, "m7"), (10, "add9"), (8, "M7"), (7, "m7")],
]
STABS = [[2, 6, 10, 13], [3, 6, 11, 14], [2, 7, 10, 15], [3, 7, 10, 13]]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * 0.45), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)


def saw(f, n, max_h=7000.0, phase=0.0):
    """Band-limited sawtooth by additive synthesis (harmonics below max_h)."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, int(max_h // f) + 1):
        out += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return out * (2 / np.pi)


def place(buf, x, start_s, gain=1.0):
    i = int(round(start_s * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    a, b = max(0, i), min(len(buf), i + len(x))
    buf[a:b] += gain * x[a - i:b - i]


def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = hp(np.random.default_rng(1).standard_normal(n), 2500) * np.exp(-t * 400) * 0.25
    return np.tanh(1.6 * (body + click)) * 0.9


def clap(rng):
    n = int(0.35 * SR); t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 4200)
    env = np.zeros(n)
    for d in (0.0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 120), 0) * 0.6
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) * 16), 0)
    return noise * env * 0.5


def hat(rng, open_=False):
    n = int((0.28 if open_ else 0.06) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500, 4) * np.exp(-t * (14 if open_ else 70)) * 0.35


def reverb(x, rng, seconds=1.8, decay=0.42, wet=0.22, tone=5500):
    n = int(seconds * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = lp(rng.standard_normal(n), tone) * np.exp(-t / decay)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - wet) + out * wet * 1.6


def music(total_s, seed):
    rng = np.random.default_rng(seed)
    n = int((total_s + 2.0) * SR)
    # Key, chords and stabs step through their lists with the seed, so videos
    # made with consecutive seeds (one day's batch) never share a key.
    tonic = [55, 57, 60, 62, 58, 53][seed % 6]            # G3 A3 C4 D4 Bb3 F3
    prog = PROGRESSIONS[(seed // 6) % len(PROGRESSIONS)]
    stabs = STABS[(seed // 2) % len(STABS)]
    drums = np.zeros(n); bass = np.zeros(n); stab_bus = np.zeros((n, 2)); pad_bus = np.zeros((n, 2))
    K, C = kick(), clap(rng)
    kicks = []
    bars = int(math.ceil(total_s / BAR)) + 1
    for b in range(bars):
        root_off, kind = prog[b % len(prog)]
        root = tonic + root_off
        while root > tonic + 6:
            root -= 12
        notes = [root + i for i in CHORDS[kind]]
        notes = [m if m >= 55 else m + 12 for m in notes]
        t0 = b * BAR
        for s in range(16):
            ts = t0 + s * STEP + (0.012 if s % 2 else 0.0)      # a little swing on the off-sixteenths
            if s % 4 == 0:
                place(drums, K, ts, 0.62); kicks.append(ts)
            if s in (4, 12):
                place(drums, C, ts, 0.8)
            if s % 4 == 2:
                place(drums, hat(rng, open_=(s == 14 and b % 2 == 1)), ts, 0.62 * (0.85 + 0.3 * rng.random()))
            else:
                place(drums, hat(rng), ts, 0.24 * (0.7 + 0.6 * rng.random()))
            if s in (2, 6, 10, 14) or (s == 15 and b % 2):
                bn = root - 24 + (12 if s == 15 else 0)
                L = int(0.2 * SR); tt = np.arange(L) / SR
                tone = np.sin(2 * np.pi * hz(bn) * tt) + 0.45 * np.sin(4 * np.pi * hz(bn) * tt) + 0.2 * np.sin(6 * np.pi * hz(bn) * tt)
                place(bass, np.tanh(2.2 * tone) * np.minimum(1, tt * 400) * np.exp(-tt * 9), ts, 0.36)
            if s in stabs:
                L = int(0.36 * SR); tt = np.arange(L) / SR
                env = np.minimum(1, tt * 300) * np.exp(-tt * 10)
                for m in notes:
                    for det, pan in ((-0.07, 0.25), (0.07, 0.75)):
                        v = lp(saw(hz(m + det), L, 6000), 3400) * env * 0.21
                        place(stab_bus[:, 0], v, ts, 1 - pan); place(stab_bus[:, 1], v, ts, pan)
        # A soft pad under each bar, darker than the stabs.
        L = int(BAR * SR + 0.4 * SR); tt = np.arange(L) / SR
        env = np.minimum(1, tt / 0.35) * np.minimum(1, np.maximum(0, (BAR + 0.4 - tt)) / 0.4)
        for m in notes[:4]:
            for det, pan in ((-0.1, 0.2), (0.1, 0.8)):
                v = lp(saw(hz(m + det), L, 4000, phase=rng.random() * 6), 1500) * env * 0.075
                place(pad_bus[:, 0], v, t0, 1 - pan); place(pad_bus[:, 1], v, t0, pan)
    # Sidechain: everything melodic ducks under the kick, the deep-house pump.
    t = np.arange(n) / SR
    duck = np.ones(n)
    for kt in kicks:
        i = int(kt * SR); L = min(n - i, int(0.3 * SR))
        if L > 0:
            duck[i:i + L] = np.minimum(duck[i:i + L], 1 - 0.6 * np.exp(-np.arange(L) / SR / 0.09))
    bass = lp(bass, 650) * duck
    stab_bus = reverb(stab_bus * duck[:, None], rng, wet=0.3)
    pad_bus = reverb(pad_bus * duck[:, None], rng, wet=0.35)
    drums_st = np.stack([drums, drums], 1)
    mix = drums_st * 0.9 + np.stack([bass, bass], 1) * 0.9 + stab_bus + pad_bus
    return mix[: int(total_s * SR)], {"tonic": tonic, "progression": prog, "stabs": stabs}


def whoosh(rng, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    lo, hi = lp(noise, 700), lp(noise, 6000)
    x = t / dur
    sweep = lo * (1 - x) + hi * x
    env = np.sin(np.pi * np.clip(x, 0, 1)) ** 2
    sweep = hp(sweep, 150) * env
    pan = x
    return np.stack([sweep * (1 - 0.6 * pan), sweep * (0.4 + 0.6 * pan)], 1) * 0.5


def pop():
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = 520 + 600 * np.exp(-t * 45)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * np.minimum(1, t * 2000)
    return np.stack([x, x], 1) * 0.45


def impact(rng):
    n = int(1.2 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (42 + 30 * np.exp(-t * 6)) * t) * np.exp(-t * 3.2)
    air = lp(rng.standard_normal(n), 1800) * np.exp(-t * 9) * 0.35
    x = np.tanh(1.4 * (boom + air)) * 0.8
    return np.stack([x, x], 1)


def ding():
    n = int(1.4 * SR); t = np.arange(n) / SR
    f = 1318.5
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for a, r, d in ((1, 1, 3.5), (0.45, 2.0, 5), (0.25, 3.01, 7)))
    x *= np.minimum(1, t * 800)
    return np.stack([x, x], 1) * 0.18


def write(path, timing, n_spots, seed):
    rng = np.random.default_rng(seed + 99)
    hook, spot, outro = timing["hook"] / FPS, timing["spot"] / FPS, timing["outro"] / FPS
    total = hook + n_spots * spot + outro
    mix, info = music(total, seed)
    sfx = np.zeros_like(mix)
    def put(x, at, g=1.0):
        i = int(at * SR); a, b = max(0, i), min(len(sfx), i + len(x))
        if b > a:
            sfx[a:b] += g * x[a - i:b - i]
    put(impact(rng), 0.0, 0.9)
    cuts = [hook] + [hook + k * spot for k in range(1, n_spots)] + [hook + n_spots * spot]
    for c in cuts:
        put(whoosh(rng), c - 0.3, 0.75)
    for k in range(n_spots):
        put(pop(), hook + k * spot + POP_AT / FPS, 0.9)
    put(ding(), hook + n_spots * spot + 0.6, 1.0)
    # Level the music, then sit the effects on top and limit softly.
    rms = np.sqrt(np.mean(mix ** 2)) + 1e-9
    mix *= 10 ** (-17 / 20) / rms
    out = mix + sfx * 10 ** (-9 / 20) / (np.max(np.abs(sfx)) + 1e-9)
    out = hp(out.T, 28).T
    out = np.tanh(out * 1.25) / np.tanh(1.25)
    fade = np.minimum(1, (len(out) - np.arange(len(out))) / (0.25 * SR))[:, None]
    out *= fade
    out *= 10 ** (-1 / 20) / (np.max(np.abs(out)) + 1e-9)
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    return {**info, "seconds": round(total, 2), "rms_db": round(20 * math.log10(np.sqrt(np.mean(out ** 2)) + 1e-9), 1)}


if __name__ == "__main__":
    import sys, json
    print(json.dumps(write(sys.argv[1], {"hook": 75, "spot": 90, "outro": 105}, 5, int(sys.argv[2]) if len(sys.argv) > 2 else 1)))
