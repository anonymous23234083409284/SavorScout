"""A small client for Buffer's GraphQL API (https://developers.buffer.com).

The key is read from BUFFER_API_KEY. In a Claude cloud session the network
proxy injects it instead, so the header is only sent when the variable is set.
"""
import json, os, time, urllib.error, urllib.request

API = "https://api.buffer.com"

CREATE = """mutation Create($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id dueAt status } }
    ... on MutationError { message }
  }
}"""


class BufferError(RuntimeError):
    pass


def gql(query, variables=None, retries=3):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    for attempt in range(retries):
        req = urllib.request.Request(API, data=body, method="POST",
                                     headers={"Content-Type": "application/json", "User-Agent": "savorscout-social/1.0"})
        if os.environ.get("BUFFER_API_KEY"):
            req.add_header("Authorization", f"Bearer {os.environ['BUFFER_API_KEY']}")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:500]
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise BufferError(f"HTTP {e.code}: {detail}") from None
        if data.get("errors"):
            raise BufferError(json.dumps(data["errors"])[:800])
        return data["data"]
    raise BufferError("Buffer API unreachable")


def channels():
    """{service: channel} for the first organization on the account."""
    org = gql("{ account { organizations { id } } }")["account"]["organizations"][0]["id"]
    rows = gql("""query($o: OrganizationId!) { channels(input: {organizationId: $o}) {
        id name service isDisconnected isQueuePaused } }""", {"o": org})["channels"]
    out = {}
    for c in rows:
        if not c["isDisconnected"]:
            out.setdefault(c["service"], c)
    return out


def create(channel_id, text, due_at, assets=(), metadata=None, draft=False):
    """Schedule one post for `due_at` (aware datetime). Returns the post dict."""
    inp = {
        "channelId": channel_id,
        "text": text,
        "schedulingType": "automatic",
        "mode": "customScheduled",
        "dueAt": due_at.astimezone(__import__("datetime").timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "assets": list(assets),
    }
    if metadata:
        inp["metadata"] = metadata
    if draft:
        inp["saveToDraft"] = True
    res = gql(CREATE, {"input": inp})["createPost"]
    if "post" not in res:
        raise BufferError(res.get("message") or json.dumps(res))
    return res["post"]


def delete(post_id):
    return gql("""mutation($id: PostId!) { deletePost(input: {id: $id}) { __typename } }""", {"id": post_id})


def video(url, thumb_ms=1200):
    return {"video": {"url": url, "metadata": {"thumbnailOffset": thumb_ms}}}


def image(url):
    return {"image": {"url": url}}
