import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const billingUrl = `${APP_URL}/settings/billing`;

  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("Estado");
    const codOper = searchParams.get("Oper");
    const parm1 = searchParams.get("PARM_1") || searchParams.get("parm_1") || "";
    const parm2 = searchParams.get("PARM_2") || searchParams.get("parm_2") || "";

    console.log("PF callback params:", { estado, codOper, parm1: parm1.substring(0, 20) + "...", parm2 });

    // Payment denied or canceled
    if (estado !== "Aprobada") {
      console.log("PF callback: Estado not Aprobada:", estado);
      return NextResponse.redirect(new URL(`${billingUrl}?canceled=true`), 302);
    }

    if (!codOper || !parm1 || !parm2) {
      console.log("PF callback: Missing params", { codOper: !!codOper, parm1: !!parm1, parm2: !!parm2 });
      return NextResponse.redirect(new URL(`${billingUrl}?canceled=true`), 302);
    }

    // Verify HMAC signature
    const { verifyParm } = await import("@/lib/paguelofacil");
    const userId = verifyParm(parm1, parm2);
    if (!userId) {
      console.error("PF callback: HMAC verification failed for parm1:", parm1.substring(0, 40));
      return NextResponse.redirect(new URL(`${billingUrl}?canceled=true`), 302);
    }

    const interval = parm2 as "monthly" | "yearly";
    if (interval !== "monthly" && interval !== "yearly") {
      console.error("PF callback: Invalid interval:", parm2);
      return NextResponse.redirect(new URL(`${billingUrl}?canceled=true`), 302);
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Idempotency: check if this codOper was already processed
    const { data: existingLog } = await supabaseAdmin
      .from("pf_payment_log")
      .select("id")
      .eq("cod_oper", codOper)
      .limit(1)
      .single();

    if (existingLog) {
      return NextResponse.redirect(new URL(`${billingUrl}?success=true`), 302);
    }

    const amount = interval === "yearly" ? 240 : 24;
    const periodDays = interval === "yearly" ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    // Upsert pf_subscriptions (user_id is UNIQUE)
    const { data: sub, error: subError } = await supabaseAdmin
      .from("pf_subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_interval: interval,
          amount_usd: amount,
          cod_oper: codOper,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          last_charge_at: now.toISOString(),
          last_charge_status: "Aprobada",
          consecutive_failures: 0,
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (subError) {
      console.error("PF callback upsert error:", subError);
      return NextResponse.redirect(new URL(`${billingUrl}?canceled=true`), 302);
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "pro",
        payment_provider: "paguelofacil",
        updated_at: now.toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("PF callback profile update error:", profileError);
    }

    // Log the payment
    await supabaseAdmin.from("pf_payment_log").insert({
      user_id: userId,
      pf_subscription_id: (sub as { id: string }).id,
      cod_oper: codOper,
      amount_usd: amount,
      status: "Aprobada",
      payment_type: "initial",
      raw_response: Object.fromEntries(searchParams.entries()),
    });

    console.log("PF callback: Success for user", userId);
    return NextResponse.redirect(new URL(`${billingUrl}?success=true`), 302);
  } catch (error) {
    console.error("PagueloFacil callback error:", error);
    return NextResponse.redirect(new URL(`${billingUrl}?canceled=true`), 302);
  }
}
