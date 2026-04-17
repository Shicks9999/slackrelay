import { NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/slack/verify";
import { parseCommandPayload } from "@/lib/slack/commands";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { assembleContext } from "@/services/context-engine";
import { getEngine } from "@/engines/registry";
import { BaseEngine } from "@/engines/base-engine";
import { contentBlocks, section, header, divider, context, actions } from "@/lib/slack/blocks";
import { scoreContent } from "@/services/scoring";
import type { EngineType } from "@/types/engine";

export async function POST(request: Request) {
  const { verified, body } = await verifySlackRequest(request);
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = parseCommandPayload(body);
  const supabase = createAdminClient();

  // Find installation for this Slack team
  const { data: installation } = await supabase
    .from("slack_installations")
    .select("team_id, bot_token")
    .eq("slack_team_id", payload.teamId)
    .single();

  if (!installation) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "SlackRelay is not installed for this workspace. Visit the app to connect.",
    });
  }

  const slack = createSlackClient(installation.bot_token);

  // Log the command
  const logEntry = {
    team_id: installation.team_id,
    slack_user_id: payload.userId,
    slack_channel_id: payload.channelId,
    command: payload.command,
    text: payload.text,
    response_status: "pending" as const,
  };

  // Route to command handler
  switch (payload.command) {
    case "/generate-content":
      return handleGenerateContent(payload, installation, slack, supabase, logEntry);
    case "/improve-message":
      return handleImproveMessage(payload, installation, slack, supabase, logEntry);
    case "/review-copy":
      return handleReviewCopy(payload, installation, slack, supabase, logEntry);
    case "/create-campaign":
      return handleCreateCampaign(payload, installation, slack, supabase, logEntry);
    case "/summarize-thread":
      return handleSummarizeThread(payload, installation, slack, supabase, logEntry);
    case "/capture-idea":
      return handleCaptureIdea(payload, installation, slack, supabase, logEntry);
    default:
      return NextResponse.json({
        response_type: "ephemeral",
        text: `Unknown command: ${payload.command}`,
      });
  }
}

async function handleGenerateContent(
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  // Parse: /generate-content [engine] [campaign-name] [prompt]
  // Example: /generate-content slack_launch My Campaign Write a product launch announcement
  const parts = payload.text.trim().split(/\s+/);

  if (parts.length < 3) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/generate-content [engine] [campaign-name] [prompt]`\nEngines: `slack_launch`, `linkedin_growth`",
    });
  }

  const engineType = parts[0] as EngineType;
  // Find the campaign by name (fuzzy match on the second part)
  const campaignSearch = parts[1].replace(/-/g, " ");
  const prompt = parts.slice(2).join(" ");

  // Acknowledge immediately — we'll respond async via response_url
  const ackResponse = NextResponse.json({
    response_type: "ephemeral",
    text: `Generating ${engineType} content... This may take a moment.`,
  });

  // Process async
  processGeneration(
    engineType,
    campaignSearch,
    prompt,
    payload,
    installation,
    slack,
    supabase,
    logEntry
  ).catch(console.error);

  return ackResponse;
}

async function processGeneration(
  engineType: EngineType,
  campaignSearch: string,
  prompt: string,
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  try {
    // Find campaign
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("team_id", installation.team_id)
      .ilike("name", `%${campaignSearch}%`)
      .limit(1);

    if (!campaigns || campaigns.length === 0) {
      await slack.respondToUrl(payload.responseUrl, {
        response_type: "ephemeral",
        text: `No campaign found matching "${campaignSearch}".`,
      });
      return;
    }

    const campaign = campaigns[0];

    // Assemble context and generate
    const context = await assembleContext({
      campaignId: campaign.id,
      engine: engineType,
      userPrompt: prompt,
    });

    const engine = getEngine(engineType);
    if (!(engine instanceof BaseEngine)) {
      throw new Error("Engine does not support generation");
    }

    const { output } = await engine.generate(
      { campaignId: campaign.id, prompt, params: {} },
      context
    );

    // Save content
    const { data: contentItem } = await supabase
      .from("content_items")
      .insert({
        campaign_id: campaign.id,
        created_by: payload.userId,
        engine: engineType,
        title: output.title,
        body: output.body,
        plain_text: output.plainText,
        input_params: { prompt, source: "slack_command" },
        context_snapshot: { sources: context.meta.sources },
        metadata: { slackChannelId: payload.channelId },
      })
      .select("id")
      .single();

    // Log success
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "success",
      content_id: contentItem?.id,
    });

    // Respond with Block Kit
    const blocks = contentBlocks(
      output.title,
      output.plainText.slice(0, 2900),
      null,
      contentItem?.id
    );

    await slack.respondToUrl(payload.responseUrl, {
      response_type: "in_channel",
      text: output.title,
      blocks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "error",
      response_message: message,
    });
    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      text: `Error: ${message}`,
    });
  }
}

async function handleImproveMessage(
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  const text = payload.text.trim();

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/improve-message [your message text]`\nI'll rewrite it to be clearer and more engaging.",
    });
  }

  // Acknowledge
  const ackResponse = NextResponse.json({
    response_type: "ephemeral",
    text: "Improving your message...",
  });

  // Process async
  processImprovement(text, payload, installation, slack, supabase, logEntry).catch(
    console.error
  );

  return ackResponse;
}

async function processImprovement(
  originalText: string,
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  try {
    const { getProvider } = await import("@/lib/ai/provider");
    const provider = await getProvider("claude");

    const result = await provider.generate({
      messages: [
        {
          role: "system",
          content: `You are a Slack communications expert. Rewrite the user's message to be clearer, more engaging, and better formatted for Slack. Use Slack mrkdwn. Return ONLY the improved message — no explanation, no preamble.`,
        },
        { role: "user", content: originalText },
      ],
      temperature: 0.7,
      maxTokens: 1024,
    });

    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "success",
    });

    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      blocks: [
        section(`*Original:*\n${originalText}`),
        { type: "divider" },
        section(`*Improved:*\n${result.content}`),
      ],
      text: result.content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Improvement failed";
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "error",
      response_message: message,
    });
    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      text: `Error: ${message}`,
    });
  }
}

// --- /review-copy ---

async function handleReviewCopy(
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  const text = payload.text.trim();

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/review-copy [paste your copy here]`\nI'll score it on clarity, conciseness, message alignment, audience relevance, and CTA strength.",
    });
  }

  const ackResponse = NextResponse.json({
    response_type: "ephemeral",
    text: "Reviewing your copy...",
  });

  processReviewCopy(text, payload, installation, slack, supabase, logEntry).catch(
    console.error
  );

  return ackResponse;
}

async function processReviewCopy(
  copyText: string,
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  try {
    const result = await scoreContent({
      title: "Slack Copy Review",
      plainText: copyText,
      engine: "slack_launch",
      campaignGoal: null,
      targetAudience: null,
      channel: "slack",
    });

    const scoreLines = [
      `Clarity: *${result.clarity.value}/10* — ${result.clarity.explanation}`,
      `Conciseness: *${result.conciseness.value}/10* — ${result.conciseness.explanation}`,
      `Message Alignment: *${result.messageAlignment.value}/10* — ${result.messageAlignment.explanation}`,
      `Audience Relevance: *${result.audienceRelevance.value}/10* — ${result.audienceRelevance.explanation}`,
      `CTA Strength: *${result.ctaStrength.value}/10* — ${result.ctaStrength.explanation}`,
    ].join("\n");

    const blocks = [
      header(`Copy Review — Overall: ${result.overall}/10`),
      section(scoreLines),
      divider(),
      section(`*Suggestions:*\n${result.suggestions.map((s) => `• ${s}`).join("\n")}`),
    ];

    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "success",
    });

    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      text: `Copy score: ${result.overall}/10`,
      blocks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "error",
      response_message: message,
    });
    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      text: `Error: ${message}`,
    });
  }
}

// --- /create-campaign ---

async function handleCreateCampaign(
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  // Parse: /create-campaign [name] | [goal]
  const text = payload.text.trim();

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/create-campaign [name] | [goal]`\nExample: `/create-campaign Q3 Product Launch | Drive awareness of new AI features`",
    });
  }

  const [name, goal] = text.split("|").map((s) => s.trim());

  if (!name) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Campaign name is required. Usage: `/create-campaign [name] | [goal]`",
    });
  }

  try {
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        team_id: installation.team_id,
        name,
        goal: goal || null,
        status: "draft",
        channels: ["slack"],
      })
      .select("id, name")
      .single();

    if (error) throw error;

    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "success",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const blocks = [
      section(`Campaign *${campaign.name}* created.`),
      context(`<${appUrl}/campaigns/${campaign.id}|Open in SlackRelay>`),
      actions("campaign", [
        { text: "Generate Content", value: `gen_${campaign.id}`, style: "primary" },
      ]),
    ];

    return NextResponse.json({
      response_type: "in_channel",
      text: `Campaign "${campaign.name}" created.`,
      blocks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Creation failed";
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "error",
      response_message: message,
    });
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Error: ${message}`,
    });
  }
}

// --- /summarize-thread ---

async function handleSummarizeThread(
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  const text = payload.text.trim();

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/summarize-thread [paste thread messages or topic]`\nI'll create a concise summary with key decisions and action items.",
    });
  }

  const ackResponse = NextResponse.json({
    response_type: "ephemeral",
    text: "Summarizing...",
  });

  processSummarizeThread(text, payload, installation, slack, supabase, logEntry).catch(
    console.error
  );

  return ackResponse;
}

async function processSummarizeThread(
  threadText: string,
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  try {
    const { getProvider } = await import("@/lib/ai/provider");
    const provider = await getProvider("claude");

    const result = await provider.generate({
      messages: [
        {
          role: "system",
          content: `You are a Slack thread summarizer. Create a concise summary of the conversation below.

FORMAT:
*Summary:* 2-3 sentence overview
*Key Decisions:* Bulleted list (if any)
*Action Items:* Bulleted list with owners (if mentioned)
*Open Questions:* Bulleted list (if any)

Use Slack mrkdwn formatting. Be concise.`,
        },
        { role: "user", content: threadText },
      ],
      temperature: 0.3,
      maxTokens: 1024,
    });

    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "success",
    });

    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      blocks: [
        header("Thread Summary"),
        section(result.content),
      ],
      text: result.content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summarization failed";
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "error",
      response_message: message,
    });
    await slack.respondToUrl(payload.responseUrl, {
      response_type: "ephemeral",
      text: `Error: ${message}`,
    });
  }
}

// --- /capture-idea ---

async function handleCaptureIdea(
  payload: ReturnType<typeof parseCommandPayload>,
  installation: { team_id: string; bot_token: string },
  slack: ReturnType<typeof createSlackClient>,
  supabase: ReturnType<typeof createAdminClient>,
  logEntry: Record<string, unknown>
) {
  const text = payload.text.trim();

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/capture-idea [your content idea]`\nI'll save it as a draft for later development.",
    });
  }

  try {
    const { captureContentIdea } = await import("@/services/slack-workflows");

    const ideaId = await captureContentIdea(
      installation.team_id,
      payload.channelId,
      payload.userId,
      text
    );

    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "success",
      content_id: ideaId,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return NextResponse.json({
      response_type: "ephemeral",
      text: `Idea captured!`,
      blocks: [
        section(`Idea captured: *${text.slice(0, 100)}${text.length > 100 ? "..." : ""}*`),
        context(`Saved as a draft · <${appUrl}|Open SlackRelay>`),
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capture failed";
    await supabase.from("slack_command_log").insert({
      ...logEntry,
      response_status: "error",
      response_message: message,
    });
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Error: ${message}`,
    });
  }
}
