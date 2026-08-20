ALTER TABLE app_states
  ADD COLUMN revision bigint;

UPDATE app_states
SET revision = 1
WHERE revision IS NULL;

ALTER TABLE app_states
  ALTER COLUMN revision SET DEFAULT 1,
  ALTER COLUMN revision SET NOT NULL;

ALTER TABLE app_states
  ADD CONSTRAINT app_states_revision_positive
  CHECK (revision > 0);
