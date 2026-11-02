"""Share images for X and Threads posts: a tips card and a ranking chart.

1080x1350 (the 4:5 frame both feeds show uncropped), in SavorScout's fonts and
colours. The tips card puts a frame of the week's own footage behind the
headline, so the post and the video read as one piece.
"""
import os, re
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(__file__)
FONTS = os.path.join(HERE, "..", "video", "public", "fonts")
FLAME = os.path.join(HERE, "..", "video", "public", "brand", "flame.png")
W, H = 1080, 1350
BASE = (12, 9, 18)
CARD = (26, 22, 38)
INK = (253, 248, 242)
INK_SOFT = (185, 174, 196)
INK_MID = (141, 132, 160)
EMBER = (255, 95, 31)
SAFFRON = (255, 200, 87)
ON_ACCENT = (26, 13, 6)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def rich_lines(d, text, f, max_w):
    """Greedy wrap of '*highlighted*' text into [[(word, hl), ...], ...]."""
    words, hl = [], False
    for tok in re.split(r"(\*)", text):
        if tok == "*":
            hl = not hl
            continue
        for w in tok.split():
            if words and re.fullmatch(r"[.,;:!?)\u2019'\"]+", w):
                words[-1] = (words[-1][0] + w, words[-1][1])   # "inside" + "." stays one word
            else:
                words.append((w, hl))
    lines, cur = [], []
    for w in words:
        trial = " ".join(x for x, _ in cur + [w])
        if cur and d.textlength(trial, font=f) > max_w:
            lines.append(cur); cur = [w]
        else:
            cur.append(w)
    return lines + ([cur] if cur else [])


def draw_rich(d, xy, lines, f, line_h, fill=INK, hl_fill=SAFFRON):
    x0, y = xy
    for line in lines:
        x = x0
        for i, (w, hl) in enumerate(line):
            t = w + (" " if i < len(line) - 1 else "")
            d.text((x, y), t, font=f, fill=hl_fill if hl else fill)
            x += d.textlength(t, font=f)
        y += line_h
    return y


def footer(img, d, right_text=""):
    flame = Image.open(FLAME).convert("RGBA")
    flame = flame.resize((int(flame.width * 44 / flame.height), 44), Image.LANCZOS)
    img.paste(flame, (64, H - 92), flame)
    d.text((64 + flame.width + 14, H - 70), "savorscout.net", font=font("Inter-Bold.otf", 30), fill=INK, anchor="lm")
    if right_text:
        d.text((W - 64, H - 70), right_text, font=font("Inter-SemiBold.otf", 24), fill=INK_MID, anchor="rm")


def tips(out, photo, kicker, title, items, note=""):
    """Photo header, headline, three numbered points, an optional note line."""
    img = Image.new("RGB", (W, H), BASE)
    if photo:
        ph = Image.open(photo).convert("RGB")
        r = max(W / ph.width, 640 / ph.height)
        ph = ph.resize((int(ph.width * r), int(ph.height * r)), Image.LANCZOS)
        top = max(0, (ph.height - 640) // 2)
        ph = ph.crop(((ph.width - W) // 2, top, (ph.width - W) // 2 + W, top + 640))
        img.paste(ph, (0, 0))
        fade = Image.new("L", (W, 640))
        fd = ImageDraw.Draw(fade)
        for y in range(640):
            fd.line([(0, y), (W, y)], fill=int(255 * min(1, max(0, (y - 120) / 520)) ** 1.3))
        img.paste(Image.new("RGB", (W, 640), BASE), (0, 0), fade)
        shade = Image.new("RGBA", (W, 640), (12, 9, 18, 70))
        img.paste(shade, (0, 0), shade)
    d = ImageDraw.Draw(img)
    kf = font("Inter-Bold.otf", 28)
    kw = d.textlength(kicker, font=kf)
    d.rounded_rectangle((64, 330, 64 + kw + 44, 382), radius=26, fill=EMBER)
    d.text((86, 356), kicker, font=kf, fill=ON_ACCENT, anchor="lm")

    def layout(k, draw):
        """Lay the text out at scale k; returns where it ends. Draws only when asked."""
        tf = font("InterDisplay-Black.otf", int(88 * k))
        lines = rich_lines(d, title, tf, 950)
        y = 404
        if draw:
            draw_rich(d, (62, y), lines, tf, int(tf.size * 1.04))
        y += int(tf.size * 1.04) * len(lines) + int(44 * k)
        hf, bf, nf = (font("InterDisplay-Black.otf", int(52 * k)), font("Inter-SemiBold.otf", int(36 * k)),
                      font("InterDisplay-Black.otf", int(36 * k)))
        dot = int(56 * k)
        for i, (head, body) in enumerate(items):
            body_lines = rich_lines(d, body, bf, 870)
            if draw:
                d.ellipse((64, y + 4, 64 + dot, y + 4 + dot), fill=SAFFRON)
                d.text((64 + dot / 2, y + 4 + dot / 2), str(i + 1), font=nf, fill=ON_ACCENT, anchor="mm")
                d.text((146, y - 2), head, font=hf, fill=INK)
                draw_rich(d, (146, y + int(64 * k)), body_lines, bf, int(47 * k), fill=INK_SOFT, hl_fill=SAFFRON)
            y += int(64 * k) + int(47 * k) * len(body_lines) + int(38 * k)
        if note:
            nf2 = font("Inter-SemiBold.otf", int(33 * k))
            note_lines = rich_lines(d, note, nf2, 940)
            if draw:
                d.line([(64, y + 6), (W - 64, y + 6)], fill=(60, 52, 80), width=2)
                draw_rich(d, (64, y + int(28 * k)), note_lines, nf2, int(44 * k), fill=INK_MID, hl_fill=SAFFRON)
            y += int(28 * k) + int(44 * k) * len(note_lines)
        return y

    k = 1.0
    while k > 0.7 and layout(k, False) > H - 130:
        k -= 0.03
    layout(k, True)
    footer(img, d)
    img.save(out, quality=92)
    return out


def ranking(out, title, subtitle, rows, source, suffix=""):
    """A bar chart of (rank, name, value) rows, the top three in saffron."""
    img = Image.new("RGB", (W, H), BASE)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-380, -520, 640, 360), fill=EMBER + (60,))
    img = Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(150))).convert("RGB")
    d = ImageDraw.Draw(img)
    tf = font("InterDisplay-Black.otf", 70)
    lines = rich_lines(d, title, tf, 950)
    y = draw_rich(d, (60, 70), lines, tf, 74)
    sf = font("Inter-SemiBold.otf", 30)
    while d.textlength(subtitle, font=sf) > W - 124 and sf.size > 20:   # never run off the edge
        sf = font("Inter-SemiBold.otf", sf.size - 1)
    d.text((62, y + 14), subtitle, font=sf, fill=INK_SOFT)
    top = y + 82
    row_h = (H - 140 - top) / len(rows)
    vmax = max(float(v) for _, _, v in rows)
    nf, rf = font("Inter-Bold.otf", int(min(30, row_h * 0.52))), font("InterDisplay-Black.otf", int(min(30, row_h * 0.55)))
    # The bars start after the longest name (campus names run long); names shrink before bars get too short.
    while 120 + max(d.textlength(name, font=nf) for _, name, _ in rows) + 30 > 620 and nf.size > 20:
        nf = font("Inter-Bold.otf", nf.size - 1)
    bx0 = max(330, int(120 + max(d.textlength(name, font=nf) for _, name, _ in rows) + 30))
    bx1 = W - 140
    for i, (rank, name, value) in enumerate(rows):
        cy = top + i * row_h + row_h / 2
        hi = i < 3
        d.text((60, cy), rank, font=rf, fill=SAFFRON if hi else INK_MID, anchor="lm")
        d.text((120, cy), name, font=nf, fill=INK, anchor="lm")
        bw = (bx1 - bx0) * float(value) / vmax
        d.rounded_rectangle((bx0, cy - row_h * 0.32, bx0 + max(bw, 8), cy + row_h * 0.32), radius=int(row_h * 0.3),
                            fill=SAFFRON if hi else (88, 74, 120))
        shown = f"{value:,}" if isinstance(value, int) else f"{value}"
        d.text((bx0 + max(bw, 8) + 14, cy), f"{shown}{suffix}", font=rf, fill=INK, anchor="lm")
    footer(img, d, source)
    img.save(out, quality=92)
    return out
