import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type { Timestamp } from "@/lib/supabase/types";

const MODEL = "claude-opus-4-7";

// $/1M tokens — update alongside MODEL if the model changes.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 5, output: 25 },
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function computeStats(timestamps: Timestamp[]) {
  const plays = timestamps.filter((t) => t.odk);
  const total = plays.length || 1;

  const count = (field: keyof Timestamp, value: string) =>
    plays.filter((t) => t[field] === value).length;

  const pct = (n: number, base: number) => Math.round((n / (base || 1)) * 100);

  // Action breakdown per down — only included when >= 5 tagged plays on that down
  const MIN_PLAYS_FOR_BREAKDOWN = 5;
  const downs = ["1st", "2nd", "3rd", "4th"] as const;
  const actionByDown: Record<string, { total: number; run: number; pass: number; kick: number; trick: number }> = {};
  for (const d of downs) {
    const downPlays = plays.filter((t) => t.down === d && t.action);
    if (downPlays.length >= MIN_PLAYS_FOR_BREAKDOWN) {
      const n = downPlays.length;
      actionByDown[d] = {
        total: n,
        run: pct(downPlays.filter((t) => t.action === "Run").length, n),
        pass: pct(downPlays.filter((t) => t.action === "Pass").length, n),
        kick: pct(downPlays.filter((t) => t.action === "Kick").length, n),
        trick: pct(downPlays.filter((t) => t.action === "Trick").length, n),
      };
    }
  }

  return {
    totalTaggedPlays: plays.length,
    odk: {
      offense: pct(count("odk", "offense"), total),
      defense: pct(count("odk", "defense"), total),
      specialTeams: pct(count("odk", "kicking"), total),
    },
    action: {
      run: pct(count("action", "Run"), total),
      pass: pct(count("action", "Pass"), total),
      kick: pct(count("action", "Kick"), total),
      trick: pct(count("action", "Trick"), total),
    },
    hash: {
      left: pct(count("hash", "left"), total),
      middle: pct(count("hash", "middle"), total),
      right: pct(count("hash", "right"), total),
    },
    down: {
      first: pct(count("down", "1st"), total),
      second: pct(count("down", "2nd"), total),
      third: pct(count("down", "3rd"), total),
      fourth: pct(count("down", "4th"), total),
    },
    actionByDown,
  };
}

export async function POST(req: NextRequest) {
  const { timestamps, projectId } = (await req.json()) as {
    timestamps: Timestamp[];
    projectId: string;
  };

  if (!timestamps?.length) {
    return new Response("No timestamps to analyze.", { status: 400 });
  }

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();
  if (callerProfile?.subscription_status !== "pro") {
    return new Response("CoachIQ is a Pro feature.", { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not configured.", { status: 500 });
  }

  // Fetch all comments for these timestamps
  const tsIds = timestamps.map((t) => t.id);
  const { data: comments } = await supabase
    .from("comments")
    .select("timestamp_id, content, profiles:user_id(full_name, email)")
    .in("timestamp_id", tsIds)
    .order("created_at", { ascending: true });

  const commentsByTs: Record<string, string[]> = {};
  for (const c of comments ?? []) {
    const name =
      (c.profiles as { full_name?: string; email?: string } | null)
        ?.full_name ||
      (c.profiles as { full_name?: string; email?: string } | null)?.email ||
      "Coach";
    if (!commentsByTs[c.timestamp_id]) commentsByTs[c.timestamp_id] = [];
    commentsByTs[c.timestamp_id].push(`${name}: ${c.content}`);
  }

  const stats = computeStats(timestamps);

  // Build the play-by-play data string
  const playData = timestamps
    .map((t, i) => {
      const parts = [
        `Play #${i + 1} @ ${t.time_seconds}s`,
        t.title && `Title: ${t.title}`,
        t.description && `Notes: ${t.description}`,
        t.odk && `ODK: ${t.odk}`,
        t.down && `Down: ${t.down}${t.distance ? ` & ${t.distance}` : ""}`,
        t.los && `LOS: ${t.los}`,
        t.hash && `Hash: ${t.hash}`,
        t.action && `Action: ${t.action}`,
        commentsByTs[t.id]?.length &&
          `Comments:\n  ${commentsByTs[t.id].join("\n  ")}`,
      ]
        .filter(Boolean)
        .join("\n");
      return parts;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are an expert football analyst and scout. You analyze game film data — timestamps, play metadata, coach notes, and comments — to produce detailed, actionable scouting reports.

Your reports are structured, direct, and use concrete percentages and observations. When descriptions mention yardage (e.g. "10 YDS RUN IZQ", "11 YDS PASS DER"), extract and summarize that data. When player names appear in notes or comments, note whether they are mentioned positively (strong) or negatively (weak/struggled). IZQ = left, DER = right, MID = middle.`;

  const userPrompt = `Analyze the following football film timestamps and generate a full scouting report.

## Pre-Computed Stats (${stats.totalTaggedPlays} tagged plays)

**ODK Distribution:** Offense ${stats.odk.offense}% | Defense ${stats.odk.defense}% | Special Teams ${stats.odk.specialTeams}%
**Action (when tagged):** Run ${stats.action.run}% | Pass ${stats.action.pass}% | Kick ${stats.action.kick}% | Trick ${stats.action.trick}%
**Hash:** Left ${stats.hash.left}% | Middle ${stats.hash.middle}% | Right ${stats.hash.right}%
**Down:** 1st ${stats.down.first}% | 2nd ${stats.down.second}% | 3rd ${stats.down.third}% | 4th ${stats.down.fourth}%

## Play-by-Play Data

${playData}

---

## Report Requirements

Write a detailed scouting report with these sections:

### Overall Summary
Brief overview of what the film reveals.

### Offensive Analysis
- Run game: percentage, preferred direction (left/middle/right), yards gained, tendencies
- Pass game: percentage, preferred direction, yards gained, tendencies
- Special plays: trick plays, kicks
- Down-and-distance tendencies
- Field position tendencies (LOS data)

### Defensive Analysis
- What situations the defense faces
- Any tendencies or weaknesses visible from the notes

### Player Insights
- Strong players mentioned positively in notes/comments
- Players who struggled or were mentioned negatively
- Key contributors on each side

### Coaching Recommendations
- 3–5 actionable takeaways for game prep based on this film

Be specific and use percentages. Reference actual plays from the data where relevant.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }

        const finalMessage = await stream.finalMessage();
        const { input_tokens, output_tokens } = finalMessage.usage;
        const pricing = PRICING[MODEL];
        const cost = pricing
          ? (input_tokens / 1_000_000) * pricing.input + (output_tokens / 1_000_000) * pricing.output
          : 0;
        await supabase.from("api_usage_log").insert({
          user_id: user.id,
          project_id: projectId ?? null,
          feature: "coachiq_report",
          model: MODEL,
          input_tokens,
          output_tokens,
          estimated_cost_usd: cost,
        });

        controller.close();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(new TextEncoder().encode(`\n\n[ERROR: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
