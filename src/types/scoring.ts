export interface ScoreDimension {
  value: number;
  explanation: string;
}

export interface ScoringResult {
  clarity: ScoreDimension;
  conciseness: ScoreDimension;
  messageAlignment: ScoreDimension;
  audienceRelevance: ScoreDimension;
  ctaStrength: ScoreDimension;
  overall: number;
  suggestions: string[];
}
