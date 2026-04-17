CREATE TYPE content_status AS ENUM (
  'draft', 'review', 'approved', 'published', 'rejected'
);

CREATE TYPE engine_type AS ENUM (
  'slack_launch', 'linkedin_growth', 'product_marketing',
  'email_campaign', 'sales_enablement'
);

-- Content items
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  engine engine_type NOT NULL,
  title TEXT NOT NULL,
  body JSONB NOT NULL,
  plain_text TEXT,
  channel TEXT,
  funnel_stage TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES content_items(id),
  input_params JSONB,
  context_snapshot JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content scores
CREATE TABLE content_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  clarity REAL NOT NULL CHECK (clarity BETWEEN 0 AND 10),
  conciseness REAL NOT NULL CHECK (conciseness BETWEEN 0 AND 10),
  message_alignment REAL NOT NULL CHECK (message_alignment BETWEEN 0 AND 10),
  audience_relevance REAL NOT NULL CHECK (audience_relevance BETWEEN 0 AND 10),
  cta_strength REAL NOT NULL CHECK (cta_strength BETWEEN 0 AND 10),
  overall REAL GENERATED ALWAYS AS (
    (clarity + conciseness + message_alignment + audience_relevance + cta_strength) / 5.0
  ) STORED,
  explanations JSONB NOT NULL,
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_campaign ON content_items(campaign_id);
CREATE INDEX idx_content_engine ON content_items(campaign_id, engine);
CREATE INDEX idx_content_status ON content_items(campaign_id, status);
CREATE INDEX idx_content_parent ON content_items(parent_id);
CREATE INDEX idx_scores_content ON content_scores(content_id);

-- RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_access" ON content_items
  FOR ALL USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "team_access" ON content_scores
  FOR ALL USING (
    content_id IN (
      SELECT ci.id FROM content_items ci
      JOIN campaigns c ON c.id = ci.campaign_id
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.id = auth.uid()
    )
  );
