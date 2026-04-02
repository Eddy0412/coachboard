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
  const now = new Date();
  const nowIso = now.toISOString();

  const summary = { expired: 0, reminders: 0, overdue: 0 };

  try {
    // ─── Step 1: Expire subscriptions that were canceled and period has ended ───
    const { data: toExpire } = await supabaseAdmin
      .from("pf_subscriptions")
      .select("id, user_id")
      .eq("cancel_at_period_end", true)
      .eq("status", "active")
      .lte("current_period_end", nowIso);

    for (const sub of (toExpire ?? []) as { id: string; user_id: string }[]) {
      await supabaseAdmin
        .from("pf_subscriptions")
        .update({ status: "expired", updated_at: nowIso })
        .eq("id", sub.id);

      await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "free", payment_provider: null, updated_at: nowIso })
        .eq("id", sub.user_id);

      summary.expired++;
    }

    // ─── Step 2: Send renewal reminders (7-day window) ───────────────────────
    // Window: period ends between now+6.5 days and now+7.5 days
    // Running daily, this fires exactly once per billing cycle.
    const windowStart = new Date(now.getTime() + 6.5 * 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 7.5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: toRemind } = await supabaseAdmin
      .from("pf_subscriptions")
      .select("id, user_id, plan_interval, amount_usd")
      .eq("status", "active")
      .eq("cancel_at_period_end", false)
      .gte("current_period_end", windowStart)
      .lte("current_period_end", windowEnd);

    if ((toRemind ?? []).length > 0) {
      const { createPaymentLink } = await import("@/lib/paguelofacil");
      const { sendRenewalReminderEmail } = await import("@/lib/notifications/email");
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      for (const sub of toRemind as {
        id: string;
        user_id: string;
        plan_interval: string;
        amount_usd: number;
      }[]) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", sub.user_id)
          .single();

        const p = profile as { email: string; full_name: string } | null;
        if (!p?.email) continue;

        // Generate a fresh payment link for the renewal
        let paymentUrl = `${APP_URL}/settings/billing`;
        try {
          const { url } = await createPaymentLink({
            amount: sub.amount_usd,
            description: `Coachboard Pro ${sub.plan_interval === "yearly" ? "Annual" : "Monthly"} Renewal`,
            returnUrl: `${APP_URL}/api/paguelofacil/callback`,
            userId: sub.user_id,
            interval: sub.plan_interval as "monthly" | "yearly",
          });
          paymentUrl = url;
        } catch (err) {
          console.error("Failed to generate renewal payment link:", err);
        }

        const renewalDate = new Date(windowStart).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // In-app notification
        await supabaseAdmin.from("notifications").insert({
          user_id: sub.user_id,
          type: "renewal_reminder",
          title: "Pro subscription renews in 7 days",
          message: `Your Pro plan renews on ${renewalDate}. Tap to pay and keep your access.`,
          data: { payment_url: paymentUrl, renewal_date: renewalDate },
          read: false,
        });

        // Email
        try {
          await sendRenewalReminderEmail(p.email, {
            name: p.full_name || "Coach",
            renewalDate,
            amount: sub.amount_usd,
            paymentUrl,
          });
        } catch (err) {
          console.error("Failed to send renewal reminder email:", err);
        }

        summary.reminders++;
      }
    }

    // ─── Step 3: Handle overdue subscriptions ────────────────────────────────
    // Active subs where period has ended and they haven't paid yet.
    // consecutive_failures is repurposed as an overdue-day counter.
    // - Day 1 overdue: send "expired" notification + email, set consecutive_failures = 1
    // - Day 3+ overdue: downgrade to free and mark past_due
    const { data: overdue } = await supabaseAdmin
      .from("pf_subscriptions")
      .select("id, user_id, plan_interval, amount_usd, consecutive_failures, current_period_end")
      .eq("status", "active")
      .eq("cancel_at_period_end", false)
      .lte("current_period_end", nowIso);

    if ((overdue ?? []).length > 0) {
      const { createPaymentLink } = await import("@/lib/paguelofacil");
      const { sendRenewalOverdueEmail } = await import("@/lib/notifications/email");
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      for (const sub of overdue as {
        id: string;
        user_id: string;
        plan_interval: string;
        amount_usd: number;
        consecutive_failures: number;
        current_period_end: string;
      }[]) {
        const newFailures = sub.consecutive_failures + 1;

        await supabaseAdmin
          .from("pf_subscriptions")
          .update({ consecutive_failures: newFailures, updated_at: nowIso })
          .eq("id", sub.id);

        // Day 1 overdue: notify the coach
        if (sub.consecutive_failures === 0) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("id", sub.user_id)
            .single();

          const p = profile as { email: string; full_name: string } | null;

          let paymentUrl = `${APP_URL}/settings/billing`;
          try {
            const { url } = await createPaymentLink({
              amount: sub.amount_usd,
              description: `Coachboard Pro ${sub.plan_interval === "yearly" ? "Annual" : "Monthly"} Renewal`,
              returnUrl: `${APP_URL}/api/paguelofacil/callback`,
              userId: sub.user_id,
              interval: sub.plan_interval as "monthly" | "yearly",
            });
            paymentUrl = url;
          } catch (err) {
            console.error("Failed to generate overdue payment link:", err);
          }

          const dueDate = new Date(sub.current_period_end).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          await supabaseAdmin.from("notifications").insert({
            user_id: sub.user_id,
            type: "renewal_overdue",
            title: "Pro subscription expired",
            message: `Your Pro plan expired on ${dueDate}. Renew now to restore access.`,
            data: { payment_url: paymentUrl, due_date: dueDate },
            read: false,
          });

          if (p?.email) {
            try {
              await sendRenewalOverdueEmail(p.email, {
                name: p.full_name || "Coach",
                dueDate,
                amount: sub.amount_usd,
                paymentUrl,
              });
            } catch (err) {
              console.error("Failed to send overdue email:", err);
            }
          }
        }

        // Day 3+ overdue: downgrade
        if (newFailures >= 3) {
          await supabaseAdmin
            .from("pf_subscriptions")
            .update({ status: "past_due", updated_at: nowIso })
            .eq("id", sub.id);

          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: "free", payment_provider: null, updated_at: nowIso })
            .eq("id", sub.user_id);
        }

        summary.overdue++;
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

/*
 * ─── FUTURE: PCI-CERTIFIED RECURRENT CHARGING ────────────────────────────────
 * When PCI DSS certification is obtained, replace the reminder flow above with
 * direct recurrent charges using chargeRecurrent() from @/lib/paguelofacil.
 * PagueloFacil must also activate the recurrent service on the merchant account.
 * ─────────────────────────────────────────────────────────────────────────────
 */
