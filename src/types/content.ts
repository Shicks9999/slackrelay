import type { EngineType } from "./engine";

export type ContentStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "rejected";

export interface ContentItem {
  id: string;
  campaignId: string;
  createdBy: string;
  engine: EngineType;
  title: string;
  body: Record<string, unknown>;
  plainText: string | null;
  channel: string | null;
  funnelStage: string | null;
  status: ContentStatus;
  version: number;
  parentId: string | null;
  inputParams: Record<string, unknown> | null;
  contextSnapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentScores {
  id: string;
  contentId: string;
  clarity: number;
  conciseness: number;
  messageAlignment: number;
  audienceRelevance: number;
  ctaStrength: number;
  overall: number;
  explanations: Record<string, string>;
  suggestions: string[];
  createdAt: string;
}
