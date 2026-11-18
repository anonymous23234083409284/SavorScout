# What the lab has learned

Learned from **58 TikToks** posted 2026-11-01 to 2026-11-17. The model explains about 84% of the differences in views (in-sample, so treat it as a guide). Multipliers below are on views; "clear" means the data shows it repeatedly, "likely" means it leans that way, "unclear" means not enough evidence yet.

**Last 7 days:** 23 videos, median 803 views, 9 of 23 at 1,000+.

## What drives views

- **Countdown vs. 'how to tell' tip: x7.7 views** (clear)
- a countdown of named schools (vs. the first week's videos): **x13.23** views (clear, seen in 32 videos)
- ranking by busiest food street (vs. walkable count): **x0.29** views (clear, seen in 2 videos)
- a 'how to tell' tip (vs. the first week's videos): **x1.71** views (likely, seen in 7 videos)
- more famous schools on screen (+1 tier): **x1.94** views (likely, seen in 33 videos)
- grouping by university system (UC, Cal State): **x1.78** views (likely, seen in 3 videos)
- a 'part 2' of an earlier hit: **x0.48** views (likely, seen in 2 videos)
- grouping by city: **x0.60** views (likely, seen in 2 videos)
- a famous-schools grouping: **x2.04** views (unclear, seen in 1 videos)
- posting on a weekend: **x1.26** views (unclear, seen in 10 videos)
- a two-school rivalry head-to-head: **x1.93** views (unclear, seen in 1 videos)
- punch-in cuts on the map scenes (faster pacing): **x1.93** views (unclear, seen in 1 videos)
- posting at 6 or 9 PM (vs. noon or 3 PM): **x0.89** views (unclear, seen in 27 videos)
- naming the upset in the hook ('Hint: it's not X'): **x1.27** views (unclear, seen in 25 videos)
- grouping by conference (vs. state): **x0.87** views (unclear, seen in 7 videos)
- one more school in the ranking: **x0.99** views (unclear, seen in 33 videos)
- a spoken voiceover (vs. music only): **x0.94** views (unclear, seen in 12 videos)
- a bigger lead for #1 (x2): **x1.03** views (unclear, seen in 33 videos)
- a more famous school named in the tease (+1 tier): **x1.03** views (unclear, seen in 33 videos)

## What drives watch time

- a countdown of named schools (vs. the first week's videos): **+2.3 s** (clear)
- one more school in the ranking: **+0.1 s** (likely)
- a spoken voiceover (vs. music only): **+0.9 s** (likely)
- grouping by conference (vs. state): **+0.7 s** (likely)
- posting at 6 or 9 PM (vs. noon or 3 PM): **+0.4 s** (unclear)

## What drives shares

- a 'how to tell' tip (vs. the first week's videos): **x0.44** (clear)
- grouping by city: **x0.24** (clear)
- one more school in the ranking: **x1.10** (clear)
- grouping by university system (UC, Cal State): **x2.20** (clear)
- a spoken voiceover (vs. music only): **x1.62** (likely)

## What drives completion (share of the video watched)

Median completion: **23%** of the video, across 50 videos with a known length.

- a countdown of named schools (vs. the first week's videos): **+18.8 points** (likely)
- a 'how to tell' tip (vs. the first week's videos): **+6.2 points** (unclear)
- a 'part 2' of an earlier hit: **-7.5 points** (unclear)
- grouping by university system (UC, Cal State): **+4.2 points** (unclear)
- posting on a weekend: **-2.0 points** (unclear)

## What works in the niche: TikTok (180 videos, 161 accounts, 2026-11-11)

Views compared after controlling for each creator's followers.

- one more hashtag: **x1.14** (clear, 180 videos)
- lasting 20 seconds or less (vs. 40-60 seconds): **x2.05** (clear, 43 videos)
- names a famous school: **x0.56** (likely, 21 videos)
- about college or campus: **x0.73** (likely, 80 videos)
- one more word in the caption: **x1.01** (likely, 180 videos)
- says it's a ranking or tier list: **x0.74** (unclear, 28 videos)
- an emoji in the caption: **x0.83** (unclear, 94 videos)
- a POV hook: **x0.75** (unclear, 2 videos)
- an original sound (vs. a song): **x1.17** (unclear, 130 videos)
- a part 2: **x0.83** (unclear, 2 videos)

The lab starts from these (both platforms combined, the more certain one counting for more) where its own features match: naming the upset in the hook ('Hint: it's not X'), a 'guess the campus' video, a two-school rivalry head-to-head, a 'part 2' of an earlier hit, a 15-20 second top-3 cut. Our own results then overrule them.

## Not tested enough yet (the lab will try these)

- a two-school rivalry head-to-head
- a 'guess the campus' video
- a 15-20 second top-3 cut
- a 'part 2' of an earlier hit
- grouping by city
- a famous-schools grouping
- ranking by busiest food street (vs. walkable count)
- punch-in cuts on the map scenes (faster pacing)
- a looping ending (no end card)

## Experiments

- 2026-11-12 g_city: countdown: Houston colleges with 5,000+ students by w (#1 UH-Downtown 114, tease Rice (4th)) -> **retry** (954 views, 9.2s; predicted 2,787)
- 2026-11-12 g_famous: countdown: 20 famous American universities by w (#1 NYU 1462, tease Harvard (7th)) -> **promote** (8,582 views, 11.58s; predicted 4,637)
- 2026-11-12 voice: every video read aloud from frame 0 (Kokoro voice), the hook map pushing in, first entry at ~4.5 s instead of 5.7 s, last place called out, #1's margin spoken -> **posted** (waiting for 3 days of numbers; predicted ?)
- 2026-11-13 part2: part2: All 9 UC campuses by mile (#1 UC Berkeley 428, tease UCLA (2nd)) -> **retry** (792 views, 7.74s; predicted 4,342)
- 2026-11-13 rivalry: rivalry: UNC vs Duke, restaurants within a 10-minute walk (87 vs 9) -> **retry** (922 views, 7.64s; predicted ?)
- 2026-11-14 g_city: countdown: 11 New York City colleges by w (#1 Touro 1,478, tease Columbia 9th) -> **drop** (457 views, 8.83s; predicted ?)
- 2026-11-14 metric_street: countdown: Ivy League by busiest food street (#1 Columbia 144) -> **drop** (462 views, 6.55s; predicted ?)
- 2026-11-14 part2: part 2: big Pennsylvania universities by busiest food street (#1 Drexel 70; Penn 4th to 2nd) -> **drop** (363 views, 5.43s; predicted ?)
- 2026-11-18 metric_street: countdown: 20 famous American universities by busiest food street (#1 NYU 190, tease Harvard (4th)) -> **posted** (waiting for 3 days of numbers; predicted 3,094)

_Written by social/pipeline/lab.py. Regenerated every daily run._
