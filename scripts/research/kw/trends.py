"""Google Trends, from the CSV files trends.google.com exports.

Trends has no open API (Google's official one is in a closed alpha), and the
unofficial ones break or get blocked, so this reads what its Download button
saves: interest over time, interest by region, and related searches (Top and
Rising). Name each file after the search it is about if you can
("late night food.csv"); a related-searches file does not say.

Trends gives interest from 0 to 100 relative to the peak, not counts. It is
for timing (when a search peaks in the year) and for comparing phrasings
side by side, which is why the report shows it next to the volume sources
rather than mixing it in.
"""
import csv
import io
import os
import re

from . import db
from .common import log

TIME_HEAD = re.compile(r"^(week|month|day|time|date)$", re.I)
GEO_HEAD = re.compile(r"^(region|metro|dma|city|subregion|country)", re.I)


def _rows(text):
    return list(csv.reader(io.StringIO(text)))


def _value(v):
    v = (v or "").strip().replace(",", "")
    if v.lower() == "breakout":
        return 5000.0  # Trends' label for growth above 5,000%
    v = v.lstrip("+").rstrip("%")
    if v in ("", "<1"):
        return 0.5 if v == "<1" else None
    try:
        return float(v)
    except ValueError:
        return None


def _term(header):
    """'late night food: (United States)' -> 'late night food'."""
    return re.sub(r"\s*:\s*\(.*\)\s*$", "", header).strip().lower()


def import_file(con, path):
    with open(path, encoding="utf-8-sig") as f:
        text = f.read()
    rows = _rows(text)
    name = os.path.splitext(os.path.basename(path))[0].strip().lower()
    n = 0
    # Related searches: "TOP" and "RISING" sections of two-column rows.
    if any(r and r[0].strip().upper() in ("TOP", "RISING") for r in rows):
        section = None
        for r in rows:
            if not r or not any(c.strip() for c in r):
                continue
            head = r[0].strip().upper()
            if head in ("TOP", "RISING"):
                section = head.lower()
                continue
            if section and len(r) >= 2:
                val = _value(r[1])
                if val is not None:
                    db.put(con, "trends", r[0].strip(), section, val, seed=name)
                    n += 1
        return f"related searches ({n})"
    # Over time or by region: a header row whose first cell names the axis.
    for i, r in enumerate(rows):
        if len(r) >= 2 and (TIME_HEAD.match(r[0].strip()) or GEO_HEAD.match(r[0].strip())):
            terms = [_term(h) for h in r[1:]]
            geo = bool(GEO_HEAD.match(r[0].strip()))
            for data in rows[i + 1:]:
                if len(data) < 2 or not data[0].strip():
                    continue
                for term, v in zip(terms, data[1:]):
                    val = _value(v)
                    if val is None:
                        continue
                    if geo:
                        db.put(con, "trends", term, "region_interest", val, period="geo:" + data[0].strip(), seed=name)
                    else:
                        db.put(con, "trends", term, "interest", val, period=data[0].strip()[:10], seed=name)
                    n += 1
            return ("interest by region" if geo else "interest over time") + f" ({n})"
    return "not a Trends export (skipped)"


def run(paths):
    con = db.connect()
    started = db.now()
    files = []
    for p in paths:
        if os.path.isdir(p):
            files += [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.lower().endswith(".csv")]
        else:
            files.append(p)
    for f in files:
        log(f"  {os.path.basename(f)}: {import_file(con, f)}")
    con.commit()
    db.run_log(con, "trends", started, len(files))
