-- What people asked Savor Scout for, in their own words.
-- Run in Supabase: SQL Editor > New query > paste > Run, then Download CSV.
-- Covers signed-in searches only: the app does not store free-trial
-- searches (those now reach GA4 as the "search" event instead).

-- 1. Every craving, most asked first.
select lower(trim(query))                           as craving,
       count(*)                                     as searches,
       count(distinct user_id)                      as people,
       round(avg(match_score))                      as avg_match,
       count(*) filter (where visited)              as went,
       count(*) filter (where outcome = 'better')   as better_than_expected,
       count(*) filter (where outcome = 'worse')    as worse_than_expected,
       string_agg(distinct location_name, ' | ')    as places
from verdicts
group by 1
order by searches desc
limit 500;

-- 2. What kind of place won, which says what the cravings resolved to.
select coalesce(category, '(none)') as category, count(*) as picks
from verdicts
group by 1
order by picks desc
limit 100;

-- 3. Where people search from.
select location_name, count(*) as searches, count(distinct user_id) as people
from verdicts
group by 1
order by searches desc
limit 100;
