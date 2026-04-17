-- Comments on content items
CREATE TABLE content_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment' CHECK (comment_type IN ('comment', 'suggestion', 'ai_suggestion')),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approval requests and decisions
CREATE TABLE content_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comments_content ON content_comments(content_id);
CREATE INDEX idx_comments_parent ON content_comments(parent_comment_id);
CREATE INDEX idx_comments_type ON content_comments(content_id, comment_type);
CREATE INDEX idx_approvals_content ON content_approvals(content_id);
CREATE INDEX idx_approvals_status ON content_approvals(status);

-- RLS
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_access" ON content_comments
  FOR ALL USING (
    content_id IN (
      SELECT ci.id FROM content_items ci
      JOIN campaigns c ON c.id = ci.campaign_id
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "team_access" ON content_approvals
  FOR ALL USING (
    content_id IN (
      SELECT ci.id FROM content_items ci
      JOIN campaigns c ON c.id = ci.campaign_id
      JOIN profiles p ON p.team_id = c.team_id
      WHERE p.user_id = auth.uid()
    )
  );
