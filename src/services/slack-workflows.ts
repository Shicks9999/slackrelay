import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { header, section, divider, context } from "@/lib/slack/blocks";

/**
 * Deliver content to mapped Slack channels.
 * Called when content is approved.
 */
export async function deliverContentToChannels(
  contentId: string
): Promise<{ delivered: string[]; errors: string[] }> {
  const supabase = createAdminClient();

  const { data: content } = await supabase
    .from("content_items")
    .select("id, title, plain_text, engine, campaign_id")
    .eq("id", contentId)
    .single();

  if (!content) throw new Error("Content not found");

  // Find channel mappings for this campaign
  const { data: mappings } = await supabase
    .from("slack_channel_mappings")
    .select("slack_channel_id, slack_channel_name, purpose")
    .eq("campaign_id", content.campaign_id)
    .eq("purpose", "content_delivery");

  if (!mappings || mappings.length === 0) {
    return { delivered: [], errors: [] };
  }

  // Get the bot token
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("team_id")
    .eq("id", content.campaign_id)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  const { data: installation } = await supabase
    .from("slack_installations")
    .select("bot_token")
    .eq("team_id", campaign.team_id)
    .single();

  if (!installation) throw new Error("No Slack installation found");

  const slack = createSlackClient(installation.bot_token);
  const delivered: string[] = [];
  const errors: string[] = [];

  const blocks = [
    header(content.title),
    section((content.plain_text ?? "").slice(0, 2900)),
    divider(),
    context(`Posted via SlackRelay · ${content.engine.replace("_", " ")}`),
  ];

  for (const mapping of mappings) {
    try {
      await slack.postMessage(
        mapping.slack_channel_id,
        content.title,
        blocks
      );
      delivered.push(mapping.slack_channel_name ?? mapping.slack_channel_id);
    } catch (err) {
      errors.push(
        `${mapping.slack_channel_name ?? mapping.slack_channel_id}: ${err instanceof Error ? err.message : "Failed"}`
      );
    }
  }

  return { delivered, errors };
}

/**
 * Send a weekly campaign digest to notification channels.
 */
export async function sendWeeklyDigest(teamId: string): Promise<void> {
  const supabase = createAdminClient();

  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Get this week's activity
  const { data: newContent } = await supabase
    .from("content_items")
    .select("id, title, engine, status, campaign_id")
    .gte("created_at", oneWeekAgo)
    .order("created_at", { ascending: false });

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, team_id")
    .eq("team_id", teamId);

  const teamCampaignIds = new Set((campaigns ?? []).map((c) => c.id));
  const teamContent = (newContent ?? []).filter((c) =>
    teamCampaignIds.has(c.campaign_id)
  );

  if (teamContent.length === 0) return;

  // Build digest message
  const generated = teamContent.length;
  const approved = teamContent.filter((c) => c.status === "approved").length;
  const draft = teamContent.filter((c) => c.status === "draft").length;

  const engineCounts: Record<string, number> = {};
  for (const c of teamContent) {
    engineCounts[c.engine] = (engineCounts[c.engine] ?? 0) + 1;
  }

  const engineSummary = Object.entries(engineCounts)
    .map(([e, n]) => `${e.replace("_", " ")}: ${n}`)
    .join(", ");

  const blocks = [
    header("Weekly Campaign Digest"),
    section(
      `*This week's activity:*\n` +
        `• ${generated} content pieces generated\n` +
        `• ${approved} approved, ${draft} drafts pending\n` +
        `• Engines used: ${engineSummary}`
    ),
    divider(),
    section(
      `*Recent content:*\n` +
        teamContent
          .slice(0, 5)
          .map((c) => `• ${c.title} (${c.status})`)
          .join("\n")
    ),
    context("SlackRelay Weekly Digest"),
  ];

  // Send to notification channels
  const { data: notifChannels } = await supabase
    .from("slack_channel_mappings")
    .select("slack_channel_id")
    .eq("team_id", teamId)
    .eq("purpose", "notifications");

  const { data: installation } = await supabase
    .from("slack_installations")
    .select("bot_token")
    .eq("team_id", teamId)
    .single();

  if (!installation || !notifChannels || notifChannels.length === 0) return;

  const slack = createSlackClient(installation.bot_token);

  for (const channel of notifChannels) {
    await slack.postMessage(
      channel.slack_channel_id,
      "Weekly Campaign Digest",
      blocks
    ).catch(console.error);
  }
}

/**
 * Capture a content idea from a Slack message.
 */
export async function captureContentIdea(
  teamId: string,
  channelId: string,
  userId: string,
  messageText: string,
  campaignId?: string
): Promise<string> {
  const supabase = createAdminClient();

  // Save as a draft content item with metadata indicating it's an idea
  const { data, error } = await supabase
    .from("content_items")
    .insert({
      campaign_id:
        campaignId ?? "00000000-0000-0000-0000-000000000000",
      created_by: userId,
      engine: "slack_launch",
      title: `Idea: ${messageText.slice(0, 60)}...`,
      body: { idea: messageText, source: "slack_capture" },
      plain_text: messageText,
      status: "draft",
      metadata: {
        source: "slack_idea_capture",
        slack_channel_id: channelId,
        captured_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
