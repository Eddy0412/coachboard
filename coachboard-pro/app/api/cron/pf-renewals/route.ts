import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const summary = { processed: 0, succeeded: 0, failed: 0, expired: 0 };

  try {
    // 1. Expire subscriptions that were canceled and period has ended
    const { data: toExpire } = await supabaseAdmin
      .from("pf_subscriptions")
      .select("id, user_id")
      .eq("cancel_at_period_end", true)
      .lte("current_period_end", now)
      .in("status", ["active"]);

    if (toExpire && toExpire.length > 0) {
      for (const sub of toExpire as { id: string; user_id: string }[]) {
        await supabaseAdmin
          .from("pf_subscriptions")
          .update({ status: "expired", updated_at: now })
          .eq("id", sub.id);

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "free",
            payment_provider: null,
            updated_at: now,
          })
          .eq("id", sub.user_id);

        summary.expired++;
      }
    }

    // 2. Renew active subscriptions that are due
    const { data: toRenew } = await supabaseAdmin
      .from("pf_subscriptions")
      .select("id, user_id, cod_oper, plan_interval, amount_usd")
      .eq("status", "active")
      .eq("cancel_at_period_end", false)
      .lte("current_period_end", now);

    if (toRenew && toRenew.length > 0) {
      const { chargeRecurrent } = await import("@/lib/paguelofacil");

      for (const sub of toRenew as {
        id: string;
        user_id: string;
        cod_oper: string;
        plan_interval: string;
        amount_usd: number;
      }[]) {
        summary.processed++;

        // Get user email for the charge
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", sub.user_id)
          .single();

        const email = (profile as { email: string } | null)?.email || "";

        const result = await chargeRecurrent({
          codOper: sub.cod_oper,
          amount: sub.amount_usd,
          email,
          description: `Coachboard Pro ${sub.plan_interval} renewal`,
        });

        if (result.success) {
          const periodDays = sub.plan_interval === "yearly" ? 365 : 30;
          const newPeriodEnd = new Date(
            Date.now() + periodDays * 24 * 60 * 60 * 1000
          ).toISOString();

          await supabaseAdmin
            .from("pf_subscriptions")
            .update({
              current_period_start: now,
              current_period_end: newPeriodEnd,
              last_charge_at: now,
              last_charge_status: "success",
              consecutive_failures: 0,
              updated_at: now,
            })
            .eq("id", sub.id);

          await supabaseAdmin.from("pf_payment_log").insert({
            user_id: sub.user_id,
            pf_subscription_id: sub.id,
            cod_oper: sub.cod_oper,
            amount_usd: sub.amount_usd,
            status: "success",
            payment_type: "renewal",
            raw_response: result.raw,
          });

          summary.succeeded++;
        } else {
          // Increment failure count
          const { data: updated } = await supabaseAdmin
            .from("pf_subscriptions")
            .update({
              last_charge_at: now,
              last_charge_status: "failed",
              consecutive_failures: (await supabaseAdmin
                .from("pf_subscriptions")
                .select("consecutive_failures")
                .eq("id", sub.id)
                .single()
                .then((r) => (r.data as { consecutive_failures: number } | null)?.consecutive_failures ?? 0)) + 1,
              updated_at: now,
            })
            .eq("id", sub.id)
            .select("consecutive_failures")
            .single();

          const failures = (updated as { consecutive_failures: number } | null)?.consecutive_failures ?? 0;

          // After 3 consecutive failures, mark past_due and downgrade
          if (failures >= 3) {
            await supabaseAdmin
              .from("pf_subscriptions")
              .update({ status: "past_due", updated_at: now })
              .eq("id", sub.id);

            await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "free",
                payment_provider: null,
                updated_at: now,
              })
              .eq("id", sub.user_id);
          }

          await supabaseAdmin.from("pf_payment_log").insert({
            user_id: sub.user_id,
            pf_subscription_id: sub.id,
            cod_oper: sub.cod_oper,
            amount_usd: sub.amount_usd,
            status: "failed",
            payment_type: "renewal",
            raw_response: result.raw,
          });

          summary.failed++;
        }
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("PF renewals cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}
