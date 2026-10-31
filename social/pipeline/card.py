"""A 4:5 share card for X and Threads: the map with every walking route, and the list.

Drawn with Pillow from the same map.png / map.json the video uses, in the
same fonts and colours, so a post and its video read as one piece.
"""
import json, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(__file__)
FONTS = os.path.join(HERE, "..", "video", "public", "fonts")
FLAME = os.path.join(HERE, "..", "video", "public", "brand", "flame.png")
W, H = 1080, 1350
BASE = (12, 9, 18)
INK = (253, 248, 242)
INK_SOFT = (185, 174, 196)
INK_MID = (141, 132, 160)
EMBER = (255, 95, 31)
SAFFRON = (255, 200, 87)
ON_ACCENT = (26, 13, 6)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def gradient(w, h, a=EMBER, b=SAFFRON):
    g = Image.new("RGB", (w, h))
    px = g.load()
    for x in range(w):
        t = x / max(1, w - 1)
        c = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
        for y in range(h):
            px[x, y] = c
    return g


def gradient_text(img, xy, text, f):
    l, t, r, b = f.getbbox(text)
    mask = Image.new("L", (r, b), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=f, fill=255)
    img.paste(gradient(r, b), xy, mask)


def fit_view(points, scale_px_m, pw, ph, min_m=650, pad=1.25):
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    minpx = min_m * scale_px_m
    bw = max(max(xs) - min(xs), minpx) * pad
    bh = max(max(ys) - min(ys), minpx * ph / pw) * pad
    s = min(pw / bw, ph / bh)
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, s


def map_panel(map_png, meta, pw, ph, campus_label):
    """The map cropped to every route, routes and pins drawn at 2x then reduced."""
    SS = 2
    base = Image.open(map_png).convert("RGB")
    pts = [(meta["campus"]["x"], meta["campus"]["y"])] + [tuple(p) for s in meta["spots"] for p in s["route"]]
    cx, cy, s = fit_view(pts, meta["scale"], pw, ph)
    s = max(s, pw / base.width, ph / base.height)          # stay on the map
    # Crop the base map to the view, then scale to the panel at 2x.
    x0 = min(max(cx - pw / 2 / s, 0), base.width - pw / s)
    y0 = min(max(cy - ph / 2 / s, 0), base.height - ph / s)
    crop = base.crop((int(x0), int(y0), int(x0 + pw / s), int(y0 + ph / s))).resize((pw * SS, ph * SS), Image.LANCZOS)
    to = lambda p: ((p[0] - x0) * s * SS, (p[1] - y0) * s * SS)
    glow = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for sp in meta["spots"]:
        gd.line([to(p) for p in sp["route"]], fill=EMBER + (110,), width=22 * SS, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(9 * SS))
    crop = Image.alpha_composite(crop.convert("RGBA"), glow)
    d = ImageDraw.Draw(crop)
    for sp in meta["spots"]:
        pts_ = [to(p) for p in sp["route"]]
        n = len(pts_)
        for i in range(n - 1):  # ember at campus fading to saffron at the spot
            t = i / max(1, n - 2)
            c = tuple(int(EMBER[k] + (SAFFRON[k] - EMBER[k]) * t) for k in range(3))
            d.line([pts_[i], pts_[i + 1]], fill=c, width=8 * SS)
        for p in (pts_[0], pts_[-1]):
            d.ellipse((p[0] - 4 * SS, p[1] - 4 * SS, p[0] + 4 * SS, p[1] + 4 * SS), fill=SAFFRON)
    num = font("InterDisplay-Black.otf", 26 * SS)
    for j, sp in enumerate(meta["spots"]):
        x, y = to((sp["x"], sp["y"]))
        r = 25 * SS
        d.ellipse((x - r, y - r, x + r, y + r), fill=EMBER, outline=INK, width=3 * SS)
        d.text((x, y + SS), str(j + 1), font=num, fill=ON_ACCENT, anchor="mm")
    x, y = to((meta["campus"]["x"], meta["campus"]["y"]))
    r = 26 * SS
    d.ellipse((x - r, y - r, x + r, y + r), fill=INK)
    d.ellipse((x - 9 * SS, y - 9 * SS, x + 9 * SS, y + 9 * SS), fill=BASE)
    lf = font("Inter-Bold.otf", 24 * SS)
    tw = d.textlength(campus_label, font=lf)
    near = min(meta["spots"], key=lambda sp: math.hypot(sp["x"] - meta["campus"]["x"], sp["y"] - meta["campus"]["y"]))
    lx = x - r - 14 * SS - tw - 36 * SS if near["x"] > meta["campus"]["x"] else x + r + 14 * SS
    d.rounded_rectangle((lx, y - 24 * SS, lx + tw + 36 * SS, y + 24 * SS), radius=24 * SS, fill=(12, 9, 18, 230), outline=(253, 248, 242, 50), width=2 * SS)
    d.text((lx + 18 * SS, y), campus_label, font=lf, fill=INK, anchor="lm")
    return crop.resize((pw, ph), Image.LANCZOS).convert("RGB")


def rounded(img, radius):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


def build(props, map_png, out_path):
    m = props["map"]
    short = props["campus"]
    img = Image.new("RGB", (W, H), BASE)
    # A faint ember glow in the corner, as on the site.
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-420, -520, 620, 380), fill=EMBER + (60,))
    img = Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(160))).convert("RGB")
    d = ImageDraw.Draw(img)
    flame = Image.open(FLAME).convert("RGBA")
    flame = flame.resize((int(flame.width * 46 / flame.height), 46), Image.LANCZOS)
    img.paste(flame, (64, 58), flame)
    d.text((64 + flame.width + 14, 81), "SAVORSCOUT", font=font("Inter-Bold.otf", 27), fill=INK, anchor="lm")
    kf = font("Inter-Bold.otf", 28)
    kw = d.textlength(short.upper(), font=kf) + 24
    d.rounded_rectangle((W - 64 - kw - 40, 56, W - 64, 106), radius=25, outline=SAFFRON, width=2)
    d.text((W - 64 - kw / 2 - 20, 81), short.upper(), font=kf, fill=INK, anchor="mm")
    big = props["hook"]["big"]
    size = 132
    while font("InterDisplay-Black.otf", size).getlength(big) > 950 and size > 70:
        size -= 4
    gradient_text(img, (60, 140), big, font("InterDisplay-Black.otf", size))
    line = f"you can walk to from {short}"
    lsize = 62
    while font("InterDisplay-Black.otf", lsize).getlength(line) > 950 and lsize > 40:
        lsize -= 2
    d.text((62, 150 + size), line, font=font("InterDisplay-Black.otf", lsize), fill=INK)
    top = 150 + size + lsize + 44
    ph = 1350 - top - 372
    panel = rounded(map_panel(map_png, m, 1000, ph, short), 34)
    img.paste(panel, (40, top), panel)
    d.rounded_rectangle((40, top, 1040, top + ph), radius=34, outline=(253, 248, 242, 30), width=2)
    af = font("Inter-SemiBold.otf", 16)
    d.text((62, top + ph - 18), "Map data © OpenStreetMap contributors, Overture Maps", font=af, fill=INK_MID, anchor="ls")
    y = top + ph + 34
    nf = font("Inter-Bold.otf", 34)
    tf = font("Inter-SemiBold.otf", 32)
    numf = font("InterDisplay-Black.otf", 26)
    for j, s in enumerate(m["spots"]):
        cy = y + j * 52 + 20
        d.ellipse((64, cy - 19, 102, cy + 19), fill=EMBER)
        d.text((83, cy + 1), str(j + 1), font=numf, fill=ON_ACCENT, anchor="mm")
        name = s["name"]
        while d.textlength(name, font=nf) > 700 and len(name) > 4:
            name = name[:-2].rstrip() + "…"
        d.text((122, cy), name, font=nf, fill=INK, anchor="lm")
        d.text((W - 64, cy), f"{s['walk_min']} min walk", font=tf, fill=SAFFRON, anchor="rm")
    d.text((64, H - 38), "savorscout.net", font=font("Inter-Bold.otf", 28), fill=INK, anchor="ls")
    d.text((W - 64, H - 38), f"{props['count']} {props['nounPlural']} within a mile", font=font("Inter-SemiBold.otf", 26), fill=INK_SOFT, anchor="rs")
    img.save(out_path, quality=92)
    return out_path


if __name__ == "__main__":
    import sys
    props = json.load(open(sys.argv[1]))
    build(props, sys.argv[2], sys.argv[3])
