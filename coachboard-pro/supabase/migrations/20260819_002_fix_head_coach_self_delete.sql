-- Fix: "Head coach can remove team members" never excluded the head coach's
-- own row, so a head coach could self-delete directly and bypass the
-- transfer-required invariant introduced in 20260819_001. Combined with the
-- "Members can leave a team" policy (which already excludes role =
-- 'head_coach'), this makes self-removal impossible for a head coach via any
-- RLS-gated path — the only way out is transfer_head_coach_and_leave (which
-- runs SECURITY DEFINER and bypasses RLS for that one atomic operation) or
-- archiving/deleting the team once they're the sole member.
ALTER POLICY "Head coach can remove team members"
  ON team_members
  USING (
    public.is_team_head_coach(team_members.team_id)
    AND team_members.user_id <> auth.uid()
  );
