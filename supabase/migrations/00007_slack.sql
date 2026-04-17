-- Slack installations
CREATE TABLE slack_installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  slack_team_id TEXT NOT NULL UNIQUE,
  slack_team_name TEXT,
  bot_token TEXT NOT NULL,
  bot_user_id TEXT,
  installer_user_id TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  incoming_webhook_url TEXT,
  incoming_webhook_channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel mappings
CREATE TABLE slack_channel_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  slack_channel_id TEXT NOT NULL,
  slack_channel_name TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('content_delivery', 'review', 'notifications')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, slack_channel_id, purpose)
);

-- Command log for auditing
CREATE TABLE slack_command_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_channel_id TEXT NOT NULL,
  command TEXT NOT NULL,
  text TEXT,
  response_status TEXT NOT NULL CHECK (response_status IN ('success', 'error', 'pending')),
  response_message TEXT,
  content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_slack_install_team ON slack_installations(team_id);
CREATE INDEX idx_slack_channel_team ON slack_channel_mappings(team_id);
CREATE INDEX idx_slack_channel_campaign ON slack_channel_mappings(campaign_id);
CREATE INDEX idx_slack_command_team ON slack_command_log(team_id);
CREATE INDEX idx_slack_command_created ON slack_command_log(created_at DESC);

-- RLS
ALTER TABLE slack_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_command_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_access" ON slack_installations
  FOR ALL USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "team_access" ON slack_channel_mappings
  FOR ALL USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "team_access" ON slack_command_log
  FOR ALL USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  );
