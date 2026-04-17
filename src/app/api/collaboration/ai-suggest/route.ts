import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/ai/provider";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const supabase = skipAuth ? createAdminClient() : await createClient();

  if (!skipAuth) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentId } = await request.json();

  if (!contentId) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }

  // Load content
  const { data: content } = await supabase
    .from("content_items")
    .select("title, plain_text, engine")
    .eq("id", contentId)
    .single();

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Load existing comments for context
  const { data: existingComments } = await supabase
    .from("content_comments")
    .select("body, comment_type")
    .eq("content_id", contentId)
    .eq("resolved", false);

  const provider = await getProvider("claude");

  const result = await provider.generate({
    messages: [
      {
        role: "system",
        content: `You are a content reviewer. Analyze the content and provide 2-4 specific, actionable improvement suggestions.

Each suggestion should:
- Identify a specific issue or opportunity
- Explain why it matters
- Provide a concrete recommendation

${existingComments && existingComments.length > 0 ? `Existing feedback (don't repeat these):\n${existingComments.map((c) => `- ${c.body}`).join("\n")}` : ""}

Return each suggestion on its own line, prefixed with "- ".`,
      },
      {
        role: "user",
        content: `Title: ${content.title}\nEngine: ${content.engine}\n\n${content.plain_text}`,
      },
    ],
    temperature: 0.5,
    maxTokens: 1024,
  });

  // Parse suggestions and save as AI comments
  const suggestions = result.content
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.trim().replace(/^- /, ""));

  for (const suggestion of suggestions) {
    await supabase.from("content_comments").insert({
      content_id: contentId,
      author_id: "ai",
      author_name: "SlackRelay AI",
      body: suggestion,
      comment_type: "ai_suggestion",
    });
  }

  return NextResponse.json({ suggestions, count: suggestions.length });
}
