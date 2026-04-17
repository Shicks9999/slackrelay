"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Comment {
  id: string;
  author_name: string | null;
  author_id: string;
  body: string;
  comment_type: string;
  resolved: boolean;
  created_at: string;
  replies?: Comment[];
}

export function CommentThread({
  contentId,
  comments,
}: {
  contentId: string;
  comments: Comment[];
}) {
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<string>("comment");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/collaboration/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          body: newComment,
          commentType,
        }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setNewComment("");
      router.refresh();
    } catch {
      // silently fail for now
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(commentId: string) {
    await fetch("/api/collaboration/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, resolved: true }),
    });
    router.refresh();
  }

  async function handleAISuggestion() {
    setLoading(true);
    try {
      const res = await fetch("/api/collaboration/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });
      if (!res.ok) throw new Error("Failed to generate suggestions");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const TYPE_BADGES: Record<string, { bg: string; label: string }> = {
    comment: { bg: "bg-zinc-100 dark:bg-zinc-800", label: "Comment" },
    suggestion: {
      bg: "bg-yellow-100 dark:bg-yellow-900",
      label: "Suggestion",
    },
    ai_suggestion: {
      bg: "bg-purple-100 dark:bg-purple-900",
      label: "AI Suggestion",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Comments</h2>
        <button
          onClick={handleAISuggestion}
          disabled={loading}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {loading ? "Generating..." : "Get AI Suggestions"}
        </button>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-zinc-400">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg border p-3 ${
                comment.resolved
                  ? "border-zinc-100 bg-zinc-50/50 opacity-60 dark:border-zinc-900 dark:bg-zinc-950/50"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.author_name ?? comment.author_id}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${TYPE_BADGES[comment.comment_type]?.bg ?? ""}`}
                  >
                    {TYPE_BADGES[comment.comment_type]?.label ??
                      comment.comment_type}
                  </span>
                  {comment.resolved && (
                    <span className="text-xs text-green-600">Resolved</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                  {!comment.resolved && (
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="comment">Comment</option>
            <option value="suggestion">Suggestion</option>
          </select>
        </div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Posting..." : "Post Comment"}
        </button>
      </form>
    </div>
  );
}
