-- Footage Bookings table for tracking service booking requests and approvals

CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE footage_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  team_id UUID REFERENCES teams(id),
  team_name TEXT NOT NULL DEFAULT '',
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  service_price NUMERIC(10,2) NOT NULL,
  location TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  booking_time TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status booking_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_footage_bookings_user ON footage_bookings(user_id);
CREATE INDEX idx_footage_bookings_status ON footage_bookings(status);

-- RLS
ALTER TABLE footage_bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON footage_bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can create bookings
CREATE POLICY "Users can create bookings"
  ON footage_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only service role (admin) can update bookings (approve/decline)
-- We handle this via the API using service role key
