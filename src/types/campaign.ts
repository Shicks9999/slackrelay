export type CampaignStatus =
  | "draft"
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type Channel =
  | "slack"
  | "linkedin"
  | "email"
  | "blog"
  | "social";

export type FunnelStage =
  | "awareness"
  | "consideration"
  | "decision"
  | "retention";

export interface AudiencePersona {
  title: string;
  description: string;
  painPoints: string[];
  goals: string[];
  demographics?: Record<string, string>;
}

export interface Campaign {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description: string | null;
  goal: string | null;
  targetAudience: string | null;
  audiencePersona: AudiencePersona | null;
  channels: Channel[];
  funnelStages: FunnelStage[];
  startDate: string | null;
  endDate: string | null;
  status: CampaignStatus;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  goal?: string;
  targetAudience?: string;
  audiencePersona?: AudiencePersona;
  channels?: Channel[];
  funnelStages?: FunnelStage[];
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {
  status?: CampaignStatus;
}
