import type { Profile, ProjectAccess, TeamMember } from "./supabase/types";

export function isProUser(profile: Profile | null): boolean {
  return profile?.subscription_status === "pro";
}

export function isAthlete(profile: Profile | null): boolean {
  return profile?.default_role === "athlete";
}

export function isCoach(profile: Profile | null): boolean {
  return (
    profile?.default_role === "coach" ||
    profile?.default_role === "head_coach"
  );
}

export function isHeadCoach(profile: Profile | null): boolean {
  return profile?.default_role === "head_coach";
}

export function canEditProject(
  access: ProjectAccess | null,
  teamMember: TeamMember | null
): boolean {
  if (access?.permission === "admin" || access?.permission === "write")
    return true;
  if (
    teamMember?.role === "head_coach" ||
    teamMember?.role === "coach"
  )
    return true;
  return false;
}

export function canAdminProject(
  access: ProjectAccess | null,
  teamMember: TeamMember | null
): boolean {
  if (access?.permission === "admin") return true;
  if (teamMember?.role === "head_coach") return true;
  return false;
}

export function canManageTeam(teamMember: TeamMember | null): boolean {
  return teamMember?.role === "head_coach";
}

export function canEditRoster(teamMember: TeamMember | null): boolean {
  return (
    teamMember?.role === "head_coach" || teamMember?.role === "coach"
  );
}
