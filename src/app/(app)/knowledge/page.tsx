import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UploadForm } from "@/components/knowledge/upload-form";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ready: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default async function KnowledgePage() {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  let documents: {
    id: string;
    title: string;
    file_name: string;
    file_type: string;
    file_size: number;
    status: string;
    chunk_count: number;
    error_message: string | null;
    created_at: string;
  }[] = [];

  if (skipAuth) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("knowledge_documents")
      .select(
        "id, title, file_name, file_type, file_size, status, chunk_count, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    documents = data ?? [];
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("knowledge_documents")
      .select(
        "id, title, file_name, file_type, file_size, status, chunk_count, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    documents = data ?? [];
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Knowledge Base
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload documents to give the AI context about your brand, products,
          and guidelines.
        </p>
      </div>

      {/* Upload */}
      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Upload Document</h2>
        <div className="mt-4">
          <UploadForm />
        </div>
      </section>

      {/* Document List */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Documents</h2>
        {documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500">
              No documents uploaded yet. Upload your first document above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="truncate text-sm font-medium">
                      {doc.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[doc.status] ?? ""}`}
                    >
                      {doc.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-zinc-400">
                    <span>{doc.file_name}</span>
                    <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                    {doc.chunk_count > 0 && (
                      <span>{doc.chunk_count} chunks</span>
                    )}
                    <span>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {doc.error_message && (
                    <p className="mt-1 text-xs text-red-500">
                      {doc.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
