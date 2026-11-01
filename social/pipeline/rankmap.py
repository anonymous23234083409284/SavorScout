"""A full-screen portrait map for a ranking video: one campus, the half mile
around its centre, and a dot for every place to eat inside that circle.

Same look as mapdata.py's walking maps (it uses the same layers and colours).
The dots come from Overture's places (open, reasonably confident, and in an
eating category); the number the video states comes from SavorScout's own
scene data (scripts/data/food-scene.json), so the two can differ slightly. The
dots show density, the caption carries the count.

    python rankmap.py <slug> <lat> <lng> <out_dir>
"""
import json, math, os, sys
from shapely import wkb

sys.path.insert(0, os.path.dirname(__file__))
import mapdata  # noqa: E402

HALF_MILE_M = 804.67
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


def build(lat, lng, out_dir, half_w=1000.0):
    P = mapdata.Projection(lat, lng)
    half_h = half_w * 16 / 9
    x0, x1, y0, y1 = -half_w, half_w, -half_h, half_h
    scale = min(mapdata.SCALE, mapdata.MAX_PX / (2 * half_h))
    W, H = int(round(2 * half_w * scale)), int(round(2 * half_h * scale))
    lon0, lat0 = P.inv(x0 - 150, y0 - 150)
    lon1, lat1 = P.inv(x1 + 150, y1 + 150)
    jobs = dict(mapdata.AREA_JOBS)
    jobs["places"] = ("theme=places/type=place", ["geometry", "basic_category", "operating_status", "confidence", "taxonomy"], None)
    data = mapdata.load_area(lon0, lat0, lon1, lat1, out_dir, jobs)
    L = mapdata.layers(data, P)
    mapdata.draw_base(L, x0, x1, y0, y1, scale, W, H, os.path.join(out_dir, "map.png"))
    px = lambda x, y: ((x - x0) * scale, (y1 - y) * scale)
    dots = []
    for r in data["places"]:
        if not is_food(r):
            continue
        g = wkb.loads(r["geometry"])
        x, y = P.m(g.x, g.y)
        d = math.hypot(x, y)
        if d <= HALF_MILE_M:
            dots.append((d, *px(x, y)))
    dots.sort()
    meta = {"width": W, "height": H, "scale": scale, "campus": dict(zip(("x", "y"), px(0, 0))),
            "radius": HALF_MILE_M * scale, "dots": [[round(x, 1), round(y, 1)] for _, x, y in dots],
            "attribution": "Map data © OpenStreetMap contributors · Overture Maps Foundation"}
    with open(os.path.join(out_dir, "map.json"), "w") as f:
        json.dump(meta, f)
    return meta


if __name__ == "__main__":
    m = build(float(sys.argv[2]), float(sys.argv[3]), sys.argv[4])
    print(sys.argv[1], m["width"], m["height"], len(m["dots"]), "dots")
