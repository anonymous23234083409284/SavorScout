#!/usr/bin/env python3
"""klipy: find a meme (GIF, clip, sticker or static meme) on KLIPY and save it for a video.

    python klipy.py search "shocked cat" [--kind gifs|clips|stickers|static-memes] [--n 8]
    python klipy.py get "shocked cat" [--kind gifs] [--pick 0]      download one into out/memes/

show.py uses get() for a script's meme beats: {"meme": {"q": "shocked cat", "kind": "gifs"}}.

THE KEY. KLIPY reads the app key from the URL (https://api.klipy.com/api/v1/<key>/gifs/search),
not from a header, so it must be in the environment as KLIPY_API_KEY. (A key saved as a network
secret is sent as a header, which KLIPY ignores: that's why it has to be an environment variable.)
The media host also has to be allowed by the environment's network settings; the first failed
download prints the host to allow.

Checked against the live API on Nov 15, 2026 (reply: data.data[] with file.hd/md/sm/xs.{mp4,gif,webp,jpg}.url;
media on static.klipy.com). The response is still read defensively, so a renamed field should not break it.

TASTE AND RIGHTS. A meme is a reaction, held 1-2 seconds, never the whole joke. Prefer animals,
cartoons-in-the-wild and anonymous reaction clips over film/TV scenes and celebrities, whose owners
can claim a video. Follow KLIPY's attribution terms (show.py prints "via KLIPY" on the frame)."""

import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.dirname(HERE)
MEMES = os.path.join(SOCIAL, "out", "memes")
BASE = "https://api.klipy.com/api/v1"
KINDS = ("gifs", "clips", "stickers", "static-memes")
PREFER = ("mp4", "gif", "webp", "jpg", "jpeg", "png")            # what Remotion plays best first
SIZES = ("hd", "md", "sm", "xs")
ANIMALS = ("cat", "cats", "dog", "dogs", "puppy", "kitten", "raccoon", "possum", "hamster", "chipmunk", "seal", "goat", "bird", "monkey")


class NoKlipy(Exception):
    pass


def call(path, **params):
    key = os.environ.get("KLIPY_API_KEY")
    if not key:
        raise NoKlipy("KLIPY_API_KEY is not set (see the top of klipy.py)")
    url = f"{BASE}/{urllib.parse.quote(key, safe='')}/{path}?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "savorscout-show"}), timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise NoKlipy(f"KLIPY refused the request ({e.code}): {e.read().decode('utf-8', 'replace')[:200]}")
    except urllib.error.URLError as e:
        raise NoKlipy(f"can't reach api.klipy.com ({e.reason})")


def items_of(resp):
    """The list of results, wherever the response keeps it."""
    node = resp
    for _ in range(4):
        if isinstance(node, list):
            return [x for x in node if isinstance(x, dict)]
        if isinstance(node, dict):
            node = node.get("data") if "data" in node else next((v for v in node.values() if isinstance(v, (list, dict))), None)
    return []


def media_of(item):
    """[(format, url, width, height)] found anywhere in an item, best size first."""
    found = []

    def walk(node, size_rank):
        if isinstance(node, dict):
            for k, v in node.items():
                kl = str(k).lower()
                rank = SIZES.index(kl) if kl in SIZES else size_rank
                if kl in PREFER and isinstance(v, dict) and v.get("url"):
                    found.append((rank, kl, v["url"], v.get("width") or 0, v.get("height") or 0))
                elif isinstance(v, str) and v.startswith("http") and re.search(r"\.(mp4|gif|webp|jpe?g|png)(\?|$)", v):
                    found.append((rank, re.search(r"\.(mp4|gif|webp|jpe?g|png)(\?|$)", v).group(1), v, 0, 0))
                else:
                    walk(v, rank)
        elif isinstance(node, list):
            for v in node:
                walk(v, size_rank)

    walk(item, len(SIZES))
    found.sort(key=lambda f: (f[0], PREFER.index(f[1]) if f[1] in PREFER else 9))
    return [(f[1], f[2], f[3], f[4]) for f in found]


def search(q, kind="gifs", n=8):
    if kind not in KINDS:
        raise NoKlipy(f"kind must be one of {KINDS}")
    resp = call(f"{kind}/search", q=q, per_page=max(8, n), page=1, customer_id="savorscout", content_filter="medium")
    out = []
    for it in items_of(resp)[:n]:
        media = media_of(it)
        if media:
            out.append({"id": str(it.get("id") or it.get("slug") or ""), "title": it.get("title") or it.get("slug") or "", "tags": it.get("tags") or [],
                        "format": media[0][0], "url": media[0][1], "width": media[0][2], "height": media[0][3]})
    return out


def get(q, dest=MEMES, kind="gifs", pick=0):
    """Download result number `pick` for a search. Returns (local path, credit line), cached by query."""
    os.makedirs(dest, exist_ok=True)
    stem = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")[:40] + f"-{kind}-{pick}"
    hit = next((f for f in os.listdir(dest) if f.startswith(stem + ".") and not f.endswith(".json")), None)
    if hit:
        return os.path.join(dest, hit), "via KLIPY"
    found = search(q, kind, 12)
    # Results are ranked by popularity, not by fit: "confident dog" can return a runway model. Put
    # the ones whose title or tags actually contain the search's words first (pick counts from there).
    words = [w for w in re.findall(r"[a-z]+", q.lower()) if len(w) > 2]
    def fit(m):
        hay = (m["title"] + " " + " ".join(str(t) for t in m["tags"])).lower()
        hay_words = set(re.findall(r"[a-z]+", hay))
        animal = [w for w in words if w in ANIMALS]             # if the search names an animal, the meme must show it
        return sum(w in hay for w in words) + (10 if animal and any(w in hay_words or w + "s" in hay_words for w in animal) else 0)
    found = sorted(found, key=lambda m: -fit(m))
    if len(found) <= pick:
        return None, ""
    m = found[pick]
    path = os.path.join(dest, f"{stem}.{m['format']}")
    try:
        with urllib.request.urlopen(urllib.request.Request(m["url"], headers={"User-Agent": "savorscout-show"}), timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    except Exception as e:
        host = urllib.parse.urlparse(m["url"]).netloc
        raise NoKlipy(f"found a meme but couldn't download it from {host} ({e}); allow that host in the environment's network settings")
    json.dump({"q": q, "kind": kind, "pick": pick, **m, "sha1": hashlib.sha1(open(path, "rb").read()).hexdigest()}, open(path + ".json", "w"), indent=1)
    return path, "via KLIPY"


if __name__ == "__main__":
    a = sys.argv[1:]
    opt = lambda name, d: a[a.index(name) + 1] if name in a else d
    try:
        if len(a) >= 2 and a[0] == "search":
            for i, m in enumerate(search(a[1], opt("--kind", "gifs"), int(opt("--n", 8)))):
                print(f"{i}: {m['format']:<4} {m['width']}x{m['height']}  {m['title'][:50]}  {m['url']}")
        elif len(a) >= 2 and a[0] == "get":
            print(get(a[1], kind=opt("--kind", "gifs"), pick=int(opt("--pick", 0))))
        else:
            sys.exit(__doc__)
    except NoKlipy as e:
        sys.exit(str(e))
