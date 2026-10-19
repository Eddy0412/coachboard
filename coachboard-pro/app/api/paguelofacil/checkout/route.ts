import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const interval = body.interval as "monthly" | "yearly" | "promo";
    if (interval !== "monthly" && interval !== "yearly" && interval !== "promo") {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }

    if (interval === "promo") {
      const { PROMO_WINDOW_END } = await import("@/lib/promo");
      if (Date.now() >= PROMO_WINDOW_END.getTime()) {
        return NextResponse.json(
          { error: "This promotion has ended" },
          { status: 400 }
        );
      }
    }

    // Check if user already has an active PF subscription
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing } = await supabaseAdmin
      .from("pf_subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    const { PROMO_PRICE_USD } = await import("@/lib/promo");
    const amount =
      interval === "promo" ? PROMO_PRICE_USD : interval === "yearly" ? 299 : 39;
    const description =
      interval === "promo"
        ? "Coachboard Pro — Promo (access through Dec 31, 2026)"
        : `Coachboard Pro ${interval === "yearly" ? "Annual" : "Monthly"} Subscription`;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${APP_URL}/api/paguelofacil/callback`;

    const { createPaymentLink } = await import("@/lib/paguelofacil");
    const { url } = await createPaymentLink({
      amount,
      description,
      returnUrl,
      userId: user.id,
      interval,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("PagueloFacil checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
