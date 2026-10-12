"""Build scripts/data/nearby-places.json: 3-5 real, open restaurants near every
campus and city page, from the Overture Maps places dataset (open data,
CDLA-Permissive-2.0, read anonymously from s3://overturemaps-us-west-2).

Run occasionally to refresh the lists, not on every build; the build only
reads the JSON and never touches the network.

  python3 -m venv /tmp/ov && /tmp/ov/bin/pip install pyarrow
  /tmp/ov/bin/python scripts/fetch-nearby-places.py

The first step downloads about 1.7M US food places (~180 MB) into /tmp and
is skipped if that file is already there. Bump RELEASE to the newest folder
under release/ when refreshing, and update the date in scripts/lib/nearby.js.
"""
import json, math, os, re, sys, time
from collections import Counter

RELEASE = "2026-09-23.1"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = "/tmp/overture-us-food.parquet"
OUT = os.path.join(REPO, "scripts", "data", "nearby-places.json")


def extract():
    import pyarrow.fs as fs, pyarrow.dataset as ds, pyarrow.compute as pc, pyarrow.parquet as pq
    s3 = fs.S3FileSystem(anonymous=True, region="us-west-2")
    base = f"overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/"
    d = ds.dataset(base, filesystem=s3, format="parquet")
    F = pc.field
    flt = ((F("bbox", "xmin") >= -180) & (F("bbox", "xmin") <= -60) & (F("bbox", "ymin") >= 17) & (F("bbox", "ymin") <= 72)
           & F("basic_category").isin(["restaurant", "casual_eatery", "fast_food_restaurant", "cafe"])
           & (F("confidence") >= 0.5))
    cols = {"id": F("id"), "name": F("names", "primary"), "cat": F("basic_category"), "tax": F("taxonomy", "primary"),
            "status": F("operating_status"), "conf": F("confidence"), "x": F("bbox", "xmin"), "y": F("bbox", "ymin"),
            "brand": F("brand", "names", "primary"), "addr": F("addresses"), "web": F("websites")}
    w, n, t = None, 0, time.time()
    for b in d.to_batches(columns=cols, filter=flt, batch_size=200000, fragment_readahead=2, batch_readahead=4):
        if b.num_rows == 0:
            continue
        if w is None:
            w = pq.ParquetWriter(CACHE + ".part", b.schema)
        w.write_batch(b)
        n += b.num_rows
        print(f"{n} rows {time.time() - t:.0f}s", file=sys.stderr, flush=True)
    w.close()
    os.replace(CACHE + ".part", CACHE)


if not os.path.exists(CACHE):
    extract()

import pyarrow.parquet as pq

def load(name):
    with open(os.path.join(REPO, "scripts", "data", name)) as f:
        return json.load(f)

targets = []
for c in load("campuses.json") + load("campuses-more.json"):
    targets.append(("campus/" + c["s"], c["lat"], c["lng"], (1.5, 3, 6)))
for c in load("us-cities.json"):
    targets.append(("eat/" + c["s"], c["lat"], c["lng"], (2, 4, 8)))

t = pq.read_table(CACHE).to_pylist()

BAD_NAME = re.compile(
    r"(?i)\b(closed|permanently|ghost kitchen|test|wholesale|distribut\w*|bakeries|warehouse|supply|"
    r"headquarters|corporate|commissary|inc|llc|l\.l\.c|corp|corporation|ltd|dba|d/b/a|sba|enterprises?|"
    r"consulting|management|marketing|properties|technology|holdings|advisors|services|investments?|"
    r"partners|group|ventures|solutions|hospitality|vending|janitorial)\b|https?://|@|\d{6,}")
CATERING_ONLY = re.compile(r"(?i)catering")
FOODISH = re.compile(r"(?i)restaurant|cafe|café|grill|kitchen|diner|pizz|bbq|bar\b|deli|taco|bistro|eatery|"
                     r"trattoria|osteria|cantina|taqueria|sushi|ramen|pho|noodle|burger|wings|chicken|bagel|bakery|"
                     r"donut|coffee|tea\b|steak|seafood|fish|barbe|smokehouse|tavern|pub\b|brew|table|cuisine|"
                     r"house|cocina|thai|indian|chinese|mexican|italian|sandwich|subs?\b|bowl|grub|eats|food")
HALL = re.compile(r"(?i)\b(hall|residence|dormitory|dorm)\b")
DINING = re.compile(r"(?i)dining|food|kitchen|cafe|café|grill|market|eatery")

def clean(r):
    if r["status"] == "permanently_closed" or r["status"] == "temporarily_closed":
        return None
    if r["status"] is None and r["conf"] < 0.85:
        return None
    if r["conf"] < 0.7:
        return None
    name = (r["name"] or "").strip()
    if not (2 <= len(name) <= 60) or BAD_NAME.search(name):
        return None
    if CATERING_ONLY.search(name) and not FOODISH.search(name):
        return None
    if HALL.search(name) and not DINING.search(name):
        return None
    if name.isupper() and len(name) > 4:
        name = name.title()
    a = next((a for a in (r["addr"] or []) if a and a.get("freeform")), None)
    if not a or a.get("country") not in ("US", "PR"):
        return None
    if re.search(r"(?i)\b(apartment|apt)\b", a["freeform"]):
        return None  # a home address: a home business or a bad record, not somewhere to eat
    return {
        "n": name, "lat": round(r["y"], 5), "lng": round(r["x"], 5),
        "cat": r["cat"], "tax": r["tax"] or "", "brand": bool(r["brand"]),
        "conf": r["conf"], "st": a["freeform"].strip(), "loc": (a.get("locality") or "").strip(),
        "reg": (a.get("region") or "").strip(), "zip": (a.get("postcode") or "")[:5],
        "web": bool(r["web"]),
    }

places = [p for p in map(clean, t) if p]
print("usable places", len(places), file=sys.stderr)

# Drop places whose map pin is far from where their own ZIP code is. The
# centre of each ZIP is the median of every place in the data that claims it,
# so one mis-pinned record cannot move it. This is what catches a Brooklyn
# restaurant pinned in lower Manhattan.
by_zip = {}
for p in places:
    if p["zip"]:
        by_zip.setdefault(p["zip"], []).append(p)
centre = {}
for z, ps in by_zip.items():
    if len(ps) >= 5:
        la = sorted(q["lat"] for q in ps); ln = sorted(q["lng"] for q in ps)
        centre[z] = (la[len(la) // 2], ln[len(ln) // 2])
def pinned_right(p):
    c = centre.get(p["zip"])
    if not c:
        return True
    return abs(c[0] - p["lat"]) * 69 < 4 and abs(c[1] - p["lng"]) * 69 * math.cos(math.radians(c[0])) < 4
# And whose town disagrees with the town most places in that ZIP give.
town = {z: Counter(q["loc"].lower() for q in ps if q["loc"]) for z, ps in by_zip.items()}
def town_agrees(p):
    t = town.get(p["zip"])
    if not t or not p["loc"] or sum(t.values()) < 5:
        return True
    return t[p["loc"].lower()] / sum(t.values()) >= 0.05
places = [p for p in places if pinned_right(p) and town_agrees(p)]
print("after ZIP check", len(places), file=sys.stderr)

# Grid index, 0.1 degree cells.
grid = {}
for p in places:
    grid.setdefault((int(p["lat"] * 10), int(p["lng"] * 10)), []).append(p)

def miles(a_lat, a_lng, b_lat, b_lng):
    r = 3958.8
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))

def near(lat, lng, radius):
    span = int(radius / 6.9) + 1  # 0.1 deg lat ~ 6.9 mi
    out = []
    for i in range(int(lat * 10) - span, int(lat * 10) + span + 1):
        for j in range(int(lng * 10) - span * 2, int(lng * 10) + span * 2 + 1):
            for p in grid.get((i, j), ()):
                d = miles(lat, lng, p["lat"], p["lng"])
                if d <= radius:
                    out.append((d, p))
    return out

GENERIC = {"restaurant", "casual_eatery", "fast_food_restaurant", "cafe", "food_and_drink", ""}

def cuisine(p):
    tax = p["tax"]
    if tax in GENERIC or not tax:
        return {"cafe": "Café", "fast_food_restaurant": "Fast food"}.get(p["cat"], "")
    words = tax.replace("_restaurant", "").split("_")
    return " ".join(w if w in ("and", "or") else w.capitalize() for w in words if w)

def pick(lat, lng, radii):
    for radius in radii:
        cands = near(lat, lng, radius)
        if len(cands) >= 3:
            break
    # Local before chains, a listed website before none (the clearest sign a
    # record is a real, trading restaurant), sit-down before fast food, then closest.
    def rank(dp):
        d, p = dp
        vague = not cuisine(p) and not FOODISH.search(p["n"])  # "Faith & Work Chicago": maybe not a restaurant at all
        return (p["brand"], not p["web"], vague, p["cat"] in ("fast_food_restaurant", "cafe"), round(d, 2), -p["conf"], p["n"])
    cands.sort(key=rank)
    chosen, names, cuisines, streets = [], set(), {}, {}
    for d, p in cands:
        key = re.sub(r"[^a-z0-9]", "", p["n"].lower())
        if key in names:
            continue
        street = re.sub(r"[^a-z0-9]", "", p["st"].lower())
        if streets.get(street, 0) >= 1 and len(cands) > 8:
            continue  # one per address when there is room to; shared addresses are often bad data
        cu = cuisine(p)
        if cu and cuisines.get(cu, 0) >= 1 and len(cands) > 8:
            continue  # spread the cuisines when there is room to
        names.add(key)
        streets[street] = streets.get(street, 0) + 1
        cuisines[cu] = cuisines.get(cu, 0) + 1
        chosen.append((d, p, cu))
        if len(chosen) == 5:
            break
    chosen.sort(key=lambda x: x[0])
    return [{
        "n": p["n"], "c": cu, "st": p["st"], "loc": p["loc"], "reg": p["reg"], "zip": p["zip"],
        "lat": p["lat"], "lng": p["lng"], "mi": round(d, 1),
    } for d, p, cu in chosen]

result, short = {}, 0
for key, lat, lng, radii in targets:
    got = pick(lat, lng, radii)
    if len(got) >= 3:
        result[key] = got
    else:
        short += 1
print("pages with a list", len(result), "without", short, file=sys.stderr)
with open(OUT, "w") as f:
    json.dump({"source": f"Overture Maps Foundation, places release {RELEASE}", "pages": result},
              f, separators=(",", ":"), ensure_ascii=False)
