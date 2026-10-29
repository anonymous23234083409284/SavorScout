"""Signing in to Google for Search Console and Google Ads.

Two ways, whichever you set up:

  An OAuth client (Desktop app). The first run opens a browser, you sign in
  with the Google account that owns Search Console (and Google Ads), and a
  refresh token is saved in out/google-token.json so later runs do not ask.
  Standard library only. If the consent screen is in "Testing", Google expires
  the refresh token after 7 days and the browser step repeats.

  A service account key, for Search Console only (Google Ads does not accept
  them). Add the service account's email as a user on the Search Console
  property. Needs `pip install google-auth` to sign the key.
"""
import base64
import hashlib
import http.server
import json
import os
import secrets
import threading
import time
import urllib.parse
import webbrowser

from .common import OUT, HttpError, http, local_path, log

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = {
    "gsc": "https://www.googleapis.com/auth/webmasters.readonly",
    "ads": "https://www.googleapis.com/auth/adwords",
}
TOKEN_FILE = os.path.join(OUT, "google-token.json")


def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _client(cfg):
    path = local_path(cfg.get("google_client_secret"))
    if not path or not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        c = json.load(f)
    c = c.get("installed") or c.get("web") or c
    return c["client_id"], c["client_secret"]


def _service_account(cfg):
    """The service account key as a dict: a file path, or the JSON itself
    (how an environment secret would carry it)."""
    v = (cfg.get("google_service_account") or "").strip()
    if not v:
        return None
    if v.startswith("{"):
        return json.loads(v)
    path = local_path(v)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def available(cfg, need):
    """Whether a sign-in method that covers `need` is set up."""
    if "ads" in need:
        return _client(cfg) is not None
    return _client(cfg) is not None or _service_account(cfg) is not None


def token(cfg, need):
    """An access token covering the scopes named in `need` ({'gsc'}, {'ads'})."""
    sa = _service_account(cfg)
    if sa and "ads" not in need:
        return _service_account_token(sa, [SCOPES[n] for n in need])
    client = _client(cfg)
    if not client:
        raise SystemExit(
            "No Google sign-in is set up. Put a Desktop-app OAuth client file at "
            "scripts/research/client_secret.json (or a service account key for Search Console only). "
            "Run `python3 scripts/research/keywords.py setup` for the steps.")
    want = {SCOPES[n] for n in need}
    saved = {}
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, encoding="utf-8") as f:
            saved = json.load(f)
    if saved.get("client_id") == client[0] and want <= set(saved.get("scopes", [])) and saved.get("refresh_token"):
        if saved.get("expiry", 0) > time.time() + 60:
            return saved["access_token"]
        try:
            r = http("POST", TOKEN_URL, form={"client_id": client[0], "client_secret": client[1],
                                              "refresh_token": saved["refresh_token"], "grant_type": "refresh_token"})
            saved.update(access_token=r["access_token"], expiry=time.time() + int(r.get("expires_in", 3600)))
            _save(saved)
            return saved["access_token"]
        except HttpError as e:
            log(f"Saved Google sign-in no longer works ({e.status}); signing in again.")
    # Ask once for everything this and earlier runs needed, so switching
    # between Search Console and Ads does not bounce through the browser.
    scopes = sorted(want | set(saved.get("scopes", [])) if saved.get("client_id") == client[0] else want)
    r = _browser_flow(client, scopes)
    saved = {"client_id": client[0], "scopes": scopes, "refresh_token": r.get("refresh_token") or saved.get("refresh_token"),
             "access_token": r["access_token"], "expiry": time.time() + int(r.get("expires_in", 3600))}
    _save(saved)
    return saved["access_token"]


def _save(tok):
    os.makedirs(OUT, exist_ok=True)
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump(tok, f)
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except OSError:
        pass


def _browser_flow(client, scopes):
    """The installed-app flow: a one-shot server on 127.0.0.1 catches the code."""
    verifier = _b64(os.urandom(48))
    challenge = _b64(hashlib.sha256(verifier.encode()).digest())
    state = secrets.token_urlsafe(16)
    got = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            if "code" in q or "error" in q:
                got.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            msg = "Signed in. You can close this tab and go back to the terminal." if "code" in q \
                else "Sign-in did not finish: " + q.get("error", ["unknown"])[0]
            self.wfile.write(f"<!doctype html><title>Savor Scout keywords</title><p style='font:16px sans-serif'>{msg}</p>".encode())

        def log_message(self, *a):
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    redirect = f"http://127.0.0.1:{server.server_address[1]}"
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_id": client[0], "redirect_uri": redirect, "response_type": "code",
        "scope": " ".join(scopes), "access_type": "offline", "prompt": "consent",
        "code_challenge": challenge, "code_challenge_method": "S256", "state": state,
    })
    log("\nSign in to Google in the browser window that just opened. If none opened, paste this link:\n" + url + "\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    t = threading.Thread(target=lambda: [server.handle_request() for _ in range(20) if not got], daemon=True)
    t.start()
    t.join(timeout=600)
    server.server_close()
    if "code" not in got:
        raise SystemExit("Google sign-in did not complete: " + got.get("error", "timed out after 10 minutes"))
    if got.get("state") != state:
        raise SystemExit("Google sign-in returned a mismatched state; try again.")
    return http("POST", TOKEN_URL, form={
        "client_id": client[0], "client_secret": client[1], "code": got["code"],
        "code_verifier": verifier, "grant_type": "authorization_code", "redirect_uri": redirect})


_sa_cache = {}


def _service_account_token(info, scopes):
    key = (info.get("client_email"), tuple(sorted(scopes)))
    hit = _sa_cache.get(key)
    if hit and hit[1] > time.time() + 60:
        return hit[0]
    try:
        from google.auth import crypt, jwt
    except ImportError:
        raise SystemExit("Signing in with a service account key needs google-auth: pip install google-auth")
    signer = crypt.RSASigner.from_service_account_info(info)
    now = int(time.time())
    token_uri = info.get("token_uri", TOKEN_URL)
    assertion = jwt.encode(signer, {"iss": info["client_email"], "scope": " ".join(scopes),
                                    "aud": token_uri, "iat": now, "exp": now + 3600})
    if isinstance(assertion, bytes):
        assertion = assertion.decode()
    r = http("POST", token_uri, form={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion})
    _sa_cache[key] = (r["access_token"], time.time() + int(r.get("expires_in", 3600)))
    return r["access_token"]
