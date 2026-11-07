"""Ask Google to recrawl the pages that matter most, through the Indexing API.

    python3 scripts/request-indexing.py              # today's pages (default 10)
    python3 scripts/request-indexing.py --limit 20
    python3 scripts/request-indexing.py --dry-run    # show what would be sent
    python3 scripts/request-indexing.py <url> ...    # specific pages

WHAT IT CAN AND CANNOT DO
Google supports this API only for job-posting and livestream pages. For other
pages it may still crawl sooner, or ignore the request; it never changes how
a page ranks. So this sends a few pages a day, not the whole site: the
campus pages Google shows most without anyone clicking
(data/priority-pages.json), highest impressions first, each at most once
every 14 days (data/indexing-sent.json remembers what went when).

SETUP (once)
1. In Google Cloud: enable the "Web Search Indexing API" for the project, and
   create a service account with a JSON key.
2. In Search Console: add the service account's email as an Owner of the
   savorscout.net property (the API requires Owner, not Restricted).
3. Put the key in the environment: GOOGLE_SERVICE_ACCOUNT_JSON holding the
   file's contents, or GOOGLE_SERVICE_ACCOUNT_FILE holding its path.

No extra packages: the sign-in is a JWT signed with `cryptography`.
"""
import base64, datetime as dt, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ORIGIN = "https://www.savorscout.net"
SENT = os.path.join(HERE, "data", "indexing-sent.json")
PRIORITY = os.path.join(HERE, "data", "priority-pages.json")
SCOPE = "https://www.googleapis.com/auth/indexing"
ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
REPEAT_DAYS = 14


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def load_key():
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw and os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE"):
        raw = open(os.environ["GOOGLE_SERVICE_ACCOUNT_FILE"]).read()
    if not raw:
        raise SystemExit("No key: set GOOGLE_SERVICE_ACCOUNT_JSON (the key file's contents) "
                         "or GOOGLE_SERVICE_ACCOUNT_FILE (its path). See the setup notes at the top of this file.")
    return json.loads(raw)


def access_token(key):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    now = int(time.time())
    header = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = b64(json.dumps({"iss": key["client_email"], "scope": SCOPE, "aud": key["token_uri"],
                             "iat": now, "exp": now + 3600}).encode())
    pk = serialization.load_pem_private_key(key["private_key"].encode(), password=None)
    sig = b64(pk.sign(f"{header}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256()))
    body = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                   "assertion": f"{header}.{claims}.{sig}"}).encode()
    with urllib.request.urlopen(urllib.request.Request(key["token_uri"], data=body), timeout=30) as r:
        return json.load(r)["access_token"]


def todays_urls(limit, sent):
    pages = json.load(open(PRIORITY))["pages"]
    cutoff = (dt.date.today() - dt.timedelta(days=REPEAT_DAYS)).isoformat()
    ranked = sorted((p for p in pages if p["url"].startswith("/campus/") and p["clicks"] == 0),
                    key=lambda p: -p["impr"])
    urls = [ORIGIN + p["url"] for p in ranked]
    return [u for u in urls if sent.get(u, "") < cutoff][:limit]


def main():
    import urllib.parse  # noqa: F401  (used by access_token)
    args = sys.argv[1:]
    dry = "--dry-run" in args
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else 10
    given = [a for a in args if a.startswith("http")]
    sent = json.load(open(SENT)) if os.path.exists(SENT) else {}
    urls = given or todays_urls(limit, sent)
    if not urls:
        print("Nothing to send: every priority page went out in the last", REPEAT_DAYS, "days.")
        return
    if dry:
        print("\n".join(urls))
        return
    token = access_token(load_key())
    today = dt.date.today().isoformat()
    ok = 0
    for u in urls:
        req = urllib.request.Request(ENDPOINT, data=json.dumps({"url": u, "type": "URL_UPDATED"}).encode(),
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30):
                pass
            sent[u] = today
            ok += 1
            print("sent   ", u)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:300]
            print("refused", u, e.code, msg)
            if e.code in (401, 403, 429):
                break  # wrong permissions or out of quota: the rest would fail the same way
    with open(SENT, "w") as f:
        json.dump(dict(sorted(sent.items())), f, indent=1)
    print(f"{ok} of {len(urls)} sent")


if __name__ == "__main__":
    import urllib.parse
    main()
