import { createAdminClient } from "@/lib/supabase/admin";

export type EventType =
  | "content.generated"
  | "content.scored"
  | "content.approved"
  | "content.rejected"
  | "campaign.created"
  | "campaign.updated"
  | "knowledge.uploaded"
  | "knowledge.ingested"
  | "slack.command"
  | "comment.created"
  | "approval.requested"
  | "approval.decided";

export async function trackEvent(
  teamId: string,
  eventType: EventType,
  options?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("usage_events").insert({
    team_id: teamId,
    user_id: options?.userId ?? null,
    event_type: eventType,
    entity_type: options?.entityType ?? null,
    entity_id: options?.entityId ?? null,
    metadata: options?.metadata ?? {},
  });
}

export interface CampaignStatsRow {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  content_count: number;
  approved_count: number;
  draft_count: number;
  scored_count: number;
  avg_score: number;
  engine_count: number;
  engines_used: string[];
  last_content_at: string | null;
  campaign_created_at: string;
}

export async function getCampaignStats(
  teamId: string
): Promise<CampaignStatsRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("campaign_stats")
    .select("*")
    .eq("team_id", teamId)
    .order("campaign_created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CampaignStatsRow[];
}

export interface ContentGap {
  engine: string;
  channel: string | null;
  funnelStage: string | null;
  count: number;
}

export async function getContentGaps(
  campaignId: string
): Promise<ContentGap[]> {
  const supabase = createAdminClient();

  // Get campaign channels and funnel stages
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("channels, funnel_stages")
    .eq("id", campaignId)
    .single();

  if (!campaign) return [];

  // Get existing content by engine/channel/stage
  const { data: content } = await supabase
    .from("content_items")
    .select("engine, channel, funnel_stage")
    .eq("campaign_id", campaignId);

  const existing = new Set(
    (content ?? []).map(
      (c) => `${c.engine}|${c.channel ?? ""}|${c.funnel_stage ?? ""}`
    )
  );

  const engines = [
    "slack_launch",
    "linkedin_growth",
    "product_marketing",
    "email_campaign",
    "sales_enablement",
  ];
  const channels = (campaign.channels as string[]) ?? [];
  const stages = (campaign.funnel_stages as string[]) ?? [];

  const gaps: ContentGap[] = [];

  for (const engine of engines) {
    for (const channel of channels) {
      for (const stage of stages) {
        const key = `${engine}|${channel}|${stage}`;
        if (!existing.has(key)) {
          gaps.push({
            engine,
            channel,
            funnelStage: stage,
            count: 0,
          });
        }
      }
    }
  }

  return gaps;
}
