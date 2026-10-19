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
    const { name, phone, teamId, teamName } = body;
    const plan: "yearly" | "promo" = body.plan === "promo" ? "promo" : "yearly";

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    if (plan === "promo") {
      const { PROMO_WINDOW_END } = await import("@/lib/promo");
      if (Date.now() >= PROMO_WINDOW_END.getTime()) {
        return NextResponse.json(
          { error: "This promotion has ended" },
          { status: 400 }
        );
      }
    }

    // Send email to billing
    const billingEmail = "billing@kkmsports.xyz";
    let emailSent = false;

    if (process.env.RESEND_API_KEY) {
      try {
        const { sendYappyPaymentRequestEmail } = await import(
          "@/lib/notifications/email"
        );
        await sendYappyPaymentRequestEmail(billingEmail, {
          requesterName: name,
          requesterEmail: user.email || "N/A",
          yappyPhone: phone,
          teamId: teamId || "N/A",
          teamName: teamName || "N/A",
          userId: user.id,
          plan,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to send Yappy request email:", emailErr);
      }
    }

    // Create in-app notification for the user
    const supabaseAdmin = getSupabaseAdmin();
    const planMessage =
      plan === "promo"
        ? "Your Yappy payment request for the Promo plan ($29.99, access through Dec 31, 2026) has been submitted. We'll process it within 24 hours."
        : "Your Yappy payment request for the Pro Annual plan ($240/yr) has been submitted. We'll process it within 24 hours.";
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "yappy_payment_request",
      title: "Yappy Payment Request Submitted",
      message: planMessage,
      data: { phone, name, plan },
      read: false,
    });

    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    console.error("Yappy request error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
