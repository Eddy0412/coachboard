-- Coachboard Pro - Row Level Security Policies
-- All tables use RLS. This file defines the policies.

-- =========================
-- Enable RLS on all tables
-- =========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE timestamp_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =========================
-- PROFILES
-- =========================
-- Users can read any profile (needed for displaying names)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =========================
-- TEAMS
-- =========================
-- Team members can read their team
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'accepted'
    )
  );

-- Authenticated users can create teams
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Head coach can update team
CREATE POLICY "Head coach can update team"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'head_coach'
    )
  );

-- =========================
-- TEAM MEMBERS
-- =========================
-- Team members can view other members of their team
CREATE POLICY "Team members can view their team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'accepted'
    )
  );

-- Head coach / coaches can insert team members
CREATE POLICY "Coaches can invite team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('head_coach', 'coach')
        AND tm.status = 'accepted'
    )
    OR team_members.user_id = auth.uid() -- allow self-insert when creating team
  );

-- Head coach can delete team members
CREATE POLICY "Head coach can remove team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'head_coach'
    )
  );

-- Members can update their own status (accept/decline)
CREATE POLICY "Members can update own membership"
  ON team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================
-- PROJECTS
-- =========================
-- Users can view projects they have access to (via team or direct access)
CREATE POLICY "Users can view accessible projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM project_access
      WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
    )
  );

-- Coaches can create projects in their teams
CREATE POLICY "Coaches can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('head_coach', 'coach')
        AND team_members.status = 'accepted'
    )
  );

-- Users with write/admin access can update projects
CREATE POLICY "Editors can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_access
      WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
        AND project_access.permission IN ('admin', 'write')
    )
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('head_coach', 'coach')
        AND team_members.status = 'accepted'
    )
  );

-- Admin / head_coach can delete projects
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_access
      WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
        AND project_access.permission = 'admin'
    )
  );

-- =========================
-- PROJECT ACCESS
-- =========================
CREATE POLICY "Users can view their own project access"
  ON project_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_access AS pa
      WHERE pa.project_id = project_access.project_id
        AND pa.user_id = auth.uid()
        AND pa.permission = 'admin'
    )
  );

CREATE POLICY "Project admins can manage access"
  ON project_access FOR INSERT
  TO authenticated
  WITH CHECK (
    granted_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM project_access AS pa
        WHERE pa.project_id = project_access.project_id
          AND pa.user_id = auth.uid()
          AND pa.permission = 'admin'
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_access.project_id
          AND projects.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Project admins can delete access"
  ON project_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_access AS pa
      WHERE pa.project_id = project_access.project_id
        AND pa.user_id = auth.uid()
        AND pa.permission = 'admin'
    )
  );

-- =========================
-- ATHLETES
-- =========================
-- Team members can read athletes
CREATE POLICY "Team members can view athletes"
  ON athletes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = athletes.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'accepted'
    )
  );

-- Coaches can manage athletes
CREATE POLICY "Coaches can create athletes"
  ON athletes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = athletes.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('head_coach', 'coach')
        AND team_members.status = 'accepted'
    )
  );

CREATE POLICY "Coaches can update athletes"
  ON athletes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = athletes.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('head_coach', 'coach')
        AND team_members.status = 'accepted'
    )
  );

CREATE POLICY "Coaches can delete athletes"
  ON athletes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = athletes.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('head_coach', 'coach')
        AND team_members.status = 'accepted'
    )
  );

-- =========================
-- TIMESTAMPS (based on project access)
-- =========================
CREATE POLICY "Users with project access can view timestamps"
  ON timestamps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timestamps.project_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.status = 'accepted'
          )
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Editors can create timestamps"
  ON timestamps FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timestamps.project_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
              AND project_access.permission IN ('admin', 'write')
          )
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('head_coach', 'coach')
              AND team_members.status = 'accepted'
          )
        )
    )
  );

CREATE POLICY "Editors can update timestamps"
  ON timestamps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timestamps.project_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
              AND project_access.permission IN ('admin', 'write')
          )
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('head_coach', 'coach')
              AND team_members.status = 'accepted'
          )
        )
    )
  );

CREATE POLICY "Editors can delete timestamps"
  ON timestamps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = timestamps.project_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
              AND project_access.permission = 'admin'
          )
        )
    )
  );

-- =========================
-- TIMESTAMP ATHLETES
-- =========================
CREATE POLICY "Users with project access can view timestamp athletes"
  ON timestamp_athletes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = timestamp_athletes.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.status = 'accepted'
          )
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Editors can manage timestamp athletes"
  ON timestamp_athletes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = timestamp_athletes.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
              AND project_access.permission IN ('admin', 'write')
          )
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('head_coach', 'coach')
              AND team_members.status = 'accepted'
          )
        )
    )
  );

CREATE POLICY "Editors can delete timestamp athletes"
  ON timestamp_athletes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = timestamp_athletes.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
              AND project_access.permission IN ('admin', 'write')
          )
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('head_coach', 'coach')
              AND team_members.status = 'accepted'
          )
        )
    )
  );

-- =========================
-- DRAWINGS
-- =========================
CREATE POLICY "Users with project access can view drawings"
  ON drawings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = drawings.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.status = 'accepted'
          )
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Editors can create drawings"
  ON drawings FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Editors can delete drawings"
  ON drawings FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = drawings.timestamp_id
        AND projects.created_by = auth.uid()
    )
  );

-- =========================
-- COMMENTS
-- =========================
CREATE POLICY "Users with project access can view comments"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timestamps
      JOIN projects ON projects.id = timestamps.project_id
      WHERE timestamps.id = comments.timestamp_id
        AND (
          projects.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = projects.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.status = 'accepted'
          )
          OR EXISTS (
            SELECT 1 FROM project_access
            WHERE project_access.project_id = projects.id
              AND project_access.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role inserts notifications (no user policy needed for insert)
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =========================
-- SHARE LINKS
-- =========================
-- Anyone authenticated can read share links by token (for /shared/[token] page)
CREATE POLICY "Authenticated users can read share links"
  ON share_links FOR SELECT
  TO authenticated
  USING (true);

-- Project admin can create share links
CREATE POLICY "Project admins can create share links"
  ON share_links FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_access
      WHERE project_access.project_id = share_links.project_id
        AND project_access.user_id = auth.uid()
        AND project_access.permission = 'admin'
    )
  );

-- =========================
-- INVITATIONS
-- =========================
-- Anyone authenticated can read invitations by token (for /invite/[token] page)
CREATE POLICY "Authenticated users can read invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Coaches can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = invitations.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('head_coach', 'coach')
        AND team_members.status = 'accepted'
    )
  );

CREATE POLICY "Invitee can update invitation status"
  ON invitations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
