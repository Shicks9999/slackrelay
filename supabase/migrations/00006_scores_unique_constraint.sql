-- Add unique constraint on content_id so we can upsert scores
ALTER TABLE content_scores ADD CONSTRAINT content_scores_content_id_key UNIQUE (content_id);
