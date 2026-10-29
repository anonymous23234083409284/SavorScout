"""Line every source up per search, then say what to change and where.

Nothing here estimates traffic. Every number in the outputs is one a source
reported (Search Console impressions, a Google Ads volume, a Bing count, an
autocomplete rank), and every recommendation names the rule that produced it,
so it can be checked against the data beside it.

Outputs, in scripts/research/out/:
  queries.csv         every search, with what each source says about it
  patterns.csv        the same searches with the place and food swapped out
  opportunities.csv   what to change, page by page, most evidence first
  pages.csv           our pages: impressions, clicks, change, index status
  template-gaps.csv   modifiers many campuses get searched with that the
                      page template never mentions
  new-pages.csv       searches with demand and no page built for them
  cannibalization.csv searches split across two or more of our pages
  reddit-*.csv        student questions and recurring phrases, if pulled
  report.html         all of the above, readable
"""
import csv
import html
import json
import os
import re
from collections import Counter, defaultdict

from . import db
from .common import EXPORT_FILE, OUT, load_seeds, log
from .site import Site, norm

FOODY = re.compile(r"\b(food|eat|eats|restaurant|restaurants|lunch|dinner|breakfast|brunch|coffee|cafe|pizza|"
                   r"taco|tacos|sushi|ramen|pho|boba|wings|burger|burgers|bbq|halal|vegan|vegetarian|bakery|"
                   r"dessert|places to|takeout|delivery|dining|cuisine|kitchen|grill|diner|buffet)\b")
# Words people add that name where they want the answer from, not something
# a page could say: "food near njit reddit". Kept as modifiers (they say what
# the social posts should be) but never reported as missing from a page.
PLATFORMS = {"reddit", "yelp", "tripadvisor", "tiktok", "instagram", "youtube", "google", "maps", "map", "doordash",
             "ubereats", "grubhub", "near", "me"}
MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _whole_period(con, source="gsc"):
    row = con.execute("SELECT period FROM obs WHERE source=? AND period LIKE '%..%' "
                      "ORDER BY period DESC LIMIT 1", (source,)).fetchone()
    return row[0] if row else None


def collect(con):
    """Per-search facts from every source in the database."""
    Q = defaultdict(lambda: {"gsc_pages": Counter(), "engines": set(), "sources": set()})
    whole = _whole_period(con)
    if whole:
        acc = defaultdict(lambda: [0.0, 0.0, 0.0])  # (q, page) -> impr, clicks, position
        for q, page, metric, v in con.execute(
                "SELECT query, page, metric, value FROM obs WHERE source='gsc' AND period=?", (whole,)):
            a = acc[(q, page)]
            a[{"impressions": 0, "clicks": 1, "position": 2}[metric]] = v
        for (q, page), (imp, clk, pos) in acc.items():
            d = Q[q]
            d["gsc_impr"] = d.get("gsc_impr", 0) + imp
            d["gsc_clicks"] = d.get("gsc_clicks", 0) + clk
            d["gsc_posw"] = d.get("gsc_posw", 0) + pos * imp
            d["gsc_pages"][page] += imp
            d.setdefault("gsc_page_pos", {})[page] = pos
            d["sources"].add("gsc")
        for label in ("last28", "prev28"):
            for q, v in con.execute("SELECT query, SUM(value) FROM obs WHERE source='gsc' AND period=? "
                                    "AND metric='impressions' GROUP BY query", (label,)):
                Q[q]["gsc_" + label] = v
    for q, metric, v in con.execute("SELECT query, metric, value FROM obs WHERE source='bing_site' AND query!=''"):
        Q[q]["bing_site_" + metric] = v
        Q[q]["sources"].add("bing_site")
    variants = {q: seed for q, seed in con.execute("SELECT query, seed FROM obs WHERE source='ads_variant'")}
    for q, metric, period, v in con.execute("SELECT query, metric, period, value FROM obs WHERE source='ads'"):
        d = Q[q]
        d["sources"].add("ads")
        if period:
            d.setdefault("ads_months", {})[period] = v
        else:
            d["ads_" + metric] = v
    for q, base in variants.items():
        if "ads_volume" not in Q.get(q, {}) and base in Q and "ads_volume" in Q[base]:
            Q[q]["ads_volume"] = Q[base]["ads_volume"]
            Q[q]["ads_variant_of"] = base
            Q[q]["sources"].add("ads")
    for q, metric, v in con.execute("SELECT query, metric, value FROM obs WHERE source='bing_kw'"):
        Q[q]["bing_" + metric] = v
        Q[q]["sources"].add("bing_kw")
    for src, q, v in con.execute("SELECT source, query, value FROM obs WHERE source LIKE 'suggest:%'"):
        d = Q[q]
        eng = src.split(":", 1)[1]
        d["engines"].add(eng)
        d["suggest_rank"] = min(d.get("suggest_rank", 99), v)
        d["sources"].add("suggest")
    for q, metric, v in con.execute("SELECT query, metric, value FROM obs WHERE source='trends' AND period=''"):
        Q[q]["trends_" + metric] = v
        Q[q]["sources"].add("trends")
    timeline = defaultdict(dict)
    for q, period, v in con.execute("SELECT query, period, value FROM obs WHERE source='trends' AND metric='interest'"):
        timeline[q][period] = v
    for q, series in timeline.items():
        Q[q]["trends_peak"] = _peak_month(series)
        Q[q]["sources"].add("trends")
    for q, d in Q.items():
        if d.get("ads_months"):
            d["peak"] = _peak_month(d["ads_months"])
            vals = list(d["ads_months"].values())
            if max(vals) > 0:
                d["low_vs_peak"] = round(min(vals) / max(vals), 2)
    return Q


def _peak_month(series):
    """The calendar month with the highest average, from 'YYYY-MM[-DD]' keys."""
    by = defaultdict(list)
    for k, v in series.items():
        m = re.match(r"\d{4}-(\d{2})", k)
        if m:
            by[int(m.group(1))].append(v)
    if not by:
        return ""
    best = max(by, key=lambda mo: sum(by[mo]) / len(by[mo]))
    return MONTH_NAMES[best]


def _ctr(d):
    imp = d.get("gsc_impr", 0)
    return d.get("gsc_clicks", 0) / imp if imp else None


def _pos(d):
    imp = d.get("gsc_impr", 0)
    return d["gsc_posw"] / imp if imp else None


def _write(name, header, rows):
    path = os.path.join(OUT, name)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    return path


def _r(x, n=1):
    if x is None:
        return ""
    return int(round(x)) if n == 0 else round(x, n)


def kind_of(path):
    if not path:
        return ""
    if path == "/":
        return "home"
    p = path.strip("/").split("/")
    if p[0] == "campus":
        return "campus-hub" if len(p) == 1 else ("campus-food" if len(p) == 3 else
                                                 ("campus-state" if len(p[1]) == 2 else "campus"))
    if p[0] == "eat":
        return "city-hub" if len(p) == 1 else ("city-state" if len(p[1]) == 2 else "city")
    return p[0]


def run(min_impr=10):
    con = db.connect()
    seeds = load_seeds()
    S = Site(seeds)
    Q = collect(con)
    if not Q:
        raise SystemExit("The database is empty. Pull some data first (suggest, gsc, bing, ads).")
    os.makedirs(OUT, exist_ok=True)

    # Match every search to the site once.
    M = {}
    for q, d in Q.items():
        m = S.match(q)
        d["match"] = m
        d["pattern"] = S.pattern(m)
        d["target"] = S.target(m)
        d["mods"] = S.modifiers(m)
        d["intent"] = S.intent(m)
        d["ranks_on"] = d["gsc_pages"].most_common(1)[0][0] if d["gsc_pages"] else ""
        d["relevant"] = bool(d.get("gsc_impr") or d["target"] or FOODY.search(m["text"]))
        M[q] = m

    # Page facts for the pages that matter most: where we rank, and targets.
    want = Counter()
    for q, d in Q.items():
        weight = d.get("gsc_impr", 0) * 10 + (d.get("ads_volume") or 0) + (d.get("bing_volume") or 0) * 5
        for p in ([d["ranks_on"]] if d["ranks_on"] else []) + ([d["target"]] if d["target"] else []):
            want[p] += weight or 1
    sample = defaultdict(list)
    for p, _ in want.most_common():
        k = kind_of(p)
        if len(sample[k]) < 6:
            sample[k].append(p)
    S.load_pages(con, [p for p, _ in want.most_common(400)] + [p for v in sample.values() for p in v])
    words = {}

    def page_words(p):
        if p not in words:
            words[p] = S.page_words(con, p)
        return words[p]

    for q, d in Q.items():
        page = d["ranks_on"] or d["target"]
        pw = page_words(page) if page else None
        d["missing"] = [w for w in d["mods"] if pw is not None and w not in PLATFORMS
                        and not set(norm(w).split()) <= pw]

    # queries.csv
    rows = []
    for q, d in sorted(Q.items(), key=lambda kv: (-(kv[1].get("gsc_impr") or 0), -(kv[1].get("ads_volume") or 0),
                                                 -(kv[1].get("bing_volume") or 0), kv[1].get("suggest_rank", 99))):
        if not d["relevant"]:
            continue
        rows.append([q, d["intent"], d["pattern"], d["target"], d["ranks_on"], _r(d.get("gsc_impr"), 0),
                     _r(d.get("gsc_clicks"), 0), _r(_ctr(d), 3), _r(_pos(d)), _r(d.get("gsc_last28"), 0),
                     _r(d.get("gsc_prev28"), 0), _r(d.get("bing_site_impressions"), 0), _r(d.get("ads_volume"), 0),
                     _r(d.get("bing_volume"), 0), _r(d.get("ads_competition"), 0), _r(d.get("ads_cpc_high"), 2),
                     d.get("peak", "") or d.get("trends_peak", ""), _r(d.get("low_vs_peak"), 2),
                     ",".join(sorted(d["engines"])), "" if d.get("suggest_rank") is None else int(d["suggest_rank"]),
                     _r(d.get("trends_top"), 0), _r(d.get("trends_rising"), 0), ",".join(sorted(d["sources"])),
                     " | ".join(d["mods"]), " | ".join(d["missing"])])
    _write("queries.csv", ["query", "intent", "pattern", "target_page", "ranks_on", "gsc_impressions", "gsc_clicks",
                           "gsc_ctr", "gsc_position", "gsc_impr_last28", "gsc_impr_prev28", "bing_site_impressions",
                           "google_volume", "bing_volume", "ads_competition", "cpc_high", "peak_month",
                           "low_vs_peak", "suggested_by", "best_suggest_rank", "trends_top", "trends_rising",
                           "sources", "modifiers", "missing_from_page"], rows)
    n_queries = len(rows)

    # patterns.csv
    P = defaultdict(lambda: {"q": [], "campuses": set(), "cities": set(), "foods": set(), "impr": 0, "clicks": 0,
                             "posw": 0.0, "gvol": 0.0, "bvol": 0.0, "sugg": 0, "mods": Counter()})
    for q, d in Q.items():
        if not d["relevant"]:
            continue
        p = P[d["pattern"]]
        p["q"].append(q)
        m = d["match"]
        if m["campus"]:
            p["campuses"].add(m["campus"])
        if m["city"]:
            p["cities"].add(m["city"])
        if m["food"]:
            p["foods"].add(m["food"])
        p["impr"] += d.get("gsc_impr", 0)
        p["clicks"] += d.get("gsc_clicks", 0)
        p["posw"] += d.get("gsc_posw", 0)
        p["gvol"] += d.get("ads_volume") or 0
        p["bvol"] += d.get("bing_volume") or 0
        p["sugg"] += 1 if d["engines"] else 0
        for w in d["mods"]:
            p["mods"][w] += 1
    ranked = sorted(P.items(), key=lambda kv: (-kv[1]["impr"], -kv[1]["gvol"], -len(kv[1]["campuses"]),
                                               -kv[1]["bvol"], -kv[1]["sugg"], kv[0]))
    _write("patterns.csv", ["pattern", "searches", "campuses", "cities", "foods", "gsc_impressions", "gsc_clicks",
                            "gsc_position", "google_volume", "bing_volume", "suggested", "examples"],
           [[pat, len(p["q"]), len(p["campuses"]), len(p["cities"]), len(p["foods"]), _r(p["impr"], 0),
             _r(p["clicks"], 0), _r(p["posw"] / p["impr"]) if p["impr"] else "", _r(p["gvol"], 0), _r(p["bvol"], 0),
             p["sugg"], " | ".join(sorted(p["q"], key=lambda x: -(Q[x].get("gsc_impr") or Q[x].get("ads_volume") or 0))[:3])]
            for pat, p in ranked])

    # pages.csv
    pages = defaultdict(dict)
    whole = _whole_period(con)
    for page, metric, period, v in con.execute(
            "SELECT page, metric, period, value FROM obs WHERE source='gsc_page'"):
        key = "whole" if period == whole else period
        pages[page][f"{key}_{metric}"] = v
    for page, metric, v in con.execute("SELECT page, metric, value FROM obs WHERE source='bing_page'"):
        pages[page]["bing_" + metric] = v
    inspect = {u: (verdict, cov, crawl) for u, verdict, cov, crawl in
               con.execute("SELECT url, verdict, coverage, last_crawl FROM inspect")}
    for u in inspect:
        pages.setdefault(u, {})
    top_q = defaultdict(list)
    for q, d in Q.items():
        for page, imp in d["gsc_pages"].items():
            top_q[page].append((imp, q))
    prow = []
    for page, v in sorted(pages.items(), key=lambda kv: -(kv[1].get("whole_impressions") or 0)):
        imp, clk = v.get("whole_impressions") or 0, v.get("whole_clicks") or 0
        l28, p28 = v.get("last28_impressions"), v.get("prev28_impressions")
        row = con.execute("SELECT title FROM pages WHERE url=?", (page,)).fetchone()
        ins = inspect.get(page, ("", "", ""))
        prow.append([page, kind_of(page), row[0] if row else "", _r(imp, 0), _r(clk, 0),
                     _r(clk / imp, 3) if imp else "", _r(v.get("whole_position")), _r(l28, 0), _r(p28, 0),
                     _r((l28 - p28) / p28, 2) if l28 is not None and p28 else "", _r(v.get("bing_impressions"), 0),
                     ins[0] or "", ins[1] or "", ins[2] or "",
                     " | ".join(q for _, q in sorted(top_q[page], reverse=True)[:3])])
    _write("pages.csv", ["page", "kind", "title", "gsc_impressions", "gsc_clicks", "gsc_ctr", "gsc_position",
                         "impr_last28", "impr_prev28", "change", "bing_impressions", "index_verdict", "coverage",
                         "last_crawl", "top_searches"], prow)

    # opportunities.csv: the rules, in order of how directly the data says it.
    opp = []
    for q, d in Q.items():
        imp, pos, ctr = d.get("gsc_impr", 0), _pos(d), _ctr(d)
        page = d["ranks_on"]
        if imp >= min_impr and pos is not None:
            miss = ", ".join(d["missing"])
            if pos <= 3 and ctr is not None and ctr < 0.15:
                opp.append(("A", "Rewrite title and description: ranks top 3, few clicks", q, page, imp, d, miss))
            elif pos <= 10:
                opp.append(("A", f"Add to title/H1: {miss}" if miss else "Page one: strengthen with internal links",
                            q, page, imp, d, miss))
            elif pos <= 20:
                opp.append(("A", f"Close to page one; add: {miss}" if miss else "Close to page one: link it from hubs",
                            q, page, imp, d, miss))
            else:
                opp.append(("C", "Ranks past page two: needs links from other sites", q, page, imp, d, miss))
            if d["target"] and page and d["target"] != page and kind_of(d["target"]) != "home":
                opp.append(("B", f"Google shows {page} but {d['target']} is the better match: link it in", q,
                            d["target"], imp, d, ""))
        elif not imp and d["target"] and ((d.get("ads_volume") or 0) >= 50 or (d.get("bing_volume") or 0) >= 10):
            opp.append(("B", "Demand, page exists, not showing in Google: check indexing and wording", q, d["target"],
                        0, d, ", ".join(d["missing"])))
    order = {"A": 0, "B": 1, "C": 2}
    opp.sort(key=lambda o: (order[o[0]], -o[4], -(o[5].get("ads_volume") or 0)))
    _write("opportunities.csv", ["priority", "action", "query", "page", "gsc_impressions", "gsc_clicks", "gsc_position",
                                 "google_volume", "bing_volume", "missing_words"],
           [[o[0], o[1], o[2], o[3], _r(o[4], 0), _r(o[5].get("gsc_clicks"), 0), _r(_pos(o[5])),
             _r(o[5].get("ads_volume"), 0), _r(o[5].get("bing_volume"), 0), o[6]] for o in opp])

    # template-gaps.csv: modifiers a page type gets searched with but never says.
    gaps = []
    for pat, p in ranked:
        kind = ("campus-food" if "{campus}" in pat and "{food}" in pat else "campus" if "{campus}" in pat
                else "city" if "{city}" in pat else "food" if "{food}" in pat else "")
        spread = len(p["campuses"]) or len(p["cities"]) or len(p["foods"])
        if not kind or spread < 3:
            continue
        tw = set()
        for s in sample.get(kind, []):
            tw |= page_words(s) or set()
        if not tw:
            continue
        missing = [w for w, _ in p["mods"].most_common() if w not in PLATFORMS and not set(norm(w).split()) <= tw]
        if missing:
            gaps.append([pat, kind, spread, _r(p["impr"], 0), _r(p["gvol"], 0), _r(p["bvol"], 0), p["sugg"],
                         ", ".join(missing[:6]), " | ".join(p["q"][:3])])
    _write("template-gaps.csv", ["pattern", "page_type", "places", "gsc_impressions", "google_volume", "bing_volume",
                                 "suggested", "words_the_template_lacks", "examples"], gaps)

    # new-pages.csv: campus x food searches with no campus x food page, and
    # what people add that no page covers.
    cand = defaultdict(lambda: {"q": [], "impr": 0, "gvol": 0.0, "bvol": 0.0, "sugg": 0})
    for q, d in Q.items():
        m = d["match"]
        if m["campus"] and m["food"] and m["food_word"] and f"{m['campus']}/{m['food']}" not in S.niche:
            c = cand[f"/campus/{m['campus']}/{m['food']}"]
        elif m["city"] and m["food"]:
            c = cand[f"(new type) /eat/{m['city']}/{m['food']}"]
        else:
            continue
        c["q"].append(q)
        c["impr"] += d.get("gsc_impr", 0)
        c["gvol"] += d.get("ads_volume") or 0
        c["bvol"] += d.get("bing_volume") or 0
        c["sugg"] += 1 if d["engines"] else 0
    newp = sorted(cand.items(), key=lambda kv: (-kv[1]["impr"], -kv[1]["gvol"], -kv[1]["bvol"], -kv[1]["sugg"]))
    _write("new-pages.csv", ["candidate_page", "searches", "gsc_impressions", "google_volume", "bing_volume",
                             "suggested", "examples"],
           [[u, len(c["q"]), _r(c["impr"], 0), _r(c["gvol"], 0), _r(c["bvol"], 0), c["sugg"], " | ".join(c["q"][:3])]
            for u, c in newp])

    # cannibalization.csv
    can = []
    for q, d in Q.items():
        tot = d.get("gsc_impr", 0)
        if tot < min_impr:
            continue
        split = [(p, i) for p, i in d["gsc_pages"].items() if i >= 0.2 * tot]
        if len(split) >= 2:
            can.append([q, _r(tot, 0)] + [" | ".join(f"{p} ({int(i)}, pos {_r(d['gsc_page_pos'].get(p))})"
                                                    for p, i in sorted(split, key=lambda x: -x[1]))])
    can.sort(key=lambda r: -float(r[1] or 0))
    _write("cannibalization.csv", ["query", "gsc_impressions", "pages"], can)

    # Reddit
    rq = con.execute("SELECT query, value, seed FROM obs WHERE source='reddit' ORDER BY value DESC").fetchall()
    if rq:
        _write("reddit-questions.csv", ["title", "score", "campus"], rq)
    rp = con.execute("SELECT a.query, a.value, b.value FROM obs a JOIN obs b ON a.query=b.query AND "
                     "b.source='reddit_phrase' AND b.metric='mentions' WHERE a.source='reddit_phrase' AND "
                     "a.metric='campuses' ORDER BY a.value DESC, b.value DESC").fetchall()
    if rp:
        _write("reddit-phrases.csv", ["phrase", "campuses", "mentions"], rp)

    _report(con, Q, ranked, opp, gaps, newp, can, prow, rq, rp)
    log(f"{n_queries} searches, {len(P)} patterns, {len(opp)} opportunities, {len(gaps)} template gaps, "
        f"{len(newp)} new-page candidates, {len(can)} split searches -> {OUT}")
    return Q, S


# -- report -------------------------------------------------------------------

def _table(header, rows, limit=60):
    if not rows:
        return "<p class='none'>Nothing here yet: pull the sources this section needs.</p>"
    head = "".join(f"<th>{html.escape(str(h))}</th>" for h in header)
    body = "".join("<tr>" + "".join(f"<td>{html.escape(str(c))}</td>" for c in r) + "</tr>" for r in rows[:limit])
    more = f"<p class='none'>{len(rows) - limit} more in the CSV.</p>" if len(rows) > limit else ""
    return f"<div class='scroll'><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>{more}"


def _report(con, Q, ranked, opp, gaps, newp, can, prow, rq, rp):
    counts = dict(con.execute("SELECT source, COUNT(DISTINCT query || '|' || page) FROM obs GROUP BY source").fetchall())
    runs = con.execute("SELECT source, MAX(finished) FROM runs GROUP BY source").fetchall()
    cards = "".join(f"<div class='card'><b>{counts[k]:,}</b><span>{html.escape(k)}</span></div>" for k in sorted(counts))
    runs_html = ", ".join(f"{html.escape(s)} {html.escape(t[:10])}" for s, t in runs)
    sections = [
        ("What to change first", "Every row is one search. A: Search Console shows us already ranking. "
         "B: the data says a page is missing out. C: needs links from other sites.",
         _table(["", "action", "search", "page", "impr.", "clicks", "pos.", "Google vol.", "Bing vol."],
                [[o[0], o[1], o[2], o[3], _r(o[4], 0), _r(o[5].get("gsc_clicks"), 0), _r(_pos(o[5])),
                  _r(o[5].get("ads_volume"), 0), _r(o[5].get("bing_volume"), 0)] for o in opp])),
        ("How people phrase it", "Searches with the campus, city and food swapped out.",
         _table(["pattern", "searches", "campuses", "impr.", "clicks", "Google vol.", "Bing vol.", "suggested", "examples"],
                [[pat, len(p["q"]), len(p["campuses"]), _r(p["impr"], 0), _r(p["clicks"], 0), _r(p["gvol"], 0),
                  _r(p["bvol"], 0), p["sugg"], " | ".join(p["q"][:2])] for pat, p in ranked])),
        ("Words the templates never use", "Searched with three or more campuses, cities or foods, and absent "
         "from that page type's title and headings.", _table(
             ["pattern", "page type", "places", "impr.", "Google vol.", "Bing vol.", "suggested", "missing", "examples"], gaps)),
        ("Pages to consider building", "Searches with no page made for them.", _table(
            ["page", "searches", "impr.", "Google vol.", "Bing vol.", "suggested", "examples"],
            [[u, len(c["q"]), _r(c["impr"], 0), _r(c["gvol"], 0), _r(c["bvol"], 0), c["sugg"], " | ".join(c["q"][:2])]
             for u, c in newp])),
        ("Our pages", "Search Console totals per page (they include searches too rare for Google to list), "
         "with the last 28 days against the 28 before, and Google's index status where inspected.",
         _table(["page", "type", "title", "impr.", "clicks", "CTR", "pos.", "last 28", "prev 28", "change", "Bing",
                 "verdict", "coverage", "last crawl", "top searches"], prow)),
        ("Searches split across pages", "Google is choosing between two of our pages for these.",
         _table(["search", "impr.", "pages"], can)),
        ("Students on Reddit", "Food questions from campus subreddits, most upvoted first.",
         _table(["title", "score", "campus"], rq)),
        ("Phrases that recur across campuses", "From the same threads.", _table(["phrase", "campuses", "mentions"], rp)),
    ]
    body = "".join(f"<section><h2>{html.escape(t)}</h2><p class='note'>{html.escape(n)}</p>{tbl}</section>"
                   for t, n, tbl in sections)
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Keyword report</title><style>
:root{{--bg:#fbfaf7;--ink:#1d1a16;--mid:#5f5a52;--line:#e4dfd6;--card:#fff;--accent:#8a3ffc}}
@media (prefers-color-scheme:dark){{:root{{--bg:#121014;--ink:#f1ede6;--mid:#a59f96;--line:#2c2830;--card:#1b181e;--accent:#b18cff}}}}
body{{background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,sans-serif;margin:0;padding:24px 16px}}
main{{max-width:1200px;margin:0 auto}}h1{{font-size:24px;margin:0 0 4px}}h2{{font-size:18px;margin:32px 0 4px}}
.note,.none{{color:var(--mid);margin:0 0 10px}}.cards{{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px}}
.card b{{display:block;font-size:18px}}.card span{{color:var(--mid);font-size:12px}}
.scroll{{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--card)}}
table{{border-collapse:collapse;width:100%}}th,td{{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{font-size:12px;color:var(--mid);font-weight:600;white-space:nowrap}}td{{font-variant-numeric:tabular-nums}}
</style></head><body><main><h1>Keyword report</h1><p class="note">Last pulls: {runs_html or "none"}.
Every number is what a source reported; nothing is estimated.</p><div class="cards">{cards}</div>{body}</main></body></html>"""
    with open(os.path.join(OUT, "report.html"), "w", encoding="utf-8") as f:
        f.write(page)


# -- export -------------------------------------------------------------------

def export(min_impr=1):
    """scripts/data/search-terms.json: what the page generators use.

    Only Search Console searches, the ones Google already ties to a page, and
    only the parts a generator can act on without guessing: the searches a
    page is shown for, the name students use for a campus in them, and the
    words they add."""
    con = db.connect()
    S = Site(load_seeds())
    Q = collect(con)
    whole = _whole_period(con)
    if not whole:
        raise SystemExit("No Search Console data to export. Run `keywords.py gsc` first.")
    pages = defaultdict(lambda: {"q": [], "names": Counter(), "mods": Counter()})
    for q, d in Q.items():
        if not d.get("gsc_impr"):
            continue
        m = S.match(q)
        mods = S.modifiers(m)
        for page, imp in d["gsc_pages"].items():
            if imp < min_impr:
                continue
            p = pages[page]
            p["q"].append([q, int(imp), d.get("gsc_page_pos", {}).get(page)])
            if m["campus"] and page.startswith(f"/campus/{m['campus']}"):
                p["names"][m["campus_name"]] += imp
            for w in mods:
                p["mods"][w] += imp
    out = {
        "asOf": whole.split("..")[1], "window": whole,
        "_note": "Written by scripts/research/keywords.py export from Search Console. Re-export to refresh; "
                 "the generators read it if it is here and behave as before if it is not.",
        "pages": {},
        "patterns": [],
    }
    for page, p in sorted(pages.items()):
        qs = sorted(p["q"], key=lambda r: -r[1])[:10]
        out["pages"][page] = {
            "q": [[q, imp, round(pos, 1) if pos else None] for q, imp, pos in qs],
            "names": [[n, int(v)] for n, v in p["names"].most_common(5)],
            "mods": [[w, int(v)] for w, v in p["mods"].most_common(8)],
        }
    # Page totals, which include the searches too rare for Google to list.
    out["totals"] = {}
    for page, metric, v in con.execute("SELECT page, metric, value FROM obs WHERE source='gsc_page' AND period=?",
                                       (whole,)):
        out["totals"].setdefault(page, [0, 0, None])[["impressions", "clicks", "position"].index(metric)] = \
            round(v, 1) if metric == "position" else int(v)
    pat = Counter()
    for q, d in Q.items():
        if d.get("gsc_impr"):
            pat[S.pattern(S.match(q))] += d["gsc_impr"]
    out["patterns"] = [[p, int(v)] for p, v in pat.most_common(80)]
    # One page per line, so a refresh reads as a diff of the pages that changed.
    with open(EXPORT_FILE, "w", encoding="utf-8") as f:
        f.write("{\n")
        for k in ("asOf", "window", "_note"):
            f.write(f" {json.dumps(k)}: {json.dumps(out[k])},\n")
        f.write(' "pages": {\n')
        items = list(out["pages"].items())
        for i, (page, v) in enumerate(items):
            f.write(f"  {json.dumps(page)}: {json.dumps(v, ensure_ascii=False)}{',' if i < len(items) - 1 else ''}\n")
        f.write(" },\n")
        f.write(f' "totals": {json.dumps(out["totals"])},\n')
        f.write(f' "patterns": {json.dumps(out["patterns"], ensure_ascii=False)}\n}}\n')
    log(f"Exported {len(out['pages'])} pages and {len(out['patterns'])} patterns -> {EXPORT_FILE}")
