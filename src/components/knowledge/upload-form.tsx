"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      setSuccess(true);
      setFile(null);
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">File</label>
        <input
          type="file"
          accept=".txt,.md,.csv,.json,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:hover:file:bg-zinc-700"
        />
        <p className="mt-1 text-xs text-zinc-400">
          Supported: .txt, .md, .csv, .json (max 10MB)
        </p>
      </div>

      <button
        type="submit"
        disabled={!file || loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Uploading..." : "Upload & Ingest"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">
          Document uploaded. Ingestion started — it will appear as &quot;ready&quot; when processing completes.
        </p>
      )}
    </form>
  );
}
