export interface BrandVoice {
  tone: string[];
  personality: string;
  doList: string[];
  dontList: string[];
}

export interface MessagingFramework {
  id: string;
  campaignId: string;
  brandVoice: BrandVoice | null;
  positioningStatement: string | null;
  tagline: string | null;
  elevatorPitch: string | null;
  pillars: MessagingPillar[];
  keyMessages: KeyMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface MessagingPillar {
  id: string;
  frameworkId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  valuePropositions: ValueProposition[];
  createdAt: string;
}

export interface ValueProposition {
  id: string;
  pillarId: string;
  statement: string;
  supportingProof: string | null;
  differentiator: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface KeyMessage {
  id: string;
  frameworkId: string;
  audienceSegment: string | null;
  channel: string | null;
  funnelStage: string | null;
  message: string;
  rationale: string | null;
  sortOrder: number;
  createdAt: string;
}
