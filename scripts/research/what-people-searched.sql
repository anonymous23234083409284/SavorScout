-- What people ask Savor Scout for, and what they tell it.
-- Run in Supabase: SQL Editor > New query > paste one block > Run > Download CSV.
--
-- search_log and feedback start filling once backend/migrations/004_search_log.sql
-- has been run and the server is deployed. verdicts (the last block) goes back
-- further but holds signed-in searches only.

-- 1. Every search, most asked first: the words people use, how often, and how
--    often we gave them a pick.
select lower(trim(query))                                  as search,
       count(*)                                            as times,
       count(distinct coalesce(session_id, id::text))      as visits,
       count(*) filter (where outcome = 'pick')            as picked,
       count(*) filter (where outcome in ('no_match', 'out_of_range')) as found_nothing,
       count(*) filter (where outcome = 'signup_wall')     as hit_signup_wall,
       min(created_at)::date                               as first_seen,
       max(created_at)::date                               as last_seen
from search_log
group by 1
order by times desc
limit 500;

-- 2. What people want and do not get: searches that found nothing or were
--    stopped. The most direct list of what to fix or build.
select outcome, lower(trim(query)) as search, location_name, count(*) as times
from search_log
where outcome <> 'pick'
group by 1, 2, 3
order by times desc
limit 300;

-- 3. What the app understood people to want: cuisine, dish, budget and
--    dietary needs pulled out of the words, counted.
select preferences->>'cuisine' as cuisine, preferences->>'dish' as dish,
       preferences->>'budget' as budget, preferences->>'dietaryRestrictions' as dietary,
       count(*) as times
from search_log
where preferences is not null
group by 1, 2, 3, 4
order by times desc
limit 300;

-- 4. Which guide pages send people into a search, and what they search for
--    when they arrive from each.
select page, count(*) as searches, string_agg(distinct lower(trim(query)), ' | ') as what_they_searched
from search_log
where source = 'guide_page'
group by page
order by searches desc
limit 200;

-- 5. Where searches come from.
select location_name, count(*) as searches, count(distinct coalesce(session_id, id::text)) as visits
from search_log
group by 1
order by searches desc
limit 200;

-- 6. The one-tap page votes: what would make each kind of page more useful.
select page_type, choice, count(*) as votes
from feedback
where kind = 'page_wish' and choice <> 'other'
group by 1, 2
order by page_type, votes desc;

-- 7. Everything people typed to us: "something else", "what else could we
--    help you with?", "what were you hoping for?". Read these in full.
select created_at::date as day, kind, choice, message, page, query, result_name
from feedback
where message is not null
order by created_at desc
limit 500;

-- 8. Was the pick what they wanted? Per search, yes against not really.
select lower(trim(query)) as search,
       count(*) filter (where choice = 'yes') as yes,
       count(*) filter (where choice = 'no')  as not_really
from feedback
where kind = 'result' and choice in ('yes', 'no')
group by 1
order by (count(*)) desc
limit 300;

-- 9. Older, signed-in searches only (the verdicts table predates search_log).
select lower(trim(query)) as craving, count(*) as searches, count(distinct user_id) as people,
       count(*) filter (where visited) as went,
       string_agg(distinct location_name, ' | ') as places
from verdicts
group by 1
order by searches desc
limit 500;
