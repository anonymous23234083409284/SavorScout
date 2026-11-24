#!/usr/bin/env python3
"""The numbers for a college page email, straight from Savor Scout's data.

    python outreach/campus_numbers.py "<school name>" ["<school name>" ...]

For each school: its campus slug, short name, places to eat within a 10-minute walk (w), within a
mile (n) and within three miles (n3), the busiest food streets, whether the campus page exists in
the build, a suggested number line for the email, and the campus page URL. Use only these numbers."""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "social", "pipeline"))
import lab  # noqa: E402

def norm(s):
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", s.lower()).split())

IDX = [(s, [c["n"]] + c.get("al", []) + ([c["a"]] if c.get("a") else [])) for s, c in lab.CAMP.items()]

def find(q):
    qn, best = norm(q), []
    if q in lab.CAMP:
        return q
    for s, names in IDX:
        for n in names:
            nn = norm(n)
            if nn == qn:
                return s
            if qn and qn in nn:
                best.append((len(nn), s))
    return sorted(best)[0][1] if best else None

def street(st):
    st = st.replace(" St", " Street").replace(" Ave", " Avenue").replace(" Rd", " Road").replace(" Blvd", " Boulevard")
    st = st.replace(" Dr", " Drive").replace(" Pkwy", " Parkway").replace(" Ln", " Lane")
    return re.sub(r"^(N|S|E|W) ", lambda m: {"N": "North ", "S": "South ", "E": "East ", "W": "West "}[m.group(1)], st)

for q in sys.argv[1:]:
    s = find(q)
    if not s:
        print(f"{q}: NOT FOUND in Savor Scout's campus data (skip this school)")
        continue
    p = lab.SCENE.get(s, {})
    w, n, n3 = p.get("w", 0), p.get("n", 0), p.get("n3", 0)
    sts = [x for x in p.get("st", []) if x[1] >= 3 and len(x[0]) > 3][:2]
    page = os.path.exists(os.path.join(ROOT, "build", "campus", f"{s}.html"))
    if w >= 15:
        line = f"we count {w} places to eat within a 10-minute walk of campus" + (f" and {n} within a mile" if n >= 2 * w else "")
    elif n >= 15:
        line = f"we count {n} places to eat within a mile of campus" + (f" and {n3} within three miles" if n3 >= 2 * n else "")
    else:
        line = f"we count {n3} places to eat within three miles of campus"
    if sts:
        line += ", with " + " and ".join(street(x[0]) for x in sts) + (" the busiest food streets" if len(sts) > 1 else " the busiest food street")
    print(f"{q} -> {s} | {lab.short(s)} | {lab.CAMP[s].get('c')}, {lab.CAMP[s].get('r')} | w={w} n={n} n3={n3} | "
          f"page={'yes' if page else 'NO (skip)'} | line: \"{line}\" | https://www.savorscout.net/campus/{s}")
