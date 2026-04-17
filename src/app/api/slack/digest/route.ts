import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigest } from "@/services/slack-workflows";
import { NextResponse } from "next/server";

/**
 * POST /api/slack/digest
 * Trigger weekly digest for all teams with Slack installations.
 * Intended to be called by a cron job (e.g., Vercel Cron).
 */
export async function POST(request: Request) {
  // Simple auth check — use a secret header for cron security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: installations } = await supabase
    .from("slack_installations")
    .select("team_id");

  if (!installations || installations.length === 0) {
    return NextResponse.json({ message: "No installations", sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const inst of installations) {
    try {
      await sendWeeklyDigest(inst.team_id);
      sent++;
    } catch (err) {
      errors.push(
        `${inst.team_id}: ${err instanceof Error ? err.message : "Failed"}`
      );
    }
  }

  return NextResponse.json({ sent, errors });
}
