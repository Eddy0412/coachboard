export type UserRole = "head_coach" | "coach" | "athlete";
export type TeamMemberStatus = "pending" | "accepted" | "declined";
export type SubscriptionStatus = "free" | "pro" | "canceled";
export type ProjectPermission = "admin" | "write" | "read";
export type InvitationStatus = "pending" | "accepted" | "expired";
export type DrawingTool = "pen" | "erase";

export type PaymentProvider = "stripe" | "paguelofacil" | "yappy" | null;

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  default_role: UserRole;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  payment_provider: PaymentProvider;
  grandfathered: boolean;
  created_at: string;
  updated_at: string;
}

export type PfSubscriptionStatus = "active" | "canceled" | "past_due" | "expired";
export type PfPlanInterval = "monthly" | "yearly";

export interface PfSubscription {
  id: string;
  user_id: string;
  plan_interval: PfPlanInterval;
  amount_usd: number;
  cod_oper: string;
  status: PfSubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  last_charge_at: string | null;
  last_charge_status: string | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface PfPaymentLog {
  id: string;
  user_id: string;
  pf_subscription_id: string | null;
  cod_oper: string;
  amount_usd: number;
  status: string;
  payment_type: string;
  raw_response: Record<string, unknown> | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string;
  status: TeamMemberStatus;
  created_at: string;
}

export type ProjectCategory = "game" | "practice";

export interface Project {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_id: string;
  category: ProjectCategory;
  created_by: string;
  coachiq_report: string | null;
  coachiq_report_visibility: "coach_only" | "team";
  coachiq_report_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAccess {
  id: string;
  project_id: string;
  user_id: string;
  permission: ProjectPermission;
  granted_by: string;
  created_at: string;
}

export interface Athlete {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  position: string;
  jersey_number: string;
  user_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Timestamp {
  id: string;
  project_id: string;
  time_seconds: number;
  end_time_seconds: number | null;
  title: string;
  description: string;
  overlay_show_sec: number;
  odk: string | null;
  down: string | null;
  distance: string | null;
  los: string | null;
  hash: string | null;
  action: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimestampAthlete {
  timestamp_id: string;
  athlete_id: string;
}

export interface Drawing {
  id: string;
  timestamp_id: string;
  tool: DrawingTool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  sort_order: number;
  created_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  timestamp_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  permission: "read";
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  team_id: string;
  email: string;
  phone: string | null;
  role: "coach" | "athlete";
  token: string;
  invited_by: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

// Supabase Database type — each table needs Row, Insert, Update, and Relationships.
// In production, replace with `supabase gen types typescript` output.
type TableDef<R> = {
  Row: R;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      teams: TableDef<Team>;
      team_members: TableDef<TeamMember>;
      projects: TableDef<Project>;
      project_access: TableDef<ProjectAccess>;
      athletes: TableDef<Athlete>;
      timestamps: TableDef<Timestamp>;
      timestamp_athletes: TableDef<TimestampAthlete>;
      drawings: TableDef<Drawing>;
      comments: TableDef<Comment>;
      notifications: TableDef<Notification>;
      share_links: TableDef<ShareLink>;
      invitations: TableDef<Invitation>;
      pf_subscriptions: TableDef<PfSubscription>;
      pf_payment_log: TableDef<PfPaymentLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      team_member_status: TeamMemberStatus;
      subscription_status: SubscriptionStatus;
      project_permission: ProjectPermission;
      invitation_status: InvitationStatus;
      drawing_tool: DrawingTool;
    };
  };
}
