"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Approval {
  id: string;
  status: string;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  changes_requested: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function ApprovalPanel({
  contentId,
  approval,
}: {
  contentId: string;
  approval: Approval | null;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(action: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/collaboration/approvals", {
        method: approval ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          approvalId: approval?.id,
          action,
          note: note || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Approval</h2>

      {approval ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[approval.status] ?? ""}`}
            >
              {approval.status.replace("_", " ")}
            </span>
            <span className="text-sm text-zinc-500">
              Requested {new Date(approval.requested_at).toLocaleString()}
            </span>
          </div>

          {approval.decision_note && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {approval.decision_note}
            </p>
          )}

          {approval.status === "pending" && (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Decision note (optional)"
                rows={2}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction("approved")}
                  disabled={loading}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction("changes_requested")}
                  disabled={loading}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => handleAction("rejected")}
                  disabled={loading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-zinc-500">
            No approval requested yet.
          </p>
          <button
            onClick={() => handleAction("request")}
            disabled={loading}
            className="mt-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Request Approval
          </button>
        </div>
      )}
    </div>
  );
}
