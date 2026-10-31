# SavorScout social

Short videos and posts made from SavorScout's own campus x food pages
(`/campus/<school>/<food>`), scheduled through Buffer to TikTok, X and Threads.

Every day at about 10 a.m. New York time, a GitHub Actions workflow
(`.github/workflows/social-daily.yml`) makes:

- **4 TikTok videos.** Each is one campus and one food: the five closest places
  on foot, each with a real walking route drawn on a map, the walking time and
  distance, background footage that matches what the place serves, and an
  original soundtrack. About 21 seconds, 1080x1920.
- **4 X posts and 4 Threads posts.** Three are built from the same pages, as a
  list with walking times plus a share card (the map and the list). The page link
  goes in a reply, so the post itself carries no link. The fourth is a question for
  replies.

Posts go out at the times in `config.json`, each a few minutes off the hour so
days don't look automated.

## Setup (once)

1. **Merge this into `main`.** GitHub only runs scheduled workflows from the
   default branch.
2. **Add two repository secrets** under Settings > Secrets and variables > Actions >
   New repository secret:
   - `BUFFER_API_KEY`: your key from publish.buffer.com/settings/api
   - `PEXELS_API_KEY`: your key from pexels.com/api
3. **Optional: try it first.** Under Actions > Daily social batch > Run workflow,
   tick "Build and render only". The run's artifact has the videos, cards and
   `posts.json`, and nothing is posted.

## Day to day

- **Pause:** Actions > Daily social batch > ··· > Disable workflow.
- **Approve before posting:** set `"mode": "draft"` in `config.json`. Everything
  lands in Buffer as drafts.
- **Change the times:** edit `slots` in `config.json` (24-hour, New York time).
- **Redo a day:** Run workflow with that date and "Redo a date" ticked. Delete
  the day's old posts in Buffer first.
- **Fewer videos:** lower `videos_per_day`.

## How it works

| Step | File | Notes |
|---|---|---|
| Pick 4 pairs | `pipeline/combos.js`, `make_batch.py` | Different campuses, foods and states each day. A pair runs once per round. About 190 pairs, so about 48 days per round. Later rounds show the next five places. |
| Map + routes | `pipeline/mapdata.py` | Streets, buildings, parks and campus outlines from Overture Maps (free, no key). Shortest walking path over streets and footpaths. |
| Footage | `pipeline/clips.py` | Pexels, matched to each place's cuisine, trimmed and graded. |
| Soundtrack | `pipeline/audio.py` | Synthesized deep house at 120 BPM, so every cut lands on a beat, plus effects. Nothing to license. |
| Text fitting | `pipeline/props.py` | Measures names with the real font. |
| Video | `video/` (Remotion) | `render.mjs` renders the batch. `npm run studio` previews it. |
| Share card | `pipeline/card.py` | 1080x1350 image for X and Threads. |
| Captions | `pipeline/posts.py` | Templates that rotate. Facts only, never "best", "cheap" or "open now". |
| Hosting | `pipeline/host.py` | Media goes on the `social-media` branch, served from raw.githubusercontent.com, kept for 2 days. |
| Scheduling | `pipeline/buffer.py` | Buffer GraphQL API. |

`history.json` on the `social-media` branch records which pairs, clips and
questions have run, so nothing repeats.

Run it by hand (Node 22, Python 3.13, ffmpeg):

```bash
pip install -r social/requirements.txt && (cd social/video && npm ci)
python social/pipeline/make_batch.py --dry-run
```

Credits: footage from Pexels; map data © OpenStreetMap contributors and the
Overture Maps Foundation (shown on every map); Inter typeface (SIL OFL,
`video/public/fonts/LICENSE-Inter.txt`). Remotion is free for individuals and
companies of up to three people; a larger company needs a license
(remotion.dev/license).
