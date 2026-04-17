export type DocumentStatus = "pending" | "processing" | "ready" | "error";

export interface KnowledgeDocument {
  id: string;
  teamId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  status: DocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  teamId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}
