"""Google Ads Keyword Planner: Google's own monthly search volumes.

The only official source of how many times a search is made on Google. Two
calls:
  ideas       searches related to seeds, each with its volume (finds phrasings)
  historical  the volume of an exact list of searches (prices a list we have)
Each result carries twelve months of volumes, which is the seasonality: when
"food near campus" peaks, and how far it falls in summer.

Needs a Google Ads account (no ads have to run, but the account holder must
be 18 or older), a developer token from a manager account's API Center with
Basic or Explorer access (a test-only token cannot read real data), and the
same Google sign-in as Search Console. Accounts that have never spent on ads
can get rounded volumes.
"""
from . import auth, db
from .common import HttpError, http, log, pause, progress

VERSIONS = ["v26", "v25", "v24", "v23", "v22", "v21", "v20"]
US, ENGLISH = "geoTargetConstants/2840", "languageConstants/1000"
MONTHS = {m: i for i, m in enumerate(["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST",
                                       "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"], 1)}


def _cid(v):
    return "".join(ch for ch in str(v or "") if ch.isdigit())


def _post(cfg, method, body, con):
    """POST to the newest API version that still answers; remembers which."""
    headers = {"Authorization": "Bearer " + auth.token(cfg, {"ads"}),
               "developer-token": cfg["ads_developer_token"]}
    if _cid(cfg.get("ads_login_customer_id")):
        headers["login-customer-id"] = _cid(cfg["ads_login_customer_id"])
    known = cfg.get("ads_api_version") or (db.cache_get(con, "ads_version") or "")
    tried = [known] + [v for v in VERSIONS if v != known] if known else VERSIONS
    last = None
    for v in tried:
        url = f"https://googleads.googleapis.com/{v}/customers/{_cid(cfg['ads_customer_id'])}:{method}"
        try:
            r = http("POST", url, body=body, headers=headers, retries=4)
        except HttpError as e:
            last = e
            text = str(e.body).lower()
            if e.status == 404 or "version" in text and ("deprecated" in text or "sunset" in text or "unsupported" in text):
                continue
            raise
        if v != known:
            db.cache_put(con, "ads_version", v)
        return r
    raise last


def _store(con, text, m, seed=""):
    if not m:
        return
    vol = m.get("avgMonthlySearches")
    if vol is not None:
        db.put(con, "ads", text, "volume", float(vol), seed=seed)
    if m.get("competitionIndex") is not None:
        db.put(con, "ads", text, "competition", float(m["competitionIndex"]), seed=seed)
    for k, metric in (("lowTopOfPageBidMicros", "cpc_low"), ("highTopOfPageBidMicros", "cpc_high")):
        if m.get(k) is not None:
            db.put(con, "ads", text, metric, round(float(m[k]) / 1e6, 2), seed=seed)
    for mv in m.get("monthlySearchVolumes", []) or []:
        month = MONTHS.get(mv.get("month"))
        if month and mv.get("year") and mv.get("monthlySearches") is not None:
            db.put(con, "ads", text, "volume", float(mv["monthlySearches"]),
                   period=f"{mv['year']}-{month:02d}", seed=seed)


def ideas(cfg, seeds, pages_per_seed_set=3):
    """Related searches with volumes, up to 20 seeds per request."""
    con = db.connect()
    started = db.now()
    n = 0
    chunks = [seeds[i:i + 20] for i in range(0, len(seeds), 20)]
    log(f"Google Ads keyword ideas: {len(seeds)} seeds in {len(chunks)} requests")
    for i, chunk in enumerate(chunks, 1):
        body = {"language": ENGLISH, "geoTargetConstants": [US], "includeAdultKeywords": False,
                "keywordPlanNetwork": "GOOGLE_SEARCH", "keywordSeed": {"keywords": chunk}, "pageSize": 1000}
        for _ in range(pages_per_seed_set):
            r = _post(cfg, "generateKeywordIdeas", body, con)
            for res in r.get("results", []):
                _store(con, res.get("text", ""), res.get("keywordIdeaMetrics"), seed=" | ".join(chunk)[:200])
                n += 1
            if not r.get("nextPageToken"):
                break
            body["pageToken"] = r["nextPageToken"]
            pause(1.2)
        con.commit()
        progress(i, len(chunks), f"requests, {n} ideas")
        pause(1.5)
    db.run_log(con, "ads_ideas", started, n)
    return n


def historical(cfg, keywords):
    """The volume of each search in `keywords` (Google merges close variants:
    "restaurant near ucla" and "restaurants near ucla" come back as one)."""
    con = db.connect()
    started = db.now()
    todo = [k for k in dict.fromkeys(k.strip().lower() for k in keywords if k.strip())
            if not db.cache_get(con, "ads_hist:" + k, max_age_days=30)]
    log(f"Google Ads volumes: {len(todo)} searches to price")
    n = 0
    for i in range(0, len(todo), 2000):
        chunk = todo[i:i + 2000]
        r = _post(cfg, "generateKeywordHistoricalMetrics", {
            "keywords": chunk, "language": ENGLISH, "geoTargetConstants": [US],
            "keywordPlanNetwork": "GOOGLE_SEARCH", "includeAdultKeywords": False}, con)
        for res in r.get("results", []):
            text = res.get("text", "")
            _store(con, text, res.get("keywordMetrics"))
            for v in res.get("closeVariants", []) or []:
                if v.lower() != text.lower():
                    db.put(con, "ads_variant", v, "variant_of", 1, seed=text)
            n += 1
        for k in chunk:
            db.cache_put(con, "ads_hist:" + k, 1)
        con.commit()
        progress(min(i + 2000, len(todo)), len(todo), "priced")
        pause(2)
    db.run_log(con, "ads_hist", started, n)
    return n
