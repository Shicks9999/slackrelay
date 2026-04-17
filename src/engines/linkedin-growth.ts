import type { InputFieldSchema, EngineType } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";
import type { EngineOutput } from "./types";
import { BaseEngine } from "./base-engine";

interface LinkedInBody {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  commentPrompt: string;
  variants: { angle: string; post: string }[];
}

export class LinkedInGrowthEngine extends BaseEngine {
  type: EngineType = "linkedin_growth";
  name = "LinkedIn Growth";
  description =
    "Generate LinkedIn posts optimized for engagement, reach, and thought leadership.";

  getInputSchema(): InputFieldSchema[] {
    return [
      {
        name: "postType",
        label: "Post type",
        type: "select",
        required: true,
        options: [
          { label: "Thought Leadership", value: "thought_leadership" },
          { label: "Product Announcement", value: "product_announcement" },
          { label: "Customer Story", value: "customer_story" },
          { label: "Industry Insight", value: "industry_insight" },
          { label: "Team / Culture", value: "team_culture" },
          { label: "Event Promotion", value: "event_promotion" },
        ],
      },
      {
        name: "tone",
        label: "Tone",
        type: "select",
        required: false,
        options: [
          { label: "Professional", value: "professional" },
          { label: "Conversational", value: "conversational" },
          { label: "Bold / Provocative", value: "bold" },
          { label: "Educational", value: "educational" },
          { label: "Storytelling", value: "storytelling" },
        ],
        defaultValue: "professional",
      },
      {
        name: "targetAudience",
        label: "Target audience on LinkedIn",
        type: "text",
        required: false,
        placeholder: "Engineering leaders, Product managers, CTOs",
      },
      {
        name: "includeHashtags",
        label: "Include hashtags",
        type: "boolean",
        required: false,
        defaultValue: true,
      },
      {
        name: "cta",
        label: "Call to action",
        type: "text",
        required: false,
        placeholder: "Link in comments, DM me, Register now",
      },
    ];
  }

  buildSystemPrompt(context: AssembledContext): string {
    return `You are a LinkedIn content strategist for B2B marketing.

Your job is to create high-performing LinkedIn posts that drive engagement and build thought leadership.

${context.formatted}

LINKEDIN BEST PRACTICES:
- Hook must stop the scroll — first line is everything
- Use short paragraphs and line breaks for readability
- Write like a human, not a brand — personal voice performs better
- One idea per post — don't try to cover everything
- End with a question or clear CTA to drive comments
- Hashtags at the end, 3-5 max, mix of broad and niche
- Keep under 1300 characters for optimal reach (unless storytelling)

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "hook": "The attention-grabbing first line",
  "body": "The main post body with line breaks",
  "cta": "The closing call to action",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
  "commentPrompt": "A suggested first comment from the poster to boost engagement",
  "variants": [
    { "angle": "Short description of angle", "post": "Full alternate version of the post" }
  ]
}

Return ONLY valid JSON. No markdown code blocks, no explanation.`;
  }

  parseOutput(raw: string): EngineOutput {
    const parsed = this.extractJSON(raw) as unknown as LinkedInBody;

    const plainParts = [
      parsed.hook,
      "",
      parsed.body,
      "",
      parsed.cta,
      "",
      parsed.hashtags.join(" "),
    ];

    return {
      title: parsed.hook,
      body: parsed as unknown as Record<string, unknown>,
      plainText: plainParts.join("\n"),
      metadata: {
        engine: "linkedin_growth",
        variantCount: parsed.variants?.length ?? 0,
        hashtagCount: parsed.hashtags?.length ?? 0,
      },
    };
  }
}
