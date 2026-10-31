"""The daily batch: pick, build, render, host and schedule SavorScout's posts.

    python social/pipeline/make_batch.py               # today's batch, scheduled in Buffer
    python social/pipeline/make_batch.py --dry-run     # build and render only, nothing posted
    python social/pipeline/make_batch.py --date 2026-11-02 --force

Each run makes, for one day (social/config.json sets the times):
  * 4 TikTok videos, each one campus x food page: the 5 closest places on foot
  * 4 X posts and 4 Threads posts: 3 built from those pages, with the share
    card and the page link in a reply, and 1 conversation question

Environment: BUFFER_API_KEY and PEXELS_API_KEY (repository secrets in GitHub
Actions; injected by the proxy in a Claude cloud session), GITHUB_TOKEN and
GITHUB_REPOSITORY (set by Actions) for the media branch, REMOTION_BROWSER to
use an installed Chrome instead of Remotion's download.
"""
import argparse, datetime as dt, json, os, random, shutil, subprocess, sys, threading, traceback
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audio, buffer, card, clips, host, mapdata, posts, props  # noqa: E402

SOCIAL = os.path.dirname(HERE)
ROOT = os.path.dirname(SOCIAL)
VIDEO = os.path.join(SOCIAL, "video")
CONFIG = json.load(open(os.path.join(SOCIAL, "config.json")))
TZ = ZoneInfo(CONFIG["timezone"])


CLIP_LOCK = threading.Lock()   # two videos build at once; they must not pick the same clip


def log(*a):
    print(*a, flush=True)


def load_combos():
    out = subprocess.check_output(["node", os.path.join(HERE, "combos.js")], cwd=ROOT)
    return json.loads(out)


def pick(combos, history, n, date):
    """n pairs not yet run: distinct campuses, none shown in the past week, and
    distinct foods and states, relaxing those last rules only when it must."""
    used = set(history.get("combos", []))
    pool = [c for c in combos if c["id"] not in used]
    if len(pool) < n:                      # every pair has run once: start the next round
        history["round"] = history.get("round", 1) + 1
        history["combos"] = []
        pool = list(combos)
    today = dt.date.fromisoformat(date)
    recent = {cid.split("--")[0] for day, rec in history.get("days", {}).items()
              if 0 < (today - dt.date.fromisoformat(day)).days <= 7 for cid in rec.get("combos", [])}
    chosen = []
    for strict in (3, 2, 1, 0):
        for c in pool:
            if len(chosen) == n:
                break
            if c in chosen or any(x["campus"]["slug"] == c["campus"]["slug"] for x in chosen):
                continue
            if strict >= 1 and c["campus"]["slug"] in recent:
                continue
            if strict >= 2 and any(x["food"] == c["food"] for x in chosen):
                continue
            if strict >= 3 and any(x["campus"]["region"] == c["campus"]["region"] for x in chosen):
                continue
            chosen.append(c)
    return chosen, pool


def spots_for(c, rnd):
    """Round 1 shows the five closest; later rounds the next five, when the page has them."""
    k = 5 * (rnd - 1)
    return c["spots"][k:k + 5] if len(c["spots"]) >= k + 5 else c["spots"][:5]


def build_one(c, date, rnd, seed, used_clips, work, public_rel):
    job = {**c, "spots": spots_for(c, rnd)}
    d = os.path.join(work, c["id"])
    os.makedirs(d, exist_ok=True)
    meta = mapdata.build(job, os.path.join(d, "map"))
    pub = os.path.join(VIDEO, "public", public_rel, c["id"])
    os.makedirs(pub, exist_ok=True)
    shutil.copy(os.path.join(d, "map", "map.png"), os.path.join(pub, "map.png"))
    rng = random.Random(seed)
    keys = [c["food"]] + [s["category"] if clips.queries_for(s["category"]) is not clips.FALLBACK else c["food"]
                          for s in meta["spots"]]
    clip_meta, clip_srcs = [], []
    for k, key in enumerate(keys):
        with CLIP_LOCK:
            cm = clips.pick(key, used_clips, 4.0, rng)
            used_clips.add(cm["id"])
        clips.prepare(cm, os.path.join(pub, f"clip{k}.mp4"), 4.0, os.path.join(work, "pexels-cache"))
        clip_meta.append(cm)
        clip_srcs.append(f"{public_rel}/{c['id']}/clip{k}.mp4")
    audio.write(os.path.join(pub, "audio.wav"), props.TIMING, len(meta["spots"]), seed)
    pr = props.build(job, meta, f"{public_rel}/{c['id']}/map.png", clip_srcs, f"{public_rel}/{c['id']}/audio.wav")
    card.build(pr, os.path.join(d, "map", "map.png"), os.path.join(d, "card.jpg"))
    return {"combo": c, "props": pr, "clips": clip_meta, "card": os.path.join(d, "card.jpg"),
            "video": os.path.join(d, "video.mp4"), "spots": meta["spots"]}


def slot(date, hhmm, rng):
    """A posting time in the configured zone, nudged a few minutes so days don't look clockwork."""
    h, m = map(int, hhmm.split(":"))
    t = dt.datetime.combine(dt.date.fromisoformat(date), dt.time(h, m), TZ)
    t += dt.timedelta(minutes=rng.randint(-CONFIG["jitter_minutes"], CONFIG["jitter_minutes"]))
    earliest = dt.datetime.now(TZ) + dt.timedelta(minutes=20)
    return max(t, earliest)


def combo_facts(c):
    return {**c, "short": c["campus"]["short"], "city": c["campus"]["city"],
            "headNoun": props.head_noun(c)}


def plan_posts(built, date, seed, history):
    """Everything to schedule, as plain dicts (also what history.json keeps)."""
    rng = random.Random(seed * 31 + 7)
    plan = []
    for i, b in enumerate(built):
        c = combo_facts(b["combo"])
        plan.append({"service": "tiktok", "at": slot(date, CONFIG["slots"]["tiktok"][i], rng).isoformat(),
                     "text": posts.tiktok_caption(c, b["spots"], seed + i), "video": b["combo"]["id"]})
    asked = history.get("questions", [])
    for service, offset in (("twitter", 0), ("threads", 2)):
        times = CONFIG["slots"][service]
        skip = (seed + offset) % len(built) if len(built) > 3 else None
        chosen = [b for j, b in enumerate(built) if j != skip][:3]
        for i, b in enumerate(chosen):
            c = combo_facts(b["combo"])
            entry = {"service": service, "at": slot(date, times[i], rng).isoformat(), "card": b["combo"]["id"]}
            if service == "twitter":
                entry["thread"] = posts.x_thread(c, b["spots"], seed + i)
            else:
                entry["thread"], entry["topic"] = posts.threads_thread(c, b["spots"], seed + i)
            plan.append(entry)
        q = posts.question(seed + offset, asked)
        asked = asked + [q]
        entry = {"service": service, "at": slot(date, times[3], rng).isoformat(), "card": None, "thread": [q]}
        if service == "threads":
            entry["topic"] = "College Food"
        plan.append(entry)
    return plan


def schedule(plan, urls, draft):
    chans = buffer.channels()
    done = []
    for p in plan:
        ch = chans.get(p["service"])
        if not ch:
            log(f"  no connected {p['service']} channel in Buffer; skipped")
            continue
        when = dt.datetime.fromisoformat(p["at"])
        if p["service"] == "tiktok":
            res = buffer.create(ch["id"], p["text"], when, [buffer.video(urls[p["video"] + ".mp4"], 1300)], draft=draft)
        else:
            items = [{"text": t, "assets": []} for t in p["thread"]]
            if p.get("card"):
                items[0]["assets"] = [buffer.image(urls[p["card"] + ".jpg"])]
            meta = {"thread": items}
            if p["service"] == "threads" and p.get("topic"):
                meta["topic"] = p["topic"]
            res = buffer.create(ch["id"], p["thread"][0], when, items[0]["assets"], {p["service"]: meta}, draft=draft)
        done.append({**p, "post_id": res["id"], "status": res.get("status")})
        log(f"  {p['service']:8} {when:%a %H:%M %Z}  {res['id']}")
    return done


def remote_and_slug():
    if os.environ.get("GITHUB_TOKEN") and os.environ.get("GITHUB_REPOSITORY"):
        slug = os.environ["GITHUB_REPOSITORY"]
        return f"https://x-access-token:{os.environ['GITHUB_TOKEN']}@github.com/{slug}.git", slug
    url = subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=ROOT, text=True).strip()
    slug = url.rstrip("/").removesuffix(".git").split("github.com/")[-1].split("@")[-1]
    return url, slug


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="YYYY-MM-DD in the configured time zone (default: today)")
    ap.add_argument("--dry-run", action="store_true", help="build and render, post nothing, push nothing")
    ap.add_argument("--force", action="store_true", help="run even if this date already has a batch")
    args = ap.parse_args()
    date = args.date or dt.datetime.now(TZ).date().isoformat()
    seed = dt.date.fromisoformat(date).toordinal()
    remote, slug = remote_and_slug()
    draft = CONFIG.get("mode") == "draft"

    history = json.loads(host.read_file(remote, "history.json") or "{}")
    if date in history.get("days", {}) and history["days"][date].get("posts") and not args.force:
        log(f"{date} already has a scheduled batch; nothing to do (use --force to redo it).")
        return
    rnd = history.get("round", 1)

    work = os.path.join(SOCIAL, "out", date)
    os.makedirs(work, exist_ok=True)
    public_rel = f"batch/{date}"
    combos = load_combos()
    chosen, pool = pick(combos, history, CONFIG["videos_per_day"], date)
    log(f"{date}: round {history.get('round', rnd)}, {len(pool)} pairs left; "
        + ", ".join(c["id"] for c in chosen))

    used_clips = set(history.get("clips", []))
    built, spare = [], [c for c in pool if c not in chosen]
    # Build in pairs; a pair that fails (no route data, no footage) is swapped for the next unused one.
    queue = list(enumerate(chosen))
    while queue:
        with ThreadPoolExecutor(2) as ex:
            batch, queue = queue[:2], queue[2:]
            futs = [(i, c, ex.submit(build_one, c, date, history.get("round", rnd), seed * 10 + i, used_clips, work, public_rel))
                    for i, c in batch]
            for i, c, f in futs:
                try:
                    built.append((i, f.result()))
                    log(f"  built {c['id']}")
                except Exception:
                    log(f"  could not build {c['id']}:\n{traceback.format_exc()}")
                    taken = {x["campus"]["slug"] for _, b in built for x in [b["combo"]]} | {x["campus"]["slug"] for _, x in queue}
                    repl = next((s for s in spare if s["campus"]["slug"] not in taken), None)
                    if repl:
                        spare.remove(repl)
                        queue.append((i, repl))
    built = [b for _, b in sorted(built, key=lambda t: t[0])]
    if not built:
        raise SystemExit("nothing could be built today")

    manifest = {"videos": [{"id": b["combo"]["id"], "props": b["props"], "out": b["video"]} for b in built]}
    mpath = os.path.join(work, "manifest.json")
    json.dump(manifest, open(mpath, "w"))
    subprocess.run(["node", os.path.join(VIDEO, "render.mjs"), mpath], cwd=VIDEO, check=True)

    plan = plan_posts(built, date, seed, history)
    json.dump(plan, open(os.path.join(work, "posts.json"), "w"), indent=1, ensure_ascii=False)
    files = {}
    for b in built:
        files[b["combo"]["id"] + ".mp4"] = b["video"]
        files[b["combo"]["id"] + ".jpg"] = b["card"]

    # What history.json remembers: which pairs, clips and questions have run.
    history.setdefault("days", {})
    history["combos"] = history.get("combos", []) + [b["combo"]["id"] for b in built]
    history["clips"] = (history.get("clips", []) + [c["id"] for b in built for c in b["clips"]])[-3000:]
    history["questions"] = (history.get("questions", []) + [p["thread"][0] for p in plan if p.get("card") is None and p["service"] != "tiktok"])[-40:]
    history["days"][date] = {"combos": [b["combo"]["id"] for b in built]}
    history["days"] = dict(sorted(history["days"].items())[-45:])

    if args.dry_run:
        log(f"dry run: videos, cards and posts.json are in {work}")
        return
    urls = host.publish(remote, slug, date, files, {"history.json": json.dumps(history, indent=1)})
    done = schedule(plan, urls, draft)
    history["days"][date]["posts"] = [{k: p[k] for k in ("service", "at", "post_id")} for p in done]
    host.publish(remote, slug, date, {}, {"history.json": json.dumps(history, indent=1)})
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(f"## SavorScout social batch for {date}\n\n| When | Where | What |\n|---|---|---|\n")
            for p in done:
                what = p.get("video") or (p["thread"][0].split("\n")[0][:80])
                f.write(f"| {dt.datetime.fromisoformat(p['at']):%H:%M} | {p['service']} | {what} |\n")
    log(f"scheduled {len(done)} posts for {date}")


if __name__ == "__main__":
    main()
