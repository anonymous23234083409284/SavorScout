# Link outreach: 10 emails a day

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
- One email per address, ever, unless they reply. No follow-up to silence for now.
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
