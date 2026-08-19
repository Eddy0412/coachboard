-- Team leave / transfer head coach / archive / delete
-- See C:\Users\Edward\.claude\plans\delegated-herding-storm.md for design context.

-- =========================
-- Self-leave RLS policy
-- =========================
-- Members can leave a team (delete their own row), except head coaches —
-- a head coach must transfer the role first (see transfer_head_coach_and_leave
-- below) or archive/delete the team if they're the sole member.
-- This is an additional permissive policy; Postgres OR's it together with the
-- existing "Head coach can remove team members" policy.
CREATE POLICY "Members can leave a team"
  ON team_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND role <> 'head_coach');

-- =========================
-- Team status (archive / delete)
-- =========================
-- Both archive and delete are soft-status changes — no team data is ever
-- hard-deleted. "archived" stays visible to the former head coach in a
-- read-only list; "deleted" is hidden from all UI but the row and its data
-- persist in the backend. Setting this column is already covered by the
-- existing "Head coach can update team" UPDATE policy (no new RLS needed).
CREATE TYPE team_status AS ENUM ('active', 'archived', 'deleted');

ALTER TABLE teams ADD COLUMN status team_status NOT NULL DEFAULT 'active';
ALTER TABLE teams ADD COLUMN archived_at timestamptz;

-- =========================
-- Atomic transfer-and-leave
-- =========================
-- A head coach's own row can't be self-deleted via RLS (excluded above), and
-- doing "promote target" + "remove self" as two separate calls risks ending
-- up with zero or two head coaches if the second call fails. This function
-- does both in one transaction.
CREATE OR REPLACE FUNCTION public.transfer_head_coach_and_leave(
  p_team_id uuid,
  p_new_head_coach_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_head_coach(p_team_id) THEN
    RAISE EXCEPTION 'Only the head coach can transfer this role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_new_head_coach_user_id
      AND status = 'accepted'
      AND role IN ('coach', 'head_coach')
  ) THEN
    RAISE EXCEPTION 'Target user is not an eligible team member';
  END IF;

  UPDATE team_members
    SET role = 'head_coach'
    WHERE team_id = p_team_id AND user_id = p_new_head_coach_user_id;

  DELETE FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_head_coach_and_leave(uuid, uuid) TO authenticated;
