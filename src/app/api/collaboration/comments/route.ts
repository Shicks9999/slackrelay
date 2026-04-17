import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const supabase = skipAuth ? createAdminClient() : await createClient();

  let authorId = "mvp-tester";
  let authorName = "MVP Tester";

  if (!skipAuth) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authorId = user.id;
    authorName = user.email ?? user.id;
  }

  const { contentId, body, commentType, parentCommentId } = await request.json();

  if (!contentId || !body) {
    return NextResponse.json({ error: "contentId and body required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_comments")
    .insert({
      content_id: contentId,
      parent_comment_id: parentCommentId ?? null,
      author_id: authorId,
      author_name: authorName,
      body,
      comment_type: commentType ?? "comment",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commentId: data.id });
}

export async function PATCH(request: Request) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const supabase = skipAuth ? createAdminClient() : await createClient();

  let userId = "mvp-tester";
  if (!skipAuth) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const { commentId, resolved } = await request.json();

  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("content_comments")
    .update({
      resolved,
      resolved_by: resolved ? userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
