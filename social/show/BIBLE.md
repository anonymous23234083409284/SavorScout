# The show: how SavorScout's videos are written, made and judged

SavorScout's videos are short comedy scenes with our own cast. A stressed student has a food
problem, Scout (our flame) turns up with one real number from SavorScout's data, and the plug
for the site is a joke inside the scene. This file is the taste: anyone (a person, or any
assistant running the daily job) who follows it can write, check and ship an episode.

- Scripts: `social/show/gold/*.json` (hand-written; the standard to match).
- Engine: `python social/pipeline/show.py lint|build <episode.json>` (voices, timing, sound,
  captions, render). `show.py`'s header documents every kind of beat.
- Drawings: `social/video/src/skit/` (cast, sets, props) and `Skit.tsx` (shots, captions).

## 1. Where the format comes from

The owner's reference (a two-person skit about college essays, about 40 seconds) beat by beat:

| time | what happens | what it does |
|---|---|---|
| 0-3 s | Student, head in hands: "Oh my god. Why is writing college essays so hard?" | The hook is the viewer's own problem, said the way they'd say it. |
| 3-6 s | He throws the page; a bin overflowing with crumpled drafts; a hand picks one up. | A wordless visual gag that shows how bad it is. |
| 6-9 s | The helper, calm: "Hey man, is everything okay?" | Opposite energy: panic meets deadpan. |
| 9-17 s | "You're the wooden desk guy! Goku's Guide!" / "Actually it's—" / "Gohan's Guide!" | He gets the brand's name wrong twice. The plug is a running joke. |
| 17-24 s | "Come on, they can't be that bad." He reads it. Four seconds of silence. Drops it. | The biggest laugh has no words. |
| 24-31 s | "Here. Take this." / "What's this?" / "A guide I made..." (the product on screen 2.5 s) | The product is a prop handed over inside the story. |
| 31-34 s | "Wow, thanks! Not as good as Mahad's guide, but..." | The rescued one is ungrateful: status flips. |
| 34-40 s | To camera: "What? Oh, so you want the guide too? Well, fine. Follow me, link in bio." | The call to action is said in character, as a joke. |

Why it works, and what every episode of ours must keep:

1. **It's a scene, not a list.** Someone wants something, something is in the way, someone
   arrives. People stay for a story.
2. **The problem is the hook**, in the first second, in the viewer's words.
3. **Two characters with opposite energy.** One spirals, one doesn't react.
4. **The laughs come from character, not wordplay**: a wrong name, a silence, an ungrateful
   thank-you. No puns.
5. **The product is a prop and the plug is a bit.** The brand is named three times and every
   time is a joke.
6. **Rhythm:** a cut every 1-3 seconds, lines under 9 words, one long silence, captions of 1-3
   words with one word in colour.

## 2. The cast (`cast.json`)

**Milo, the student.** Broke, dramatic, one meal from disaster. Treats a small food problem as
the end of the world, then commits to a terrible plan with total confidence. Never learns. Never
says thank you properly.
- Talks in exact, sad specifics: "four dollars", "a single free sample", "it's Tuesday".
- Exaggerates the stakes, never the facts. He believes everything he says.
- Gets SavorScout's name wrong (Flavor Scout, Sailor Scout, Saver Scout...). Always.

**Scout, SavorScout's flame.** Calm, dry, unbothered. Knows every place to eat near every campus.
- Answers panic with one exact number. Short sentences. Never raises its voice.
- Never explains a joke, never says "actually", never sells. It states facts and lets them land.
- It is a flame: bad plans it is handed catch fire. It doesn't comment on that.

The contrast is the engine: **Milo exaggerates, Scout understates.** If both are joking, nothing
is funny. If a line could be said by either of them, rewrite it.

## 3. What makes a line funny here

- **The game.** Each scene has one unusual thing, and every beat pushes it further. In the
  pilot: Milo's plan for surviving on $4. Find the game before writing lines.
- **Specific beats general.** "Dinner: sleep" beats "I can't afford dinner". A number, a day of
  the week, a brand of sadness.
- **Three, with the third one wrong.** Breakfast: a free sample. Lunch: smelling someone's
  fries. Dinner: sleep. Two set the pattern, the third breaks it.
- **Silence.** One beat per episode has no words and no music: Scout reads the plan. Let it sit
  for two full seconds.
- **Status.** Milo acts superior while being helped ("I was going to work that out"). Scout
  never fights for status, which is why it always has it.
- **The callback.** Bring one earlier phrase back near the end ("Dinner: sleep is still plan B").
- **The stat is a punchline.** The true number lands hardest right after a silence or right
  before an undercut: "277 places within a 10-minute walk. You've been to two."
- **The plug is in character.** Milo turns to the camera, annoyed that you're still here:
  "What? You're broke too? Fine. SavorScout dot net. It's free. Which is also my budget."

## 4. The corny test

Read every line and cut it if any of these is true. `show.py lint` catches the words; the rest
is judgment.

- It's a pun or food wordplay ("lettuce", "nacho average", "taco 'bout").
- It uses ad words or filler ("foodie", "yummy", "hidden gem", "game changer", "you won't
  believe").
- It borrows slang to sound young ("no cap", "slay", "bussin"). Slang dates in weeks.
- It explains the joke, or a character laughs at their own line.
- It's random instead of specific ("a llama ate my homework"). Absurd is fine; unmotivated isn't.
- It's mean about a school or its students. We joke about being broke, hungry, lazy and
  indecisive, which everyone is. A campus with few restaurants is a fact, never an insult.
- It sounds like an advert. Scout never says "check out", "amazing" or "the best".
- It needs an exclamation mark to work.
- Either character could have said it.

## 5. What Scout is allowed to say

Every number comes from SavorScout's data through a slot, so a script can't state a wrong one:
`{w}` places to eat within a 10-minute walk, `{n}` within a mile, `{street}` and `{street_n}`
(the busiest food street and its count), `{pizza}`, `{coffee}`, `{campus}`. Never claim what the
data can't back: no "best", no "cheapest", no prices, no "open now", no ratings. Milo's money
troubles are his own; Scout answers with how many places there are, and the site is free.

## 6. The formats

A format is a skeleton of beats. The cast, the rules above and the data stay the same.

**The Rescue** (built; `gold/four-dollars.json` is the model). 30-40 s, about 95 words.

| beat | seconds | who | what |
|---|---|---|---|
| Cold open | 0-3 | Milo | The problem in 9 words or fewer, plus a prop gag (the bank balance). |
| Spiral | 3-9 | Milo | His plan: three items, the third one wrong. |
| Entrance | 9-11 | Scout | "Hey. You good?" Flat. |
| Wrong name | 11-16 | both | Milo gets the site's name wrong; Scout starts to correct him; he gets it wrong again. |
| Verdict | 16-21 | Scout | "Your plan can't be that bad." Reads it in silence. It burns. |
| The fix | 21-27 | Scout | The real map and the real number, then one dry line about it. |
| Undercut | 27-30 | Milo | Ungrateful, with a callback. |
| Plug | 30-36 | Milo | To camera: the site's name, said as a joke. End card. |

Formats designed and not built yet (each needs its own skeleton here and, where noted, drawings):
- **The Group Chat.** A text thread: nobody can decide where to eat, Scout joins with a number.
  Needs a chat screen.
- **The Intervention.** Milo's Wallet and Stomach argue; Scout settles it. Needs two characters.
- **Hunger Hotline.** "Hunger emergency line, what's your situation?" A phone call.
- **Campus Court.** Two schools argue over who eats better; Scout reads out both counts.

## 7. Writing an episode

1. **Pick the situation** (broke until Friday, ten minutes between classes, 2 a.m., the dining
   hall just closed, a date on a budget, parents visiting, a group that can't decide, rain).
2. **Write ten opening lines** for it, each 9 words or fewer. Keep the one that sounds most like
   a real student complaining. That's the hook.
3. **Find the game:** the one unusual thing Milo does about it (his plan, his excuse, his list).
4. **Write the plan as three items**, the third one wrong. This is usually the best joke; spend
   time on it.
5. **Choose a campus and the stat.** Use the slots. Pick the number that's funniest next to the
   plan (a huge count for someone who's eaten at two places).
6. **Write Scout's lines last.** Fewer words than you think. One line after the number.
7. **Write the undercut and the plug.** The plug says the site's real name once, correctly.
8. **Cut.** Every line under 9 words where possible, 16 at most. 55-125 words in all.
9. **Say it out loud, fast.** If a line trips you, it trips the voice. No capitals for emphasis
   (the voice would spell them out); mark the caption's coloured word with `*stars*`.
10. `python social/pipeline/show.py lint <file>`, then `build <file> --render`, then look at
    the frames: the opening frame must show the problem, and no caption may be cut off.

## 8. Judging an episode

Score each from 0 to 2 and ship at 8 or more of 10. Below that, rewrite the weakest beat.

- **Hook:** would a student stop scrolling for the first three seconds?
- **Game:** is there one clear unusual thing, pushed further each beat?
- **Best joke:** is there a line you'd repeat to someone? (If not, it isn't ready.)
- **Truth:** is the number real, and is it used as a punchline rather than read out?
- **Plug:** is the site's name a joke and not an advert?

## 9. How the show learns

Each built episode records its ingredients (`out/show/<id>/episode.json`: format, situation,
campus, lines). Views, watch time and shares come from the daily stats. The plan for days 2-3:
score situations, games and formats the way the lab scores countdowns, write more of what
earns shares, and retire what doesn't.
