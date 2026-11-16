#!/usr/bin/env python3
"""Link outreach: 10 personal emails a day asking for a mention, never the same person twice.

    python outreach/outreach.py status
    python outreach/outreach.py next [10]         the next targets nobody has emailed, with their real numbers
    python outreach/outreach.py draft <slug> [--title T --author A --detail D --url U --name N]
                                                  the email for one target (with or without an article to mention)
    python outreach/outreach.py log <slug|-> <email> <subject>     record a sent email (do this right after sending)
    python outreach/outreach.py seen <email>      exit 0 if this address was already emailed

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
    rows = [p for p in pitches() if p.get("email") and sha(p["email"]) not in done]
    rows.sort(key=lambda p: (p.get("unconfirmed", False), p.get("tier", 9), min((r["rank"] for r in p["rankings"]), default=99)))
    return rows[:n]


def fact(p):
    """One true, punchy sentence about the school, and the links that back it."""
    r = min(p["rankings"], key=lambda r: r["rank"])
    place = {1: "first", 2: "second", 3: "third"}.get(r["rank"], f"{r['rank']}th")
    line = (f"{p['school']} comes out {place} of the {r['n']} {r['group']} schools, with {r['w']} places to eat within a 10-minute walk of campus"
            if r["rank"] <= 3 else
            f"{p['school']} has {r['w']} places to eat within a 10-minute walk of campus, which puts it {place} of the {r['n']} {r['group']} schools")
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
            f"within a 10-minute walk of all {r['n']} {r['group']} campuses, using open map data, and found that {line}.\n\n"
            f"The full breakdown is here:\n{ranking}\n\nAnd every place near {p['school']}:\n{campus}\n\n{ask}\n\nBest,\n{SIGN}")
    return subject, body


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
    elif a[0] == "seen" and len(a) > 1:
        sys.exit(0 if seen(a[1]) else 1)
    else:
        sys.exit(__doc__)
