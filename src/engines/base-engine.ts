import type { EngineType, InputFieldSchema } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";
import type { ContentEngine, EngineInput, EngineOutput } from "./types";
import { getProvider, type AIProviderName } from "@/lib/ai/provider";

export abstract class BaseEngine implements ContentEngine {
  abstract type: EngineType;
  abstract name: string;
  abstract description: string;

  abstract getInputSchema(): InputFieldSchema[];
  abstract buildSystemPrompt(context: AssembledContext): string;
  abstract parseOutput(raw: string): EngineOutput;

  /**
   * Generate content using the assembled context and user input.
   */
  async generate(
    input: EngineInput,
    context: AssembledContext,
    providerName: AIProviderName = "claude"
  ): Promise<{ output: EngineOutput; tokensUsed: number }> {
    const provider = await getProvider(providerName);
    const systemPrompt = this.buildSystemPrompt(context);

    const userPrompt = this.buildUserPrompt(input);

    const result = await provider.generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
    });

    const output = this.parseOutput(result.content);

    return {
      output,
      tokensUsed: result.tokensUsed.total,
    };
  }

  protected buildUserPrompt(input: EngineInput): string {
    const parts: string[] = [];

    if (input.prompt) {
      parts.push(input.prompt);
    }

    if (Object.keys(input.params).length > 0) {
      parts.push("");
      parts.push("Parameters:");
      for (const [key, value] of Object.entries(input.params)) {
        if (value !== undefined && value !== null && value !== "") {
          parts.push(`- ${key}: ${value}`);
        }
      }
    }

    return parts.join("\n");
  }

  /**
   * Try to parse JSON from the AI response, handling markdown code blocks.
   */
  protected extractJSON(raw: string): Record<string, unknown> {
    // Try direct parse first
    try {
      return JSON.parse(raw);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error("Failed to parse AI response as JSON");
    }
  }
}
