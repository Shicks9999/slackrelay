import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestDocument } from "@/services/knowledge";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  let userId = "mvp-tester";
  let teamId: string | null = null;

  if (!skipAuth) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // Get team_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("user_id", user.id)
      .single();
    teamId = profile?.team_id ?? null;
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) ?? file?.name ?? "Untitled";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith(".md")) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Allowed: .txt, .md, .csv, .json`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Max 10MB." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    // Upload to Supabase Storage
    const storagePath = `knowledge/${teamId ?? "default"}/${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: "Upload failed", details: uploadError.message },
        { status: 500 }
      );
    }

    // Create document record
    const { data: doc, error: docError } = await admin
      .from("knowledge_documents")
      .insert({
        team_id: teamId ?? "00000000-0000-0000-0000-000000000000",
        title,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        status: "pending",
        created_by: skipAuth ? null : userId,
      })
      .select("id")
      .single();

    if (docError) {
      return NextResponse.json(
        { error: "Failed to create document", details: docError.message },
        { status: 500 }
      );
    }

    // Extract text and trigger async ingestion
    const textContent = await extractText(buffer, file.type, file.name);

    // Fire and forget — ingestion runs in background
    ingestDocument(doc.id, textContent).catch(console.error);

    return NextResponse.json({
      documentId: doc.id,
      status: "processing",
      message: "Document uploaded. Ingestion started.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function extractText(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<string> {
  // For MVP: handle text-based files directly
  if (
    fileType === "text/plain" ||
    fileType === "text/markdown" ||
    fileType === "text/csv" ||
    fileName.endsWith(".md")
  ) {
    return buffer.toString("utf-8");
  }

  if (fileType === "application/json") {
    const json = JSON.parse(buffer.toString("utf-8"));
    return JSON.stringify(json, null, 2);
  }

  // PDF extraction would require a library — for MVP, return a placeholder
  if (fileType === "application/pdf") {
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  }

  return buffer.toString("utf-8");
}
