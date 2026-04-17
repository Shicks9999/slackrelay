import { createClient } from "@/lib/supabase/server";
import { searchKnowledge } from "@/services/knowledge";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  let teamId: string | null = null;

  if (!skipAuth) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("user_id", user.id)
      .single();
    teamId = profile?.team_id ?? null;
  }

  const { query, matchCount, threshold } = (await request.json()) as {
    query: string;
    matchCount?: number;
    threshold?: number;
  };

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const results = await searchKnowledge(
      teamId ?? "00000000-0000-0000-0000-000000000000",
      query,
      matchCount ?? 5,
      threshold ?? 0.7
    );

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
