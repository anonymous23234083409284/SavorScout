# The daily batch

Every day SavorScout posts **4 TikTok videos, 4 X threads and 4 Threads
posts**, all new: researched and written for that day, never a template
cycled from before. The one thing that repeats is the soundtrack. The library on
the `social-media` branch (`sounds/`) rotates, least recently used first.

A scheduled Claude session runs this every afternoon and schedules the next
day. These are its steps. A person can run them the same way.

## 0. Read the numbers first, then ask the lab

```bash
python social/pipeline/make_day.py stats    # writes social/stats.json, best first
python social/pipeline/lab.py snapshot      # adds today's numbers to social/lab/snapshots.jsonl
python social/pipeline/crawl.py record      # exact video lengths, so the lab can learn completion rate
python social/pipeline/crawl.py weekly      # niche crawls (YouTube + TikTok, with footage) + model, once a week
python social/pipeline/compete.py weekly    # competitors: their latest videos, hits vs. flops, once a week
python social/pipeline/lab2.py analyze      # after a crawl: Lab v2 rebuilds the playbook from the footage
python social/pipeline/lab.py score         # scores experiments 3+ days old (promote / retry / drop)
python social/pipeline/lab.py report        # writes social/lab/report.md: read it
```

**The lab** (`social/pipeline/lab.py`) is the producer's notebook. It turns
every posted TikTok into features (format, how famous the schools are,
whether the hook names an upset, #1's lead, how many schools, posting time)
and learns, with honest uncertainty, what drives views, watch time and shares.
Then it generates candidate videos from SavorScout's data (conferences,
states, systems, cities, famous schools, rivalries, guess-the-campus, short
cuts, part 2s, two metrics) and picks by **Thompson sampling**: it draws one
plausible version of what it has learned and picks the best ideas under it,
so untested ideas get tried and failures stop being picked. It penalizes
groupings, teases, regions and formats used recently, so it varies itself
instead of copying a template. `report.md` says what it believes and what it
hasn't tested yet.

**The crawler** (`social/pipeline/crawl.py`) feeds the lab better data. Once
a week it pulls short-form videos in SavorScout's niche from the official
YouTube Data API and, through an Apify actor, public TikTok videos from niche
hashtags (college food, campus food, dining halls, food rankings). It judges
each against its own channel (YouTube) or after allowing for the creator's
followers (TikTok), and learns which hooks, lengths and sounds over-perform. Those findings become the lab's starting
beliefs for matching features (a named upset, a guessing game, X vs Y, a
part 2, a short cut); our own results then overrule them. Raw API data stays
in `social/lab/crawl/` (git-ignored, deleted after 30 days); only the learned
findings (`social/lab/niche.json`) are kept. TikTok's terms forbid scraping, so
the TikTok crawl is kept small and impersonal: public video numbers only, no
comments, creators reduced to an anonymous code and a follower count, footage
downloaded only to be measured and reduced to one small frame strip, then
deleted (Apify's copy too). Before each run the crawler reads Apify's meter
and splits what's left of the free $5 a month over the weeks left in the
cycle: competitor tracking first, the niche search gets the rest, and the last
$0.25 is never spent. Keys live in the environment's network secrets
(www.googleapis.com and api.apify.com); a missing one just skips that source,
and the lab carries on with its own data.

**Private lab data survives restarts.** Everything git-ignored that the labs
learn from (`social/lab/crawl/`, the review strips) is saved to a private,
named key-value store in the owner's Apify account (`crawl.py sync up`) and
brought back after a container restart (`crawl.py sync down`; the weekly
steps do both). It never goes into git.

**Competitors** (`social/pipeline/compete.py`, watchlist in
`social/competitors.json`). The accounts closest to ours, each checked before
joining (active, mostly in our niche): state-by-state college countdowns, a
city school-ranking countdown, college-ranking slides, food spots near NYU and
three college-food series. Each week it pulls their newest videos (enough to
reach back ~9 days of their posting) and compares every video with **its own
account's typical video**, so audience size drops out and what separates a
hit from a flop is the content. It measures the footage of each account's top
3, bottom 3 and typical videos, and writes `social/lab/compete-report.md`
(hook types, topics, length and pacing that win inside accounts, how many
accounts agree, and us vs. their hits). To add an account: `compete.py
discover` (search) and `compete.py validate <handle>`, then add it to the
watchlist. Their captions, opening lines and frame strips stay private and are
deleted after 30 days; we learn patterns, never copy their content.

**Lab v2** (`social/pipeline/lab2.py`, with `vision.py`) learns from the
footage itself. Each week ~100 recent, top-performing food TikToks (all food,
not just college) are downloaded, measured and deleted: shot lengths and
cuts, hard cuts vs. dissolves and fades, motion and zooms, the opening frame
(words on screen, faces, brightness), how much of the video carries text,
whether the end loops to the start, and loudness. Performance is a breakout:
views after allowing for followers and age. Lab v2 compares winners with
losers, fits one model of everything at once, finds the sweet spots for the
settings we control, and writes `social/lab/playbook.json` and
`social/lab/lab2-report.md`. The targets come from videos we could make (no
on-camera person carrying the video). The scripter reads the settings: punch-in
cuts on map scenes to reach the target shot length, the hook length, and
looping endings when the evidence is clear. One video in four flips one
setting so our own results can confirm it. After rendering, `lab2.py check
<date>` scores every video against the playbook; fix anything it flags that
you can before publishing.

**Expert review (weekly, with the crawl).** Numbers alone can't say *why*, and our own videos
alone can't say what's possible. Once a week run `python social/pipeline/review.py` and read the
whole pack in `social/out/review/` next to `lab2-report.md` and `compete-report.md`:
- **Ours:** `table.md` (views, completion, shares per 1,000, hook, tease) and frame strips of our
  best and worst countdowns at 0-10 s.
- **Competitors:** `compete/sheet-<account>.jpg` (each account's best videos above its worst, the
  same six moments, labelled against the account's typical video), `compete/hits.jpg` and
  `compete/flops.jpg` across accounts, and `compete/index.md` (captions, opening lines, links).
- **The food niche:** `niche-top.jpg` / `niche-bottom.jpg` (biggest and smallest breakouts).

Then rewrite `social/lab/expert-review.md`: what works and what flops **for competitors and for
us**, the mechanism, how sure (high / medium / low), and what to change in order of impact. Look at
the frames, not just the tables: what happens in their first second, how fast the first reveal
comes, how they frame the ranking, what makes people share. Turn each conclusion into an action
(a trends.json boost, an experiment, or a script change) and check last week's conclusions against
the new numbers. Describe their patterns in our own words; never reuse their footage, text or
music.

**Trends.** After the research step (1), write `social/lab/trends.json` when
something in the news should lift an idea (a school in the headlines, a big
game, a viral campus moment):

```json
{"date": "2026-11-12", "boost": [{"match": "Ohio State|Michigan", "weight": 0.2, "why": "The Game is in two weeks"}]}
```

`match` is a regex over the schools' names and the grouping key; `weight` is
in log-views (0.1 small, 0.3 large). The lab also knows a calendar (rivalry
week, Thanksgiving, finals, conference championships).

**Plan and script:**

```bash
python social/pipeline/lab.py plan <date>     # 2 proven countdowns + 2 one-change experiments, with reasons
python social/pipeline/lab.py script <date>   # writes batches/<date>/videos.json and posts.json
python social/pipeline/lab.py maps <date>     # "slug lat lng [street]" lines for rankmap.py
```

Use the lab's picks unless one is wrong: bad data (check every map), a
grouping that reads badly, or a fact you can't stand behind. Then take the
next candidate from `social/lab/plan-<date>.json` or write one by hand, keep
the `"lab"` field on every video (it's how the lab learns), and say why in the
report. Then do steps 4 and 5 as always: every line read as a first-time
viewer, every clip checked.

TikTok decides how far a video travels mostly by **average watch time**:
it shows each new video to a small test audience and keeps pushing only the
ones people stay with and share. What the account's first week showed:

- Most videos held viewers for **1.3 to 3 seconds** of 37 to 50. People left
  before the second scene, so nothing after second two mattered.
- The **Big Ten countdown** (schools ranked by places to eat within half a
  mile, last place to first) held them about **9.5 seconds**, got **9 shares**
  and drew 395 views on Threads, against 0 to 57 for every other Threads post.
- "How to tell cheap food from bad food" was second (about 5 seconds, 10 likes).
- Generic explainers (ramen broths, eating alone, late-night food) did worst.
- X showed most posts to 0 to 4 people. A new account with no followers gets
  almost no reach there, so keep X posts short and don't spend effort on it.

Re-read this every day and follow the numbers, not this list: whatever holds
people longest and gets shared is what to make more of.

## The daily mix: 2 proven + 2 experiments (from Nov 12)

The goal is an average of **1,000+ views per video**. By Nov 11, 15 of 17
countdowns had passed 1,000 (median about 2,400), while every "how to tell"
tip stayed at 230–390 with no shares. So the tip slot is gone. Each day:

- **2 countdowns** (the proven format below), keeping the floor high. Vary
  them: a new grouping or a new metric, a different tease, never the same
  hook wording two days running.
- **2 experiments**, each changing **one thing** from the countdown so the
  result says what caused it. Pick from the backlog in
  `social/experiments.json` (or add a new idea there first), never the same
  experiment twice in one day.

**Scoring, 72 hours after posting** (use `make_day.py stats`):
- 1,000+ views and 9+ seconds average watch: **promote**. It joins the proven
  rotation and can take a countdown slot.
- Under 500 views: **drop** it, and note why you think it missed.
- In between: **retry once** with one tweak.

Every run starts by scoring the experiments that are 3+ days old and writing
the result into `social/experiments.json` (`results`), then picks today's
two. The famous-name groupings (UC, Ivy, Penn, the old Pac-12) have done best,
so lean on recognisable schools in both slots.

## The proven format: countdowns

**Countdowns of named schools.**
People stay to see where their school lands, argue in the comments and send
it to friends at the other schools. Group the schools by something people
identify with: a conference (Big Ten, SEC, ACC, Big 12, Big East, Ivy
League, Mountain West...), a state ("every big university in Texas"), a
system (UC, Cal State, SUNY, CUNY), a city, HBCUs, or schools with famous
rivalries. Rank by a number from `food-scene.json`: places to eat within a
10-minute walk (`w`), the share on one street (`st`), coffee shops (`cof`),
local restaurants (`loc`), fast food (`ff`), cuisines (`cz`, `top`). Don't
repeat a grouping and metric within two weeks (Big Ten Nov 1; SEC and Ivy
League Nov 4).

How a countdown is built (`social/batches/2026-11-04/videos.json`, `sec-walkable`):

1. **The hook, about 4 seconds, over the #1 school's map** (`"style": "hook",
   "map": <slug>`): a question naming the group and the measure, plus a
   tease. "Which SEC school has the most restaurants within a 10-minute
   walk?" with "Guess before it shows." or "Hint: it's not Columbia." The first
   scene's words are on screen at frame 0, and the map fills with dots while
   people read. Never open on stock footage.
2. **The bottom of the ranking as a list**, last place first (`list`, rows
   paced about 0.75 s each).
3. **The top five as full-screen maps**, #5 down to #1 (`rank` scenes with
   `num`, the count, and the busiest food street as the sub line). Ties share
   a rank ("Tied with Georgia for 3rd").
4. **The end**: "Did we rank your school right? Comment below." with "Which
   conference should we rank next?"

Keep it to 30 to 40 seconds. For a single-campus number (NYU's 1,462), open
on that campus's `rank` scene with the question as its title
(`"text_style": "maptitle"`), so the count climbs from the first frame.

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
prices or ratings. Follow "The daily mix" above: two countdowns of named
schools and two experiments from `social/experiments.json`.
Use the X and Threads posts for the same rankings (with a ranking card), and
for the guides' tips.

## 3. Write the scripts

`social/batches/<date>/videos.json` holds the videos (`"date"` is the day they
post; a day's second batch goes in its own folder, like `2026-11-02b`, with
`"batch": "2026-11-02b"` beside the date). Each scene has a length in beats, a style, the words (`*star*`
highlights a word) and Pexels searches:

- `hook`: the first 3–4 seconds. Short, specific, a little surprising. Its
  words show from frame 0. With `"map"` it opens on a campus map instead of footage.
- `cap`: a caption line. `item`: a numbered or named point with a `sub` line.
- `word`: one big word over a quick montage shot. `small`: a white subtitle box.
- `list`: ranked rows over blurred footage. A row can carry a fourth item,
  a small line under the name (`["1", "UNC Chapel Hill", "70%", "Franklin St"]`).
- `rank`: a full-screen map (`rankmap.py <slug> <lat> <lng> <dir>` builds it).
  Give it a street (`rankmap.py <slug> <lat> <lng> <dir> "Franklin St"`) and
  the map covers a mile, dims every other place, and lights up that
  street's places one by one. The scene's `label` and `suffix` replace the
  default "places to eat within ½ mile" under the number (`"suffix": "%"`).
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
python crawl.py record <date>        # store each video's length for the lab
python lab2.py check <date>          # score each video against the playbook; fix what it flags
python make_day.py cards <date>
python make_day.py publish <date> /tmp/sounds
python make_day.py verify <date>     # reads all 12 posts back from Buffer
```

`verify` checks every post against `posts.json`: text, thread parts, Threads
topic, time, and that each video or card is attached and served. A post
that has already gone out shows its live link.

A Pexels id picked by eye is pinned in the script (`"clip": 8448265` on the
scene), and a video can pin its soundtrack (`"track": "disco-105"`). If only
part of a clip works (someone lifts the glass out of frame at 7 seconds), set
`"clip_from"` to the second the scene should start from. So when the
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
