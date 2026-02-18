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
    const {
      athleteId,
      timestampTitle,
      projectTitle,
      projectId,
      taggedByName,
    } = body;

    if (!athleteId) {
      return NextResponse.json({ error: "athleteId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Look up the athlete to find their user_id
    const { data: athlete } = await supabase
      .from("athletes")
      .select("user_id, first_name, last_name")
      .eq("id", athleteId)
      .single();

    if (!athlete?.user_id) {
      // Athlete has no linked user account — skip notification
      return NextResponse.json({ success: true, skipped: true });
    }

    // Get the athlete's profile for email and phone
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone")
      .eq("id", athlete.user_id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const message = `You were tagged in "${timestampTitle || "a coaching point"}" on "${projectTitle}" by ${taggedByName}.`;

    // 1. In-app notification
    await supabase.from("notifications").insert({
      user_id: athlete.user_id,
      type: "athlete_tagged",
      title: "You've been tagged!",
      message,
      data: {
        project_id: projectId,
        athlete_id: athleteId,
      },
      read: false,
    });

    // 2. Email notification (best effort)
    if (profile.email && process.env.RESEND_API_KEY) {
      try {
        const { sendAthleteTaggedEmail } = await import("@/lib/notifications/email");
        await sendAthleteTaggedEmail(profile.email, {
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          timestampTitle: timestampTitle || "a coaching point",
          projectTitle: projectTitle || "a project",
          taggedByName: taggedByName || "Your coach",
          projectId,
        });
      } catch (e) {
        console.error("Failed to send athlete tagged email:", e);
      }
    }

    // 3. WhatsApp notification (best effort)
    if (
      profile.phone &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      try {
        const { sendNotificationWhatsApp } = await import("@/lib/notifications/whatsapp");
        await sendNotificationWhatsApp(profile.phone, message);
      } catch (e) {
        console.error("Failed to send athlete tagged WhatsApp:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Athlete tagged notification error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
