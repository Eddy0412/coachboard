-- Knowledge Base / Documentation articles, plus a real staff role.
-- See C:\Users\Edward\.claude\plans\delegated-herding-storm.md for design context.

-- =========================
-- Staff flag on profiles
-- =========================
-- The existing "Users can update own profile" policy has no column
-- restriction, so without this REVOKE any authenticated user could self-set
-- is_staff via a plain client update. Only the service role / SQL editor
-- (unaffected by a REVOKE on `authenticated`) can grant it.
ALTER TABLE profiles ADD COLUMN is_staff boolean NOT NULL DEFAULT false;
REVOKE UPDATE (is_staff) ON profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_staff FROM profiles WHERE id = auth.uid()), false);
$$;

-- =========================
-- Articles (Knowledge Base + Documentation)
-- =========================
CREATE TYPE article_category AS ENUM ('kba', 'doc');
CREATE TYPE article_status AS ENUM ('draft', 'published');

CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category article_category NOT NULL,
  status article_status NOT NULL DEFAULT 'draft',
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  topic text NOT NULL,
  description text NOT NULL,
  cause text,                 -- nullable: DOC articles are how-tos, not troubleshooting
  resolution text NOT NULL,
  youtube_video_id text,      -- optional embedded tutorial
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Published articles are visible to any signed-in user; staff also see drafts.
CREATE POLICY "Published articles are viewable by authenticated users"
  ON articles FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.is_staff());

CREATE POLICY "Staff can create articles"
  ON articles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff() AND created_by = auth.uid());

CREATE POLICY "Staff can update articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff can delete articles"
  ON articles FOR DELETE
  TO authenticated
  USING (public.is_staff());
