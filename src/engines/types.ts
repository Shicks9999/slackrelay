import type { EngineType, InputFieldSchema } from "@/types/engine";
import type { AssembledContext } from "@/services/context-engine";

export interface EngineInput {
  campaignId: string;
  prompt: string;
  params: Record<string, unknown>;
}

export interface EngineOutput {
  title: string;
  body: Record<string, unknown>;
  plainText: string;
  metadata: Record<string, unknown>;
}

export interface ContentEngine {
  type: EngineType;
  name: string;
  description: string;
  getInputSchema(): InputFieldSchema[];
  buildSystemPrompt(context: AssembledContext): string;
  parseOutput(raw: string): EngineOutput;
}
