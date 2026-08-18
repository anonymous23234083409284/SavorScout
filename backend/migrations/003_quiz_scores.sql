-- Taste quiz scores
--
-- Six numbers, 0-100, one per dimension the quiz measures. Stored on the
-- profile rather than in their own table because there is exactly one row per
-- user and it is always read alongside the profile.
--
-- Optional. Without this column the server keeps scores in process memory,
-- which works but is lost on restart — so a user's week of answers would stop
-- affecting their results after the next deploy. Running this makes it stick.
--
-- Safe to re-run.

alter table if exists profiles
  add column if not exists quiz_scores jsonb;

comment on column profiles.quiz_scores is
  'Taste quiz results: {heat,sweet,value,adventure,lateNight,discovery} each 0-100.';
