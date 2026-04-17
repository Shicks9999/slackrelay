import { NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";

export async function POST(request: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-slack-signature") ?? "";
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const rawBody = await request.text();

  if (!verifySlackSignature(signingSecret, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Slack sends action payloads as URL-encoded with a `payload` field
  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get("payload") ?? "{}");

  if (payload.type !== "block_actions") {
    return new Response("", { status: 200 });
  }

  const action = payload.actions?.[0];
  if (!action) {
    return new Response("", { status: 200 });
  }

  const actionId = action.action_id as string;
  const value = action.value as string;

  // Handle content actions: content_approve_{id}, content_edit_{id}, content_reject_{id}
  if (actionId.startsWith("content_")) {
    const operation = actionId.replace("content_", "").split("_")[0];
    const contentId = value.replace(`${operation}_`, "");
    await handleContentAction(operation, contentId, payload);
  }

  return new Response("", { status: 200 });
}

async function handleContentAction(
  operation: string,
  contentId: string,
  payload: Record<string, unknown>
) {
  const supabase = createAdminClient();

  const statusMap: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
  };

  const newStatus = statusMap[operation];
  if (newStatus) {
    await supabase
      .from("content_items")
      .update({ status: newStatus })
      .eq("id", contentId);
  }

  // Respond with update
  const responseUrl = payload.response_url as string;
  if (responseUrl) {
    const { data: content } = await supabase
      .from("content_items")
      .select("title, status")
      .eq("id", contentId)
      .single();

    const slackTeamId = (payload.team as Record<string, string>)?.id;
    const { data: installation } = await supabase
      .from("slack_installations")
      .select("bot_token")
      .eq("slack_team_id", slackTeamId)
      .single();

    if (installation) {
      const slack = createSlackClient(installation.bot_token);
      await slack.respondToUrl(responseUrl, {
        replace_original: false,
        response_type: "ephemeral",
        text: `Content "${content?.title}" has been *${content?.status}*.`,
      });
    }
  }
}
