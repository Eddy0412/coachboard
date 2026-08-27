// Drawing colors
export const DRAW_COLORS = [
  { hex: "#00E5FF", name: "Cyan" },
  { hex: "#FF4D4D", name: "Red" },
  { hex: "#FFD166", name: "Yellow" },
  { hex: "#A3FF12", name: "Green" },
  { hex: "#FFFFFF", name: "White" },
  { hex: "#FF69B4", name: "Pink" },
  { hex: "#FFA500", name: "Orange" },
  { hex: "#8B5CF6", name: "Purple" },
] as const;

// Free tier: only first 3 colors
export const FREE_DRAW_COLORS = DRAW_COLORS.slice(0, 3);

export const DRAW_SIZES = [2, 4, 8, 12] as const;

export const DEFAULT_STEP_SECONDS = 5;
export const DEFAULT_OVERLAY_DURATION = 1;

// Free tier limits
export const FREE_LIMITS = {
  maxProjects: 2,
  maxTeams: 1,
  maxAthletes: 10,
  drawColors: 3,
  notifications: false,
  shareLinks: false,
  comments: false,
  csvExport: false,
} as const;

// Pro tier limits
export const PRO_LIMITS = {
  maxTeams: 1,
  maxAthletes: Infinity,
} as const;

// ODK (Offense / Defense / Kicking) options
export const ODK_OPTIONS = [
  { value: "offense", label: "Offense", code: "OFF", variant: "success" as const },
  { value: "defense", label: "Defense", code: "DEF", variant: "danger" as const },
  { value: "kicking", label: "Special Teams", code: "SPT", variant: "warning" as const },
] as const;

export const DOWN_OPTIONS = ["1st", "2nd", "3rd", "4th"] as const;

export const HASH_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "middle", label: "Middle" },
  { value: "right", label: "Right" },
] as const;

export const ACTION_OPTIONS = ["Run", "Pass", "Kick", "Trick"] as const;

// Pass target picker: normalized y=0 (top) is this many yards past the LOS.
// The LOS itself sits at PASS_TARGET_LOS_Y (not y=1) so the space below it can capture
// passes thrown behind the line (screens, shovels) instead of clamping them at the LOS.
export const PASS_TARGET_MAX_DEPTH_YDS = 40;
export const PASS_TARGET_YARD_TICKS = [10, 20, 30] as const;
export const PASS_TARGET_LOS_Y = 0.75;

export const PASS_RESULT_OPTIONS = [
  { value: "complete", label: "Complete", variant: "success" as const },
  { value: "incomplete", label: "Incomplete", variant: "warning" as const },
  { value: "interception", label: "INT", variant: "danger" as const },
] as const;

// Debounce timing for auto-save (ms)
export const AUTOSAVE_DEBOUNCE_MS = 1000;
