/**
 * One-time script: export all user emails from profiles into a CSV
 * for importing into a Resend Audience.
 * Usage: npx tsx scripts/export-user-emails.ts
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email, full_name")
    .order("email");

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  const seen = new Set<string>();
  const rows = ["email,first_name,last_name"];

  for (const p of profiles ?? []) {
    const email = p.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    const [first = "", ...rest] = (p.full_name ?? "").trim().split(/\s+/);
    const last = rest.join(" ");
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    rows.push([email, first, last].map(escape).join(","));
  }

  const outPath = join(__dirname, "..", "..", "email-updates", "coachboard-users.csv");
  writeFileSync(outPath, rows.join("\n"), "utf-8");
  console.log(`Wrote ${seen.size} unique emails to ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
