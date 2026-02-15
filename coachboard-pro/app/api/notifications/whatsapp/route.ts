import { NextRequest, NextResponse } from "next/server";
import {
  sendInviteWhatsApp,
  sendNotificationWhatsApp,
} from "@/lib/notifications/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    if (!to) {
      return NextResponse.json({ error: "No phone number" }, { status: 400 });
    }

    switch (type) {
      case "invite":
        await sendInviteWhatsApp(to, data);
        break;
      case "notification":
        await sendNotificationWhatsApp(to, data.message);
        break;
      default:
        return NextResponse.json(
          { error: "Unknown notification type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    return NextResponse.json(
      { error: "Failed to send WhatsApp" },
      { status: 500 }
    );
  }
}
