"""Map assets for one video: a styled base map and the walking routes drawn on it.

Streets, buildings, parks, water and campus outlines come from Overture Maps
(free, no key, read straight from its public S3 bucket), which is also where
SavorScout's restaurant listings come from. Routes are real shortest walking
paths over the street and footpath network, so "4 min walk" is measured, not a
straight line divided by a guess.

Writes into OUT_DIR:
  map.png   the base map, in a local metric projection, SCALE pixels per metre
  map.json  everything the video draws on top: campus pin, spot pins, routes,
            street labels, camera framings (all in map.png pixel coordinates)
"""
import json, math, os, pickle, re, sys
from concurrent.futures import ThreadPoolExecutor

import networkx as nx
import shapely
import numpy as np
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pafs
from scipy.spatial import cKDTree
from shapely import wkb
from shapely.geometry import LineString, MultiLineString, Point, Polygon, MultiPolygon, box
from shapely.ops import unary_union

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection, PolyCollection

PINNED_RELEASE = "2026-09-23.1"   # the release SavorScout's listings came from; used if listing fails
SCALE = 2.0            # base map pixels per metre
MAX_PX = 4200          # cap on either side of map.png
PAD_M = 420            # map extends this far beyond the campus and the spots
WALK_M_PER_MIN = 80    # 4.8 km/h, the usual planning figure for walking

# Colours: SavorScout's own dark violet (src/App.css --base, --card), so the
# ember route and pins carry the frame the way the site's accents do.
BG = "#0f0c16"
BUILDING = "#221d30"
PARK = "#14251c"
WATER = "#10203a"
CAMPUS_FILL = "#2a1834"
CAMPUS_EDGE = "#93407f"
ROAD = {  # class: (width px at SCALE, colour)
    "motorway": (15, "#5e5582"), "trunk": (14, "#5e5582"), "primary": (13, "#5a517c"),
    "secondary": (11, "#534a72"), "tertiary": (9, "#4b4368"), "residential": (7, "#41395c"),
    "living_street": (6, "#41395c"), "unclassified": (6, "#3e3758"), "service": (4, "#342e4b"),
    "pedestrian": (5, "#3b3454"), "footway": (2.6, "#373052"), "path": (2.6, "#373052"),
    "cycleway": (2.6, "#373052"), "steps": (2.6, "#373052"), "track": (2.6, "#312b47"),
}
WALKABLE_EXCLUDE = {"motorway"}
LABEL_CLASSES = {"primary", "secondary", "tertiary", "trunk", "residential"}


class Projection:
    """Local equirectangular projection in metres around (lat0, lng0)."""
    def __init__(self, lat0, lng0):
        self.lat0, self.lng0 = lat0, lng0
        self.kx = 111320.0 * math.cos(math.radians(lat0))
        self.ky = 110540.0

    def m(self, lng, lat):
        return ((lng - self.lng0) * self.kx, (lat - self.lat0) * self.ky)

    def inv(self, x, y):
        return (self.lng0 + x / self.kx, self.lat0 + y / self.ky)


def _s3():
    return pafs.S3FileSystem(anonymous=True, region="us-west-2", connect_timeout=20, request_timeout=60)


_bucket = None


def bucket():
    """The newest Overture release in the public bucket. Overture deletes old
    releases after a few months, so a pinned one would eventually vanish."""
    global _bucket
    if _bucket is None:
        release = os.environ.get("OVERTURE_RELEASE")
        if not release:
            try:
                infos = _s3().get_file_info(pafs.FileSelector("overturemaps-us-west-2/release/"))
                names = sorted(i.base_name for i in infos if i.type == pafs.FileType.Directory and i.base_name[:1].isdigit())
                release = names[-1] if names else PINNED_RELEASE
            except Exception:
                release = PINNED_RELEASE
        _bucket = f"overturemaps-us-west-2/release/{release}"
    return _bucket


def fetch(theme_type, lon0, lat0, lon1, lat1, columns, extra=None):
    """Rows of one Overture theme/type whose bbox falls inside the given box."""
    d = ds.dataset(f"{bucket()}/{theme_type}/", filesystem=_s3(), format="parquet")
    F = lambda k: pc.field(("bbox", k))
    flt = (F("xmax") > lon0) & (F("xmin") < lon1) & (F("ymax") > lat0) & (F("ymin") < lat1)
    if extra is not None:
        flt = flt & extra
    return d.to_table(columns=columns, filter=flt).to_pylist()


def project_geom(g, P):
    return shapely.transform(g, lambda a: np.column_stack(((a[:, 0] - P.lng0) * P.kx, (a[:, 1] - P.lat0) * P.ky)))


def lines_of(g):
    if isinstance(g, LineString):
        return [g]
    if isinstance(g, MultiLineString):
        return list(g.geoms)
    if hasattr(g, "geoms"):
        return [l for gg in g.geoms for l in lines_of(gg)]
    return []


def polys_of(g):
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    if hasattr(g, "geoms"):
        return [p for gg in g.geoms for p in polys_of(gg)]
    return []


def build_graph(road_lines):
    """Walkable network, noded at every crossing. Returns graph and node coords."""
    merged = unary_union([l for l, cls in road_lines if cls not in WALKABLE_EXCLUDE])
    G = nx.Graph()
    key = lambda c: (round(c[0], 1), round(c[1], 1))
    for seg in lines_of(merged):
        cs = list(seg.coords)
        if len(cs) < 2:
            continue
        a, b = key(cs[0]), key(cs[-1])
        if a == b:
            continue
        L = seg.length
        if G.has_edge(a, b) and G[a][b]["length"] <= L:
            continue
        G.add_edge(a, b, length=L, coords=cs)
    if G.number_of_nodes() == 0:
        return G, [], None
    # Keep the largest connected piece: stray islands make "no route" answers.
    big = max(nx.connected_components(G), key=len)
    G = G.subgraph(big).copy()
    nodes = list(G.nodes)
    return G, nodes, cKDTree(np.array(nodes))


def route(G, nodes, tree, a_xy, b_xy):
    """Shortest walk from a to b (metres). Returns (coords, length_m) or None."""
    if tree is None:
        return None
    _, ia = tree.query(a_xy)
    _, ib = tree.query(b_xy)
    na, nb = nodes[ia], nodes[ib]
    try:
        path = nx.shortest_path(G, na, nb, weight="length")
    except nx.NetworkXNoPath:
        return None
    coords = [tuple(a_xy)]
    for u, v in zip(path, path[1:]):
        cs = G[u][v]["coords"]
        if math.dist(cs[0], u) > math.dist(cs[-1], u):
            cs = cs[::-1]
        coords.extend(cs)
    coords.append(tuple(b_xy))
    line = LineString(coords)
    return list(line.simplify(1.5).coords), line.length


ABBREV = [(r"\bStreet$", "St"), (r"\bAvenue$", "Ave"), (r"\bBoulevard$", "Blvd"), (r"\bDrive$", "Dr"),
          (r"\bRoad$", "Rd"), (r"\bPlace$", "Pl"), (r"\bLane$", "Ln"), (r"\bParkway$", "Pkwy"),
          (r"^North ", "N "), (r"^South ", "S "), (r"^East ", "E "), (r"^West ", "W ")]


def short_street(name):
    for pat, rep in ABBREV:
        name = re.sub(pat, rep, name)
    return name


def street_labels(named, view, P_px, max_labels=7):
    """A few street names, placed mid-way along each street's longest piece."""
    by = {}
    for line, cls, name in named:
        if not name or cls not in LABEL_CLASSES:
            continue
        clipped = line.intersection(view)
        for l in lines_of(clipped):
            if l.length < 160:
                continue
            by.setdefault(name, []).append(l)
    ranked = sorted(by.items(), key=lambda kv: -sum(l.length for l in kv[1]))
    out, placed = [], []
    for name, ls in ranked:
        l = max(ls, key=lambda q: q.length)
        mid = l.interpolate(0.5, normalized=True)
        a = l.interpolate(max(0, l.project(mid) - 40))
        b = l.interpolate(min(l.length, l.project(mid) + 40))
        ang = math.degrees(math.atan2(-(b.y - a.y), b.x - a.x))  # screen y grows down
        if ang > 90: ang -= 180
        if ang < -90: ang += 180
        x, y = P_px(mid.x, mid.y)
        if any(math.dist((x, y), q) < 260 for q in placed):
            continue
        placed.append((x, y))
        out.append({"name": short_street(name), "x": round(x, 1), "y": round(y, 1), "angle": round(ang, 1)})
        if len(out) >= max_labels:
            break
    return out


def build(job, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    campus = job["campus"]
    spots = job["spots"]
    P = Projection(campus["lat"], campus["lng"])
    pts = [(0.0, 0.0)] + [P.m(s["lng"], s["lat"]) for s in spots]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    # Wider than tall, like the frames it is shown in (the video's map card is
    # 1000x690, the share card's panel about 1000x600), and at least 1.4 km
    # tall so a short walk still shows its neighbourhood. Whatever the camera
    # frames then stays on the map instead of running off its edge.
    half_h = max((max(ys) - min(ys)) / 2 + PAD_M, 700)
    half_w = max((max(xs) - min(xs)) / 2 + PAD_M, half_h * 1.75)
    x0, x1, y0, y1 = cx - half_w, cx + half_w, cy - half_h, cy + half_h
    scale = min(SCALE, MAX_PX / (2 * half_w))
    W, H = int(round(2 * half_w * scale)), int(round(2 * half_h * scale))
    lon0, lat0 = P.inv(x0 - 200, y0 - 200)
    lon1, lat1 = P.inv(x1 + 200, y1 + 200)

    jobs = {
        "roads": ("theme=transportation/type=segment", ["class", "names", "geometry"], pc.field("subtype") == "road"),
        "landuse": ("theme=base/type=land_use", ["subtype", "class", "names", "geometry"], None),
        "water": ("theme=base/type=water", ["geometry"], None),
        "buildings": ("theme=buildings/type=building", ["geometry"], None),
    }
    cache = os.path.join(out_dir, "overture.pkl")
    data = None
    if os.path.exists(cache):
        with open(cache, "rb") as f:
            saved = pickle.load(f)
        b = saved.get("bbox") if isinstance(saved, dict) and "bbox" in saved else None
        if b and b[0] <= lon0 and b[1] <= lat0 and b[2] >= lon1 and b[3] >= lat1:
            data = saved["data"]
    if data is None:
        with ThreadPoolExecutor(4) as ex:
            futs = {k: ex.submit(fetch, t, lon0, lat0, lon1, lat1, cols, extra) for k, (t, cols, extra) in jobs.items()}
            data = {k: f.result() for k, f in futs.items()}
        with open(cache, "wb") as f:
            pickle.dump({"bbox": (lon0, lat0, lon1, lat1), "data": data}, f)

    view = box(x0, y0, x1, y1)
    road_lines, named = [], []
    for r in data["roads"]:
        g = project_geom(wkb.loads(r["geometry"]), P)
        name = (r.get("names") or {}).get("primary")
        for l in lines_of(g):
            road_lines.append((l, r["class"] or "unclassified"))
            named.append((l, r["class"] or "unclassified", name))
    parks, campus_polys, water, buildings = [], [], [], []
    for r in data["landuse"]:
        g = project_geom(wkb.loads(r["geometry"]), P)
        if r["subtype"] == "education" and r["class"] in ("university", "college"):
            campus_polys += polys_of(g)
        elif r["subtype"] in ("park", "recreation") or r["class"] in ("park", "garden", "pitch", "golf_course", "grass", "village_green"):
            parks += polys_of(g)
    for r in data["water"]:
        water += polys_of(project_geom(wkb.loads(r["geometry"]), P))
    for r in data["buildings"]:
        buildings += polys_of(project_geom(wkb.loads(r["geometry"]), P))

    # The campus outline: education areas that contain, or sit near, the campus point.
    origin = Point(0, 0)
    mine = [p for p in campus_polys if p.area > 20000 and p.distance(origin) < 250]
    campus_outline = unary_union(mine) if mine else None

    def px(x, y):
        return ((x - x0) * scale, (y1 - y) * scale)

    # ---- base map ---------------------------------------------------------
    dpi = 100
    fig = plt.figure(figsize=(W / dpi, H / dpi), dpi=dpi)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(x0, x1); ax.set_ylim(y0, y1); ax.set_axis_off()
    fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
    lw = lambda px_w: px_w * scale / SCALE * 72 / dpi

    def polys(collection, face, edge="none", ew=0.0, z=1, alpha=1.0):
        rings = [np.asarray(p.exterior.coords) for p in collection if p.intersects(view)]
        if rings:
            ax.add_collection(PolyCollection(rings, facecolors=face, edgecolors=edge, linewidths=ew, zorder=z, alpha=alpha, antialiased=True))

    polys(parks, PARK, z=1)
    polys(water, WATER, z=2)
    if campus_outline is not None:
        polys(polys_of(campus_outline), CAMPUS_FILL, edge=CAMPUS_EDGE, ew=lw(3), z=3)
    polys(buildings, BUILDING, z=4)
    order = ["track", "steps", "cycleway", "path", "footway", "service", "pedestrian", "unclassified",
             "living_street", "residential", "tertiary", "secondary", "primary", "trunk", "motorway"]
    for cls in order:
        segs = [np.asarray(l.coords) for l, c in road_lines if c == cls and l.intersects(view)]
        if segs:
            w, col = ROAD[cls]
            ax.add_collection(LineCollection(segs, colors=col, linewidths=lw(w), capstyle="round", joinstyle="round", zorder=5 + order.index(cls) * 0.01, antialiased=True))
    fig.savefig(os.path.join(out_dir, "map.png"), dpi=dpi, facecolor=BG)
    plt.close(fig)

    # ---- routes -----------------------------------------------------------
    G, nodes, tree = build_graph(road_lines)
    out_spots = []
    for s, (sx, sy) in zip(spots, pts[1:]):
        straight = math.hypot(sx, sy)
        r = route(G, nodes, tree, (0.0, 0.0), (sx, sy))
        if r is None or r[1] > max(3.0 * straight, straight + 600):
            coords, length = [(0.0, 0.0), (sx, sy)], straight * 1.3   # no sane route: draw direct
        else:
            coords, length = r
        mins = max(1, int(round(length / WALK_M_PER_MIN)))
        out_spots.append({**s, "x": round(px(sx, sy)[0], 1), "y": round(px(sx, sy)[1], 1),
                          "walk_m": round(length), "walk_min": mins, "walk_mi": round(length / 1609.34, 1),
                          "route": [[round(a, 1), round(b, 1)] for a, b in (px(*c) for c in coords)]})

    # Closest means closest on foot: number the spots by the walk, not the crow-fly line.
    out_spots.sort(key=lambda s: s["walk_m"])
    labels = street_labels(named, view, px)
    meta = {
        "width": W, "height": H, "scale": scale,
        "campus": {"x": round(px(0, 0)[0], 1), "y": round(px(0, 0)[1], 1), "label": campus["short"]},
        "campus_outline": [[[round(a, 1), round(b, 1)] for a, b in (px(*c) for c in p.exterior.simplify(4).coords)]
                           for p in (polys_of(campus_outline) if campus_outline is not None else [])],
        "spots": out_spots,
        "labels": labels,
        "attribution": "© OpenStreetMap contributors · Overture Maps Foundation",
        "counts": {k: len(v) for k, v in data.items()},
    }
    with open(os.path.join(out_dir, "map.json"), "w") as f:
        json.dump(meta, f)
    return meta


if __name__ == "__main__":
    job = json.load(open(sys.argv[1]))
    m = build(job, sys.argv[2])
    print(json.dumps({"size": m["width"], "counts": m["counts"],
                      "walks": [(s["name"], s["walk_min"], s["walk_m"]) for s in m["spots"]]}))
