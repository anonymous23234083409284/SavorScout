-- Free-trial search tracking
--
-- One search before signing up. Enforcing that in the browser would be
-- theatre — clearing localStorage or opening a private window resets it — so
-- the allowance is counted server side, keyed on a HASH of the client IP.
--
-- Hashed, not stored raw: the server never needs to know anybody's address,
-- only whether it has seen it before, and an unhashed IP log is personal data
-- we would then be responsible for.
--
-- Optional. Without this table the server falls back to an in-process map,
-- which still blocks the browser-side bypasses but resets on deploy. Running
-- this makes the allowance survive restarts.
--
-- Safe to re-run.

create table if not exists anon_trials (
  ip_hash    text primary key,
  searches   integer     not null default 0,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now()
);

-- Trials are only ever read by exact key, so the primary key is the only
-- index needed. This one exists purely so old rows can be swept cheaply.
create index if not exists anon_trials_last_at_idx on anon_trials (last_at);
