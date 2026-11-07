# Press outreach: student newspapers

One pitch per school in the college food rankings (`scripts/data/rankings.js`),
sent by hand from the owner's own email. The pitches live in a private tracker
page on claude.ai ("Campus Paper Pitches"), which saves what was sent, replied
to and linked.

- `contacts.jsonl`: each ranked school's student paper, its newsroom or tips
  address where one was found (`email`), or the page to find it on (`form`),
  and where it came from (`src`). `unconfirmed` marks addresses from older or
  third-party sources. Found by web search in November 2026; mastheads change
  every year, so check before a second round.
- `make-pitches.js`: builds the pitches from the rankings and contacts.
  `node outreach/make-pitches.js . outreach/contacts.jsonl /tmp/pitches.json`
- `tracker.template.html`: the tracker page; `/*PITCHES*/` is replaced with the
  pitch JSON before publishing.

A new ranking needs its schools' papers added to `contacts.jsonl`, then a
rebuild and republish of the tracker.
