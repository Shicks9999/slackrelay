import { createClient } from "@/lib/supabase/server";
import { estimateTokens, truncateToTokenBudget } from "@/lib/ai/tokens";
import type { EngineType } from "@/types/engine";

export interface ContextRequest {
  campaignId: string;
  engine: EngineType;
  channel?: string;
  funnelStage?: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface CampaignContext {
  name: string;
  goal: string | null;
  targetAudience: string | null;
  audiencePersona: Record<string, unknown> | null;
  channels: string[];
  funnelStages: string[];
}

export interface MessagingContext {
  positioningStatement: string | null;
  brandVoice: Record<string, unknown> | null;
  tagline: string | null;
  elevatorPitch: string | null;
  pillars: {
    name: string;
    description: string | null;
    valuePropositions: {
      statement: string;
      supportingProof: string | null;
      differentiator: string | null;
    }[];
  }[];
  keyMessages: {
    message: string;
    audienceSegment: string | null;
    channel: string | null;
    funnelStage: string | null;
    rationale: string | null;
  }[];
}

export interface AssembledContext {
  campaign: CampaignContext;
  messaging: MessagingContext | null;
  formatted: string;
  meta: {
    totalTokens: number;
    truncated: boolean;
    sources: string[];
  };
}

const DEFAULT_MAX_TOKENS = 4000;

/**
 * Context Engine v1: Assembles campaign + messaging context.
 * Knowledge retrieval and historical examples will be added in v2/v3.
 */
export async function assembleContext(
  request: ContextRequest
): Promise<AssembledContext> {
  const supabase = await createClient();
  const maxTokens = request.maxTokens ?? DEFAULT_MAX_TOKENS;
  const sources: string[] = [];
  let truncated = false;

  // Step 1: Load campaign data (mandatory)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "name, goal, target_audience, audience_persona, channels, funnel_stages"
    )
    .eq("id", request.campaignId)
    .single();

  if (!campaign) {
    throw new Error(`Campaign not found: ${request.campaignId}`);
  }

  const campaignContext: CampaignContext = {
    name: campaign.name,
    goal: campaign.goal,
    targetAudience: campaign.target_audience,
    audiencePersona: campaign.audience_persona,
    channels: campaign.channels ?? [],
    funnelStages: campaign.funnel_stages ?? [],
  };
  sources.push("campaign");

  // Step 2: Load messaging framework (if exists)
  let messagingContext: MessagingContext | null = null;

  const { data: framework } = await supabase
    .from("messaging_frameworks")
    .select("id, positioning_statement, brand_voice, tagline, elevator_pitch")
    .eq("campaign_id", request.campaignId)
    .single();

  if (framework) {
    // Load pillars with value propositions
    const { data: pillars } = await supabase
      .from("messaging_pillars")
      .select(
        "name, description, sort_order, id"
      )
      .eq("framework_id", framework.id)
      .order("sort_order");

    const pillarsWithVPs = await Promise.all(
      (pillars ?? []).map(async (pillar) => {
        const { data: vps } = await supabase
          .from("value_propositions")
          .select("statement, supporting_proof, differentiator")
          .eq("pillar_id", pillar.id)
          .order("sort_order");

        return {
          name: pillar.name,
          description: pillar.description,
          valuePropositions: (vps ?? []).map((vp) => ({
            statement: vp.statement,
            supportingProof: vp.supporting_proof,
            differentiator: vp.differentiator,
          })),
        };
      })
    );

    // Load key messages, filtered by channel/stage if provided
    let keyMessagesQuery = supabase
      .from("key_messages")
      .select("message, audience_segment, channel, funnel_stage, rationale")
      .eq("framework_id", framework.id)
      .order("sort_order");

    if (request.channel) {
      keyMessagesQuery = keyMessagesQuery.or(
        `channel.eq.${request.channel},channel.is.null`
      );
    }
    if (request.funnelStage) {
      keyMessagesQuery = keyMessagesQuery.or(
        `funnel_stage.eq.${request.funnelStage},funnel_stage.is.null`
      );
    }

    const { data: keyMessages } = await keyMessagesQuery;

    messagingContext = {
      positioningStatement: framework.positioning_statement,
      brandVoice: framework.brand_voice,
      tagline: framework.tagline,
      elevatorPitch: framework.elevator_pitch,
      pillars: pillarsWithVPs,
      keyMessages: (keyMessages ?? []).map((km) => ({
        message: km.message,
        audienceSegment: km.audience_segment,
        channel: km.channel,
        funnelStage: km.funnel_stage,
        rationale: km.rationale,
      })),
    };
    sources.push("messaging");
  }

  // Step 3: Format context into a prompt-ready string
  const formatted = formatContext(
    campaignContext,
    messagingContext,
    request,
    maxTokens
  );

  const totalTokens = estimateTokens(formatted.text);
  truncated = formatted.truncated;

  return {
    campaign: campaignContext,
    messaging: messagingContext,
    formatted: formatted.text,
    meta: {
      totalTokens,
      truncated,
      sources,
    },
  };
}

function formatContext(
  campaign: CampaignContext,
  messaging: MessagingContext | null,
  request: ContextRequest,
  maxTokens: number
): { text: string; truncated: boolean } {
  const sections: string[] = [];

  // Campaign context (always included — priority 1)
  sections.push("CAMPAIGN CONTEXT:");
  sections.push(`Campaign: ${campaign.name}`);
  if (campaign.goal) sections.push(`Goal: ${campaign.goal}`);
  if (campaign.targetAudience)
    sections.push(`Target Audience: ${campaign.targetAudience}`);
  if (campaign.channels.length > 0)
    sections.push(`Channels: ${campaign.channels.join(", ")}`);
  if (campaign.funnelStages.length > 0)
    sections.push(`Funnel Stages: ${campaign.funnelStages.join(", ")}`);
  if (campaign.audiencePersona) {
    sections.push(
      `Audience Persona: ${JSON.stringify(campaign.audiencePersona)}`
    );
  }

  // Brand voice (priority 2)
  if (messaging?.brandVoice) {
    sections.push("");
    sections.push("BRAND VOICE:");
    const bv = messaging.brandVoice as Record<string, unknown>;
    if (bv.tone) sections.push(`Tone: ${JSON.stringify(bv.tone)}`);
    if (bv.personality) sections.push(`Personality: ${bv.personality}`);
    if (bv.doList) sections.push(`Do: ${JSON.stringify(bv.doList)}`);
    if (bv.dontList) sections.push(`Don't: ${JSON.stringify(bv.dontList)}`);
  }

  // Positioning (priority 3)
  if (messaging?.positioningStatement) {
    sections.push("");
    sections.push(
      `POSITIONING STATEMENT: ${messaging.positioningStatement}`
    );
  }

  // Key messages (priority 4)
  if (messaging?.keyMessages && messaging.keyMessages.length > 0) {
    sections.push("");
    sections.push("KEY MESSAGES:");
    for (const km of messaging.keyMessages) {
      let line = `- ${km.message}`;
      if (km.audienceSegment) line += ` [audience: ${km.audienceSegment}]`;
      if (km.channel) line += ` [channel: ${km.channel}]`;
      sections.push(line);
    }
  }

  // Messaging pillars + value props (priority 5)
  if (messaging?.pillars && messaging.pillars.length > 0) {
    sections.push("");
    sections.push("MESSAGING PILLARS:");
    for (const pillar of messaging.pillars) {
      sections.push(`\n${pillar.name}:`);
      if (pillar.description) sections.push(`  ${pillar.description}`);
      for (const vp of pillar.valuePropositions) {
        sections.push(`  - ${vp.statement}`);
        if (vp.supportingProof)
          sections.push(`    Proof: ${vp.supportingProof}`);
        if (vp.differentiator)
          sections.push(`    Differentiator: ${vp.differentiator}`);
      }
    }
  }

  // Channel + stage context
  if (request.channel) {
    sections.push("");
    sections.push(`TARGET CHANNEL: ${request.channel}`);
  }
  if (request.funnelStage) {
    sections.push(`FUNNEL STAGE: ${request.funnelStage}`);
  }

  const fullText = sections.join("\n");
  return truncateToTokenBudget(fullText, maxTokens);
}
