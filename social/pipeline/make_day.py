"""One day of SavorScout posts, from scripts in social/batches/<date>/ to Buffer.

Every day posts 4 TikTok videos, 4 X threads and 4 Threads posts, made the
afternoon before by a scheduled Claude session (social/DAILY.md is its
playbook). The content is researched and written fresh for each day:
videos.json holds the video scripts, posts.json the X and Threads threads,
TikTok captions, posting times and share-card specs. Only the soundtracks
repeat: music.py's library rotates, least recently used first.

    python make_day.py sounds <dir>              # fetch the soundtrack library from the media branch
    python make_day.py build <date> <sounds dir> <rank maps dir>
    python make_day.py qa <date>                 # contact sheets: every clip at start, middle, end
    python make_day.py render <date>
    python make_day.py cards <date>
    python make_day.py publish <date> <sounds dir> [--dry-run] [--force]
    python make_day.py verify <date>             # read every scheduled post back from Buffer

Between build and render, look at the qa sheets and replace any clip that
does not show what its caption says: reel.py repick <videos.json> <video> '{"3": [...queries]}'.
"""
import json, os, subprocess, sys, urllib.request
from io import BytesIO

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import buffer, host, postcard, reel  # noqa: E402

SOCIAL = os.path.dirname(HERE)
ROOT = os.path.dirname(SOCIAL)
UA = {"User-Agent": "savorscout-social/1.0"}


def paths(date):
    return (os.path.join(SOCIAL, "batches", date), os.path.join(SOCIAL, "out", "batches", date),
            os.path.join(SOCIAL, "video", "public", "reel", date))


def remote_and_slug():
    if os.environ.get("GITHUB_TOKEN") and os.environ.get("GITHUB_REPOSITORY"):
        slug = os.environ["GITHUB_REPOSITORY"]
        return f"https://x-access-token:{os.environ['GITHUB_TOKEN']}@github.com/{slug}.git", slug
    url = subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=ROOT, text=True).strip()
    return url, url.rstrip("/").removesuffix(".git").split("github.com/")[-1]


def sounds(dest):
    """Download the soundtrack library (sounds/ on the media branch) into dest."""
    _, slug = remote_and_slug()
    base = f"https://raw.githubusercontent.com/{slug}/{host.BRANCH}/sounds"
    os.makedirs(dest, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(f"{base}/library.json", headers=UA), timeout=60) as r:
        lib = json.load(r)
    for t in lib["tracks"]:
        path = os.path.join(dest, t["file"])
        if not os.path.exists(path):
            with urllib.request.urlopen(urllib.request.Request(f"{base}/{t['file']}", headers=UA), timeout=120) as r, open(path, "wb") as f:
                f.write(r.read())
    json.dump(lib, open(os.path.join(dest, "library.json"), "w"), indent=1)
    print(f"{len(lib['tracks'])} tracks in {dest}")


def build(date, sounds_dir, rank_dir):
    wdir, out, _ = paths(date)
    os.makedirs(out, exist_ok=True)
    # Never reuse a clip the account has already posted.
    remote, _ = remote_and_slug()
    history = json.loads(host.read_file(remote, "history.json") or "{}")
    used_path = os.path.join(out, "used-clips.json")
    # Clips rejected on review (wrong subject, a business name or logo) never come back either.
    used = set(history.get("clips", [])) | set(history.get("rejected", [])) | \
        (set(json.load(open(used_path))) if os.path.exists(used_path) else set())
    json.dump(sorted(used), open(used_path, "w"))
    subprocess.run([sys.executable, os.path.join(HERE, "reel.py"), os.path.join(wdir, "videos.json"), sounds_dir, rank_dir], check=True)


def qa(date):
    """Every clip at 10%, 50% and 90% of its scene, labelled with its caption."""
    from PIL import Image, ImageDraw
    wdir, out, _ = paths(date)
    spec = {v["id"]: v for v in json.load(open(os.path.join(wdir, "videos.json")))["videos"]}
    reels = json.load(open(os.path.join(out, "reels.json")))
    os.makedirs(os.path.join(out, "qa"), exist_ok=True)
    for v in reels["videos"]:
        cols = []
        for i, sc in enumerate(v["props"]["scenes"]):
            if "src" not in sc:
                continue
            frames = []
            for k, frac in enumerate((0.1, 0.5, 0.9)):
                f = os.path.join(out, "qa", f"{v['id']}-{i:02d}-{k}.png")
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{sc['dur'] / 30 * frac:.2f}", "-i",
                                os.path.join(SOCIAL, "video", "public", sc["src"]), "-frames:v", "1", "-vf", "scale=150:267", f], check=True)
                frames.append(f)
            s = spec[v["id"]]["scenes"][i]
            cols.append((f"{i}: {(s.get('text') or s.get('title', '')).replace('*', '')[:22]}", frames))
        sheet = Image.new("RGB", (150 * len(cols), 267 * 3 + 30))
        d = ImageDraw.Draw(sheet)
        for c, (label, frames) in enumerate(cols):
            d.text((150 * c + 4, 6), label, fill=(255, 220, 120))
            for r, f in enumerate(frames):
                sheet.paste(Image.open(f), (150 * c, 30 + 267 * r))
        sheet.save(os.path.join(out, "qa", f"sheet-{v['id']}.png"))
        print(os.path.join(out, "qa", f"sheet-{v['id']}.png"))


def render(date):
    _, out, _ = paths(date)
    subprocess.run(["node", os.path.join(SOCIAL, "video", "render.mjs"), os.path.join(out, "manifest.json")],
                   cwd=os.path.join(SOCIAL, "video"), check=True)


def photo(spec, date):
    """A card's header photo: a Pexels photo by id, or a frame of one of the date's clips."""
    from PIL import Image
    _, out, pub = paths(date)
    if "pexels" in spec:
        req = urllib.request.Request(f"https://api.pexels.com/v1/photos/{spec['pexels']}", headers=UA)
        if os.environ.get("PEXELS_API_KEY"):
            req.add_header("Authorization", os.environ["PEXELS_API_KEY"])
        with urllib.request.urlopen(req, timeout=30) as r:
            src = json.load(r)["src"]["large2x"]
        with urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=60) as r:
            path = os.path.join(out, "cards", f"photo-{spec['pexels']}.jpg")
            Image.open(BytesIO(r.read())).convert("RGB").save(path, quality=92)
        return path
    vid, scene, at = spec["clip"]
    path = os.path.join(out, "cards", f"photo-{vid}-{scene}.jpg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(at), "-i", os.path.join(pub, vid, f"s{scene:02d}.mp4"),
                    "-frames:v", "1", path], check=True)
    return path


def cards(date):
    wdir, out, _ = paths(date)
    os.makedirs(os.path.join(out, "cards"), exist_ok=True)
    posts = json.load(open(os.path.join(wdir, "posts.json")))
    for name, c in posts["cards"].items():
        dest = os.path.join(out, "cards", f"{name}.jpg")
        if c["type"] == "tips":
            postcard.tips(dest, photo(c["photo"], date) if c.get("photo") else None, c["kicker"], c["title"],
                          [tuple(i) for i in c["items"]], c.get("note", ""))
        else:
            postcard.ranking(dest, c["title"], c["subtitle"], [tuple(r) for r in c["rows"]], c.get("source", ""), c.get("suffix", ""))
        print(dest)


def publish(date, sounds_dir, dry_run=False, force=False):
    """Host every video and card, then schedule the date's posts in Buffer."""
    import datetime as dt
    wdir, out, _ = paths(date)
    if os.path.exists(os.path.join(wdir, "scheduled.json")) and not (dry_run or force):
        # Running twice would post everything twice; delete the posts in Buffer first, then pass --force.
        raise SystemExit(f"{date} is already scheduled (batches/{date}/scheduled.json). Use --force to schedule it again.")
    posts = json.load(open(os.path.join(wdir, "posts.json")))
    reels = json.load(open(os.path.join(out, "reels.json")))
    files = {f"{v['id']}.mp4": os.path.join(out, f"{v['id']}.mp4") for v in reels["videos"]}
    files.update({f"{n}.jpg": os.path.join(out, "cards", f"{n}.jpg") for n in posts["cards"]})
    missing = [p for p in files.values() if not os.path.exists(p)]
    if missing:
        raise SystemExit(f"missing: {missing}")
    remote, slug = remote_and_slug()
    history = json.loads(host.read_file(remote, "history.json") or "{}")
    lib_path = os.path.join(sounds_dir, "library.json")
    lib = json.load(open(lib_path))
    root_files = {"sounds/library.json": lib_path}
    root_files.update({f"sounds/{t['file']}": os.path.join(sounds_dir, t["file"]) for t in lib["tracks"]})
    history["clips"] = sorted(set(history.get("clips", [])) | {sc["clip"]["id"] for v in reels["videos"]
                                                               for sc in v["props"]["scenes"] if "clip" in sc})
    rejected_path = os.path.join(out, "rejected-clips.json")
    if os.path.exists(rejected_path):
        history["rejected"] = sorted(set(history.get("rejected", [])) | set(json.load(open(rejected_path))))
    history.setdefault("batches", {})[date] = {"videos": [v["id"] for v in reels["videos"]],
                                              "tracks": [v["track"] for v in reels["videos"]],
                                              "posts_planned": {k: [p.get("id") or p.get("video") for p in posts[k]]
                                                                for k in ("tiktok", "twitter", "threads")}}
    if dry_run:
        print("dry run: would publish", sorted(files), "and schedule", {k: len(v) for k, v in posts.items() if k != "cards"})
        return
    # Media goes under the day it posts, even for a day's second batch (2026-11-02b).
    day = json.load(open(os.path.join(wdir, "videos.json"))).get("date", date)
    urls = host.publish(remote, slug, day, files, {"history.json": json.dumps(history, indent=1)}, root_files)
    chans = buffer.channels()
    done = []
    for p in posts["tiktok"]:
        when = dt.datetime.fromisoformat(p["at"])
        res = buffer.create(chans["tiktok"]["id"], p["text"], when, [buffer.video(urls[p["video"] + ".mp4"], 1200)])
        done.append({"service": "tiktok", "at": res["dueAt"], "post_id": res["id"], "what": p["video"]})
    for service in ("twitter", "threads"):
        for p in posts[service]:
            when = dt.datetime.fromisoformat(p["at"])
            items = [{"text": t, "assets": []} for t in p["thread"]]
            if p.get("card"):
                items[0]["assets"] = [buffer.image(urls[p["card"] + ".jpg"])]
            meta = {"thread": items}
            if service == "threads" and p.get("topic"):
                meta["topic"] = p["topic"]
            res = buffer.create(chans[service]["id"], p["thread"][0], when, items[0]["assets"], {service: meta})
            done.append({"service": service, "at": res["dueAt"], "post_id": res["id"], "what": p["id"]})
    for d in sorted(done, key=lambda d: d["at"]):
        print(f"  {d['at']}  {d['service']:8} {d['what']:24} {d['post_id']}")
    history["batches"][date]["posts"] = done
    host.publish(remote, slug, day, {}, {"history.json": json.dumps(history, indent=1)})
    json.dump(done, open(os.path.join(wdir, "scheduled.json"), "w"), indent=1)


def verify(date):
    """Read every scheduled post back from Buffer and check it against posts.json.

    Text, thread parts, Threads topic, posting time, and that each video or
    card is attached and publicly served. Returns the number of posts with a
    problem (0 means all is as written).
    """
    import datetime as dt
    from zoneinfo import ZoneInfo
    wdir, _, _ = paths(date)
    sched = json.load(open(os.path.join(wdir, "scheduled.json")))
    posts = json.load(open(os.path.join(wdir, "posts.json")))
    tz = ZoneInfo(json.load(open(os.path.join(SOCIAL, "config.json")))["timezone"])
    want = {p["video"]: p for p in posts["tiktok"]}
    want.update({p["id"]: p for p in posts["twitter"] + posts["threads"]})
    query = """query($id: PostId!) { post(input: {id: $id}) { id status dueAt externalLink error { message } text assets { source }
      metadata { ... on TwitterPostMetadata { thread { text assets { source } } }
                 ... on ThreadsPostMetadata { topic thread { text assets { source } } } } } }"""

    def served(url):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers=UA), timeout=30) as r:
                return r.status == 200
        except Exception:
            return False

    problems = 0
    for s in sorted(sched, key=lambda d: d["at"]):
        p = buffer.gql(query, {"id": s["post_id"]})["post"]
        w = want[s["what"]]
        when = dt.datetime.fromisoformat(p["dueAt"].replace("Z", "+00:00")).astimezone(tz)
        sent = p["status"] == "sent"         # once it posts, Buffer swaps in its own copy of the media
        issues = [] if p["status"] in ("scheduled", "sent") else [f"status {p['status']}"]
        if p.get("error"):
            issues.append(f"error: {p['error'].get('message')}")
        if when != dt.datetime.fromisoformat(w["at"]).astimezone(tz):
            issues.append("time differs")
        urls = [a["source"] for a in p["assets"] or []]
        if s["service"] == "tiktok":
            parts = 1
            if p["text"] != w["text"]:
                issues.append("caption differs")
            if not urls or not (sent or urls[0].endswith(f"/{s['what']}.mp4")):
                issues.append("video missing")
        else:
            thread = (p["metadata"] or {}).get("thread") or []
            parts = len(thread)
            if [t["text"] for t in thread] != w["thread"]:
                issues.append("thread differs")
            first = [a["source"] for a in (thread[0]["assets"] if thread else [])]
            if w.get("card") and not (first and (sent or first[0].endswith(f"/{w['card']}.jpg"))):
                issues.append("card missing")
            urls += first
            if s["service"] == "threads" and (p["metadata"] or {}).get("topic") != w.get("topic"):
                issues.append("topic differs")
        if not sent:
            issues += [f"not served: {u}" for u in sorted(set(urls)) if not served(u)]
        problems += bool(issues)
        state = "sent " + (p.get("externalLink") or "") if sent else "scheduled"
        print(f"  {when:%a %I:%M %p}  {s['service']:8} {s['what']:20} parts={parts}  {'; '.join(issues) or 'OK'}  ({state.strip()})")
    print(f"{len(sched)} posts read back, {problems} with problems")
    return problems


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "sounds":
        sounds(sys.argv[2])
    elif cmd == "build":
        build(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "qa":
        qa(sys.argv[2])
    elif cmd == "render":
        render(sys.argv[2])
    elif cmd == "cards":
        cards(sys.argv[2])
    elif cmd == "publish":
        publish(sys.argv[2], sys.argv[3], "--dry-run" in sys.argv, "--force" in sys.argv)
    elif cmd == "verify":
        sys.exit(1 if verify(sys.argv[2]) else 0)
