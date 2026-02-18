import { NextRequest, NextResponse } from "next/server";
import {
  sendInviteEmail,
  sendProjectSharedEmail,
  sendCommentEmail,
} from "@/lib/notifications/email";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service not configured (RESEND_API_KEY missing)" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, to, data } = body;

    switch (type) {
      case "invite":
        await sendInviteEmail(to, data);
        break;
      case "project_shared":
        await sendProjectSharedEmail(to, data);
        break;
      case "comment":
        await sendCommentEmail(to, data);
        break;
      default:
        return NextResponse.json(
          { error: "Unknown notification type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email notification error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
