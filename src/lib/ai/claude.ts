import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AIGenerateOptions,
  AIGenerateResult,
} from "./provider";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;

export class ClaudeProvider implements AIProvider {
  name = "claude" as const;
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const systemMessage = options.messages.find((m) => m.role === "system");
    const userMessages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: userMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const content = textBlock?.text ?? "";

    return {
      content,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
    };
  }

  async *generateStream(
    options: AIGenerateOptions
  ): AsyncIterable<{ text: string; done: boolean }> {
    const systemMessage = options.messages.find((m) => m.role === "system");
    const userMessages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = this.client.messages.stream({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: userMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { text: event.delta.text, done: false };
      }
    }

    yield { text: "", done: true };
  }
}
