import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/ai/provider";
import { NextResponse } from "next/server";

export async function GET() {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const supabase = skipAuth ? createAdminClient() : await createClient();

  if (!skipAuth) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gather state
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentContent } = await supabase
    .from("content_items")
    .select("id, title, engine, status, campaign_id")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: pendingApprovals } = await supabase
    .from("content_approvals")
    .select("id, content_id")
    .eq("status", "pending");

  const { data: unresolvedComments } = await supabase
    .from("content_comments")
    .select("id")
    .eq("resolved", false)
    .eq("comment_type", "suggestion");

  const summary = {
    campaigns: (campaigns ?? []).map((c) => `${c.name} (${c.status})`).join(", "),
    recentContent: (recentContent ?? []).map((c) => `${c.title} [${c.engine}, ${c.status}]`).join(", "),
    pendingApprovals: pendingApprovals?.length ?? 0,
    unresolvedSuggestions: unresolvedComments?.length ?? 0,
    draftCount: (recentContent ?? []).filter((c) => c.status === "draft").length,
  };

  const provider = await getProvider("claude");

  const result = await provider.generate({
    messages: [
      {
        role: "system",
        content: `You are a campaign operations advisor. Based on the current state of the user's campaigns, suggest 3-5 prioritized next actions.

Format each action as:
- **Action title** — Brief description of what to do and why

Focus on high-impact actions: content that needs scoring, drafts awaiting review, campaigns missing content types, or opportunities to improve low-scoring content.`,
      },
      {
        role: "user",
        content: `Current state:\n${JSON.stringify(summary, null, 2)}`,
      },
    ],
    temperature: 0.5,
    maxTokens: 512,
  });

  return NextResponse.json({ actions: result.content });
}
