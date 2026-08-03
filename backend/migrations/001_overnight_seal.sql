-- The Overnight Seal
--
-- One prediction per day is answered but NOT graded. The result is held until
-- the next morning, which converts a habit ("I should open this") into an
-- appointment ("something of mine is waiting"). Appointment mechanics are the
-- strongest known driver of daily return — the same shape as a Wordle reset or
-- a loot timer, minus the currency.
--
-- Two timestamps carry the whole mechanic:
--   sealed_at   the answer was recorded, the grade was withheld
--   revealed_at the user has since seen the outcome
--
-- A seal is outstanding when sealed_at is set, revealed_at is null, and
-- sealed_at fell on an earlier day. Someone who disappears for a week comes
-- back to an envelope still waiting, which is the intended behaviour.
--
-- Safe to re-run.

alter table calibrations
  add column if not exists sealed_at   timestamptz,
  add column if not exists revealed_at timestamptz;

-- Partial index: the only query that matters is "does this user have an
-- unopened seal", which is a tiny slice of the table.
create index if not exists calibrations_open_seal_idx
  on calibrations (user_id, sealed_at)
  where sealed_at is not null and revealed_at is null;
