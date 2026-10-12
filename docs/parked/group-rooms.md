# Parked: Group rooms

Parked on 12 October 2026. Nothing was deleted. The feature still works; it is
hidden behind two switches, and the few lines of homepage copy that had to come
out are kept below word for word.

## What group rooms are

Someone opens a room and shares a link (`savorscout.net/r/ABC123`). Everyone who
taps it sees the same five or so restaurant cards, taps Yes on anything they
would eat, and gets one veto to remove an option for the whole group. When two
options are left the vetoes stop and the votes decide. No signup needed.

## What "parked" changed

| Where | What happens now |
|---|---|
| Header tabs | The **Group** tab is hidden. Its place goes to a new **About** tab. |
| Shared links `/r/ABC123` | Open the normal homepage instead of joining a room. |
| Campus pages | The "Deciding as a group" section is hidden. |
| City pages | The "Deciding as a group in …" section is hidden. |
| 6 guide pages | The "If you're deciding as a group" section is hidden where it pitched rooms: hungover, can't decide, picky eaters, big group, work team lunch, birthday dinner. Plain group advice on other guides still shows. |
| Homepage text and FAQ schema | The group question and mentions were removed. The original text is below. |

Still in place and untouched: all the room code in `src/App.js` (screens,
voting, rematch, share card), the server routes in `backend/server.js`, and
`scripts/make-room-html.js` (the link-preview page for `/r/` links).

## How to bring it back

1. In `src/App.js`, set `const GROUP_ENABLED = true;`
2. In `scripts/lib/features.js`, set `GROUP_ENABLED: true`
3. Put the homepage text below back into `public/index.html`.
4. Build, then run `node scripts/make-lastmod.js` so the sitemap marks the
   changed pages as updated.

With step 1 the Group tab returns next to About. If About should go back to
being a header button instead of a tab, that is a separate change.

## Homepage text removed from `public/index.html`

**In the WebApplication schema, `featureList`** (third item):

```
"Group voting rooms shareable by link, no signup required",
```

**In the FAQPage schema**, a whole question, second in the list:

```json
{
  "@type": "Question",
  "name": "How do you pick a restaurant as a group?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Savor Scout group rooms turn it into a 90-second vote. The host shares a link, everyone taps yes on anything they would eat, and each person gets one veto to remove an option for the group. When two options remain the vetoes stop and votes decide. No app or signup is needed."
  }
},
```

**In the FAQPage schema, "Is Savor Scout free?"** answer, originally:

```
Yes. Searching and group rooms are free, no app download is required, and you can run one search without creating an account.
```

**In the page body**, a section between "How do you decide where to eat?" and
"What restaurant should I eat at tonight?":

```html
<h2>How do you pick a restaurant as a group?</h2>
<p>
  Group decisions fail because everyone is polite until someone is annoyed. Savor
  Scout's group rooms turn it into a 90-second game: the host opens a room and shares
  a link, everyone taps Yes on anything they'd eat, and each person gets one veto to
  remove an option for the whole group. When two options remain the vetoes stop and
  the winner is decided on votes. No app, no signup — anyone who taps the link plays.
</p>
```

**In the page body, "Is Savor Scout free?"**, originally:

```
Yes. Searching is free, group rooms are free, and no app download is required. You
can run one search without an account at all.
```
