# Link outreach: 40 emails a day (Nov 24): 20 to journalists, 20 to college page managers

The goal is backlinks to savorscout.net from pages people trust: student newspapers first, then
local food writers, campus blogs and "where to eat near X" guides. Ten personal emails every
weekday, each asking plainly for a mention with a link, none sounding like a pitch.

## The daily routine

1. `python outreach/outreach.py status`, then `python outreach/outreach.py next 10`: the next
   newspapers nobody has emailed, each with its true number.
2. **Find one real article to mention** for each (this is what gets replies). Ask the Featured
   connector for one 2026 article per paper about food, dining, restaurants near campus, dining
   halls or student food costs: title, URL, author, date, and one specific checkable detail.
   Open nothing you can't verify: if Featured returns nothing for a paper, or the detail can't
   be confirmed by a web search of the paper's site, send the version without an article.
   Never write "I enjoyed your piece on..." about a piece that wasn't found and read.
3. `python outreach/outreach.py draft <slug> --title "..." --author "..." --detail "..." --url "..."`
   (leave the options off for the no-article version). Read the draft: every number in it comes
   from the rankings data, so don't add any others.
4. **Check for a duplicate twice:** `python outreach/outreach.py seen <address>` and a Gmail
   search `in:sent to:<address>`. If either finds something, skip that target.
5. Send with the Gmail connector (plain text, from the owner's account), then at once
   `python outreach/outreach.py log <slug> <address> "<subject>"`.
6. When the newspapers run out, use Featured to find people instead: writers and editors who
   published a "where to eat near <campus>" guide, a student-budget food piece or a college-town
   restaurant roundup in the last year, with a public work address. Their addresses are personal
   data: never write them in a committed file (`outreach.py log - <address> "<subject>"` keeps
   only a hash). Match each to the campus page or ranking that fits their article.
7. Check replies: Gmail `in:inbox newer_than:7d`. Answer questions the same day; if someone
   says no or asks not to be contacted, don't write again. Note links won in the report.
8. Commit `outreach/sent.jsonl` and push. Report: who was emailed, with or without an article,
   replies, links won, and how many newspapers are left.

## The email

```
Subject: Quick question about your "<article title>" piece

Hi <name or "<Paper> team">,

Really enjoyed <author>'s piece "<title>", especially <one specific detail from it>.

It got me wondering how <School> compares on the basics, and I had the numbers to check.

I run Savor Scout, a free site that maps places to eat near campuses. We just finished counting
every place to eat within a 10-minute walk of all <n> <group> campuses, using open map data, and
found that <School's true ranking and count>.

The full breakdown is here: <ranking page>
And every place near <School>: <campus page>

Would you be open to adding a link to it in that piece, or the next time you write about eating
near campus? It would give your readers something they can check for themselves.

Best,
Charan Nukathoti (Savor Scout founder)
savorscout.net
```

## Rules

- **No money, ever (the owner's rule, Nov 17).** Never offer payment, a fee, a sponsored post or a
  link exchange. Skip any target whose page asks for payment to be featured. If a reply asks for a
  fee, thank them, say we can't do paid placements, and leave it there.
- One email per address, unless they reply, except the single 7-day follow-up to college pages (see below).
- Ten a day at most, weekdays only, one at a time (never bcc, never a mail merge).
- Only true things: the article was really read, every number is from `scripts/data/rankings.js`,
  and we never claim prices, ratings, "best" or anything the data doesn't hold.
- Ask for the link once, plainly, in the last paragraph. No "just circling back", no flattery
  beyond the one specific detail, no exclamation marks, no attachments.
- The owner chose not to include an opt-out line. US law (CAN-SPAM) expects commercial email to
  carry a postal address and a way to opt out; a request for editorial coverage is a grey area.
  If volume ever grows past this hand-sized list, add both.
- What works gets written here: which subject lines and which kinds of fact earned replies.

## Journalist requests (Featured, HARO, Connectively, Qwoted, Substack)

Every request we look at goes in `outreach/requests.jsonl`, pitched or skipped, so nothing is answered
twice and nothing is re-judged. Before drafting: `python outreach/outreach.py req-seen "<outlet>" "<question>"`
(exit 0 = already handled). After sending or deciding: `python outreach/outreach.py req-log <platform> "<outlet>" "<question>" <pitched|skipped|drafted> "note"`.
`req-list` shows the log. Answer only as what Charan is: a student founder of a free campus-food map
site. Never pose as a chef, restaurateur, dietitian, or PR rep, and never send an answer with an
opinion or personal story he hasn't approved. One answer per outlet per story; for outlets that post
many near-identical questions (College Recruiter), answer at most two, each with a different story.
- **No personal exposure (the owner's rule, Nov 21).** Skip any request that needs a headshot, photos,
  a bio with personal details, a recorded interview, video or TV. Only text answers or data-led pitches
  that cite Savor Scout's numbers.

- **What Nov 23-24 showed.** Featured's free plan allows about one full search run a day: the opportunity search
  and its page reader both run out after one pass and renew in about 3 hours (the page reader in about a day). The
  open HARO requests that take email replies were almost all gift guides, video spots or "no AI answers", so few
  journalist requests fit; resource pages are the better use of the budget. University sites are blocked by this
  environment's network unless their host is on the allowed list (20 were added Nov 23); WebSearch can confirm an
  office's published email without Featured.

## Journalists: 20 a day (the owner's direction, Nov 24: "40 emails a day, 20 to journalists, 20 to page managers")

The daily task "SavorScout daily journalist outreach (20)" runs at 10:43 am ET every day; the college pages
run at 12:11 pm. Claude sends both.

- **Who:** US journalists and writers whose recent work (last ~12 months) touches what our data measures:
  restaurants and food in college towns or big-university cities, campus dining and student life, student money
  and the cost of college, food trends and data lists, local news in a college town. Sources, in order: open
  journalist requests that take a reply email and fit (see above); one Featured run a day for journalist profiles
  with the email Featured shows; WebSearch for recent articles plus the author's work email on the outlet's own
  site (author page, staff directory, contact page).
- **Verify:** the article exists (title, outlet, date) and the address belongs to that outlet (its domain, or
  printed on its site). Skip mismatches (an address at an unrelated company), personal webmail unless the outlet's
  site lists it, non-US outlets, and anyone already in `outreach/journalists.jsonl` (`outreach.py jour-seen
  "<name>" "<outlet>"`) or the sent log.
- **Numbers:** `python outreach/campus_numbers.py --ranks "<school>"` gives the counts and every rank we can
  quote ("3rd of 18 ACC schools"). Quote nothing else.
- **The email** (the Nov 21-24 journalist drafts are the model):

```
Subject: <a local number as the hook, e.g. "A UNC number for your campus food coverage: 87 places within a 10-minute walk">

Hi <first name>,

I saw your <Outlet> piece "<title>", so I thought this might be useful for a future story.

I run Savor Scout, a free site that counts every place to eat within a 10-minute walk of US college campuses,
using open map data. <one to three facts for their area or beat, from campus_numbers.py --ranks>.

Every place near <School>, closest first: <campus URL>   (or the rankings page for a list story)

Would you be open to linking it the next time you write about <their topic>? I'm glad to pull numbers for any
campus in your area.

Best,
Charan Nukathoti (Savor Scout founder)
savorscout.net
```

- Mention their piece by title only unless you read it; no claims about why students eat where they do; no money,
  no "best", one ask. After each send: `outreach.py log - <address> "<subject>"` and
  `outreach.py jour-log "<name>" "<outlet>" <article-url> sent "<angle>"`. Replies: answer with numbers, log
  `replied`, `linked` (after checking the link is live) or `declined` (never contact again).

## College resource pages: 20 a day (the owner's direction, Nov 24)

Claude sends these now (before Nov 24 the owner sent them). Goal: 15 backlinks by Dec 31. The daily task
"SavorScout daily link outreach (20 college pages)" runs at 12:11 pm ET every day.

- **Target:** an official page on a US university site (or a city visitor bureau page about dining near the
  university) that names off-campus restaurants or links to a local dining guide. One page per school, never a
  school twice: `outreach.py page-seen <slug>`; every page handled goes in `outreach/pages.jsonl` with
  `outreach.py page-log <slug> <url> <sent|skipped|replied|linked|declined> "note"` (no addresses in that file).
- **Numbers:** `python outreach/campus_numbers.py "<school>"` gives the slug, the counts, a ready number line and
  the campus URL. Skip schools that are not in our data or have no campus page.
- **Contact:** an address printed on the university's own site (the page, or that office's contact or staff page).
  Prefer the person who runs the program; else the office that owns the page. Never guess or construct one.
  Site-printed obfuscation may be decoded ("info [at] honors [dot] umass [dot] edu", Cloudflare data-cfemail).
- **Verifying pages:** the environment blocks university hosts unless they are on its allowed list (20 were added
  Nov 23). For other hosts, WebSearch summaries of the page and its contact page work; Featured can verify a list
  of URLs once a day. If the owner allows `*.edu` in the environment's network settings, fetch pages directly.
- **The email** (the Nov 24 batch, all 20 sent):

```
Subject: A free map of places to eat near <School>, for your "<page title>" page

Hi <Name or Office team>,

I came across your "<page title>" page<, one true detail from the page>.

I run Savor Scout, a free site that maps every place to eat near a college campus, using open map data.
Near <School>, <number line from campus_numbers.py>.

Here is the full list, with a map:
<campus URL>

Would you consider adding it to the page as an extra resource for <audience>? It is free, and it covers
every place in the open map data.

Best,
Charan Nukathoti (Savor Scout founder)
savorscout.net
```

- **After sending:** `outreach.py log - <address> "<subject>"` (hash only) and `page-log ... sent "<office>"`.
- **Replies:** answer questions; when a link goes up, confirm it on the page and log `linked`; a "no" is logged
  `declined` and never contacted again; bounces are logged `skipped "bounced"`.
- **Volume note:** at 20+ cold emails a day, watch for bounces (keep them under ~5%) and replies marked as spam.
  US law (CAN-SPAM) expects bulk commercial email to carry a postal address and an opt-out; these are
  one-to-one requests, but if replies ask how to stop, add a one-line opt-out (the owner's call).

## Volume, follow-ups and the safety gate (the owner's direction, Nov 24: "add the follow-up and go to 60 a day")

| Dates | Journalists (10:43 am) | College pages (12:11 pm) | College pages (3:37 pm) | New emails a day |
|---|---|---|---|---|
| Nov 25-30 | 20 | 20 | none | 40 |
| Dec 1-18 | 20 | 20 | 20 (only if the gate passes) | 60 |
| Dec 19-31 | 10 | 10 | none | 20 (university offices close for winter break) |

Plus follow-ups (below), which are replies in existing threads.

- **The gate**, checked at the start of every run: `python outreach/outreach.py gate-window` gives a date;
  count the bounce notices since then (Gmail `from:mailer-daemon after:<that date>`), then
  `python outreach/outreach.py gate <count>`. It fails at 3 or more bounces that are also 3% or more of the emails
  sent in that window (the last 7 days, never before Nov 24, when sending switched to verified addresses). If it
  fails, or Google warns about the account (sending limit, unusual activity), or anyone replies that it's spam or
  asks to stop: skip the 3:37 pm batch, cut every task to 10 a day, and tell the owner.
- **Follow-ups (college pages only, one ever per school):** 7 days after the first email, if the thread has no
  reply and no bounce (Gmail thread with a single message) and `outreach.py page-status <slug>` shows no replied,
  declined, linked or followup, reply in the same thread (Gmail `replyThreadId`, subject "Re: <original subject>",
  same address read from the thread, so no address is stored):

```
Hi <same greeting>,

I wanted to make sure my note below reached you. If a link to the map of places to eat near <School> would help
readers of your "<page title>" page, here it is again: <campus URL>

And if it's not a fit, no problem at all.

Best,
Charan Nukathoti (Savor Scout founder)
savorscout.net
```

  Then `outreach.py page-log <slug> <page-url> followup "<date of the first email>"`. Journalists get no
  follow-ups. Nobody gets a third email unless they reply.

## The backlink playbook (owner's goal, Nov 21: average position ~5-6 by Feb-Mar; 40 emails a day)

Ranked by how likely someone is to say yes. Always: one personal email, the school's real number, no money, no link swaps.

1. **Resource and info pages that already list "places to eat near campus"** (the owner asked to keep doing this).
   University pages run by admissions/visitor centers, orientation, parent and family programs, student government,
   housing ("off-campus living"), and city/chamber/visitor-bureau "dining near the university" pages. Pitch: "your page
   lists places to eat near campus; ours is a free, always-current map of every one within a 10-minute walk", link the
   campus page. Highest yes-rate: it helps their readers and costs them one line. .edu links are the most valuable.
2. **Writers who already wrote about food near that campus** (journalist matches, student papers, local news,
   college-town food bloggers). Pitch a fresh number for a follow-up or an update to the old piece.
3. **Broken or outdated links**: on those resource pages, find dead links to closed restaurants or old guides and offer
   the campus page as the replacement. People fix broken things quickly.
4. **Unlinked mentions**: anyone who quotes our numbers or names Savor Scout without a link gets a short thank-you
   asking for the link. Near-certain yes. (Check monthly.)
5. **Data for list-makers**: sites that publish "best college towns", "best colleges for food" lists get our counts
   as a source (University Magazine is the model).
6. **Journalist requests** (HARO/Featured/Qwoted/Substack): only real fits, text answers only (see the rules above).
7. **Campus clubs and student guides**: food clubs, culinary clubs, international student orgs, freshman guides
   on club sites. Smaller links, friendly audience.

Never: paying, link exchanges, guest posts written for links, posing as anything but a student founder of a free site,
anything that needs photos or personal details.
