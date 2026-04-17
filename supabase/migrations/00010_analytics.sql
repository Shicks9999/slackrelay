-- Usage events for tracking all system actions
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_usage_events_team ON usage_events(team_id);
CREATE INDEX idx_usage_events_type ON usage_events(team_id, event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);
CREATE INDEX idx_usage_events_entity ON usage_events(entity_type, entity_id);

-- RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_access" ON usage_events
  FOR ALL USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  );

-- Campaign stats materialized view
CREATE OR REPLACE VIEW campaign_stats AS
SELECT
  c.id AS campaign_id,
  c.team_id,
  c.name AS campaign_name,
  c.status AS campaign_status,
  COUNT(DISTINCT ci.id) AS content_count,
  COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'approved') AS approved_count,
  COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'draft') AS draft_count,
  COUNT(DISTINCT cs.id) AS scored_count,
  COALESCE(AVG(cs.overall), 0) AS avg_score,
  COUNT(DISTINCT ci.engine) AS engine_count,
  array_agg(DISTINCT ci.engine) FILTER (WHERE ci.engine IS NOT NULL) AS engines_used,
  MAX(ci.created_at) AS last_content_at,
  c.created_at AS campaign_created_at
FROM campaigns c
LEFT JOIN content_items ci ON ci.campaign_id = c.id
LEFT JOIN content_scores cs ON cs.content_id = ci.id
GROUP BY c.id, c.team_id, c.name, c.status, c.created_at;
