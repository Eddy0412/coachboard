ALTER TABLE timestamps ADD COLUMN IF NOT EXISTS pass_result TEXT;

ALTER TABLE timestamps ADD CONSTRAINT timestamps_pass_result_valid
  CHECK (pass_result IS NULL OR pass_result IN ('complete', 'incomplete', 'interception'));
