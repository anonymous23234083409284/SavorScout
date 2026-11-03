"""A full-screen portrait map for a ranking video: one campus, the half mile
around its centre, and a dot for every place to eat inside that circle.

With a street, the circle is a mile and that street's places are kept apart
("hl"), so the video can light up one street (a campus's food street).

Same look as mapdata.py's walking maps (it uses the same layers and colours).
The dots come from Overture's places (open, reasonably confident, and in an
eating category); the number the video states comes from SavorScout's own
scene data (scripts/data/food-scene.json), so the two can differ slightly. The
dots show density, the caption carries the count.

    python rankmap.py <slug> <lat> <lng> <out_dir> ["Franklin St"]
"""
import json, math, os, re, sys
from shapely import wkb

sys.path.insert(0, os.path.dirname(__file__))
import mapdata  # noqa: E402

HALF_MILE_M = 804.67
MILE_M = 1609.34

# Street names the way scripts/fetch-nearby-places.py counts them (keep the two
# in step): '1000 E Franklin St Ste 4' -> 'franklin st', direction words dropped.
SUFFIX = {"street": "St", "st": "St", "avenue": "Ave", "ave": "Ave", "av": "Ave", "boulevard": "Blvd", "blvd": "Blvd",
          "road": "Rd", "rd": "Rd", "drive": "Dr", "dr": "Dr", "lane": "Ln", "ln": "Ln", "parkway": "Pkwy", "pkwy": "Pkwy",
          "highway": "Hwy", "hwy": "Hwy", "place": "Pl", "pl": "Pl", "court": "Ct", "ct": "Ct", "square": "Sq",
          "sq": "Sq", "plaza": "Plaza", "plz": "Plaza", "way": "Way", "terrace": "Ter", "circle": "Cir"}
DIRS = {"north": "N", "south": "S", "east": "E", "west": "W", "n": "N", "s": "S", "e": "E", "w": "W",
        "ne": "NE", "nw": "NW", "se": "SE", "sw": "SW", "northeast": "NE", "northwest": "NW", "southeast": "SE", "southwest": "SW"}


def street_key(addr):
    a = re.split(r",|\s(?:ste|suite|unit|#|apt|bldg|building|fl|floor|rm|room)\b\.?", addr or "", flags=re.I)[0].strip()
    m = re.match(r"^\d+[A-Za-z]?(?:-\d+)?\s+(.+)$", a)
    if not m:
        return None
    words = m.group(1).replace(".", "").split()
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        if lw in DIRS and (i == 0 or i == len(words) - 1):
            out.append(DIRS[lw])
        elif lw in SUFFIX and i == len(words) - 1:
            out.append(SUFFIX[lw])
        else:
            out.append(w)
    return " ".join(w for w in " ".join(out).lower().split() if w.upper() not in DIRS.values()) or None
FOOD = {"restaurant", "casual_eatery", "coffee_shop", "cafe", "bakery", "dessert_shop", "fast_food_restaurant",
        "food_truck", "juice_bar", "ice_cream_shop", "deli", "sandwich_shop", "pizza_restaurant", "tea_room",
        "bubble_tea_shop", "donut_shop", "bagel_shop", "food_court", "snack_bar", "breakfast_restaurant"}


def is_food(r):
    if r.get("operating_status") == "permanently_closed" or (r.get("confidence") or 0) < 0.5:
        return False
    if r.get("basic_category") in FOOD:
        return True
    tax = r.get("taxonomy") or {}
    return any("restaurant" in (h or "") for h in (tax.get("hierarchy") or []))


def build(lat, lng, out_dir, half_w=1000.0, street=None):
    radius = MILE_M if street else HALF_MILE_M
    half_w = half_w * radius / HALF_MILE_M          # the same framing at either radius
    key = street_key("1 " + street) if street else None
    P = mapdata.Projection(lat, lng)
    half_h = half_w * 16 / 9
    x0, x1, y0, y1 = -half_w, half_w, -half_h, half_h
    scale = min(mapdata.SCALE, mapdata.MAX_PX / (2 * half_h))
    W, H = int(round(2 * half_w * scale)), int(round(2 * half_h * scale))
    lon0, lat0 = P.inv(x0 - 150, y0 - 150)
    lon1, lat1 = P.inv(x1 + 150, y1 + 150)
    jobs = dict(mapdata.AREA_JOBS)
    cols = ["geometry", "basic_category", "operating_status", "confidence", "taxonomy"]
    place_job = "places_st" if street else "places"      # its own cache key: these rows carry addresses
    jobs[place_job] = ("theme=places/type=place", cols + (["addresses"] if street else []), None)
    data = mapdata.load_area(lon0, lat0, lon1, lat1, out_dir, jobs)
    L = mapdata.layers(data, P)
    mapdata.draw_base(L, x0, x1, y0, y1, scale, W, H, os.path.join(out_dir, "map.png"))
    px = lambda x, y: ((x - x0) * scale, (y1 - y) * scale)
    dots, hl = [], []
    for r in data[place_job]:
        if not is_food(r):
            continue
        g = wkb.loads(r["geometry"])
        x, y = P.m(g.x, g.y)
        d = math.hypot(x, y)
        if d <= radius:
            addr = ((r.get("addresses") or [{}])[0] or {}).get("freeform") if street else None
            (hl if key and street_key(addr) == key else dots).append((d, *px(x, y)))
    dots.sort()
    # The street lights up from one end to the other, along its longer axis.
    if hl:
        along = 1 if (max(p[1] for p in hl) - min(p[1] for p in hl)) >= (max(p[2] for p in hl) - min(p[2] for p in hl)) else 2
        hl.sort(key=lambda p: p[along])
    meta = {"width": W, "height": H, "scale": scale, "campus": dict(zip(("x", "y"), px(0, 0))),
            "radius": radius * scale, "dots": [[round(x, 1), round(y, 1)] for _, x, y in dots],
            "attribution": "Map data © OpenStreetMap contributors · Overture Maps Foundation"}
    if street:
        meta["hl"] = [[round(x, 1), round(y, 1)] for _, x, y in hl]
    with open(os.path.join(out_dir, "map.json"), "w") as f:
        json.dump(meta, f)
    return meta


if __name__ == "__main__":
    m = build(float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], street=sys.argv[5] if len(sys.argv) > 5 else None)
    print(sys.argv[1], m["width"], m["height"], len(m["dots"]), "dots", len(m.get("hl", [])), "on the street")
