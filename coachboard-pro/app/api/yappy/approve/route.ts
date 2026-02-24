import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifyToken(userId: string, token: string): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`yappy-approve:${userId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function generateApproveToken(userId: string): string {
  const secret = process.env.CRON_SECRET!;
  return crypto
    .createHmac("sha256", secret)
    .update(`yappy-approve:${userId}`)
    .digest("hex");
}

export async function GET(request: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const token = searchParams.get("token");

  if (!userId || !token) {
    return new NextResponse(page("Missing parameters", "error", APP_URL), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!verifyToken(userId, token)) {
    return new NextResponse(page("Invalid or expired approval link", "error", APP_URL), {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Check current status
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name, subscription_status")
    .eq("id", userId)
    .single();

  if (!profile) {
    return new NextResponse(page("User not found", "error", APP_URL), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const p = profile as { email: string; full_name: string; subscription_status: string };

  if (p.subscription_status === "pro") {
    return new NextResponse(
      page(`${p.full_name} (${p.email}) is already on the Pro plan.`, "already", APP_URL),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  // Upgrade to pro
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_status: "pro",
      payment_provider: "yappy",
      updated_at: now.toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Yappy approve error:", error);
    return new NextResponse(page("Failed to upgrade user. Check server logs.", "error", APP_URL), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Create subscription record for billing page display
  await supabaseAdmin
    .from("pf_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_interval: "yearly",
        amount_usd: 240,
        cod_oper: "YAPPY-MANUAL",
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        last_charge_at: now.toISOString(),
        last_charge_status: "approved",
        consecutive_failures: 0,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    );

  // Send confirmation email to user
  try {
    const { sendYappyApprovalEmail } = await import("@/lib/notifications/email");
    await sendYappyApprovalEmail(p.email, { name: p.full_name });
  } catch (emailErr) {
    console.error("Failed to send Yappy approval email:", emailErr);
  }

  // Send in-app notification
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "yappy_approved",
    title: "Pro Plan Activated!",
    message: "Your Yappy payment has been confirmed. You now have full access to all Pro features.",
    data: {},
    read: false,
  });

  return new NextResponse(
    page(`${p.full_name} (${p.email}) has been upgraded to Pro!`, "success", APP_URL),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function page(message: string, type: "success" | "error" | "already", appUrl: string): string {
  const color = type === "success" ? "#22c55e" : type === "already" ? "#3b82f6" : "#ef4444";
  const icon = type === "success" ? "&#10003;" : type === "already" ? "&#8505;" : "&#10007;";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Yappy Approval</title></head>
<body style="font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb;">
<div style="text-align:center;padding:40px;max-width:400px;">
<div style="width:60px;height:60px;border-radius:50%;background:${color};color:white;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">${icon}</div>
<h2 style="margin:0 0 8px;color:#111;">${type === "success" ? "Approved!" : type === "already" ? "Already Pro" : "Error"}</h2>
<p style="color:#666;margin:0 0 24px;">${message}</p>
<a href="${appUrl}/settings/billing" style="display:inline-block;padding:10px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">Go to Coachboard</a>
</div></body></html>`;
}
