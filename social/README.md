# SavorScout social

Short videos and posts for TikTok (@wfoodfinds), X and Threads (@campuseatshq),
made from SavorScout's own data and guides and scheduled through Buffer.

## How it runs

Every week brings **4 TikTok videos, 4 X threads and 4 Threads posts**, all
researched and written that week, so there's never the same template on repeat.
Only the soundtracks rotate. A scheduled Claude session does this every Sunday
afternoon for the week ahead. Its playbook is [`WEEKLY.md`](WEEKLY.md), and each
week's scripts and schedule are kept in `weeks/<monday>/`.

The videos are creator-style:
- full-screen footage cut on the beat
- bold outlined captions
- full-screen maps for rankings
- an original soundtrack
- no headers, progress bars or app chrome

## Pieces

| Step | File | Notes |
|---|---|---|
| Video scripts | `weeks/<monday>/videos.json` | Scenes with beats, style, words and footage searches |
| Posts | `weeks/<monday>/posts.json` | X threads, Threads posts, TikTok captions, times, share cards |
| Build | `pipeline/reel.py` | Footage per scene (Pexels), captions fitted to the real font, beat timing, audio mix |
| Soundtracks | `pipeline/music.py` | Original lo-fi, deep house and nu-disco tracks; least recently used plays next |
| Ranking maps | `pipeline/rankmap.py` | A campus, the half mile around it, every place to eat as a dot (Overture Maps) |
| Walking routes | `pipeline/mapdata.py` | Street maps and shortest walking paths (the walkable-five format) |
| Video | `video/` (Remotion) | `Reel` composition for the weekly videos, `Short` for walkable-five |
| Share cards | `pipeline/postcard.py` | 1080x1350 tips cards and ranking charts |
| Week runner | `pipeline/make_week.py` | sounds, build, qa, render, cards, publish |
| Hosting | `pipeline/host.py` | Media on the `social-media` branch (raw.githubusercontent.com), kept 10 days; the soundtrack library in `sounds/` |
| Scheduling | `pipeline/buffer.py` | Buffer GraphQL API |

`history.json` on the `social-media` branch records every clip, track and
week, so footage never repeats and topics don't come back too soon.

## Day to day

- **Pause:** pause or delete the weekly scheduled task in Claude (claude.ai/code,
  scheduled tasks). Posts already in Buffer still go out unless you delete them there.
- **Change something this week:** edit or delete the post in Buffer.
- **Add your own music:** see "Soundtracks" in `WEEKLY.md`.
- **Old daily format:** `.github/workflows/social-daily.yml` still makes a day of
  walkable-five posts, but only when you run it by hand (it needs the
  `BUFFER_API_KEY` and `PEXELS_API_KEY` repository secrets).

Run a week by hand (Node 22, Python 3.13, ffmpeg):

```bash
pip install -r social/requirements.txt && (cd social/video && npm ci)
python social/pipeline/make_week.py sounds /tmp/sounds
python social/pipeline/make_week.py build 2026-11-02 /tmp/sounds /tmp/rank
```

Credits: footage and photos from Pexels; map data © OpenStreetMap contributors
and the Overture Maps Foundation (shown on every map); Inter typeface (SIL
OFL, `video/public/fonts/LICENSE-Inter.txt`). Remotion is free for individuals
and companies of up to three people; a larger company needs a license
(remotion.dev/license).
