import type { EngineType } from "@/types/engine";
import type { ContentEngine } from "./types";
import { SlackLaunchEngine } from "./slack-launch";
import { LinkedInGrowthEngine } from "./linkedin-growth";
import { ProductMarketingEngine } from "./product-marketing";
import { EmailCampaignEngine } from "./email-campaign";
import { SalesEnablementEngine } from "./sales-enablement";

const engines: Record<string, ContentEngine> = {
  slack_launch: new SlackLaunchEngine(),
  linkedin_growth: new LinkedInGrowthEngine(),
  product_marketing: new ProductMarketingEngine(),
  email_campaign: new EmailCampaignEngine(),
  sales_enablement: new SalesEnablementEngine(),
};

export function getEngine(type: EngineType): ContentEngine {
  const engine = engines[type];
  if (!engine) {
    throw new Error(`Engine not implemented: ${type}`);
  }
  return engine;
}

export function listEngines(): ContentEngine[] {
  return Object.values(engines);
}
