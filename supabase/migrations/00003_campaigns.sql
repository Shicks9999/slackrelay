CREATE TYPE campaign_status AS ENUM (
  'draft', 'planning', 'active', 'paused', 'completed', 'archived'
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  target_audience TEXT,
  audience_persona JSONB,
  channels TEXT[] DEFAULT '{}',
  funnel_stages TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  status campaign_status NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_team ON campaigns(team_id);
CREATE INDEX idx_campaigns_status ON campaigns(team_id, status);
CREATE INDEX idx_campaigns_created ON campaigns(team_id, created_at DESC);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read campaigns" ON campaigns
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can update campaigns" ON campaigns
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team admins can delete campaigns" ON campaigns
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
