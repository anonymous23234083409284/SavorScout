"""Paths, settings and the one HTTP helper every source uses.

Everything here is standard library, so the tool runs on any Python 3.8+
without installing anything. The one optional extra is google-auth, needed
only to sign in to Search Console with a service account key.
"""
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # scripts/research
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "out")
CONFIG_FILE = os.path.join(HERE, "config.json")
SEEDS_FILE = os.path.join(HERE, "seeds.json")
DB_FILE = os.path.join(OUT, "keywords.db")
EXPORT_FILE = os.path.join(REPO, "scripts", "data", "search-terms.json")
PRIORITY_FILE = os.path.join(REPO, "scripts", "data", "priority-pages.json")

# Every setting the tool reads. Secrets stay in config.json, which git
# ignores, or in the environment variable named beside each one, which is
# how a cloud session or a scheduled job would pass them.
DEFAULTS = {
    "site": ("https://www.savorscout.net", "SS_SITE"),
    # The property exactly as Search Console lists it: "sc-domain:savorscout.net"
    # for a domain property, "https://www.savorscout.net/" for a URL-prefix one.
    "gsc_property": ("", "SS_GSC_PROPERTY"),
    # A Desktop-app OAuth client from Google Cloud (signs in as you), or a
    # service account key (signs in as itself; add its email in Search Console).
    "google_client_secret": ("client_secret.json", "SS_GOOGLE_CLIENT_SECRET"),
    "google_service_account": ("", "SS_GOOGLE_SERVICE_ACCOUNT"),
    "bing_api_key": ("", "SS_BING_API_KEY"),
    "bing_site_url": ("https://www.savorscout.net/", "SS_BING_SITE_URL"),
    "bing_country": ("us", "SS_BING_COUNTRY"),
    "bing_language": ("en-US", "SS_BING_LANGUAGE"),
    "ads_developer_token": ("", "SS_ADS_DEVELOPER_TOKEN"),
    "ads_customer_id": ("", "SS_ADS_CUSTOMER_ID"),
    "ads_login_customer_id": ("", "SS_ADS_LOGIN_CUSTOMER_ID"),
    "ads_api_version": ("", "SS_ADS_API_VERSION"),
    "reddit_client_id": ("", "SS_REDDIT_CLIENT_ID"),
    "reddit_client_secret": ("", "SS_REDDIT_CLIENT_SECRET"),
    "reddit_user_agent": ("savorscout-keywords/2.0", "SS_REDDIT_USER_AGENT"),
}

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0"


def load_config():
    cfg = {k: v[0] for k, v in DEFAULTS.items()}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, encoding="utf-8") as f:
            cfg.update({k: v for k, v in json.load(f).items() if not k.startswith("_")})
    for k, (_, env) in DEFAULTS.items():
        if os.environ.get(env):
            cfg[k] = os.environ[env]
    return cfg


def write_config_template():
    """config.json with every setting blank, and a line on where each comes from."""
    if os.path.exists(CONFIG_FILE):
        return False
    body = {"_read_me": "Fill in what you have; anything left blank is skipped. "
                        "Run `python3 scripts/research/keywords.py setup` for where each one comes from."}
    body.update({k: v[0] for k, v in DEFAULTS.items()})
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(body, f, indent=2)
        f.write("\n")
    return True


def local_path(p):
    """A path from config.json, relative to scripts/research unless absolute."""
    if not p:
        return ""
    return p if os.path.isabs(p) else os.path.join(HERE, p)


def load_seeds():
    if not os.path.exists(SEEDS_FILE):
        sys.exit("seeds.json is missing. Build it with: node scripts/research/make-seeds.js")
    with open(SEEDS_FILE, encoding="utf-8") as f:
        return json.load(f)


class HttpError(Exception):
    def __init__(self, status, body, url):
        super().__init__(f"HTTP {status} from {url.split('?')[0]}: {str(body)[:500]}")
        self.status, self.body, self.url = status, body, url


def http(method, url, params=None, form=None, body=None, headers=None, timeout=40,
         retries=3, auth=None):
    """One request, parsed as JSON when it is JSON.

    Retries rate limits and server errors with a growing pause (honouring
    Retry-After), and raises HttpError for anything else, with the body, since
    every API here explains its refusals there.
    """
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params, doseq=True)
    data = None
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json, */*"}
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        hdrs["Content-Type"] = "application/x-www-form-urlencoded"
    elif body is not None:
        data = json.dumps(body).encode()
        hdrs["Content-Type"] = "application/json"
    if auth:
        import base64
        hdrs["Authorization"] = "Basic " + base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode()
    hdrs.update(headers or {})
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                raw = res.read()
                charset = res.headers.get_content_charset() or "utf-8"
                text = raw.decode(charset, "replace")
                try:
                    return json.loads(text)
                except ValueError:
                    return text
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", "replace")
            try:
                payload = json.loads(text)
            except ValueError:
                payload = text
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = e.headers.get("Retry-After")
                wait = int(wait) if wait and wait.isdigit() else (5, 20, 60, 120)[attempt]
                log(f"  {e.code} from {urllib.parse.urlsplit(url).netloc}; waiting {wait}s")
                time.sleep(wait)
                continue
            raise HttpError(e.code, payload, url)
        except (urllib.error.URLError, OSError) as e:
            if attempt < retries:
                time.sleep((3, 10, 30, 60)[attempt])
                continue
            raise HttpError(0, str(e), url)


def pause(seconds):
    """Sleep about `seconds`, jittered so requests do not land on a beat."""
    if seconds > 0:
        time.sleep(seconds * random.uniform(0.7, 1.5))


def log(msg=""):
    print(msg, flush=True)


def progress(n, total, extra=""):
    print(f"\r  {n}/{total} {extra}   ", end="", flush=True)
    if n == total:
        print()


def path_of(url, site):
    """'https://www.savorscout.net/campus/x' -> '/campus/x'."""
    for origin in (site.rstrip("/"), site.rstrip("/").replace("://www.", "://")):
        if url.startswith(origin):
            url = url[len(origin):]
            break
    url = url.split("#")[0]
    return url or "/"
