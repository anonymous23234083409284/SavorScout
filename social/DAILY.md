# The daily batch

Every day SavorScout posts **4 TikTok videos, 4 X threads and 4 Threads
posts**, all new: researched and written for that day, never a template
cycled from before. The one thing that repeats is the soundtrack. The library on
the `social-media` branch (`sounds/`) rotates, least recently used first.

A scheduled Claude session runs this every afternoon and schedules the next
day. These are its steps. A person can run them the same way.

## 1. Research what will do well tomorrow

- Search the web, as text, for what is working right now: TikTok and food
  trends this week, what college students are talking about (exams, weather,
  holidays, campus events, game days), and formats that earn saves, shares
  and comments.
- Check tomorrow's calendar: day of the week, exams, breaks, holidays, weather,
  game day. Timing is half of reach.
- Read `history.json` on the `social-media` branch (`batches`, and `weeks`
  from before) so no topic, campus or format repeats from the last two weeks.

## 2. Pick four ideas SavorScout can stand behind

Every claim has to come from SavorScout's own data or guides:

| Source | What it gives you |
|---|---|
| `scripts/data/situations.js`, `situations-more.js` | 30+ guides (`/what-to-eat/<slug>`): finals week, cold night, on a budget, late night, first date... |
| dish guides (`/food/<slug>`, `scripts/data/dishes*.js`) | how to spot a good one, what to order |
| `scripts/data/food-scene.json` | per campus: places within a mile (`n`), within half a mile (`w`), % local (`loc`), busiest food streets (`st`) |
| `scripts/data/campus-cuisine.json`, `social/pipeline/combos.js` | the closest places of one food to one campus |

Never claim what the data can't back: no "best", "cheapest", "open now",
prices or ratings. Four videos a day means variety inside the day, so mix the
formats: an explainer, a ranking with maps, a seasonal guide, a myth-buster, a
walkable list, a "what to order". Lead with whatever is most timely.

## 3. Write the scripts

`social/batches/<date>/videos.json` holds the videos (`"date"` is the day they
post; a day's second batch goes in its own folder, like `2026-11-02b`, with
`"batch": "2026-11-02b"` beside the date). Each scene has a length in beats, a style, the words (`*star*`
highlights a word) and Pexels searches:

- `hook`: the first 2–3 seconds. Short, specific, a little surprising.
- `cap`: a caption line. `item`: a numbered or named point with a `sub` line.
- `word`: one big word over a quick montage shot. `small`: a white subtitle box.
- `list`: ranked rows over blurred footage. `rank`: a full-screen map
  (`rankmap.py <slug> <lat> <lng> <dir>` builds it).
- `end`: the call to action ("Save this...", "Send this to...", "Where should
  your school be?"), over a reused clip.

`social/batches/<date>/posts.json` holds the X threads, Threads posts, TikTok
captions, posting times (ISO with offset) and share-card specs.
`social/batches/2026-11-02/` is the model.

- **X:** a thread of 3–5 posts. The first one has to stand alone. No hashtags, the
  link only in the last reply, every post under 280 characters.
- **Threads:** one conversational post of up to 500 characters that ends in a
  question, one topic tag, and the link in a reply.
- **TikTok:** a question, a "save this" or "send this", 4–5 specific hashtags,
  no links.
- **Times** (`social/config.json` `slots`, New York time, a few minutes of
  jitter):
  - TikTok at about 12:20, 3:20, 6:20 and 9:20 PM
  - X an hour apart at about 4:40, 5:40, 6:40 and 7:40 PM
  - Threads an hour apart at about 5:10, 6:10, 7:10 and 8:10 PM

## 4. Check every word

Read every caption, sub line, card and post as someone scrolling past who has
never heard of SavorScout. Fix anything that could be read two ways:

- **One plain sentence per line.** No headline-ese or stacked modifiers. The
  owner flagged "Big Ten schools ranked by how much food you can walk to": it
  reads as "the top ten schools" or "big ten tips". "Which Big Ten campus has
  the most restaurants within a 10-minute walk?" says what it means.
- **Name the thing.** Say restaurants, places to eat, campus. Avoid vague
  stand-ins like "food you can walk to", "spots" or a bare "it".
- **No insider words.** Spell out or drop jargon like "turnover",
  "leoparding" or a conference name with no context.
- **Every number gets its unit and its scope:** "within half a mile of
  campus", "38% of 910 campuses".
- **The hook has to make sense on its own,** before the next scene explains it.

After rendering, read the captions again on the actual frames, at phone size.

## 5. Build, check every clip, render, publish

```bash
cd social/pipeline
python make_day.py sounds /tmp/sounds
python make_day.py build <date> /tmp/sounds <rank maps dir>
python make_day.py qa <date>
```

Look at every QA sheet. Each clip appears at its start, middle and end. Replace
any clip that:

- doesn't show what its caption says, at any point in the clip
- shows a real business's name or logo
- looks dated (face masks) or is low quality

If Pexels has no honest match for a label, change the label to something it
does have, or show what defines the thing instead (soy sauce for shoyu, salt
for shio). Only put real candidates in front of yourself: preview sheets of a
few searches, then start/middle/end frames of the finalists, before you pick.

```bash
python reel.py repick ../batches/<date>/videos.json <video> '{"3": ["better query", "another"]}'
python reel.py repick ../batches/<date>/videos.json <video> '{"3": 8448265}'   # a Pexels id picked by eye
python reel.py refit ../batches/<date>/videos.json                            # after small word edits
python make_day.py render <date>
python make_day.py cards <date>
python make_day.py publish <date> /tmp/sounds
```

A Pexels id picked by eye is pinned in the script (`"clip": 8448265` on the
scene), and a video can pin its soundtrack (`"track": "disco-105"`). So when the
words change enough to need new timing, just run `build` again: pinned clips and
tracks come back exactly as reviewed. `refit` only re-fits captions into the
old timing. Rejected clips (wrong subject, a business name or logo) go into
the batch's `rejected-clips.json`, and publishing adds them to `history.json`
so no later day picks them again.

Watch a few frames of each finished video before publishing. Then commit
`social/batches/<date>/` (including `scheduled.json`).

## Soundtracks

`music.py` makes original tracks in three moods: `cozy` (lo-fi), `groove` (deep
house) and `upbeat` (nu-disco). Each script names a mood, and the least recently
used track of that mood plays. Four videos a day work through the library
fast, so add tracks as it repeats:

- **More original tracks:** `python music.py build <library dir> <count>`, then
  publish.
- **Tracks you own or have licensed:** put the files in `sounds/` on the
  `social-media` branch with an entry in `library.json`. Give it a `bpm`, plus
  `offset` (seconds to the first downbeat) and a `mood`. A TikTok Business
  account should only use music cleared for business use.
