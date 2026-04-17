-- Knowledge documents
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge chunks with pgvector embeddings
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_docs_team ON knowledge_documents(team_id);
CREATE INDEX idx_knowledge_docs_status ON knowledge_documents(team_id, status);
CREATE INDEX idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_team ON knowledge_chunks(team_id);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_access" ON knowledge_documents
  FOR ALL USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "team_access" ON knowledge_chunks
  FOR ALL USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  );

-- Semantic search RPC
CREATE OR REPLACE FUNCTION search_knowledge(
  p_team_id UUID,
  p_query_embedding vector(1536),
  p_match_count INTEGER DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kc.chunk_index,
    1 - (kc.embedding <=> p_query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.team_id = p_team_id
    AND kd.status = 'ready'
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY kc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;
