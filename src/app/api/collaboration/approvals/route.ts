import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const supabase = skipAuth ? createAdminClient() : await createClient();

  let userId = "mvp-tester";
  if (!skipAuth) {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const { contentId } = await request.json();

  if (!contentId) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_approvals")
    .insert({
      content_id: contentId,
      requested_by: userId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update content status to review
  await supabase
    .from("content_items")
    .update({ status: "review" })
    .eq("id", contentId);

  return NextResponse.json({ approvalId: data.id });
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

  const { approvalId, contentId, action, note } = await request.json();

  if (!approvalId || !action) {
    return NextResponse.json({ error: "approvalId and action required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("content_approvals")
    .update({
      status: action,
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_note: note ?? null,
    })
    .eq("id", approvalId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update content status based on approval decision
  const statusMap: Record<string, string> = {
    approved: "approved",
    rejected: "rejected",
    changes_requested: "draft",
  };
  const newStatus = statusMap[action];
  if (newStatus && contentId) {
    await supabase
      .from("content_items")
      .update({ status: newStatus })
      .eq("id", contentId);
  }

  return NextResponse.json({ ok: true });
}
