import type { InputFieldSchema, EngineType } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";
import type { EngineOutput } from "./types";
import { BaseEngine } from "./base-engine";

interface SalesEnablementBody {
  title: string;
  talkingPoints: { point: string; supporting: string }[];
  objectionHandling: { objection: string; response: string }[];
  customerQuestions: { question: string; answer: string }[];
  competitiveInsights: string[];
  closingStatement: string;
}

export class SalesEnablementEngine extends BaseEngine {
  type: EngineType = "sales_enablement";
  name = "Sales Enablement";
  description =
    "Generate sales collateral — talking points, objection handling, battle cards.";

  getInputSchema(): InputFieldSchema[] {
    return [
      {
        name: "contentType",
        label: "Content type",
        type: "select",
        required: true,
        options: [
          { label: "Talking Points", value: "talking_points" },
          { label: "Objection Handling", value: "objection_handling" },
          { label: "Discovery Questions", value: "discovery_questions" },
          { label: "Customer Pitch", value: "customer_pitch" },
          { label: "ROI Justification", value: "roi_justification" },
        ],
      },
      {
        name: "dealStage",
        label: "Deal stage",
        type: "select",
        required: false,
        options: [
          { label: "Prospecting", value: "prospecting" },
          { label: "Discovery", value: "discovery" },
          { label: "Demo / Evaluation", value: "evaluation" },
          { label: "Negotiation", value: "negotiation" },
          { label: "Closing", value: "closing" },
        ],
        defaultValue: "discovery",
      },
      {
        name: "buyerRole",
        label: "Buyer role",
        type: "text",
        required: false,
        placeholder: "CTO, VP of Engineering, IT Manager",
      },
      {
        name: "industry",
        label: "Industry",
        type: "text",
        required: false,
        placeholder: "Financial services, Healthcare, Tech",
      },
      {
        name: "competitor",
        label: "Primary competitor (if applicable)",
        type: "text",
        required: false,
        placeholder: "Microsoft Teams",
      },
    ];
  }

  buildSystemPrompt(context: AssembledContext): string {
    return `You are a sales enablement expert who creates high-impact sales collateral.

${context.formatted}

SALES ENABLEMENT PRINCIPLES:
- Every talking point must tie to customer value
- Objection responses should acknowledge, reframe, and prove
- Use the "Feel, Felt, Found" framework for sensitive objections
- Discovery questions should uncover pain, impact, and urgency
- Competitive insights should be factual and defensible
- Match language to the buyer's role and industry

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "title": "Document title",
  "talkingPoints": [
    { "point": "Key talking point", "supporting": "Evidence or supporting detail" }
  ],
  "objectionHandling": [
    { "objection": "Common objection", "response": "How to respond" }
  ],
  "customerQuestions": [
    { "question": "Question to ask the customer", "answer": "Why this question matters / expected response" }
  ],
  "competitiveInsights": ["Competitive insight 1", "Competitive insight 2"],
  "closingStatement": "Suggested closing statement"
}

Return ONLY valid JSON.`;
  }

  parseOutput(raw: string): EngineOutput {
    const parsed = this.extractJSON(raw) as unknown as SalesEnablementBody;

    const plainParts = [
      parsed.title,
      "",
      "TALKING POINTS:",
      ...parsed.talkingPoints.map(
        (tp) => `- ${tp.point}\n  ${tp.supporting}`
      ),
      "",
      "OBJECTION HANDLING:",
      ...parsed.objectionHandling.map(
        (oh) => `Q: ${oh.objection}\nA: ${oh.response}`
      ),
      "",
      "DISCOVERY QUESTIONS:",
      ...parsed.customerQuestions.map((cq) => `- ${cq.question}`),
      "",
      parsed.closingStatement,
    ];

    return {
      title: parsed.title,
      body: parsed as unknown as Record<string, unknown>,
      plainText: plainParts.join("\n"),
      metadata: {
        engine: "sales_enablement",
        talkingPointCount: parsed.talkingPoints?.length ?? 0,
        objectionCount: parsed.objectionHandling?.length ?? 0,
      },
    };
  }
}
