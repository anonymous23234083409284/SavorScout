# Expert review: what works, what flops, and why (Nov 11, first week with competitors)

**Evidence, from three angles**

- **Competitors.** 7 TikTok accounts closest to ours (`social/competitors.json`), each checked
  before joining: active, and mostly posting in our niche. 58 of their videos are old enough to
  judge (3+ days), each compared with **its own account's typical video**, so audience size drops
  out. 48 had their footage measured and kept as frame strips (each account's top 3, bottom 3 and
  2 typical), plus the opening line spoken in each (TikTok's own captions). Numbers:
  `compete-report.md`.
- **The food niche.** 76 measured recent food TikToks (`lab2-report.md`), with frame strips of
  the 8 biggest and 8 smallest breakouts.
- **Us.** All 34 SavorScout TikToks: views, watch time, completion, shares, and frame strips of
  the best and worst countdowns.

Confidence: **high** = large and consistent across many videos or accounts; **medium** =
consistent but few accounts or confounded; **low** = a lead worth testing. This is week one of
competitor tracking (about 10 judged videos per account); findings firm up each week.

## What works for competitors, and why

1. **A map countdown that moves and talks from the first frame.** The two closest format
   twins (a state's colleges ranked; a city's high schools ranked by strictness) use our ingredients:
   a map of the place, an outline, numbered entries. They get 4K-25K typical views on about 16K
   followers, up to 108K. In every one of their videos:
   - the map is already zooming in at 0 s;
   - a voice asks the question from the very first frame and announces the first entry within
     about 3 seconds;
   - one large word is on screen at a time, captioning the voice, instead of a block of text;
   - a real photo of each place appears with its number, from about 6 s;
   - a new entry comes every ~4 seconds.

   **High** (identical across every video of both accounts).

2. **A list with a loser, so people argue and forward it.** The state college countdown frames
   each list as a provocation (which colleges are the worst) and asks whether your school made
   the list. Its college countdowns get **12-30 shares per 1,000 views** (median ~16); our state
   countdowns get about 3. Our own best sharers had rivalry built in (UC system 13.5, Big 12 25).
   Mechanism: when a list names a loser, people send it to a friend at that school. **Medium-high**
   (one account, plus the same gap in our own videos). We won't copy their insult; our data has
   an honest loser in every list: the campus with the fewest restaurants within a 10-minute walk.

3. **Colleges beat high schools, roughly 100 to 1.** The same account, same template: the
   college countdowns got 4K-108K views; its high-school versions got about 200. The pull is the
   college audience. **Medium** (the gap is huge, but the high-school videos were also its first
   posts).

4. **About a minute long.** In all 6 accounts with measured footage, the hits ran longer than
   the flops (median 63 s vs. 56 s), and a video shorter than the account's usual length got about
   half its typical views. Their hits sit at 55-70 s, many just past one minute. (That's the
   minimum length for TikTok's creator payouts, which may be why so many land there.) Ours
   average 35 s. **Medium-high** (consistent in every account, though the gap inside each is
   modest).

5. **The same format, every day.** Identical videos swing 10-50x on the same account. The college
   lunch series ran 77K to 12.5M views with the same line; the city countdown ran 753 to 59K. Much
   of a single video's result is the first test audience and the place. The winners post the same
   template daily and let the hits come. **High.**

6. **Big, close-knit audiences.** Illinois (108K), Indiana (44K), Iowa (39K) and Georgia (29K)
   beat Idaho (4K): many schools, many students who know each other's schools. **Medium.**

7. **A single ranking fact, shown instantly.** An admissions account's 6-8 s posts showing one
   published college ranking got about 380K-390K views, against 500-5K for its advice videos. The
   answer is on screen from the first frame. **Low-medium** (one account, but a 100x gap).

8. **A cheap, surprising price says "college" on the food side.** The lunch series (a hand
   building a plate, the price in a small caption the whole time, no face) is the biggest account
   we watch. **Medium.**

## What flops for competitors

1. **Leaving their own format.** The dining-hall creator's coffee-shop tour (0.15x its typical),
   the state account's high-school versions (0.01x).
2. **Talking over pure food visuals.** The dining-hall creator's music-only creations hit 2.1M;
   its videos where she talks got 0.15-0.3x. Voice carries a countdown; it doesn't help a food
   close-up.
3. **Faster cutting didn't help.** Inside these accounts the hits cut slightly *less* often (a
   shot every ~3.9 s) than the flops (~3.3 s). Our 3.8 s is already in range. **Medium.**
4. **One shop or a promotion instead of a list.** The NYU food creator's compilations of
   several spots did about 2x her typical; single-shop and sponsored-giveaway videos got about
   half. **Low-medium.**

## What the wider food niche adds

The biggest food breakouts are mostly people on camera (ordering, eating, reacting), which isn't
our format. Three things carry over:
- the payoff fills the first frame;
- the opening line is 8 words or fewer;
- something moves from the first frame.

Lab v2 says the same in numbers: winners put 2-7 words on the first frame.

## Us: what works, what doesn't

- **Works:** countdowns (median 2,230 views vs. 261 for tips); conferences and systems for shares
  (about 15 per 1,000); a famous school's surprise placing in the caption.
- **Doesn't:**
  - **The opening.** Our frames at 0, 1, 2.5 and 4 s are identical: a dark map, 12 words, no
    voice, nothing moving. The first entry comes at 6-10 s.
  - **Length.** At 35 s we're short of where competitors' hits sit.
- **Changed my mind:** last week I said to use state lists only for rivalries or famous upsets.
  Competitors show state lists can do very well (17K-108K) when the framing gives people
  something to dispute. **It's the framing, not the grouping.**

| | ours | their hits |
|---|---|---|
| words on the first frame | 12 | 2-4 |
| movement at 0 s | none | map already zooming |
| voice | none | from the first frame |
| first entry | 6-10 s | about 3-6 s |
| length | 35 s | 55-70 s |
| shares per 1,000 views | 2.7 (states ~3) | ~4 overall; 12-30 for state college countdowns |

## What to change, in order of expected impact

1. **Rebuild the opening: motion and a voice from the first frame.**
   - What changes:
     - The map is already zooming toward the region at 0 s.
     - A short spoken question (10 words or fewer) with one-word captions replaces the
       four-line block.
     - The first entry lands by about 3 s.
   - Pipeline needs: a text-to-speech voice (an open-source one runs inside the pipeline; no
     new account) and word-timed captions.
   - Test: 1 video in 4 first.
   - Needs the owner's OK: it gives the brand a voice. (The backlog's "voice" experiment, now
     with evidence.)
   - **Expected: large. Sure: high that it matters, medium on the size.**
2. **Give every list a loser.** For example: which campus in a state is stuck in a food desert,
   ranked from fewest to most restaurants within a 10-minute walk, with the loser named at the
   end. Close with an open question: did your school make it, and is the ranking fair? It's about
   food access, never about the students. **Expected: large on shares. Sure: medium.**
3. **Countdowns of 55-60 s with 12-15 schools** (about 4 s each), inside the owner's 60 s cap.
   Ask the owner about going just past a minute, where competitors' hits cluster.
   **Sure: medium-high.**
4. **Big states, conferences and systems first:** California, Texas, New York, Pennsylvania,
   Illinois, Ohio, Florida, Georgia, North Carolina, Michigan.
5. **A real photo of each campus** next to its number (licensed images, e.g. Wikimedia Commons
   with credit). Every format-twin entry has one. **Sure: medium.**
6. **Judge formats on 4+ videos.** Identical videos swing 10-50x, so one flop isn't a verdict.
   Keep the two proven slots daily.
7. **A single-fact short (15 s):** one striking result, the answer on screen within a second.
   **Sure: low-medium.**

**What would change my mind:** if voice-and-motion openings don't lift completion above our 26%
within 8 videos, or loser-framed lists don't beat our state lists on shares per 1,000, drop them.
If competitors' new hits stop clustering near one minute, revisit length.

_Written from social/out/review/ (python social/pipeline/review.py): our table and strips, the
competitor sheets and index (private), the niche sheets (private), lab2-report.md and
compete-report.md. Redone weekly; the next review checks these against a second week of
competitor data and our first tests._
