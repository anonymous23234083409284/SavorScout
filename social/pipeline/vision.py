#!/usr/bin/env python3
"""Footage analysis: what an editor would notice, measured.

    python vision.py <video.mp4> [...]      print the features of each video as JSON

Every feature comes from the pixels and the audio, so it works the same on a
niche TikTok and on our own render, which is what makes them comparable.

PACING        cuts (hard and gradual), shot lengths, cuts per second, when the
              first cut lands, cuts in the first 3 seconds
TRANSITIONS   hard cuts vs. gradual ones (dissolves, fades), fades through black
MOTION        how much the picture moves between cuts, camera movement and
              zoom (optical flow), motion in the first second
HOOK          the first frame: words on screen (OCR), a question on screen,
              faces and how big, brightness, contrast, colour
TEXT          how much of the video carries on-screen text, words per frame
LOOP          how closely the last frame matches the first (a seamless loop
              rewatches)
AUDIO         loudness (LUFS), loudness range, silence at the start

Methods are standard and deliberately transparent: frame differencing plus
colour-histogram distance for cuts (a spike is a hard cut; a sustained rise
without a spike is a gradual transition), Farneback optical flow for camera
motion, Tesseract for on-screen text, OpenCV's face detector for faces, and
ffmpeg's EBU R128 meter for loudness."""

import json
import math
import os
import re
import subprocess
import sys

import numpy as np

try:
    import cv2
except ImportError:          # flow and faces are skipped without OpenCV
    cv2 = None

SMALL_W, SMALL_H = 54, 96    # analysis resolution for cuts and motion (9:16)


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    st = j["streams"][0]
    num, den = (int(x) for x in st["r_frame_rate"].split("/"))
    return float(j["format"]["duration"]), num / den if den else 30.0, int(st["width"]), int(st["height"])


def frames(path, fps):
    """Every frame at analysis size, RGB, as an (n, H, W, 3) array."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps},scale={SMALL_W}:{SMALL_H}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    n = len(raw) // (SMALL_W * SMALL_H * 3)
    return np.frombuffer(raw[: n * SMALL_W * SMALL_H * 3], dtype=np.uint8).reshape(n, SMALL_H, SMALL_W, 3)


def frame_at(path, t, width=540):
    """One full-detail frame (for OCR and faces)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", "-vf",
                          f"scale={width}:-2", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    if not raw or cv2 is None:
        return None
    return cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)


def hist(f):
    h = np.histogramdd(f.reshape(-1, 3) // 32, bins=(8, 8, 8), range=((0, 8), (0, 8), (0, 8)))[0].ravel()
    return h / max(1.0, h.sum())


def cuts_and_transitions(F, fps):
    """Hard cuts: a one-frame spike in colour-histogram or pixel difference, well above the local level.
    Gradual transitions (dissolves, fades): two steady shots a half-second apart that look different,
    joined by small steps with no spike, which fast motion inside one shot doesn't produce."""
    H = np.array([hist(f) for f in F])
    hd = np.concatenate([[0.0], 0.5 * np.abs(np.diff(H, axis=0)).sum(axis=1)])        # 0..1
    gray = F.mean(axis=3)
    pd = np.concatenate([[0.0], np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2)) / 255])
    n, w = len(hd), max(3, int(fps // 2))
    hard = []
    for t in range(1, n):
        lh = np.median(hd[max(1, t - w):t + w + 1])
        lp = np.median(pd[max(1, t - w):t + w + 1])
        spike_h = hd[t] > 0.12 and hd[t] > 5 * max(lh, 0.01) and pd[t] > 0.02
        spike_p = pd[t] > 0.03 and pd[t] > 6 * max(lp, 0.004)
        if (spike_h or spike_p) and (not hard or t - hard[-1] > fps * 0.25):
            hard.append(t)
    near_hard = set()
    for c in hard:
        near_hard.update(range(c - 2, c + 3))
    # Gradual: a sustained run (0.25-2 s) of raised change against the surroundings, with no single
    # dominant spike, between two clearly different shots.
    gradual = []
    lo, hi, pad = int(fps * 0.25), int(fps * 2.0), int(fps * 1.5)
    def around(t):
        a = np.concatenate([hd[max(1, t - pad):max(1, t - lo)], hd[t + lo:t + pad]])
        return float(np.median(a)) if a.size else 0.0
    base = np.array([around(t) for t in range(n)])
    elevated = (hd > np.maximum(0.04, 3 * base)) & ~np.isin(np.arange(n), list(near_hard))
    t = 1
    while t < n:
        if not elevated[t]:
            t += 1
            continue
        e = t
        while e + 1 < n and (elevated[e + 1] or (e + 2 < n and elevated[e + 2])):
            e += 1
        run = hd[t:e + 1]
        if lo <= e - t + 1 <= hi and run.max() < 3 * np.median(run) and t >= 3 and e + 3 < n \
                and 0.5 * np.abs(H[t - 2] - H[e + 2]).sum() > 0.4:
            gradual.append((t + e) // 2)
        t = e + 1
    bright = gray.mean(axis=(1, 2))
    fades_black = int(np.sum((bright[1:] < 12) & (bright[:-1] >= 12)))
    return sorted(hard), gradual, pd, fades_black


def flow_stats(F, fps):
    """Camera movement from optical flow, sampled 5 times a second: share of time moving, zoom tendency."""
    if cv2 is None or len(F) < 3:
        return {}
    step = max(1, int(round(fps / 5)))
    g = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY) for f in F[::step]]
    mags, divs = [], []
    ys, xs = np.mgrid[0:SMALL_H, 0:SMALL_W]
    rx, ry = xs - SMALL_W / 2, ys - SMALL_H / 2
    rn = np.sqrt(rx ** 2 + ry ** 2) + 1e-6
    for a, b in zip(g, g[1:]):
        fl = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 2, 9, 2, 5, 1.1, 0)
        mags.append(float(np.median(np.linalg.norm(fl, axis=2))))
        divs.append(float(np.mean((fl[..., 0] * rx + fl[..., 1] * ry) / rn)))   # >0 zooming in
    mags, divs = np.array(mags), np.array(divs)
    return {"camera_moving_share": round(float(np.mean(mags > 0.25)), 3),
            "zoom_in_share": round(float(np.mean(divs > 0.12)), 3),
            "zoom_out_share": round(float(np.mean(divs < -0.12)), 3)}


def ocr_words(img):
    """Overlay text: bright, high-contrast lettering. Keep only words Tesseract is confident about,
    so a busy food shot doesn't turn into junk letters."""
    if img is None:
        return ""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    words = []
    for i, prep in enumerate((cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)[1], gray)):
        if i == 1 and len(words) >= 2:      # the overlay pass found text: skip the slower full pass
            break
        ok, png = cv2.imencode(".png", prep)
        # One thread per call: Tesseract's own threading swamps the CPU when several videos run at once.
        tsv = subprocess.run(["tesseract", "stdin", "stdout", "--psm", "11", "-l", "eng", "tsv"], input=png.tobytes(),
                             capture_output=True, env={**os.environ, "OMP_THREAD_LIMIT": "1"}).stdout.decode("utf-8", "replace")
        found = []
        for line in tsv.splitlines()[1:]:
            parts = line.split("\t")
            if len(parts) == 12 and parts[11].strip():
                conf, word = float(parts[10]), parts[11].strip()
                clean = re.sub(r"[^A-Za-z0-9'?!#%$]", "", word)
                if conf >= 80 and (len(clean) >= 2 or clean in ("?", "!", "I", "a", "A")) and \
                        sum(ch.isalpha() for ch in clean) >= max(1, len(clean) // 2):
                    found.append(clean)
        if len(found) > len(words):
            words = found
    return " ".join(words)


_FACE = None


def faces(img):
    global _FACE
    if img is None or cv2 is None:
        return 0, 0.0
    if _FACE is None:
        _FACE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    fs = _FACE.detectMultiScale(g, scaleFactor=1.1, minNeighbors=6, minSize=(40, 40))
    if len(fs) == 0:
        return 0, 0.0
    area = max(w * h for (_, _, w, h) in fs) / (g.shape[0] * g.shape[1])
    return int(len(fs)), round(float(area), 4)


def colorfulness(img):
    if img is None:
        return None
    b, g, r = (img[..., i].astype(float) for i in range(3))
    rg, yb = r - g, 0.5 * (r + g) - b
    return round(float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)), 1)


def loudness(path):
    err = subprocess.run(["ffmpeg", "-v", "info", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    lra = re.findall(r"LRA:\s+(-?[\d.]+) LU", err)
    sil = subprocess.run(["ffmpeg", "-v", "info", "-nostats", "-i", path, "-af", "silencedetect=n=-45dB:d=0.3",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", sil)]
    has_audio = "Audio:" in err
    return {"has_audio": has_audio, "lufs": float(i[-1]) if i and has_audio else None,
            "loudness_range": float(lra[-1]) if lra and has_audio else None,
            "silent_start": bool(starts and starts[0] <= 0.05) if has_audio else None}


def analyze(path, ocr=True):
    duration, src_fps, width, height = probe(path)
    fps = 15 if duration > 75 else 30
    F = frames(path, fps)
    n = len(F)
    hard, gradual, pd, fades_black = cuts_and_transitions(F, fps)
    cuts = sorted(hard + gradual)
    bounds = [0] + cuts + [n]
    shots = np.diff(bounds) / fps
    shots = shots[shots > 0.05]
    moving = np.array([pd[t] for t in range(1, n) if t not in set(c for h in hard for c in (h, h + 1))])
    first = frame_at(path, 0.05)
    words0 = ocr_words(first) if ocr else ""
    nfaces, face_area = faces(first)
    ocr_times = [t for t in np.arange(0.5, min(duration, 20.5), 4.0)] if ocr else []
    texts = [ocr_words(frame_at(path, t)) for t in ocr_times]
    wcounts = [len(t.split()) for t in texts]
    face_hits = [faces(frame_at(path, t))[0] > 0 for t in ocr_times[::2]] if ocr else []
    gray0 = cv2.cvtColor(first, cv2.COLOR_BGR2GRAY) if first is not None and cv2 is not None else None
    loop = None
    if n > 10:
        a, b = F[0].astype(float), F[-1].astype(float)
        loop = round(float(1 - np.abs(a - b).mean() / 255) * float(1 - 0.5 * np.abs(hist(F[0]) - hist(F[-1])).sum()), 3)
    out = {
        "duration_s": round(duration, 2), "width": width, "height": height,
        "cuts": len(cuts), "hard_cuts": len(hard), "gradual_transitions": len(gradual), "fades_black": fades_black,
        "cuts_per_s": round(len(cuts) / duration, 3) if duration else 0.0,
        "median_shot_s": round(float(np.median(shots)), 2) if len(shots) else round(duration, 2),
        "longest_shot_s": round(float(shots.max()), 2) if len(shots) else round(duration, 2),
        "first_cut_s": round(cuts[0] / fps, 2) if cuts else round(duration, 2),
        "cuts_first_3s": sum(1 for c in cuts if c / fps <= 3.0),
        "gradual_share": round(len(gradual) / len(cuts), 3) if cuts else 0.0,
        "motion": round(float(moving.mean()), 4) if len(moving) else 0.0,
        "motion_first_1s": round(float(pd[1:fps + 1].mean()), 4) if n > fps else 0.0,
        "hook_words": len(words0.split()), "hook_text": words0[:120], "hook_question": "?" in words0,
        "hook_faces": nfaces, "hook_face_area": face_area,
        "hook_brightness": round(float(gray0.mean()), 1) if gray0 is not None else None,
        "hook_contrast": round(float(gray0.std()), 1) if gray0 is not None else None,
        "hook_colorfulness": colorfulness(first),
        "text_share": round(float(np.mean([w >= 2 for w in wcounts])), 3) if wcounts else None,
        "words_per_frame": round(float(np.mean(wcounts)), 2) if wcounts else None,
        "face_share": round(float(np.mean(face_hits)), 3) if face_hits else None,
        "loop_similarity": loop,
    }
    out.update(flow_stats(F, fps))
    out.update(loudness(path))
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        print(json.dumps({"file": os.path.basename(p), **analyze(p)}, indent=1))
