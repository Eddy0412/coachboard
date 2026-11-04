// The id of the dedicated, read-only "Coachboard Demo" project the guided
// tour shows at the end (after the coach has created their own project and
// first timestamp). Owned by a system account (see the one-time seeding
// script), flagged `is_global_demo` in the DB so RLS allows any signed-in
// user to view it. Empty until that clone exists.
export const GLOBAL_DEMO_PROJECT_ID = "3b54ba33-b9f5-4ed7-aa22-6f2982acf54f";

// Shared localStorage key for the in-progress guided-setup stage, read by
// both the tour itself (components/onboarding/guided-setup.tsx) and pages
// that need to know "is a guided tour currently steering me" without a
// query-string signal (e.g. to pre-fill an example value).
export const ONBOARDING_STAGE_KEY = (userId: string) => `onboarding_stage_${userId}`;

// Remembers the id of the coach's own practice project across the "demo"
// stage's detour to GLOBAL_DEMO_PROJECT_ID, so the tour can route back to it
// afterward for the delete_project stage (the project's URL isn't derivable
// from the current page while we're off looking at the demo project).
export const ONBOARDING_OWN_PROJECT_KEY = (userId: string) => `onboarding_own_project_${userId}`;

// Permanent "I've already been through the interactive guided tour" flag,
// set once stage reaches "done" (finished or skipped) — independent of the
// intro modal's own "Don't show this again" checkbox, so picking "Coach"
// again on a later login (because that checkbox was left unchecked) doesn't
// restart the whole interactive tour for someone who's already done it.
export const ONBOARDING_COMPLETED_KEY = (userId: string) => `onboarding_completed_${userId}`;
