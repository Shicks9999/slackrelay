import type { InputFieldSchema, EngineType } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";
import type { EngineOutput } from "./types";
import { BaseEngine } from "./base-engine";

interface EmailBody {
  subject: string;
  preheader: string;
  greeting: string;
  body: string;
  cta: { text: string; url: string };
  signoff: string;
  variants: { subject: string; preheader: string }[];
}

export class EmailCampaignEngine extends BaseEngine {
  type: EngineType = "email_campaign";
  name = "Email Campaign";
  description =
    "Generate email campaign content with subject lines, body copy, and A/B variants.";

  getInputSchema(): InputFieldSchema[] {
    return [
      {
        name: "emailType",
        label: "Email type",
        type: "select",
        required: true,
        options: [
          { label: "Product Announcement", value: "product_announcement" },
          { label: "Webinar Invite", value: "webinar_invite" },
          { label: "Nurture / Drip", value: "nurture" },
          { label: "Re-engagement", value: "re_engagement" },
          { label: "Customer Onboarding", value: "onboarding" },
          { label: "Newsletter", value: "newsletter" },
        ],
      },
      {
        name: "tone",
        label: "Tone",
        type: "select",
        required: false,
        options: [
          { label: "Professional", value: "professional" },
          { label: "Friendly", value: "friendly" },
          { label: "Urgent", value: "urgent" },
          { label: "Educational", value: "educational" },
          { label: "Conversational", value: "conversational" },
        ],
        defaultValue: "professional",
      },
      {
        name: "senderName",
        label: "Sender name",
        type: "text",
        required: false,
        placeholder: "Sarah from Slack",
      },
      {
        name: "ctaUrl",
        label: "CTA destination URL",
        type: "text",
        required: false,
        placeholder: "https://slack.com/features",
      },
      {
        name: "variantCount",
        label: "Number of subject line variants",
        type: "number",
        required: false,
        defaultValue: 2,
      },
    ];
  }

  buildSystemPrompt(context: AssembledContext): string {
    return `You are an email marketing expert who writes high-converting B2B emails.

${context.formatted}

EMAIL BEST PRACTICES:
- Subject line: 6-10 words, create curiosity or state clear value
- Preheader: Extends the subject, adds context (40-60 chars)
- Opening: Personal, relevant, no generic greetings
- Body: Short paragraphs, scannable, one core message
- CTA: One primary CTA, specific action, stands out visually
- Signoff: Warm, human, matches the brand voice
- Always generate subject line A/B variants

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "subject": "Primary subject line",
  "preheader": "Email preheader text",
  "greeting": "Opening greeting line",
  "body": "Main email body with line breaks",
  "cta": { "text": "CTA button text", "url": "https://..." },
  "signoff": "Closing and signature",
  "variants": [
    { "subject": "Alternative subject", "preheader": "Alternative preheader" }
  ]
}

Return ONLY valid JSON.`;
  }

  parseOutput(raw: string): EngineOutput {
    const parsed = this.extractJSON(raw) as unknown as EmailBody;

    const plainParts = [
      `Subject: ${parsed.subject}`,
      `Preheader: ${parsed.preheader}`,
      "",
      parsed.greeting,
      "",
      parsed.body,
      "",
      `[${parsed.cta.text}](${parsed.cta.url})`,
      "",
      parsed.signoff,
    ];

    return {
      title: parsed.subject,
      body: parsed as unknown as Record<string, unknown>,
      plainText: plainParts.join("\n"),
      metadata: {
        engine: "email_campaign",
        variantCount: parsed.variants?.length ?? 0,
      },
    };
  }
}
