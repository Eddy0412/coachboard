ALTER TABLE timestamps ADD COLUMN IF NOT EXISTS target_x DOUBLE PRECISION;
ALTER TABLE timestamps ADD COLUMN IF NOT EXISTS target_y DOUBLE PRECISION;

ALTER TABLE timestamps ADD CONSTRAINT timestamps_target_x_range CHECK (target_x IS NULL OR (target_x >= 0 AND target_x <= 1));
ALTER TABLE timestamps ADD CONSTRAINT timestamps_target_y_range CHECK (target_y IS NULL OR (target_y >= 0 AND target_y <= 1));
