"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScoreButton({ contentId }: { contentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleScore() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/content/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Scoring failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleScore}
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Scoring..." : "Score Content"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
