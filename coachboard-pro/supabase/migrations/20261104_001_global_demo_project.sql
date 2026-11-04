-- Global read-only demo project for the guided onboarding tour.
-- One project can be flagged is_global_demo; every signed-in user can SELECT
-- it (and its timestamps/drawings/tagged athletes) regardless of team
-- membership, but INSERT/UPDATE/DELETE policies are untouched — nobody
-- outside its own (dedicated, untouchable) team can ever write to it.

ALTER TABLE projects ADD COLUMN is_global_demo boolean NOT NULL DEFAULT false;

ALTER POLICY "Users can view accessible projects"
  ON projects
  USING (
    created_by = auth.uid()
    OR projects.team_id IN (SELECT public.get_my_team_ids())
    OR EXISTS (
      SELECT 1 FROM project_access
      WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
    )
    OR projects.is_global_demo = true
  );

ALTER POLICY "Users with project access can view timestamps"
  ON timestamps
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timestamps.project_id
        AND (
          projects.created_by = auth.uid()
          OR projects.team_id IN (SELECT public.get_my_team_ids())
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
          OR projects.is_global_demo = true
        )
    )
  );

ALTER POLICY "Users with project access can view drawings"
  ON drawings
  USING (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = drawings.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR projects.team_id IN (SELECT public.get_my_team_ids())
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
          OR projects.is_global_demo = true
        )
    )
  );

ALTER POLICY "Users with project access can view timestamp athletes"
  ON timestamp_athletes
  USING (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = timestamp_athletes.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR projects.team_id IN (SELECT public.get_my_team_ids())
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
          OR projects.is_global_demo = true
        )
    )
  );

ALTER POLICY "Team members can view athletes"
  ON athletes
  USING (
    athletes.team_id IN (SELECT public.get_my_team_ids())
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.team_id = athletes.team_id
        AND projects.is_global_demo = true
    )
  );
