-- Tracks Anthropic API spend per call (currently: CoachIQ report generation)
-- so staff can see fund usage per pro user on the admin stats page.

CREATE TABLE api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  feature text NOT NULL DEFAULT 'coachiq_report',
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_usage_log_user ON api_usage_log(user_id);
CREATE INDEX idx_api_usage_log_created ON api_usage_log(created_at);

ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Writes only ever happen from the server via the service role key, which
-- bypasses RLS — no INSERT policy needed for `authenticated`.

CREATE POLICY "Users can view their own API usage"
  ON api_usage_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all API usage"
  ON api_usage_log FOR SELECT
  TO authenticated
  USING (public.is_staff());
