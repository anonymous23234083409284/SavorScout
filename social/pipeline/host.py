"""Public URLs for a day's media, served from the repo's `social-media` branch.

Buffer fetches each video and image from a public URL when the post goes out
(it has no upload endpoint), and this repository is public, so the branch is
the host: https://raw.githubusercontent.com/<repo>/social-media/<date>/<file>.

The branch holds media only and is rewritten as a single commit on every
publish, keeping today and yesterday, so it never grows. Its vercel.json turns
off Vercel deployments for it, and nothing on it touches the site.
"""
import datetime as dt
import os, shutil, subprocess, tempfile, time, urllib.request

BRANCH = "social-media"
KEEP_DAYS = 2

README = """# social-media

Images and videos for SavorScout's scheduled social posts, served to Buffer from
raw.githubusercontent.com. Written by social/pipeline/host.py, which replaces this
branch with a single commit on every run and keeps only the last few days.
Nothing here is part of the site. See social/README.md on main.
"""
VERCEL = '{\n  "git": { "deploymentEnabled": false }\n}\n'


def git(*args, cwd=None, check=True):
    return subprocess.run(["git", *args], cwd=cwd, check=check, capture_output=True, text=True)


def publish(remote, repo_slug, date, files, extra=None):
    """Put `files` ({name: local path}) under <date>/ on the branch and return {name: url}.

    `extra` is {path: text} written at the branch root (history.json).
    """
    work = tempfile.mkdtemp(prefix="media-")
    try:
        r = git("clone", "--quiet", "--depth", "1", "--single-branch", "--branch", BRANCH, remote, work, check=False)
        if r.returncode != 0:                        # first run: the branch does not exist yet
            shutil.rmtree(work, ignore_errors=True)
            os.makedirs(work)
            git("init", "--quiet", cwd=work)
            git("remote", "add", "origin", remote, cwd=work)
        today = dt.date.fromisoformat(date)
        for name in os.listdir(work):
            try:
                day = dt.date.fromisoformat(name)
            except ValueError:
                continue
            if (today - day).days >= KEEP_DAYS:
                shutil.rmtree(os.path.join(work, name))
        os.makedirs(os.path.join(work, date), exist_ok=True)
        for name, path in files.items():
            shutil.copy(path, os.path.join(work, date, name))
        with open(os.path.join(work, "README.md"), "w") as f:
            f.write(README)
        with open(os.path.join(work, "vercel.json"), "w") as f:
            f.write(VERCEL)
        for path, text in (extra or {}).items():
            with open(os.path.join(work, path), "w") as f:
                f.write(text)
        git("checkout", "--quiet", "--orphan", "publish", cwd=work)
        git("add", "-A", cwd=work)
        git("-c", "user.name=SavorScout social bot", "-c", "user.email=social-bot@savorscout.net",
            "commit", "--quiet", "-m", f"Media for {date}", cwd=work)
        git("push", "--quiet", "--force", "origin", f"publish:refs/heads/{BRANCH}", cwd=work)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    base = f"https://raw.githubusercontent.com/{repo_slug}/{BRANCH}/{date}"
    urls = {name: f"{base}/{name}" for name in files}
    wait_until_served(list(urls.values()))
    return urls


def wait_until_served(urls, timeout=300):
    """raw.githubusercontent.com can lag a push by a minute; Buffer must not see a 404."""
    deadline = time.time() + timeout
    pending = list(urls)
    while pending and time.time() < deadline:
        still = []
        for u in pending:
            try:
                req = urllib.request.Request(u, method="HEAD", headers={"User-Agent": "savorscout-social/1.0"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    if r.status != 200:
                        still.append(u)
            except Exception:
                still.append(u)
        pending = still
        if pending:
            time.sleep(10)
    if pending:
        raise RuntimeError(f"media not served after {timeout}s: {pending}")


def read_file(remote, path):
    """One file from the branch's tip, or None (history.json on the first run)."""
    work = tempfile.mkdtemp(prefix="media-read-")
    try:
        r = git("clone", "--quiet", "--depth", "1", "--single-branch", "--branch", BRANCH, "--no-checkout",
                "--filter=blob:none", remote, work, check=False)
        if r.returncode != 0:
            return None
        r = git("show", f"HEAD:{path}", cwd=work, check=False)
        return r.stdout if r.returncode == 0 else None
    finally:
        shutil.rmtree(work, ignore_errors=True)
