import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { estimateTokens } from "@/lib/ai/tokens";

const CHUNK_SIZE = 500; // target tokens per chunk
const CHUNK_OVERLAP = 50; // overlap tokens between chunks
const MAX_CHARS_PER_CHUNK = CHUNK_SIZE * 4;
const OVERLAP_CHARS = CHUNK_OVERLAP * 4;
const EMBEDDING_BATCH_SIZE = 20;

/**
 * Ingest a document: extract text, chunk, embed, and store.
 * Updates the document status throughout the process.
 */
export async function ingestDocument(
  documentId: string,
  textContent: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("knowledge_documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  try {
    const { data: doc } = await supabase
      .from("knowledge_documents")
      .select("team_id")
      .eq("id", documentId)
      .single();

    if (!doc) throw new Error("Document not found");

    // Chunk the text
    const chunks = chunkText(textContent);

    // Generate embeddings in batches
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const embeddings = await generateEmbeddings(batch);
      allEmbeddings.push(...embeddings);
    }

    // Store chunks with embeddings
    const chunkRows = chunks.map((content, index) => ({
      document_id: documentId,
      team_id: doc.team_id,
      content,
      chunk_index: index,
      token_count: estimateTokens(content),
      embedding: JSON.stringify(allEmbeddings[index]),
    }));

    // Insert in batches of 50
    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      const { error } = await supabase.from("knowledge_chunks").insert(batch);
      if (error) throw error;
    }

    // Mark as ready
    await supabase
      .from("knowledge_documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    await supabase
      .from("knowledge_documents")
      .update({
        status: "error",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    throw err;
  }
}

/**
 * Split text into overlapping chunks, breaking at sentence boundaries.
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + MAX_CHARS_PER_CHUNK;

    if (end >= text.length) {
      chunks.push(text.slice(start).trim());
      break;
    }

    // Try to break at a sentence boundary
    const slice = text.slice(start, end);
    const lastPeriod = slice.lastIndexOf(". ");
    const lastNewline = slice.lastIndexOf("\n\n");
    const breakPoint = Math.max(lastPeriod, lastNewline);

    if (breakPoint > MAX_CHARS_PER_CHUNK * 0.3) {
      end = start + breakPoint + 1;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - OVERLAP_CHARS;
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Search knowledge base using semantic similarity.
 */
export async function searchKnowledge(
  teamId: string,
  query: string,
  matchCount = 5,
  threshold = 0.7
): Promise<
  { id: string; documentId: string; content: string; similarity: number }[]
> {
  const { generateEmbedding } = await import("@/lib/ai/embeddings");
  const queryEmbedding = await generateEmbedding(query);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("search_knowledge", {
    p_team_id: teamId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_count: matchCount,
    p_match_threshold: threshold,
  });

  if (error) throw error;

  return (data ?? []).map(
    (row: {
      id: string;
      document_id: string;
      content: string;
      similarity: number;
    }) => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      similarity: row.similarity,
    })
  );
}
