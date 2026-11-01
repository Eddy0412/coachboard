-- Feedback board: bug reports, comments, and ideas from any signed-in user,
-- with voting, comments, and staff triage (status/priority).

CREATE TYPE feedback_category AS ENUM ('bug', 'comment', 'idea');
CREATE TYPE feedback_severity AS ENUM ('small_thing', 'annoying', 'blocks_me', 'breaks_site');
CREATE TYPE feedback_priority AS ENUM ('p0', 'p1', 'p2');
CREATE TYPE feedback_status AS ENUM ('new', 'tbd', 'planned', 'in_progress', 'done', 'wont_fix');

CREATE TABLE feedback_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category feedback_category NOT NULL,
  title text NOT NULL,
  details text NOT NULL,
  severity feedback_severity,
  priority feedback_priority,
  status feedback_status NOT NULL DEFAULT 'new',
  page_path text,
  author_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feedback_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feedback_votes (
  item_id uuid NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

CREATE TABLE feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_items_created_at_idx ON feedback_items (created_at DESC);
CREATE INDEX feedback_attachments_item_id_idx ON feedback_attachments (item_id);
CREATE INDEX feedback_votes_item_id_idx ON feedback_votes (item_id);
CREATE INDEX feedback_comments_item_id_idx ON feedback_comments (item_id);

ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- feedback_items: anyone signed in can read and post; only staff can triage
-- (status/priority) after the fact.
CREATE POLICY "Feedback items are viewable by authenticated users"
  ON feedback_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can submit feedback"
  ON feedback_items FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Staff can triage feedback"
  ON feedback_items FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- feedback_attachments: readable by anyone signed in; only the item's own
-- author can attach files to it (attached in the same request as creation).
CREATE POLICY "Feedback attachments are viewable by authenticated users"
  ON feedback_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Item author can attach files"
  ON feedback_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_items
      WHERE id = item_id AND author_id = auth.uid()
    )
  );

-- feedback_votes: a simple per-user toggle.
CREATE POLICY "Feedback votes are viewable by authenticated users"
  ON feedback_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cast their own vote"
  ON feedback_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own vote"
  ON feedback_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- feedback_comments: anyone signed in can read and post.
CREATE POLICY "Feedback comments are viewable by authenticated users"
  ON feedback_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can comment on feedback"
  ON feedback_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- =========================
-- Storage: screenshot attachments
-- =========================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feedback-attachments', 'feedback-attachments', true, 5242880)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Feedback attachment files are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feedback-attachments');

CREATE POLICY "Authenticated users can upload feedback attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
