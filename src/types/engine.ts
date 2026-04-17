export type EngineType =
  | "slack_launch"
  | "linkedin_growth"
  | "product_marketing"
  | "email_campaign"
  | "sales_enablement";

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

export interface InputFieldSchema {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "multiselect" | "boolean" | "number";
  required: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  defaultValue?: unknown;
}

export interface ContentEngine {
  type: EngineType;
  name: string;
  description: string;
  getInputSchema(): InputFieldSchema[];
}
