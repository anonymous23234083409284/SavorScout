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

Also writes scripts/data/food-scene.json (per-page food scene, per-guide
rankings) and scripts/data/campus-cuisine.json (the campus x cuisine pages;
batch size and the minimum-listings gate are in data/niche-config.json).
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
        rows = json.load(f)
    if name.startswith("campuses"):
        # Same overrides as scripts/lib/campuses.js: where IPEDS has an office, not a campus.
        with open(os.path.join(REPO, "scripts", "data", "campus-locations.json")) as f:
            fix = json.load(f)
        rows = [{**c, **{k: v for k, v in fix.get(c["s"], {}).items() if k in ("lat", "lng")}} for c in rows]
    return rows

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
    r"partners|group|ventures|solutions|hospitality|vending|janitorial|liquors?|wine & spirits|spirits|"
    r"candy|candies|smoke shop|vape|tobacco|cigars?|convenience|gas station|fuel|lottery|answers|realty|insurance|"
    r"repair|plumbing|hvac|salon|nails|dental|dentist|clinic|attorney|law firm|storage|cleaners|laundromat)\b|https?://|@|\d{6,}")
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
    if not re.match(r"^\d", a["freeform"].strip()):
        return None  # no street number: a mall, a campus building or a bad record, not a findable door
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

# A chain is a name that turns up 15 or more times across the country. The
# data's own brand field misses most of them (Denny's, KFC, Round Table), so
# counting names is the more honest test.
def norm(n):
    return re.sub(r"[^a-z0-9]", "", n.lower())
name_count = Counter(norm(p["n"]) for p in places)
for p in places:
    p["chain"] = p["brand"] or name_count[norm(p["n"])] >= 15

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

# Restaurant type in the data -> the food guide that covers it. Types with no
# guide still count in the food-scene numbers; they just get no link.
TAX_GUIDE = {
    "mexican_restaurant": "mexican-food", "pizza_restaurant": "pizza", "bakery": "bakery", "cafe": "coffee",
    "sandwich_shop": "sandwiches", "american_restaurant": "american-food", "seafood_restaurant": "seafood",
    "burger_restaurant": "burgers", "ice_cream_shop": "ice-cream", "chinese_restaurant": "chinese-food",
    "italian_restaurant": "italian-food", "taco_restaurant": "tacos", "barbecue_restaurant": "bbq",
    "chicken_restaurant": "fried-chicken", "sushi_restaurant": "sushi", "breakfast_and_brunch_restaurant": "breakfast",
    "delicatessen": "deli", "diner": "diner", "donut_shop": "donuts", "japanese_restaurant": "japanese-food",
    "dessert_shop": "dessert", "steakhouse": "steak", "indian_restaurant": "indian-food", "thai_restaurant": "thai-food",
    "vietnamese_restaurant": "vietnamese-food", "mediterranean_restaurant": "mediterranean-food",
    "asian_fusion_restaurant": "asian-fusion-food", "bagel_shop": "bagels", "chicken_wings_restaurant": "wings",
    "gastropub": "gastropub", "korean_restaurant": "korean-food", "buffet_restaurant": "buffet",
    "texmex_restaurant": "tex-mex-food", "hot_dog_restaurant": "hot-dogs", "greek_restaurant": "greek-food",
    "caribbean_restaurant": "caribbean-food", "frozen_yogurt_shop": "dessert", "salad_bar": "salad",
    "southern_american_restaurant": "southern-food", "french_restaurant": "french-food",
    "cajun_and_creole_restaurant": "cajun-food", "shaved_ice_shop": "shaved-ice", "pancake_house": "pancakes",
    "tapas_bar": "tapas", "middle_eastern_restaurant": "mezze", "soul_food": "soul-food", "ramen_restaurant": "ramen",
    "peruvian_restaurant": "peruvian-food", "poke_restaurant": "poke", "cuban_restaurant": "cuban-food",
    "salvadoran_restaurant": "salvadoran-food", "jamaican_restaurant": "jamaican-food",
    "filipino_restaurant": "filipino-food", "halal_restaurant": "halal-food", "hawaiian_restaurant": "hawaiian-food",
    "brazilian_restaurant": "brazilian-food", "spanish_restaurant": "spanish-food", "lebanese_restaurant": "lebanese-food",
    "gelato_shop": "gelato", "argentine_restaurant": "argentinian-food", "colombian_restaurant": "colombian-food",
    "fish_and_chips_restaurant": "fish-and-chips", "puerto_rican_restaurant": "puerto-rican-food",
    "soup_restaurant": "soup", "dominican_restaurant": "dominican-food", "german_restaurant": "german-food",
    "venezuelan_restaurant": "venezuelan-food", "dim_sum_restaurant": "dim-sum", "ethiopian_restaurant": "ethiopian-food",
    "turkish_restaurant": "turkish-food", "persian_restaurant": "persian-food", "honduran_restaurant": "honduran-food",
    "pakistani_restaurant": "pakistani-food", "portuguese_restaurant": "portuguese-food",
    "doner_kebab_restaurant": "kebabs", "taiwanese_restaurant": "taiwanese-food",
    "cheesesteak_restaurant": "cheesesteak", "afghani_restaurant": "afghan-food", "nepalese_restaurant": "nepali-food",
    "haitian_restaurant": "haitian-food", "mongolian_restaurant": "mongolian-food", "polish_restaurant": "polish-food",
    "falafel_restaurant": "falafel", "guatemalan_restaurant": "guatemalan-food", "ecuadorian_restaurant": "ecuadorian-food",
    "acai_bowls": "acai-bowls", "moroccan_restaurant": "moroccan-food", "malaysian_restaurant": "malaysian-food",
    "dumpling_restaurant": "dumplings", "cambodian_restaurant": "cambodian-food", "burmese_restaurant": "burmese-food",
    "russian_restaurant": "russian-food", "indonesian_restaurant": "indonesian-food",
    "bangladeshi_restaurant": "bangladeshi-food", "nigerian_restaurant": "nigerian-food", "syrian_restaurant": "syrian-food",
    "egyptian_restaurant": "egyptian-food", "armenian_restaurant": "armenian-food", "empanada_restaurant": "empanadas",
    "ukrainian_restaurant": "ukrainian-food", "irish_restaurant": "irish-food", "georgian_restaurant": "georgian-food",
    "uzbek_restaurant": "uzbek-food", "sri_lankan_restaurant": "sri-lankan-food", "israeli_restaurant": "israeli-food",
    "cantonese_restaurant": "cantonese-food", "west_african_restaurant": "west-african-food",
    "waffle_restaurant": "waffles", "hungarian_restaurant": "hungarian-food", "trinidadian_restaurant": "trinidadian-food",
    "sichuan_restaurant": "sichuan-food", "laotian_restaurant": "laotian-food", "tibetan_restaurant": "tibetan-food",
    "yemenite_restaurant": "yemeni-food", "wrap_restaurant": "wraps", "rotisserie_chicken_restaurant": "rotisserie-chicken",
    "vegetarian_restaurant": "diet:vegetarian", "vegan_restaurant": "diet:vegan",
    "gluten_free_restaurant": "diet:gluten-free", "kosher_restaurant": "diet:kosher",
}

# Dishes no restaurant type names on its own, and the kind of place that serves
# them. Their guides show where those places are, and say so.
DISH_VIA = {
    "mexican_restaurant": "birria al-pastor carnitas mole pozole menudo burritos enchiladas tortas chilaquiles carne-asada "
                          "nachos quesadillas tamales churros breakfast-burritos oaxacan-food mariscos fish-tacos",
    "taco_restaurant": "birria al-pastor carnitas fish-tacos",
    "salvadoran_restaurant": "pupusas", "venezuelan_restaurant": "arepas", "colombian_restaurant": "arepas",
    "vietnamese_restaurant": "banh-mi pho bun-bo-hue spring-rolls",
    "indian_restaurant": "biryani dosa tandoori chaat butter-chicken thali curry",
    "nepalese_restaurant": "momos", "tibetan_restaurant": "momos",
    "japanese_restaurant": "udon soba katsu tempura yakitori izakaya omakase teriyaki okonomiyaki matcha mochi",
    "korean_restaurant": "korean-bbq bibimbap tteokbokki sundubu korean-fried-chicken",
    "chinese_restaurant": "soup-dumplings peking-duck hand-pulled-noodles chinese-bbq fried-rice congee noodles dumplings",
    "thai_restaurant": "pad-thai khao-soi curry",
    "jamaican_restaurant": "jerk-chicken oxtail", "caribbean_restaurant": "jerk-chicken oxtail roti",
    "trinidadian_restaurant": "roti",
    "middle_eastern_restaurant": "hummus shawarma", "lebanese_restaurant": "hummus shawarma",
    "mediterranean_restaurant": "hummus shawarma gyros", "greek_restaurant": "gyros",
    "pizza_restaurant": "neapolitan-pizza new-york-pizza deep-dish-pizza detroit-style-pizza",
    "italian_restaurant": "pasta italian-beef", "burger_restaurant": "smash-burgers",
    "barbecue_restaurant": "brisket ribs pulled-pork", "steakhouse": "prime-rib",
    "breakfast_and_brunch_restaurant": "pancakes waffles chicken-and-waffles biscuits-and-gravy eggs-benedict brunch",
    "seafood_restaurant": "oysters lobster crab lobster-rolls clam-chowder seafood-boil crawfish fried-catfish ceviche",
    "cajun_and_creole_restaurant": "gumbo jambalaya po-boys beignets crawfish shrimp-and-grits",
    "southern_american_restaurant": "shrimp-and-grits meat-and-three biscuits-and-gravy",
    "chicken_restaurant": "hot-chicken chicken-sandwich",
    "dessert_shop": "cheesecake crepes", "ice_cream_shop": "gelato",
    "polish_restaurant": "pierogi", "cuban_restaurant": "cuban-sandwich", "peruvian_restaurant": "ceviche",
    "sandwich_shop": "cheesesteak cuban-sandwich wraps", "delicatessen": "bagels",
}

GENERIC = {"restaurant", "casual_eatery", "fast_food_restaurant", "cafe", "food_and_drink", ""}

def cuisine(p):
    tax = p["tax"]
    if tax in GENERIC or not tax:
        return {"cafe": "Café", "fast_food_restaurant": "Fast food"}.get(p["cat"], "")
    words = tax.replace("_restaurant", "").split("_")
    return " ".join(w if w in ("and", "or") else w.capitalize() for w in words if w)

def guide_of(p):
    g = TAX_GUIDE.get(p["tax"])
    if g:
        return g
    return "coffee" if p["cat"] == "cafe" else None

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
        return (p["chain"], not p["web"], vague, p["cat"] in ("fast_food_restaurant", "cafe"), round(d, 2), -p["conf"], p["n"])
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
        **({"g": guide_of(p)} if guide_of(p) else {}),
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


# ---------------------------------------------------------------------------
# Food scene: what is around each campus and city, and where each food is.
# Written to scripts/data/food-scene.json.
# ---------------------------------------------------------------------------

LABEL_FIX = {
    "Texmex": "Tex-Mex", "Afghani": "Afghan", "Yemenite": "Yemeni", "Chicken Wings": "Wings",
    "Delicatessen": "Deli", "Southern American": "Southern", "Ice Cream Shop": "Ice cream",
    "Salad Bar": "Salad", "Tapas Bar": "Tapas", "Sandwich Shop": "Sandwiches", "Donut Shop": "Donuts",
    "Bagel Shop": "Bagels", "Taco": "Tacos", "Dessert Shop": "Dessert", "Frozen Yogurt Shop": "Frozen yogurt",
    "Gelato Shop": "Gelato", "Shaved Ice Shop": "Shaved ice", "Pancake House": "Pancakes",
    "Acai Bowls": "Açaí bowls", "Doner Kebab": "Kebabs", "Breakfast and Brunch": "Breakfast & brunch",
    "Bar and Grill": "Bar & grill", "Cajun and Creole": "Cajun & Creole", "Asian Fusion": "Asian fusion",
    "Fish and Chips": "Fish & chips", "Hot Dog": "Hot dogs", "Burger": "Burgers", "Chicken": "Chicken",
    "Soul Food": "Soul food", "Dim Sum": "Dim sum", "Candy Store": None, "Internet Cafe": None,
    "Chocolatier": "Chocolate", "Cupcake Shop": "Cupcakes", "Pretzel Shop": "Pretzels", "Popcorn Shop": None,
    "Theme": None, "Comfort Food": "Comfort food", "Health Food": "Health food", "Pop Up": None,
    "Latin American": "Latin American", "Pan Asian": "Pan-Asian", "Middle Eastern": "Middle Eastern",
}

def scene_label(p):
    # The same test the coffee guide counts by, so a page's coffee tile and the
    # coffee guide's count for that page agree.
    if guide_of(p) == "coffee":
        return "Coffee"
    if p["tax"] in GENERIC or not p["tax"]:
        return None
    lab = cuisine(p)
    return LABEL_FIX.get(lab, lab)

KIND_FIX = {
    "bakery": "bakeries", "cafe": "coffee shops and cafés", "sandwich_shop": "sandwich shops",
    "ice_cream_shop": "ice cream shops", "delicatessen": "delis", "diner": "diners", "donut_shop": "donut shops",
    "dessert_shop": "dessert shops", "steakhouse": "steakhouses", "bagel_shop": "bagel shops", "gastropub": "gastropubs",
    "salad_bar": "salad bars", "frozen_yogurt_shop": "frozen yogurt shops", "shaved_ice_shop": "shaved ice shops",
    "pancake_house": "pancake houses", "tapas_bar": "tapas bars", "soul_food": "soul food restaurants",
    "gelato_shop": "gelato shops", "acai_bowls": "açaí bowl shops", "texmex_restaurant": "Tex-Mex restaurants",
    "chicken_wings_restaurant": "wing spots", "chicken_restaurant": "chicken restaurants",
    "breakfast_and_brunch_restaurant": "breakfast and brunch spots", "middle_eastern_restaurant": "Middle Eastern restaurants",
    "afghani_restaurant": "Afghan restaurants", "argentine_restaurant": "Argentine restaurants",
    "yemenite_restaurant": "Yemeni restaurants", "southern_american_restaurant": "Southern restaurants",
    "cajun_and_creole_restaurant": "Cajun and Creole restaurants", "doner_kebab_restaurant": "kebab shops",
    "fish_and_chips_restaurant": "fish and chips shops", "asian_fusion_restaurant": "Asian fusion restaurants",
    "dim_sum_restaurant": "dim sum restaurants", "hot_dog_restaurant": "hot dog spots", "burger_restaurant": "burger joints",
    "pizza_restaurant": "pizzerias", "taco_restaurant": "taquerias and taco shops", "barbecue_restaurant": "barbecue joints",
    "empanada_restaurant": "empanada shops", "wrap_restaurant": "wrap shops", "waffle_restaurant": "waffle houses",
    "rotisserie_chicken_restaurant": "rotisserie chicken spots", "dumpling_restaurant": "dumpling houses",
    "falafel_restaurant": "falafel shops", "poke_restaurant": "poké shops", "ramen_restaurant": "ramen shops",
    "sushi_restaurant": "sushi restaurants", "soup_restaurant": "soup restaurants",
    "vietnamese_restaurant": "pho and Vietnamese noodle-soup shops",
    "cheesesteak_restaurant": "cheesesteak shops", "vegetarian_restaurant": "vegetarian restaurants",
    "vegan_restaurant": "vegan restaurants", "gluten_free_restaurant": "gluten-free restaurants",
    "kosher_restaurant": "kosher restaurants", "halal_restaurant": "halal restaurants",
    "american_restaurant": "American restaurants", "seafood_restaurant": "seafood restaurants",
    "mexican_restaurant": "Mexican restaurants", "comfort_food_restaurant": "comfort food restaurants",
    "health_food_restaurant": "health food restaurants", "buffet_restaurant": "buffets",
}

def kind(tax):
    if tax in KIND_FIX:
        return KIND_FIX[tax]
    words = tax.replace("_restaurant", "").split("_")
    return " ".join(w.capitalize() for w in words) + " restaurants"

for p in places:
    p["g"] = guide_of(p)
    p["lab"] = scene_label(p)

national_lab = Counter(p["lab"] for p in places if p["lab"])
national_labeled = sum(national_lab.values())
lab_guide = {}
for p in places:
    if p["lab"] and p["g"] and p["lab"] not in lab_guide:
        lab_guide[p["lab"]] = p["g"]

SUFFIX = {"street": "St", "st": "St", "avenue": "Ave", "ave": "Ave", "av": "Ave", "boulevard": "Blvd", "blvd": "Blvd",
          "road": "Rd", "rd": "Rd", "drive": "Dr", "dr": "Dr", "lane": "Ln", "ln": "Ln", "parkway": "Pkwy", "pkwy": "Pkwy",
          "highway": "Hwy", "hwy": "Hwy", "place": "Pl", "pl": "Pl", "court": "Ct", "ct": "Ct", "square": "Sq",
          "sq": "Sq", "plaza": "Plaza", "plz": "Plaza", "way": "Way", "terrace": "Ter", "circle": "Cir"}
DIRS = {"north": "N", "south": "S", "east": "E", "west": "W", "n": "N", "s": "S", "e": "E", "w": "W",
        "ne": "NE", "nw": "NW", "se": "SE", "sw": "SW", "northeast": "NE", "northwest": "NW", "southeast": "SE", "southwest": "SW"}

def street_of(addr):
    """'1000 E University Ave Ste 4' -> 'E University Ave'. None when there is no house number to strip:
    that is a mall, a campus building or a PO box rather than a street someone could walk down."""
    a = re.split(r",|\s(?:ste|suite|unit|#|apt|bldg|building|fl|floor|rm|room)\b\.?", addr, flags=re.I)[0].strip()
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
            out.append(w if not w.isupper() or len(w) <= 3 else w.capitalize())
    st = " ".join(out)
    return st if 3 <= len(st) <= 40 and not re.search(r"\d{3,}", st.split()[0]) else None

# East and Southeast Asian kitchens, for /food/asian-food and the line on each
# campus and city page that points to it. South Asian is its own guide set.
ASIAN = {"chinese_restaurant", "japanese_restaurant", "korean_restaurant", "thai_restaurant", "vietnamese_restaurant",
         "asian_restaurant", "asian_fusion_restaurant", "pan_asian_restaurant", "sushi_restaurant", "ramen_restaurant",
         "dim_sum_restaurant", "filipino_restaurant", "taiwanese_restaurant", "cantonese_restaurant", "sichuan_restaurant",
         "malaysian_restaurant", "indonesian_restaurant", "burmese_restaurant", "cambodian_restaurant", "laotian_restaurant",
         "mongolian_restaurant", "hong_kong_style_cafe", "dumpling_restaurant", "shanghainese_restaurant", "hunan_restaurant",
         "singaporean_restaurant", "southeast_asian_restaurant", "fujian_restaurant", "wok_restaurant"}

def scene(lat, lng, radius, walk):
    ps = near(lat, lng, radius)
    if len(ps) < 5:
        return None
    labs = Counter(p["lab"] for d, p in ps if p["lab"])
    labeled = sum(labs.values()) or 1
    top = [[l, lab_guide.get(l, ""), n] for l, n in labs.most_common(12) if n >= 2][:10]
    hi = []
    for l, n in labs.items():
        if n < 3 or l == "Coffee" or national_lab[l] < 500:
            continue  # a rare type makes a silly multiple out of three places
        ratio = (n / labeled) / (national_lab[l] / national_labeled)
        if ratio >= 2:
            hi.append([l, lab_guide.get(l, ""), round(ratio, 1), n])
    hi.sort(key=lambda x: -x[2])
    # Where the food is: the streets with the most places on them. Keyed
    # case-insensitively so "E University Ave" and "E UNIVERSITY AVE" count once.
    # Keyed without direction words, so "Abbe Rd N", "N Abbe Rd" and "Abbe Rd"
    # count as the one road they are, and shown in their commonest spelling.
    streets, spellings = Counter(), {}
    for d, p in ps:
        st = street_of(p["st"])
        if st:
            key = " ".join(w for w in st.lower().split() if w.upper() not in DIRS.values())
            if not key:
                continue
            streets[key] += 1
            spellings.setdefault(key, Counter())[st] += 1
    food_streets = [[spellings[k].most_common(1)[0][0] if len(spellings[k]) == 1 else
                     " ".join(w for w in spellings[k].most_common(1)[0][0].split() if w not in DIRS.values()), n]
                    for k, n in streets.most_common(4) if n >= 3]
    # A wider count for campuses on the edge of town, where a mile holds only a
    # handful: three miles is a short drive or bus ride, and says more.
    wide = len(near(lat, lng, 3.0)) if radius < 3 else len(ps)
    return {
        "st": food_streets, "n3": wide, "as": sum(1 for d, p in ps if p["tax"] in ASIAN),
        # Counts for the core cuisine guides, so a page links to one only where
        # that cuisine is actually there, whatever its place in the top ten.
        "cz": {k: labs.get(k, 0) for k in ("Mexican", "Korean", "Vietnamese")},
        "r": radius, "n": len(ps), "w": sum(1 for d, p in ps if d <= walk),
        "loc": round(100 * sum(1 for d, p in ps if not p["chain"]) / len(ps)),
        "ff": sum(1 for d, p in ps if p["cat"] == "fast_food_restaurant"),
        "cof": labs.get("Coffee", 0), "top": top, "hi": hi[:3],
    }

pages_scene = {}
city_g, city_t, camp_g, camp_t, city_own, camp_own = {}, {}, {}, {}, {}, {}
def in_city(p, c):
    return p["loc"].lower() == c["c"].lower() and p["reg"].upper() == c["r"]
cities = load("us-cities.json")
campuses = load("campuses.json") + load("campuses-more.json")
def scene_at(lat, lng, radii, walk):
    for r in radii:
        sc = scene(lat, lng, r, walk)
        if sc:
            return sc
    return None

for c in campuses:
    sc = scene_at(c["lat"], c["lng"], (1.0, 2.0, 4.0), 0.5)
    if sc:
        pages_scene["campus/" + c["s"]] = sc
    ps = near(c["lat"], c["lng"], 1.0)
    camp_own[c["s"]] = [p for d, p in ps]
    camp_g[c["s"]] = Counter(p["g"] for d, p in ps if p["g"])
    camp_t[c["s"]] = Counter(p["tax"] for d, p in ps if p["tax"])
for c in cities:
    sc = scene_at(c["lat"], c["lng"], (2.0, 4.0), 0.5)
    if sc:
        pages_scene["eat/" + c["s"]] = sc
    # A city's own restaurants are the ones whose address names it. A radius
    # would hand Hoboken half of Manhattan.
    ps = [p for d, p in near(c["lat"], c["lng"], 12.0) if in_city(p, c)]
    city_own[c["s"]] = ps
    city_g[c["s"]] = Counter(p["g"] for p in ps if p["g"])
    city_t[c["s"]] = Counter(p["tax"] for p in ps if p["tax"])
city_by = {c["s"]: c for c in cities}

# Each guide: the restaurant types that serve it, directly or as "where it is usually found".
guide_direct = {}
for tax, g in TAX_GUIDE.items():
    guide_direct.setdefault(g, []).append(tax)
guide_direct.setdefault("coffee", []).append("cafe")
guide_via = {}
for tax, gs in DISH_VIA.items():
    for g in gs.split():
        guide_via.setdefault(g, []).append(tax)

natl_g = Counter(p["g"] for p in places if p["g"])
natl_t = Counter(p["tax"] for p in places if p["tax"])

# Guides whose food lives at several kinds of place, as the guide itself says.
# Soup: "pho shops, ramen shops ... when the soup is the reason the restaurant
# exists". Dedicated soup restaurants alone are 656 listings, mostly one chain.
GUIDE_SET = {"soup": ["soup_restaurant", "ramen_restaurant", "vietnamese_restaurant"],
             "asian-food": sorted(ASIAN)}
# How a guide names what it counts, where one type's label would not do.
GUIDE_KINDS = {"asian-food": ["Chinese, Japanese, Korean, Thai, Vietnamese and other East and Southeast Asian restaurants"]}
# Within those types, the places that are actually about the soup. A
# Vietnamese grill or banh mi shop is not a pho house.
SOUP_NAME = re.compile(r"(?i)\b(pho|phở|bun bo|bún|hu tieu|hủ tiếu|noodle|soup|ramen|udon|menudo|pozole|caldo)")
def soup_match(p):
    return p["tax"] in ("soup_restaurant", "ramen_restaurant") or (p["tax"] == "vietnamese_restaurant" and SOUP_NAME.search(p["n"]))
for g, T in GUIDE_SET.items():
    guide_via[g] = T

# Online-only schools have an office address, not a campus anyone eats near.
ONLINE = re.compile(r"(?i)University of the People|\bGlobal\b|\bOnline\b|National and Global|"
                    # and the same exclusions scripts/lib/campuses.js applies (NO_CAMPUS), so
                    # nothing is picked here that the site never builds a page for
                    r"digital immersion|global campus|world campus|\bdistrict\b|system office|\bvirtual\b")

guides = {}
for g in set(guide_direct) | set(guide_via):
    direct = g in natl_g and natl_g[g] >= 20 and g not in GUIDE_SET
    if direct:
        taxes = sorted(set(guide_direct.get(g, [])), key=lambda t: -natl_t.get(t, 0))
        count_city = lambda s: city_g[s][g]
        count_camp = lambda s: camp_g[s][g]
        match = lambda p: p["g"] == g
        natl = natl_g[g]
    else:
        taxes = list(GUIDE_SET[g]) if g in GUIDE_SET else sorted(set(guide_via.get(g, [])), key=lambda t: -natl_t.get(t, 0))
        if not taxes:
            continue
        if g == "soup":
            match = soup_match
            count_city = lambda s: sum(1 for p in city_own[s] if soup_match(p))
            count_camp = lambda s: sum(1 for p in camp_own[s] if soup_match(p))
            natl = sum(1 for p in places if soup_match(p))
        else:
            count_city = lambda s, T=tuple(taxes): sum(city_t[s][t] for t in T)
            count_camp = lambda s, T=tuple(taxes): sum(camp_t[s][t] for t in T)
            match = lambda p, T=tuple(taxes): p["tax"] in T
            natl = sum(natl_t.get(t, 0) for t in taxes)
    top_cities = sorted(((count_city(c["s"]), c["s"]) for c in cities), reverse=True)
    top_cities = [[s, n] for n, s in top_cities if n >= 3][:12]
    top_camps = sorted(((count_camp(c["s"]), c["s"]) for c in campuses if not ONLINE.search(c["n"])), reverse=True)
    top_camps = [[s, n] for n, s in top_camps if n >= 2][:10]
    examples = []
    for s, n in top_cities[:6]:
        c = city_by[s]
        cands = [(miles(c["lat"], c["lng"], p["lat"], p["lng"]), p) for p in city_own[s] if match(p) and not p["chain"]]
        cands.sort(key=lambda dp: (not dp[1]["web"], round(dp[0], 1), -dp[1]["conf"]))
        if cands:
            d, p = cands[0]
            examples.append({"n": p["n"], "st": p["st"], "loc": p["loc"], "reg": p["reg"], "zip": p["zip"],
                             "lat": p["lat"], "lng": p["lng"], "city": s, "c": cuisine(p)})
    if not top_cities and not top_camps:
        continue
    guides[g] = {"via": not direct and g not in GUIDE_KINDS,
                 "kinds": GUIDE_KINDS.get(g) or [kind(t) for t in taxes[:3 if g in GUIDE_SET else 2]], "natl": natl,
                 "cities": top_cities, "campuses": top_camps, "ex": examples}

print("scene pages", len(pages_scene), "guides with data", len(guides), file=sys.stderr)
with open(os.path.join(REPO, "scripts", "data", "food-scene.json"), "w") as f:
    json.dump({"source": f"Overture Maps Foundation, places release {RELEASE}", "pages": pages_scene, "guides": guides},
              f, separators=(",", ":"), ensure_ascii=False)


# ---------------------------------------------------------------------------
# Campus x cuisine pages: /campus/<school>/<food>, e.g. "Korean food near NYU".
# Written to scripts/data/campus-cuisine.json. A pair qualifies only with
# min_places real matching listings within a mile; the batch is the top
# `batch` qualifying pairs, highest-priority campuses first, spread wide.
# ---------------------------------------------------------------------------

with open(os.path.join(REPO, "scripts", "data", "niche-config.json")) as f:
    NICHE = json.load(f)

# Cuisines people search "<food> near <school>" for, each with how a place is
# matched. Food-guide slugs, so every page sits under a real guide.
NICHE_FOODS = ["mexican-food", "asian-food", "chinese-food", "japanese-food", "korean-food", "thai-food",
               "vietnamese-food", "indian-food", "italian-food", "mediterranean-food", "sushi", "ramen", "pizza",
               "tacos", "burgers", "bbq", "coffee", "bakery", "sandwiches", "fried-chicken", "wings", "breakfast",
               "seafood", "halal-food", "greek-food", "deli", "ice-cream", "bagels", "donuts", "dessert"]

def niche_match(g):
    if g == "asian-food":
        return lambda p: p["tax"] in ASIAN
    return lambda p: p["g"] == g

def read_js_slugs(path, pattern):
    with open(os.path.join(REPO, path)) as f:
        return re.findall(pattern, f.read())

focus = read_js_slugs("scripts/data/search-focus.js", r'"/campus/([a-z0-9-]+)"')

with open(os.path.join(REPO, "scripts", "make-campus-pages.js")) as f:
    src = f.read()
m = re.search(r"CTR_TEST = new Set\(\[([\s\S]*?)\]\)", src)
clicked = re.findall(r'"([a-z0-9-]+)"', m.group(1)) if m else []
by_slug = {c["s"]: c for c in campuses}
order = []
for s_ in focus + clicked:
    if s_ in by_slug and s_ not in order:
        order.append(s_)
rest = sorted((c["s"] for c in campuses if c["s"] not in order and not ONLINE.search(c["n"])),
              key=lambda s_: -len(camp_own.get(s_, [])))
order += rest

def pair(c, g):
    ps = [(miles(c["lat"], c["lng"], p["lat"], p["lng"]), p) for p in camp_own.get(c["s"], []) if niche_match(g)(p)]
    if len(ps) < NICHE["min_places"]:
        return None
    ps.sort(key=lambda dp: dp[0])
    streets = Counter()
    for d, p in ps:
        st = street_of(p["st"])
        if st:
            streets[" ".join(w for w in st.split() if w not in DIRS.values())] += 1
    wide = sum(1 for d, p in near(c["lat"], c["lng"], 3.0) if niche_match(g)(p))
    seen, shown = set(), []
    for d, p in sorted(ps, key=lambda dp: (dp[1]["chain"], dp[0])):   # local first, then closest
        k = norm(p["n"])
        if k in seen:
            continue
        seen.add(k)
        shown.append((d, p))
        if len(shown) == 10:
            break
    shown.sort(key=lambda dp: dp[0])
    return {
        "campus": c["s"], "food": g, "n": len(ps), "w": sum(1 for d, p in ps if d <= 0.5), "n3": wide,
        "loc": round(100 * sum(1 for d, p in ps if not p["chain"]) / len(ps)),
        "st": [[s_, n] for s_, n in streets.most_common(2) if n >= 2],
        "places": [{"n": p["n"], "c": cuisine(p), "st": p["st"], "loc": p["loc"], "reg": p["reg"], "zip": p["zip"],
                    "lat": p["lat"], "lng": p["lng"], "mi": round(d, 1), "chain": p["chain"]} for d, p in shown],
    }

# One page per family of food per campus, so a campus gets "Thai", "Mexican"
# and "coffee" rather than "Asian", "Chinese" and "sushi". Within a family the
# specific cuisine beats the umbrella: "Thai food near Simmons" is a narrower,
# less contested search than "Asian food near Simmons".
FAMILY = {"asian-food": "asian", "chinese-food": "asian", "japanese-food": "asian", "korean-food": "asian",
          "thai-food": "asian", "vietnamese-food": "asian", "sushi": "asian", "ramen": "asian",
          "mexican-food": "mexican", "tacos": "mexican", "pizza": "italian", "italian-food": "italian",
          "coffee": "cafe", "bakery": "cafe", "bagels": "cafe", "donuts": "cafe", "dessert": "sweet", "ice-cream": "sweet",
          "burgers": "american", "bbq": "american", "fried-chicken": "american", "wings": "american",
          "sandwiches": "american", "deli": "american", "breakfast": "breakfast", "mediterranean-food": "med",
          "greek-food": "med", "halal-food": "med", "indian-food": "indian", "seafood": "seafood"}

def pick(cands):
    best = {}
    for x in sorted(cands, key=lambda x: (x["food"] == "asian-food", -x["n"])):
        best.setdefault(FAMILY[x["food"]], x)
    return sorted(best.values(), key=lambda x: -x["n"])

tier1 = [s_ for s_ in order if s_ in focus or s_ in clicked]
per, eligible = {}, 0
for s_ in order:
    cands = [x for x in (pair(by_slug[s_], g) for g in NICHE_FOODS) if x]
    eligible += len(cands)
    if cands:
        per[s_] = pick(cands)[:NICHE["per_campus"]]

# The campuses Google already shows us for go first, every one of them up to
# per_campus pages, round-robin so each gets its best page before any gets a
# third; then the rest of the list the same way.
batch = []
for tier in (tier1, [s_ for s_ in order if s_ not in tier1]):
    for rank in range(NICHE["per_campus"]):
        for s_ in tier:
            if s_ in per and len(per[s_]) > rank and len(batch) < NICHE["batch"]:
                batch.append(per[s_][rank])
print("campus x cuisine: eligible", eligible, "published", len(batch), file=sys.stderr)
with open(os.path.join(REPO, "scripts", "data", "campus-cuisine.json"), "w") as f:
    json.dump({"source": f"Overture Maps Foundation, places release {RELEASE}", "eligible": eligible,
               "pages": batch}, f, separators=(",", ":"), ensure_ascii=False)
