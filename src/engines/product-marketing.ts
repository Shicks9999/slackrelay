import type { InputFieldSchema, EngineType } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";
import type { EngineOutput } from "./types";
import { BaseEngine } from "./base-engine";

interface ProductMarketingBody {
  headline: string;
  subheadline: string;
  valueProps: { title: string; description: string }[];
  featureHighlights: { feature: string; benefit: string }[];
  socialProof: string;
  cta: string;
  competitivePositioning: string;
}

export class ProductMarketingEngine extends BaseEngine {
  type: EngineType = "product_marketing";
  name = "Product Marketing";
  description =
    "Generate product positioning copy, value propositions, and feature messaging.";

  getInputSchema(): InputFieldSchema[] {
    return [
      {
        name: "contentType",
        label: "Content type",
        type: "select",
        required: true,
        options: [
          { label: "Product Landing Page", value: "landing_page" },
          { label: "Feature Announcement", value: "feature_announcement" },
          { label: "Competitive Battle Card", value: "battle_card" },
          { label: "Product One-Pager", value: "one_pager" },
          { label: "Release Notes", value: "release_notes" },
        ],
      },
      {
        name: "productName",
        label: "Product / Feature name",
        type: "text",
        required: true,
        placeholder: "Slack AI",
      },
      {
        name: "targetBuyer",
        label: "Target buyer persona",
        type: "text",
        required: false,
        placeholder: "IT decision-makers, Engineering leads",
      },
      {
        name: "competitors",
        label: "Key competitors",
        type: "text",
        required: false,
        placeholder: "Microsoft Teams, Google Chat",
      },
      {
        name: "keyDifferentiators",
        label: "Key differentiators",
        type: "textarea",
        required: false,
        placeholder: "What makes this product unique?",
      },
    ];
  }

  buildSystemPrompt(context: AssembledContext): string {
    return `You are a product marketing strategist specializing in B2B SaaS.

Your job is to create compelling product messaging that communicates clear value, differentiates from competitors, and drives adoption.

${context.formatted}

PRODUCT MARKETING PRINCIPLES:
- Lead with the customer problem, not the feature
- Every feature must map to a benefit
- Use specific numbers and proof points where possible
- Position against competitors without naming them directly (unless requested)
- Keep the language benefit-focused and jargon-free
- Social proof builds trust — include it when available

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "headline": "Main product headline",
  "subheadline": "Supporting value statement",
  "valueProps": [
    { "title": "Value prop title", "description": "2-3 sentence explanation" }
  ],
  "featureHighlights": [
    { "feature": "Feature name", "benefit": "Why the customer cares" }
  ],
  "socialProof": "A suggested social proof statement or customer quote placeholder",
  "cta": "Primary call to action",
  "competitivePositioning": "1-2 sentences on how this positions against alternatives"
}

Return ONLY valid JSON.`;
  }

  parseOutput(raw: string): EngineOutput {
    const parsed = this.extractJSON(raw) as unknown as ProductMarketingBody;

    const plainParts = [
      parsed.headline,
      parsed.subheadline,
      "",
      ...parsed.valueProps.map((vp) => `${vp.title}: ${vp.description}`),
      "",
      ...parsed.featureHighlights.map(
        (fh) => `${fh.feature} — ${fh.benefit}`
      ),
      "",
      parsed.socialProof,
      "",
      parsed.cta,
    ];

    return {
      title: parsed.headline,
      body: parsed as unknown as Record<string, unknown>,
      plainText: plainParts.join("\n"),
      metadata: {
        engine: "product_marketing",
        valuePropCount: parsed.valueProps?.length ?? 0,
        featureCount: parsed.featureHighlights?.length ?? 0,
      },
    };
  }
}
