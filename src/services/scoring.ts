import { getProvider, type AIProviderName } from "@/lib/ai/provider";
import type { ScoringResult } from "@/types/scoring";

interface ScoreContentInput {
  title: string;
  plainText: string;
  engine: string;
  campaignGoal: string | null;
  targetAudience: string | null;
  channel: string | null;
}

const SCORING_PROMPT = `You are a marketing content quality analyst.

Score the following content on these five dimensions (0-10 each):

1. **Clarity** — Is the message easy to understand? Is it free of jargon or ambiguity?
2. **Conciseness** — Does it communicate the point without unnecessary filler?
3. **Message Alignment** — Does the content align with the stated campaign goal?
4. **Audience Relevance** — Is the tone, language, and framing appropriate for the target audience?
5. **CTA Strength** — Is the call to action specific, compelling, and actionable?

For each dimension, provide:
- A score from 0 to 10 (integers only)
- A one-sentence explanation

Then provide 2-4 specific, actionable suggestions for improvement.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "clarity": { "value": 8, "explanation": "..." },
  "conciseness": { "value": 7, "explanation": "..." },
  "messageAlignment": { "value": 9, "explanation": "..." },
  "audienceRelevance": { "value": 6, "explanation": "..." },
  "ctaStrength": { "value": 7, "explanation": "..." },
  "suggestions": ["...", "..."]
}`;

export async function scoreContent(
  input: ScoreContentInput,
  providerName: AIProviderName = "claude"
): Promise<ScoringResult> {
  const provider = await getProvider(providerName);

  const userPrompt = buildUserPrompt(input);

  const result = await provider.generate({
    messages: [
      { role: "system", content: SCORING_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 1024,
  });

  return parseResponse(result.content);
}

function buildUserPrompt(input: ScoreContentInput): string {
  const parts = [`## Content to Score`, `**Title:** ${input.title}`, ""];

  if (input.engine) {
    parts.push(`**Engine:** ${input.engine}`);
  }
  if (input.channel) {
    parts.push(`**Channel:** ${input.channel}`);
  }
  if (input.campaignGoal) {
    parts.push(`**Campaign Goal:** ${input.campaignGoal}`);
  }
  if (input.targetAudience) {
    parts.push(`**Target Audience:** ${input.targetAudience}`);
  }

  parts.push("", "**Content:**", input.plainText);

  return parts.join("\n");
}

function parseResponse(raw: string): ScoringResult {
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      throw new Error("Failed to parse scoring response as JSON");
    }
  }

  const clarity = parsed.clarity as { value: number; explanation: string };
  const conciseness = parsed.conciseness as {
    value: number;
    explanation: string;
  };
  const messageAlignment = parsed.messageAlignment as {
    value: number;
    explanation: string;
  };
  const audienceRelevance = parsed.audienceRelevance as {
    value: number;
    explanation: string;
  };
  const ctaStrength = parsed.ctaStrength as {
    value: number;
    explanation: string;
  };

  const overall =
    (clarity.value +
      conciseness.value +
      messageAlignment.value +
      audienceRelevance.value +
      ctaStrength.value) /
    5;

  return {
    clarity,
    conciseness,
    messageAlignment,
    audienceRelevance,
    ctaStrength,
    overall: Math.round(overall * 10) / 10,
    suggestions: parsed.suggestions as string[],
  };
}
