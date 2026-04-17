import { NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";

interface SlackEvent {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    text: string;
    user: string;
    channel: string;
    ts: string;
    team?: string;
  };
  team_id?: string;
}

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

  const body = JSON.parse(rawBody) as SlackEvent;

  // URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle events
  if (body.type === "event_callback" && body.event) {
    // Fire and forget — respond immediately
    handleEvent(body.event, body.team_id ?? "").catch(console.error);
  }

  return new Response("", { status: 200 });
}

async function handleEvent(
  event: NonNullable<SlackEvent["event"]>,
  slackTeamId: string
) {
  if (event.type !== "app_mention") return;

  const supabase = createAdminClient();

  const { data: installation } = await supabase
    .from("slack_installations")
    .select("team_id, bot_token")
    .eq("slack_team_id", slackTeamId)
    .single();

  if (!installation) return;

  const slack = createSlackClient(installation.bot_token);

  // Strip the bot mention from the text
  const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

  if (!cleanText) {
    await slack.postMessage(
      event.channel,
      "Hey! Try asking me to generate content, review copy, or summarize a thread. Use my slash commands for the best experience:\n• `/generate-content` — Create campaign content\n• `/review-copy` — Score and improve your copy\n• `/improve-message` — Rewrite a message\n• `/summarize-thread` — Summarize a conversation"
    );
    return;
  }

  // Use AI to respond to the mention
  const { getProvider } = await import("@/lib/ai/provider");
  const provider = await getProvider("claude");

  const result = await provider.generate({
    messages: [
      {
        role: "system",
        content: `You are SlackRelay, an AI marketing assistant in Slack. You help teams create campaign content, review copy, and improve messaging.

Respond helpfully and concisely using Slack mrkdwn. If the user's request would be better served by a specific command, suggest it:
- /generate-content — Create content for a campaign
- /review-copy — Score and review copy
- /improve-message — Rewrite a Slack message
- /create-campaign — Create a new campaign
- /summarize-thread — Summarize a conversation

Keep responses under 300 words.`,
      },
      { role: "user", content: cleanText },
    ],
    temperature: 0.7,
    maxTokens: 1024,
  });

  await slack.postMessage(event.channel, result.content);
}
