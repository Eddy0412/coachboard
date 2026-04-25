/**
 * One-time script: send a renewal reminder to a specific coach.
 * Usage: npx tsx scripts/send-renewal-once.ts
 * Delete this file after use.
 */
import { createClient } from "@supabase/supabase-js";
import { sendRenewalReminderEmail } from "../lib/notifications/email";

const COACH_EMAIL = "seareign@gmail.com";
const APP_URL = "https://coachboard.kkmsports.xyz";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Find user
  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", COACH_EMAIL)
    .single();

  if (!profile) {
    console.error("User not found:", pe?.message);
    process.exit(1);
  }
  console.log(`Found user: ${profile.full_name} (${profile.id})`);

  // 2. Find active subscription
  const { data: sub, error: se } = await supabase
    .from("pf_subscriptions")
    .select("id, plan_interval, amount_usd, current_period_end")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .single();

  if (!sub) {
    console.error("No active subscription found:", se?.message);
    process.exit(1);
  }
  console.log(`Subscription: ${sub.plan_interval} $${sub.amount_usd}, ends ${sub.current_period_end}`);

  // 3. Use billing page as payment URL (running locally without production PF credentials)
  const paymentUrl = `${APP_URL}/settings/billing`;

  const renewalDate = new Date(sub.current_period_end).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // 4. Insert in-app notification
  const { error: ne } = await supabase.from("notifications").insert({
    user_id: profile.id,
    type: "renewal_reminder",
    title: "Pro subscription renewal",
    message: `Your Pro plan is due for renewal. Tap to pay and keep your access.`,
    data: { payment_url: paymentUrl, renewal_date: renewalDate },
    read: false,
  });
  if (ne) console.error("Notification insert error:", ne.message);
  else console.log("In-app notification sent.");

  // 5. Send email
  await sendRenewalReminderEmail(profile.email, {
    name: profile.full_name || "Coach",
    renewalDate,
    amount: sub.amount_usd,
    paymentUrl,
  });
  console.log(`Renewal reminder email sent to ${profile.email}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
