import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { Timestamp } from "@/lib/supabase/types";

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

  const pct = (n: number) => Math.round((n / total) * 100);

  return {
    totalTaggedPlays: plays.length,
    odk: {
      offense: pct(count("odk", "offense")),
      defense: pct(count("odk", "defense")),
      specialTeams: pct(count("odk", "kicking")),
    },
    action: {
      run: pct(count("action", "Run")),
      pass: pct(count("action", "Pass")),
      kick: pct(count("action", "Kick")),
      trick: pct(count("action", "Trick")),
    },
    hash: {
      left: pct(count("hash", "left")),
      middle: pct(count("hash", "middle")),
      right: pct(count("hash", "right")),
    },
    down: {
      first: pct(count("down", "1st")),
      second: pct(count("down", "2nd")),
      third: pct(count("down", "3rd")),
      fourth: pct(count("down", "4th")),
    },
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not configured.", { status: 500 });
  }

  const supabase = getSupabaseAdmin();

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

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
