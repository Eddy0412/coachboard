import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 404 }
    );
  }

  // Check expiration
  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", data.id);
    return NextResponse.json(
      { error: "Invitation has expired" },
      { status: 410 }
    );
  }

  return NextResponse.json(data);
}

// POST — accept an invitation (uses service role to bypass RLS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitationId, userId } = body;

    if (!invitationId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch the invitation
    const { data: invitation, error: invErr } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Add user to team
    const { error: memberErr } = await supabase.from("team_members").upsert(
      {
        team_id: invitation.team_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
        status: "accepted",
      },
      { onConflict: "team_id,user_id" }
    );
    if (memberErr) {
      console.error("team_members upsert error:", memberErr);
    }

    // If athlete, add to roster or link existing entry
    if (invitation.role === "athlete") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      const fullName = profile?.full_name || profile?.email || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Check if there's already an athlete entry for this user or matching name
      const { data: existingByUser } = await supabase
        .from("athletes")
        .select("id")
        .eq("team_id", invitation.team_id)
        .eq("user_id", userId)
        .limit(1);

      const { data: existingByName } = await supabase
        .from("athletes")
        .select("id, user_id")
        .eq("team_id", invitation.team_id)
        .ilike("first_name", firstName)
        .ilike("last_name", lastName || firstName)
        .is("user_id", null)
        .limit(1);

      if (existingByUser && existingByUser.length > 0) {
        // Already linked — nothing to do
      } else if (existingByName && existingByName.length > 0) {
        // Existing roster entry without user_id — link it
        await supabase
          .from("athletes")
          .update({ user_id: userId })
          .eq("id", existingByName[0].id);
      } else {
        // No existing entry — create new
        const { error: athleteErr } = await supabase.from("athletes").insert({
          team_id: invitation.team_id,
          first_name: firstName,
          last_name: lastName || firstName,
          position: "",
          jersey_number: "",
          user_id: userId,
          created_by: invitation.invited_by,
        });
        if (athleteErr) {
          console.error("athletes insert error:", athleteErr);
        }
      }
    }

    // Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
