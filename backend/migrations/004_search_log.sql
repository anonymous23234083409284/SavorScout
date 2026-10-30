-- What people ask Savor Scout for, and what they tell it.
--
-- Run once in Supabase: SQL Editor > New query > paste this file > Run.
-- Until it has run, the server keeps working and logs one line saying the
-- tables are missing; nothing is lost but the rows themselves.
--
-- search_log: every search anyone types, signed in or not, with what the
-- app understood it to mean and how it ended. The point is to build the
-- product around what people actually ask for, so a search that found
-- nothing or hit the sign-up wall is recorded too: those are the clearest
-- statement of what is missing.
--
-- feedback: what people tell us on the pages and after a pick: the one-tap
-- "what would make this page more useful?" votes, the "something else" and
-- "what else could we help you with?" answers, and "was this what you
-- wanted?" after a result.
--
-- Both are readable and writable only by the server (row level security on,
-- no policies), never by a browser. No IP addresses are stored. Locations
-- are kept as the place name the person chose and coordinates rounded to two
-- decimals, an area about a kilometre wide rather than an address.

create table if not exists public.search_log (
  id               bigserial primary key,
  created_at       timestamptz not null default now(),
  query            text not null,
  preferences      jsonb,             -- what the app understood the search to ask for
  outcome          text not null,     -- pick, no_match, out_of_range, signup_wall, daily_limit, invalid, error
  result_name      text,
  result_category  text,
  match_score      integer,
  location_name    text,
  lat              double precision,
  lng              double precision,
  radius_mode      text,
  source           text,              -- app, or guide_page when it came from a page's search bar
  page             text,              -- that guide page's path
  session_id       text,              -- random per browser tab; ties one visit's searches together, nothing else
  user_id          uuid,              -- set when signed in
  signed_in        boolean not null default false
);
create index if not exists search_log_created_idx on public.search_log (created_at desc);
alter table public.search_log enable row level security;

create table if not exists public.feedback (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  kind         text not null,         -- page_wish, page_ask, result
  choice       text,                  -- the option tapped ("cheap", "late", "yes", "no", "other")
  message      text,                  -- what they typed
  page         text,                  -- the path it was sent from
  page_type    text,                  -- campus, campus_food, city, app
  query        text,                  -- result feedback: the search it is about
  result_name  text,                  -- result feedback: the place that was picked
  session_id   text,
  user_id      uuid
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
