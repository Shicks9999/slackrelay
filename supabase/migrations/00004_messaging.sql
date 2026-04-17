-- Messaging frameworks (one per campaign)
CREATE TABLE messaging_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  brand_voice JSONB,
  positioning_statement TEXT,
  tagline TEXT,
  elevator_pitch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- Messaging pillars
CREATE TABLE messaging_pillars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES messaging_frameworks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Value propositions (per pillar)
CREATE TABLE value_propositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pillar_id UUID NOT NULL REFERENCES messaging_pillars(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  supporting_proof TEXT,
  differentiator TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Key messages (per framework)
CREATE TABLE key_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES messaging_frameworks(id) ON DELETE CASCADE,
  audience_segment TEXT,
  channel TEXT,
  funnel_stage TEXT,
  message TEXT NOT NULL,
  rationale TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_frameworks_campaign ON messaging_frameworks(campaign_id);
CREATE INDEX idx_pillars_framework ON messaging_pillars(framework_id);
CREATE INDEX idx_vp_pillar ON value_propositions(pillar_id);
CREATE INDEX idx_km_framework ON key_messages(framework_id);

-- RLS
ALTER TABLE messaging_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_propositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_access" ON messaging_frameworks
  FOR ALL USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "team_access" ON messaging_pillars
  FOR ALL USING (
    framework_id IN (
      SELECT mf.id FROM messaging_frameworks mf
      JOIN campaigns c ON c.id = mf.campaign_id
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "team_access" ON value_propositions
  FOR ALL USING (
    pillar_id IN (
      SELECT mp.id FROM messaging_pillars mp
      JOIN messaging_frameworks mf ON mf.id = mp.framework_id
      JOIN campaigns c ON c.id = mf.campaign_id
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "team_access" ON key_messages
  FOR ALL USING (
    framework_id IN (
      SELECT mf.id FROM messaging_frameworks mf
      JOIN campaigns c ON c.id = mf.campaign_id
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.id = auth.uid()
    )
  );
