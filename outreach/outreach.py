#!/usr/bin/env python3
"""Link outreach: 10 personal emails a day asking for a mention, never the same person twice.

    python outreach/outreach.py status
    python outreach/outreach.py next [10]         the next targets nobody has emailed, with their real numbers
    python outreach/outreach.py draft <slug> [--title T --author A --detail D --url U --name N]
                                                  the email for one target (with or without an article to mention)
    python outreach/outreach.py log <slug|-> <email> <subject>     record a sent email (do this right after sending)
    python outreach/outreach.py seen <email>      exit 0 if this address was already emailed
    python outreach/outreach.py req-seen "<outlet>" "<question>"    exit 0 if this journalist request was already handled
    python outreach/outreach.py req-log <platform> "<outlet>" "<question>" <pitched|skipped|drafted> ["note"]
    python outreach/outreach.py req-list          every journalist request handled so far
    python outreach/outreach.py page-seen <campus-slug>             exit 0 if any page at this school was already pitched or skipped
    python outreach/outreach.py page-log <campus-slug> <page-url> <sent|skipped|replied|linked|declined> ["note"]
    python outreach/outreach.py page-list         every college resource page handled so far, with counts
    python outreach/outreach.py jour-seen "<name>" "<outlet>"       exit 0 if this journalist was already pitched or skipped
    python outreach/outreach.py jour-log "<name>" "<outlet>" <article-url|-> <sent|skipped|replied|linked|declined> ["note"]
    python outreach/outreach.py jour-list         every journalist handled so far, with counts

PIPELINE.md has the daily routine and the rules. The sent log (outreach/sent.jsonl) is the memory:
an address in it is never emailed again. Gmail's Sent folder is checked too, in case the log is
behind (`in:sent to:<address>`)."""

import datetime as dt
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SENT = os.path.join(HERE, "sent.jsonl")
JOURS = os.path.join(HERE, "journalists.jsonl")   # journalists pitched: name, outlet, article, status. Never an address
PAGES = os.path.join(HERE, "pages.jsonl")    # college resource pages: school, page, status. Never an address (those live in sent.jsonl as hashes)
REQS = os.path.join(HERE, "requests.jsonl")      # journalist requests (Featured/HARO/Connectively/Qwoted): one answer each, ever
SIGN = "Charan Nukathoti (Savor Scout founder)\nsavorscout.net"


def sha(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()[:16]


def sent():
    return [json.loads(l) for l in open(SENT)] if os.path.exists(SENT) else []


def seen(email):
    return sha(email) in {r["to"] for r in sent()}


def pitches():
    """Every ranked school's paper with its real numbers and links (built by make-pitches.js)."""
    out = os.path.join("/tmp", "savorscout-pitches.json")
    subprocess.run(["node", os.path.join(HERE, "make-pitches.js"), ROOT, os.path.join(HERE, "contacts.jsonl"), out], check=True, capture_output=True)
    return json.load(open(out))


def targets(n):
    done = {r["to"] for r in sent()}
    rows = [p for p in pitches() if p.get("email") and p.get("rankings") and sha(p["email"]) not in done]
    rows.sort(key=lambda p: (p.get("unconfirmed", False), p.get("tier", 9), min((r["rank"] for r in p["rankings"]), default=99)))
    return rows[:n]


GROUPS = None


def groups():
    """How each ranking is said in a sentence, from scripts/data/rankings.js: a state ranking
    (`big`) covers only that state's universities with 20,000+ students, so it is never "all
    Texas campuses" but "the 13 big Texas universities"."""
    global GROUPS
    if GROUPS is None:
        js = "console.log(JSON.stringify(require(process.argv[1]).map(g => ({s: g.s, big: !!g.big}))))"
        out = subprocess.run(["node", "-e", js, os.path.join(ROOT, "scripts", "data", "rankings.js")], capture_output=True, text=True, check=True).stdout
        GROUPS = {g["s"]: g for g in json.loads(out)}
    return GROUPS


def ordinal(n):
    return {1: "first", 2: "second", 3: "third"}.get(n) or f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def scope(r):
    """("all 18 Big Ten campuses", "of the 18 Big Ten schools") or, for a state, ("the 13 big Texas
    universities", "of the 13")."""
    if groups().get(r["s"], {}).get("big"):
        return f"the {r['n']} big {r['group']} universities", f"of the {r['n']}"
    return f"all {r['n']} {r['group']} campuses", f"of the {r['n']} {r['group']} schools"


def fact(p):
    """One true, punchy sentence about the school, and the links that back it."""
    r = min(p["rankings"], key=lambda r: r["rank"])
    of = scope(r)[1]
    if r["rank"] <= 3:
        line = f"{p['school']} comes out {ordinal(r['rank'])} {of}, with {r['w']} places to eat within a 10-minute walk of campus"
    elif r["rank"] == r["n"]:
        line = f"{p['school']} has {r['w']} places to eat within a 10-minute walk of campus, the fewest {of}"
    else:
        line = f"{p['school']} has {r['w']} places to eat within a 10-minute walk of campus, which puts it {ordinal(r['rank'])} {of}"
    return line, f"https://www.savorscout.net/rankings/{r['s']}", f"https://www.savorscout.net/campus/{p['slug']}", r


def draft(p, title=None, author=None, detail=None, url=None, name=None):
    line, ranking, campus, r = fact(p)
    hello = f"Hi {name}," if name else f"Hi {p['paper'].removeprefix('The ')} team,"
    if title and detail:                       # only when a real article was found and read
        subject = f"Quick question about your \"{title}\" piece"
        opener = (f"Really enjoyed {author + chr(39) + 's' if author else 'your'} piece \"{title}\", especially {detail}.\n\n"
                  f"It got me wondering how {p['school']} compares on the basics, and I had the numbers to check.")
        ask = (f"Would you be open to adding a link to it in that piece, or the next time you write about eating near campus? "
               f"It would give your readers something they can check for themselves.")
    else:
        subject = f"A number for your food coverage: {r['w']} places to eat within a 10-minute walk of {p['school']}"
        opener = f"I'm writing because {p['paper']} covers student life at {p['school']}, and I have a number about it you may not have seen."
        ask = (f"Would you be open to mentioning it, with a link, the next time you write about eating near campus? "
               f"You're welcome to use the numbers, and I'm glad to share the data behind them.")
    body = (f"{hello}\n\n{opener}\n\n"
            f"I run Savor Scout, a free site that maps places to eat near campuses. We just finished counting every place to eat "
            f"within a 10-minute walk of {scope(r)[0]}, using open map data, and found that {line}.\n\n"
            f"The full breakdown is here:\n{ranking}\n\nAnd every place near {p['school']}:\n{campus}\n\n{ask}\n\nBest,\n{SIGN}")
    return subject, body


def req_id(outlet, question):
    """The same request seen twice (or reposted with small edits) gets the same id: outlet + the first
    12 words of the question, lowercased, punctuation stripped."""
    import re
    words = re.findall(r"[a-z0-9]+", question.lower())[:12]
    return hashlib.sha256((outlet.strip().lower() + "|" + " ".join(words)).encode()).hexdigest()[:16]


def reqs():
    return [json.loads(l) for l in open(REQS)] if os.path.exists(REQS) else []


if __name__ == "__main__":
    a = sys.argv[1:]
    opt = lambda k: a[a.index(k) + 1] if k in a else None
    if not a or a[0] == "status":
        rows = sent()
        today = dt.date.today().isoformat()
        print(f"{len(rows)} emails sent in all, {sum(1 for r in rows if r['date'] == today)} today; {len(targets(999))} newspapers with an address not yet emailed")
    elif a[0] == "next":
        for p in targets(int(a[1]) if len(a) > 1 else 10):
            print(json.dumps({"slug": p["slug"], "school": p["school"], "paper": p["paper"], "site": p["site"], "email": p["email"],
                              "unconfirmed": p.get("unconfirmed", False), "fact": fact(p)[0]}, ensure_ascii=False))
    elif a[0] == "draft" and len(a) > 1:
        p = next((x for x in pitches() if x["slug"] == a[1]), None) or sys.exit("no such school in contacts.jsonl")
        if seen(p["email"]):
            sys.exit(f"already emailed {p['paper']}: not drafting a second one")
        s, b = draft(p, opt("--title"), opt("--author"), opt("--detail"), opt("--url"), opt("--name"))
        print(json.dumps({"to": p["email"], "subject": s, "body": b}, ensure_ascii=False, indent=1))
    elif a[0] == "log" and len(a) > 3:
        if seen(a[2]):
            sys.exit("already in the log")
        public = any(json.loads(l).get("email", "").lower() == a[2].lower() for l in open(os.path.join(HERE, "contacts.jsonl")))
        with open(SENT, "a") as f:             # a newsroom's public address is kept readable; a person's is kept only as a hash
            f.write(json.dumps({"date": dt.date.today().isoformat(), "to": sha(a[2]), "address": a[2] if public else None,
                                "slug": None if a[1] == "-" else a[1], "subject": a[3]}, ensure_ascii=False) + "\n")
    elif a[0] == "req-seen" and len(a) > 2:
        hit = [r for r in reqs() if r["id"] == req_id(a[1], a[2])]
        print(json.dumps(hit[-1]) if hit else "new")
        sys.exit(0 if hit else 1)
    elif a[0] == "req-log" and len(a) > 4:
        i = req_id(a[2], a[3])
        if any(r["id"] == i and r["status"] == "pitched" for r in reqs()):
            sys.exit("already pitched: not logging a second answer")
        with open(REQS, "a") as f:
            f.write(json.dumps({"date": dt.date.today().isoformat(), "id": i, "platform": a[1], "outlet": a[2],
                                "question": a[3][:200], "status": a[4], "note": a[5] if len(a) > 5 else ""}, ensure_ascii=False) + "\n")
    elif a[0] == "page-seen" and len(a) > 1:
        rows = [json.loads(l) for l in open(PAGES)] if os.path.exists(PAGES) else []
        hit = [r for r in rows if r["slug"] == a[1]]
        print(json.dumps(hit[-1]) if hit else "new")
        sys.exit(0 if hit else 1)
    elif a[0] == "page-log" and len(a) > 3:
        if a[3] not in ("sent", "skipped", "replied", "linked", "declined"):
            sys.exit("status must be sent, skipped, replied, linked or declined")
        with open(PAGES, "a") as f:
            f.write(json.dumps({"date": dt.date.today().isoformat(), "slug": a[1], "url": a[2], "status": a[3],
                                "note": a[4] if len(a) > 4 else ""}, ensure_ascii=False) + "\n")
    elif a[0] == "page-list":
        rows = [json.loads(l) for l in open(PAGES)] if os.path.exists(PAGES) else []
        for r in rows:
            print(f"{r['date']}  {r['status']:8} {r['slug'][:40]:40} {r['url'][:70]}")
        from collections import Counter
        c = Counter(r["status"] for r in rows)
        print(f"{len({r['slug'] for r in rows})} schools; " + ", ".join(f"{k} {v}" for k, v in c.items()))
    elif a[0] in ("jour-seen", "jour-log", "jour-list"):
        rows = [json.loads(l) for l in open(JOURS)] if os.path.exists(JOURS) else []
        key = lambda n, o: (" ".join(n.lower().split()), " ".join(o.lower().replace("the ", "").split()))
        if a[0] == "jour-seen" and len(a) > 2:
            hit = [r for r in rows if key(r["name"], r["outlet"]) == key(a[1], a[2]) or (r["name"].lower() == a[1].lower())]
            print(json.dumps(hit[-1]) if hit else "new")
            sys.exit(0 if hit else 1)
        elif a[0] == "jour-log" and len(a) > 4:
            if a[4] not in ("sent", "skipped", "replied", "linked", "declined"):
                sys.exit("status must be sent, skipped, replied, linked or declined")
            with open(JOURS, "a") as f:
                f.write(json.dumps({"date": dt.date.today().isoformat(), "name": a[1], "outlet": a[2], "article": a[3],
                                    "status": a[4], "note": a[5] if len(a) > 5 else ""}, ensure_ascii=False) + "\n")
        elif a[0] == "jour-list":
            for r in rows:
                print(f"{r['date']}  {r['status']:8} {r['name'][:28]:28} {r['outlet'][:30]:30} {r['note'][:50]}")
            from collections import Counter
            c = Counter(r["status"] for r in rows)
            print(f"{len(rows)} entries; " + ", ".join(f"{k} {v}" for k, v in c.items()))
        else:
            sys.exit(__doc__)
    elif a[0] == "req-list":
        for r in reqs():
            print(f"{r['date']}  {r['status']:8} {r['platform']:12} {r['outlet']:30} {r['question'][:70]}")
    elif a[0] == "seen" and len(a) > 1:
        sys.exit(0 if seen(a[1]) else 1)
    else:
        sys.exit(__doc__)
