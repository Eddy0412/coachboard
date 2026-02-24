-- PagueloFacil payment integration schema

-- Add payment_provider column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT NULL;

-- PagueloFacil subscriptions table
CREATE TABLE pf_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  plan_interval TEXT NOT NULL CHECK (plan_interval IN ('monthly', 'yearly')),
  amount_usd NUMERIC(10,2) NOT NULL,
  cod_oper TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  last_charge_at TIMESTAMPTZ,
  last_charge_status TEXT,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PagueloFacil payment log table
CREATE TABLE pf_payment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pf_subscription_id UUID REFERENCES pf_subscriptions(id) ON DELETE SET NULL,
  cod_oper TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for pf_subscriptions
ALTER TABLE pf_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pf_subscription"
  ON pf_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles inserts/updates from API routes (no user-facing insert/update needed)

-- RLS policies for pf_payment_log
ALTER TABLE pf_payment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pf_payment_log"
  ON pf_payment_log FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for cron job performance
CREATE INDEX idx_pf_subscriptions_status_period
  ON pf_subscriptions (status, current_period_end)
  WHERE status IN ('active', 'canceled');

CREATE INDEX idx_pf_payment_log_cod_oper
  ON pf_payment_log (cod_oper);
