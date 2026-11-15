# Formats: what we found, why it works, and how we use it

The strategy is a **trojan horse**: the video is a joke people would share with no product in
it, and SavorScout rides inside (the cast, one real number, one line at the end). This file is
the evidence and the recipes. `BIBLE.md` is the taste (how to write a funny line); this is the
shelf of shapes to pour it into.

How it's fed: `python social/pipeline/hook_hunter.py hunt` (weekly) searches TikTok for short
scripted videos that got far more views than their creator has followers and saves their spoken
scripts in `social/lab/crawl/hooks/` (private, not in git). Read `weekly_formats.json` and
`near_misses.json`, add any new shape here, write our own episode in it.

**The line we don't cross:** a format (who talks, what the game is, where the turn comes, how
long) is free to reuse. The words, footage, sound and characters are someone's work. We write
every line ourselves and never paste a script, a caption or a clip.

## 1. First hunt (Nov 15, 2026)

252 videos scraped for $0.85 of Apify credit (232 from 22 search phrases, 20 from Cluely).
The strict filter (12-35 s, 50,000+ views, views at least 5x the creator's followers, 25+ spoken
words) kept **11**; another **15** passed everything but length (36-90 s). Most rejections were
length (140 of 232): comedy skits mostly run 40-90 seconds, so read the near misses too.
Phrases about a situation ("free college food", "that one friend who", "pov your roommate")
found far better material than generic hook phrases ("the dark side of", "nobody talks about"),
which mostly returned edits, advice and news.

| what | numbers | the shape |
|---|---|---|
| Two friends, one phone | 5.7M views, 187,800 shares (3.3%), 24 s | **The Withheld Reveal** |
| "Where do you want to eat" as a hostage negotiation | 1.0M views, 28,500 shares (2.9%), 77 s, animated | **The Second-Person Spiral** |
| "Free college food, part 1" | 22.7M views from 45,600 followers (498x), 70 s | **The Deadpan Survival Series** |
| A receipt that talks to you | 604,500 views, 5,593 shares, 23 s | **The Talking Object** |
| "Only eating free food for a day at Duke" | 5.9M views, 31 s | **One Rule For A Day** |
| A roommate who turns out to be a monster | 411,600 views (20x), 20 s | a two-line premise skit |

Share rate is the number to watch: the two videos about a feeling everyone has had (a friend
who won't show you; a partner who "isn't picky") were shared by about 3% of viewers. Most
videos sit under 0.5%.

## 2. Case study: Cluely (20 newest videos, 130,500 followers)

Median 173,750 views; best 1.2M; worst 29,200. What they do:

1. **It's a sitcom, not ads.** Every video is an episode ("Ep 34: salaries get leaked") of an
   office comedy with a fixed cast: the brutally blunt star engineer, the coworker he
   torments, the boss, HR. People follow characters, and each episode advertises the others.
2. **The brand is the place, not the pitch.** The company is where the show happens and a
   hashtag. In 20 videos the product is pitched in about three.
3. **The pitched ones are the worst.** The episode whose caption opens "TRY our new app...
   Link in bio!!" got 34,900 views, a fifth of the median; the top videos have no pitch at all.
   Selling in the caption's first line tells the viewer, and the algorithm, it's an ad.
4. **One extreme trait, pushed.** The star has no filter. Every scene asks "what would he say
   here?" and goes one step further than expected. The other characters exist to be shocked.
5. **Cold opens.** First lines are an accusation or a question mid-argument ("can you explain
   why he makes eight times as much as me?"). Nobody says hello.
6. **Mockumentary cutaways.** Scene, then a character alone explaining themselves to camera,
   then back. It lets a joke be told twice: what happened, and the excuse.
7. **Relatable titles.** "POV: trying to socialize with...", "that one coworker who...", "tag
   that coworker". The title is the viewer's own life; the video is the exaggeration.
8. **Sequels fade.** "Pt 2" and arc episodes that need the previous one did worst. Every
   episode must work cold.

What we take: recurring cast with one trait each (Milo: delusional confidence; Scout: calm
until the one blow-up), numbered episodes, the brand as a character, cold opens, a to-camera
aside, relatable titles, no pitch before the last five seconds. What we leave: their humour
leans hard on ethnic stereotypes and insults. It gets views and it would get a student brand
dropped by the campus accounts and newspapers we're courting. Our edge is absurd specifics
(a three-week-old stale peanut), not targets.

## 3. The shelf

Each recipe: the game, the skeleton, and how SavorScout rides inside. Lengths are the finished
video. `show.py` builds all of these from the same beat types.

**The Rescue** (ours; `gold/four-dollars.json`). 35-47 s. A terrible plan, the wrong name, the
read and the blow-up, the number, the ungrateful thanks. Skeleton in `BIBLE.md` section 6.

**The Withheld Reveal** (`gold/no-way.json`). 25-35 s.
- Game: A reacts harder and harder to their phone; B only ever asks to see.
- Skeleton: reaction / "What?" / bigger reaction / "What is it?" / "you would not believe it" /
  B finally demands it / the reveal / a flat button.
- Rule: A never describes the thing. Every A line is bigger than the last; every B line is
  shorter. In the original there is no reveal at all (that's the joke).
- Ours: the reveal is the real map and count, and Scout's button is "I made that."

**The Second-Person Spiral** (`gold/five-stages.json` is the no-face cousin). 30-60 s.
- Game: a narrator tells YOU what you're doing, as if it were a thriller or a nature film,
  while something tiny (choosing dinner) goes wrong in stages.
- Skeleton: the trap ("they ask where you want to eat") / three rejected offers / the
  metaphor that names the game ("this is now a hostage negotiation") / escalation / you give
  up / they suggest your first idea as their own.
- Rule: present tense, "you", short sentences, the ending returns to the start.
- Ours: Milo and Scout act it silently while the narrator talks, or memes carry it; the number
  arrives as the thing you didn't know ("there were 1,462 places the whole time").

**The Deadpan Survival Series.** 25-45 s, numbered ("Broke food, part 6").
- Game: total sincerity about something very small. No jokes in the wording at all; the
  comedy is the gap between the tone (a cooking show) and the thing (one potato).
- Skeleton: "Part N." / today's limit / three earnest steps / a polite safety note about
  something trivial / a modest verdict / "thank you for joining me."
- Ours: Milo hosts, completely proud ("Today my budget was four dollars"). Scout appears for
  one line with the number. Numbering makes people look for parts 1-5.

**The Talking Object.** 15-25 s.
- Game: the thing itself speaks, in the first person, a little offended.
- Skeleton: "Stop." / what you just did to it / the fact / "every time you..." / the ask.
- Ours: the vending machine ("You again."), the instant noodle cup, the dining-hall door at
  9:01 pm, Milo's bank balance. Needs one drawn prop with a mouth; the phone, the plan and the
  noodle cup already exist in `Stage.tsx`.

**One Rule For A Day.** 25-35 s.
- Game: a rule stated in the first line ("only eating free food for a day at <school>"), then
  a fast list of how it went, each item one sentence.
- Ours: needs real footage or a real person, so it's for a human with a phone, not the
  automated run. Worth doing if a student ambassador ever wants to make videos.

**The Office Sitcom** (Cluely). 45-120 s. Our version is the Milo-and-Scout episodes with a
to-camera aside: after a scene, cut to Milo alone, looking at the camera, explaining himself.

## 4. Trojan-horse rules

1. The video must be funny with the last five seconds cut off. If it isn't, it's an ad.
2. SavorScout appears as: Scout (a character), one true number (a punchline), the name said
   wrong (a running joke), and one line at the very end. Never more.
3. The caption is the viewer's life ("that one friend who won't show you their phone"), not
   the product. No link talk, no "check out", nothing about the site in the first line.
4. Every episode stands alone. Number them, but never require the last one.
5. One game per video. If you can't say the game in six words, there isn't one.
6. Under 35 seconds when the game is one joke; up to 50 when there's a story. Cut the
   explanation, keep the reaction.
7. A meme is a reaction held under four seconds, never the joke itself.

## 5. Each week

1. `python social/pipeline/hook_hunter.py budget`, then `hunt` (it sizes itself to what's left;
   about $0.50 buys 100 videos). `keywords` shows which phrases pay; drop the dead ones from
   `social/hooks.json` and add situations students actually say out loud.
2. Read the new scripts. For each one worth keeping, write down the game in six words, the
   skeleton, and where the turn is. Add it to section 3 if it's new.
3. Write three episodes in the best shape with our cast and our lines (`BIBLE.md` section 7),
   `show.py lint`, voice them, build, watch, ship the ones that score 8 of 10.
4. When our own numbers come in (shares first, then views), note which shapes earned them here.
