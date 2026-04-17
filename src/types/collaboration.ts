export type CommentType = "comment" | "suggestion" | "ai_suggestion";

export interface ContentComment {
  id: string;
  contentId: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string | null;
  body: string;
  commentType: CommentType;
  resolved: boolean;
  resolvedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export interface ContentApproval {
  id: string;
  contentId: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}
