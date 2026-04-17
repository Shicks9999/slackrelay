export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGenerateOptions {
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface AIGenerateResult {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
}

export interface AIProvider {
  name: string;
  generate(options: AIGenerateOptions): Promise<AIGenerateResult>;
  generateStream(
    options: AIGenerateOptions
  ): AsyncIterable<{ text: string; done: boolean }>;
}

export type AIProviderName = "claude" | "openai";

let cachedProvider: AIProvider | null = null;
let cachedProviderName: AIProviderName | null = null;

export async function getProvider(
  name: AIProviderName = "claude"
): Promise<AIProvider> {
  if (cachedProvider && cachedProviderName === name) {
    return cachedProvider;
  }

  switch (name) {
    case "claude": {
      const { ClaudeProvider } = await import("./claude");
      cachedProvider = new ClaudeProvider();
      break;
    }
    case "openai":
      throw new Error("OpenAI provider not yet implemented");
    default:
      throw new Error(`Unknown AI provider: ${name}`);
  }

  cachedProviderName = name;
  return cachedProvider;
}
