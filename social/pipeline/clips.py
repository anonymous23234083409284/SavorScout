"""Background footage from Pexels, matched to what each place serves.

Pexels footage is free to use without attribution (pexels.com/license); the
outro still credits it. The API key is read from PEXELS_API_KEY. In a Claude
cloud session the key is injected by the network proxy instead, so the header
is only sent when the variable is set.

Clips are trimmed, cropped to 1080x1920, graded a touch warmer and re-encoded
without audio, so the renderer only ever decodes small, uniform files.
"""
import json, os, random, subprocess, urllib.parse, urllib.request

API = "https://api.pexels.com/videos/search"

# What to search for, by the cuisine a listing carries ("c" in the data) or the
# page's food. The first term is the most literal; later ones add variety.
QUERIES = {
    "pizza": ["pizza slice", "pepperoni pizza", "pizza cheese", "pizza oven", "pizza"],
    "mexican": ["tacos", "street tacos", "burrito", "quesadilla", "guacamole", "nachos"],
    "café": ["latte art", "pouring coffee", "iced coffee", "espresso shot", "cappuccino", "coffee beans"],
    "coffee": ["latte art", "pouring coffee", "iced coffee", "espresso shot", "cappuccino", "coffee beans"],
    "ramen": ["ramen", "noodles chopsticks", "noodle soup"],
    "korean": ["korean food", "bibimbap", "korean fried chicken", "korean bbq"],
    "japanese": ["japanese food", "udon noodles", "tempura", "gyoza"],
    "sushi": ["sushi", "sushi rolls", "sashimi", "nigiri"],
    "chinese": ["dumplings", "dim sum", "fried rice wok", "chinese food"],
    "asian": ["noodles chopsticks", "stir fry wok", "dumplings", "asian food"],
    "asian fusion": ["stir fry wok", "noodles chopsticks", "bao buns"],
    "thai": ["pad thai", "thai curry", "thai food"],
    "vietnamese": ["pho", "banh mi", "spring rolls"],
    "indian": ["indian curry", "naan bread", "biryani"],
    "italian": ["pasta", "spaghetti", "fresh pasta", "italian food"],
    "burgers": ["burger", "cheeseburger", "smash burger"],
    "sandwich shop": ["sandwich", "deli sandwich", "sub sandwich"],
    "sandwiches": ["sandwich", "deli sandwich", "sub sandwich"],
    "deli": ["deli sandwich", "sandwich"],
    "bakery": ["bakery", "croissant", "fresh bread"],
    "dessert": ["dessert", "cake slice", "ice cream"],
    "ice cream": ["ice cream", "ice cream cone"],
    "seafood": ["seafood", "shrimp", "oysters"],
    "breakfast": ["pancakes", "breakfast eggs", "waffles"],
    "bbq": ["bbq brisket", "barbecue grill", "ribs"],
    "wings": ["chicken wings", "buffalo wings"],
    "fried chicken": ["fried chicken"],
    "donuts": ["donuts", "glazed donut"],
    "bagels": ["bagel", "bagels"],
    "mediterranean": ["falafel", "hummus", "shawarma"],
    "greek": ["gyro", "greek salad"],
    "halal": ["shawarma", "kebab"],
}
FALLBACK = ["food", "restaurant kitchen", "cooking"]


def queries_for(key):
    k = (key or "").lower().replace("-food", "").replace("-", " ").strip()
    return QUERIES.get(k) or QUERIES.get(k.rstrip("s")) or FALLBACK


def search(query, page=1, per_page=40):
    q = urllib.parse.urlencode({"query": query, "orientation": "portrait", "size": "medium",
                                "per_page": per_page, "page": page})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "savorscout-social/1.0"})
    if os.environ.get("PEXELS_API_KEY"):
        req.add_header("Authorization", os.environ["PEXELS_API_KEY"])
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("videos", [])


def best_file(v):
    """The 1080-wide portrait rendition, else the closest one at or above 720 wide."""
    files = [f for f in v.get("video_files", []) if f.get("width") and f.get("height")
             and f["height"] > f["width"] and f.get("file_type") == "video/mp4"]
    if not files:
        return None
    exact = [f for f in files if f["width"] == 1080]
    if exact:
        return min(exact, key=lambda f: f.get("fps") or 30)
    ok = [f for f in files if f["width"] >= 720]
    return min(ok, key=lambda f: abs(f["width"] - 1080)) if ok else None


def pick(key, used, seconds, rng, avoid=()):
    """One clip for a cuisine key, skipping ids in `used` or `avoid`."""
    for query in rng.sample(queries_for(key), k=len(queries_for(key))) + FALLBACK:
        for page in (1, 2):
            try:
                vids = search(query, page=page)
            except Exception as e:  # network hiccup: try the next query
                print(f"pexels search failed for {query!r}: {e}")
                continue
            vids = [v for v in vids if v["id"] not in used and v["id"] not in avoid
                    and v.get("duration", 0) >= seconds + 1 and best_file(v)]
            if vids:
                # Pexels ranks by relevance and quality; stay near the top, vary a little.
                v = rng.choice(vids[:8])
                return {"id": v["id"], "query": query, "url": v["url"], "by": v["user"]["name"],
                        "file": best_file(v)["link"], "duration": v["duration"]}
    raise RuntimeError(f"no Pexels clip found for {key}")


def prepare(clip, out_path, seconds, cache_dir):
    """Download, trim, crop to 1080x1920 at 30 fps, grade, strip audio."""
    os.makedirs(cache_dir, exist_ok=True)
    raw = os.path.join(cache_dir, f"{clip['id']}.mp4")
    if not os.path.exists(raw):
        req = urllib.request.Request(clip["file"], headers={"User-Agent": "savorscout-social/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(raw + ".part", "wb") as f:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                f.write(b)
        os.replace(raw + ".part", raw)
    # Start a little in, where clips usually settle after the opening move.
    start = min(1.0, max(0.0, clip["duration"] - seconds - 0.2))
    vf = ("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,"
          "eq=contrast=1.06:saturation=1.12:gamma=0.98,colorbalance=rm=0.03:gm=0.0:bm=-0.03")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.2f}", "-i", raw, "-t", f"{seconds:.2f}",
                    "-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_path], check=True)
    return out_path


def frame(path, at, out_png):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", path, "-frames:v", "1",
                    "-vf", "scale=270:480", out_png], check=True)
