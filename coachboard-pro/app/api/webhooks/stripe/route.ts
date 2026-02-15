import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const supabaseAdmin = getSupabaseAdmin();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Lazy import stripe utilities
  const { getStripe, createCheckoutSession, createBillingPortalSession, getOrCreateCustomer } =
    await import("@/lib/stripe");

  // Handle checkout session creation
  if (action === "checkout") {
    try {
      const body = await request.json();
      const { interval } = body;

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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const customer = await getOrCreateCustomer(user.email!, user.id);

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);

      const priceId =
        interval === "yearly"
          ? process.env.STRIPE_PRO_YEARLY_PRICE_ID!
          : process.env.STRIPE_PRO_MONTHLY_PRICE_ID!;

      const session = await createCheckoutSession(
        customer.id,
        priceId,
        `${APP_URL}/settings/billing?success=true`,
        `${APP_URL}/settings/billing?canceled=true`
      );

      return NextResponse.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      return NextResponse.json(
        { error: "Failed to create checkout" },
        { status: 500 }
      );
    }
  }

  // Handle billing portal
  if (action === "portal") {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (!profile?.stripe_customer_id) {
        return NextResponse.json(
          { error: "No subscription found" },
          { status: 400 }
        );
      }

      const session = await createBillingPortalSession(
        profile.stripe_customer_id,
        `${APP_URL}/settings/billing`
      );

      return NextResponse.json({ url: session.url });
    } catch (error) {
      console.error("Portal error:", error);
      return NextResponse.json(
        { error: "Failed to create portal session" },
        { status: 500 }
      );
    }
  }

  // Handle Stripe webhook events
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "pro",
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const status = subscription.status;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        let subStatus: "free" | "pro" | "canceled" = "free";
        if (status === "active" || status === "trialing") subStatus = "pro";
        else if (status === "canceled" || status === "past_due") subStatus = "canceled";

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: subStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "free",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
