# The weekly batch

Every week SavorScout posts **4 TikTok videos, 4 X threads and 4 Threads
posts**, all new: researched and written that week, never a template cycled
from last week. The one thing that repeats is the soundtrack. The library on
the `social-media` branch (`sounds/`) rotates, least recently used first.

A scheduled Claude session runs this every Sunday afternoon and schedules
Monday through Saturday. These are its steps. A person can run them the same way.

## 1. Research what will do well this week

- Search the web, as text, for what is working right now: TikTok and food
  trends this month, what college students are talking about (exams, weather,
  holidays, campus events), and formats that earn saves, shares and comments.
- Check the calendar: exams, breaks, holidays, daylight saving, the first cold
  week, game weekends. Timing is half of reach.
- Read `history.json` on the `social-media` branch (`weeks`) so no topic or
  campus repeats from recent weeks.

## 2. Pick four ideas SavorScout can stand behind

Every claim has to come from SavorScout's own data or guides:

| Source | What it gives you |
|---|---|
| `scripts/data/situations.js`, `situations-more.js` | 30+ guides (`/what-to-eat/<slug>`): finals week, cold night, on a budget, late night, first date... |
| dish guides (`/food/<slug>`, `scripts/data/dishes*.js`) | how to spot a good one, what to order |
| `scripts/data/food-scene.json` | per campus: places within a mile (`n`), within half a mile (`w`), % local (`loc`), busiest food streets (`st`) |
| `scripts/data/campus-cuisine.json`, `social/pipeline/combos.js` | the closest places of one food to one campus |

Never claim what the data can't back: no "best", "cheapest", "open now",
prices or ratings. Mix the formats: an explainer, a ranking with maps, a
seasonal guide, a myth-buster, a walkable list. Lead with whatever is most
timely.

## 3. Write the scripts

`social/weeks/<monday>/videos.json` holds the videos. Each scene has a length in
beats, a style, the words (`*star*` highlights a word) and Pexels searches:

- `hook`: the first 2–3 seconds. Short, specific, a little surprising.
- `cap`: a caption line. `item`: a numbered or named point with a `sub` line.
- `word`: one big word over a quick montage shot. `small`: a white subtitle box.
- `list`: ranked rows over blurred footage. `rank`: a full-screen map
  (`rankmap.py <slug> <lat> <lng> <dir>` builds it).
- `end`: the call to action ("Save this...", "Send this to...", "Where should
  your school be?"), over a reused clip.

`social/weeks/<monday>/posts.json` holds the X threads, Threads posts, TikTok
captions, posting times (ISO with offset) and share-card specs. Last week's
files are the model.

- **X:** a thread of 3–5 posts. The first one has to stand alone. No hashtags, the
  link only in the last reply, every post under 280 characters.
- **Threads:** one conversational post of up to 500 characters that ends in a
  question, one topic tag, and the link in a reply.
- **TikTok:** a question, a "save this" or "send this", 4–5 specific hashtags,
  no links.
- **Times:** spread Monday to Saturday, a few minutes off the hour, never two
  posts on one platform in the same day.

## 4. Build, check every clip, render, publish

```bash
cd social/pipeline
python make_week.py sounds /tmp/sounds
python make_week.py build <monday> /tmp/sounds <rank maps dir>
python make_week.py qa <monday>
```

Look at every QA sheet. Each clip appears at its start, middle and end. Replace
any clip that:

- doesn't show what its caption says, at any point in the clip
- shows a real business's name or logo
- looks dated (face masks) or is low quality

```bash
python reel.py repick ../weeks/<monday>/videos.json <video> '{"3": ["better query", "another"]}'
python reel.py repick ../weeks/<monday>/videos.json <video> '{"3": 8448265}'   # a Pexels id picked by eye
python reel.py refit ../weeks/<monday>/videos.json                            # after editing any words
python make_week.py render <monday>
python make_week.py cards <monday>
python make_week.py publish <monday> /tmp/sounds
```

Watch a few frames of each finished video before publishing. Then commit
`social/weeks/<monday>/` (including `scheduled.json`).

## Soundtracks

`music.py` makes original tracks in three moods: `cozy` (lo-fi), `groove` (deep
house) and `upbeat` (nu-disco). Each script names a mood, and the least recently
used track of that mood plays. To add tracks you own or have licensed, put the
files in `sounds/` on the `social-media` branch with an entry in
`library.json`. Give it a `bpm`, plus `offset` (seconds to the first downbeat)
and a `mood`. A TikTok Business account should only use music cleared for
business use.
