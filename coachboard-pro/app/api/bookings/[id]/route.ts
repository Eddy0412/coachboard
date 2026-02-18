import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// PATCH — approve or decline a booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, adminNotes } = body as {
      action: "approved" | "declined";
      adminNotes?: string;
    };

    if (!action || !["approved", "declined"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Update the booking status
    const { data: booking, error: updateErr } = await supabase
      .from("footage_bookings")
      .update({
        status: action,
        admin_notes: adminNotes || "",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Send in-app notification to the requester
    const isApproved = action === "approved";
    await supabase.from("notifications").insert({
      user_id: booking.user_id,
      type: "footage_booking_update",
      title: isApproved ? "Booking Approved!" : "Booking Declined",
      message: isApproved
        ? `Your ${booking.service_name} booking for ${booking.booking_date} at ${booking.booking_time} has been approved! Our video team will be at ${booking.location}.`
        : `Your ${booking.service_name} booking for ${booking.booking_date} has been declined.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
      data: {
        booking_id: booking.id,
        status: action,
        service_name: booking.service_name,
        date: booking.booking_date,
        time: booking.booking_time,
      },
      read: false,
    });

    // 3. Send email to the requester
    if (booking.user_email && process.env.RESEND_API_KEY) {
      try {
        const { sendBookingStatusEmail } = await import("@/lib/notifications/email");
        await sendBookingStatusEmail(booking.user_email, {
          status: action,
          serviceName: booking.service_name,
          date: booking.booking_date,
          time: booking.booking_time,
          location: booking.location,
          adminNotes: adminNotes || "",
        });
      } catch (emailErr) {
        console.error("Failed to send booking status email:", emailErr);
      }
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
