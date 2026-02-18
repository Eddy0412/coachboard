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
    const body = await request.json();
    const { userId, userEmail, userName, teamId, teamName, service, location, date, time, notes } = body;

    if (!service || !location || !date || !time || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Insert into footage_bookings table
    const { data: booking, error: bookingErr } = await supabase
      .from("footage_bookings")
      .insert({
        user_id: userId,
        user_email: userEmail || "",
        user_name: userName || "",
        team_id: teamId || null,
        team_name: teamName || "",
        service_id: service.id,
        service_name: service.name,
        service_category: service.category,
        service_price: service.price,
        location,
        booking_date: date,
        booking_time: time,
        notes: notes || "",
        status: "pending",
      })
      .select("id")
      .single();
    if (bookingErr) throw bookingErr;

    // 2. Create an in-app notification for the user (confirmation)
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "footage_booking",
      title: "Footage Booking Submitted",
      message: `Your ${service.name} booking request for ${date} at ${time} has been submitted. We'll confirm availability within 24 hours.`,
      data: {
        booking_id: booking?.id,
        service_name: service.name,
        service_price: service.price,
        location,
        date,
        time,
      },
      read: false,
    });

    // 3. Send email notification to admin
    let emailSent = false;
    const adminEmail = process.env.FOOTAGE_BOOKING_EMAIL;
    if (adminEmail && process.env.RESEND_API_KEY) {
      try {
        const { sendBookingNotificationEmail } = await import("@/lib/notifications/email");
        await sendBookingNotificationEmail(adminEmail, {
          customerName: userName || userEmail || "Unknown",
          customerEmail: userEmail || "N/A",
          teamName: teamName || "N/A",
          teamId: teamId || "N/A",
          serviceName: service.name,
          serviceCategory: service.category,
          servicePrice: service.price,
          location,
          date,
          time,
          notes: notes || "",
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to send booking email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: booking?.id,
      emailSent,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 });
  }
}

// GET — fetch all bookings (admin: all, regular user: own)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const supabase = getSupabaseAdmin();

    // If requesting all (admin view), return all bookings
    if (all) {
      const { data, error } = await supabase
        .from("footage_bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    // Otherwise return user's own bookings
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("footage_bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
