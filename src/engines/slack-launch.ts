import type { InputFieldSchema, EngineType } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";
import type { EngineOutput } from "./types";
import { BaseEngine } from "./base-engine";

interface SlackLaunchBody {
  headline: string;
  body: string;
  bulletPoints: string[];
  cta: string;
  threadFollowUp: string;
  channelVariants: { channel: string; message: string }[];
}

export class SlackLaunchEngine extends BaseEngine {
  type: EngineType = "slack_launch";
  name = "Slack Campaign Launch";
  description =
    "Generate complete Slack announcement and launch content with channel variants.";

  getInputSchema(): InputFieldSchema[] {
    return [
      {
        name: "launchType",
        label: "Launch type",
        type: "select",
        required: true,
        options: [
          { label: "Product Launch", value: "product_launch" },
          { label: "Feature Update", value: "feature_update" },
          { label: "Company News", value: "company_news" },
          { label: "Event", value: "event" },
          { label: "Initiative", value: "initiative" },
        ],
      },
      {
        name: "targetChannels",
        label: "Target Slack channels",
        type: "text",
        required: false,
        placeholder: "#general, #product, #engineering",
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: false,
        options: [
          { label: "Routine", value: "routine" },
          { label: "Important", value: "important" },
          { label: "Critical", value: "critical" },
        ],
        defaultValue: "routine",
      },
      {
        name: "maxLength",
        label: "Length",
        type: "select",
        required: false,
        options: [
          { label: "Short (1-2 paragraphs)", value: "short" },
          { label: "Medium (3-4 paragraphs)", value: "medium" },
          { label: "Detailed (5+)", value: "detailed" },
        ],
        defaultValue: "medium",
      },
      {
        name: "cta",
        label: "Call to action",
        type: "text",
        required: false,
        placeholder: "Sign up for the beta",
      },
    ];
  }

  buildSystemPrompt(context: AssembledContext): string {
    return `You are a Slack marketing communications expert.

Your job is to create compelling Slack announcements that are on-brand, clear, and drive action.

${context.formatted}

FORMAT REQUIREMENTS:
- Use Slack mrkdwn formatting (*bold*, _italic_, bullet points)
- Keep messages scannable — busy people read Slack quickly
- Include emoji where appropriate for visual scanning
- The headline should grab attention immediately
- Bullet points should highlight key takeaways
- CTA should be specific and actionable

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "headline": "Bold opening line",
  "body": "Main message body in Slack mrkdwn",
  "bulletPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "cta": "Specific call to action",
  "threadFollowUp": "Additional detail for a thread reply",
  "channelVariants": [
    { "channel": "#channel-name", "message": "Adapted message for this channel" }
  ]
}

Return ONLY valid JSON. No markdown code blocks, no explanation.`;
  }

  parseOutput(raw: string): EngineOutput {
    const parsed = this.extractJSON(raw) as unknown as SlackLaunchBody;

    // Build plain text version
    const plainParts = [
      parsed.headline,
      "",
      parsed.body,
      "",
      ...parsed.bulletPoints.map((bp) => `- ${bp}`),
      "",
      parsed.cta,
    ];

    return {
      title: parsed.headline,
      body: parsed as unknown as Record<string, unknown>,
      plainText: plainParts.join("\n"),
      metadata: {
        engine: "slack_launch",
        variantCount: parsed.channelVariants?.length ?? 0,
      },
    };
  }
}
