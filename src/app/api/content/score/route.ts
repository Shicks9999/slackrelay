import { createClient } from "@/lib/supabase/server";
import { scoreContent } from "@/services/scoring";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentId } = (await request.json()) as { contentId: string };

  if (!contentId) {
    return NextResponse.json(
      { error: "contentId is required" },
      { status: 400 }
    );
  }

  // Load content item with campaign context
  const { data: content, error: contentError } = await supabase
    .from("content_items")
    .select("id, title, plain_text, engine, channel, campaign_id")
    .eq("id", contentId)
    .single();

  if (contentError || !content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Load campaign for goal and audience context
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("goal, target_audience")
    .eq("id", content.campaign_id)
    .single();

  try {
    const result = await scoreContent({
      title: content.title,
      plainText: content.plain_text ?? "",
      engine: content.engine,
      campaignGoal: campaign?.goal ?? null,
      targetAudience: campaign?.target_audience ?? null,
      channel: content.channel,
    });

    // Upsert scores — replace existing scores for this content
    const { error: saveError } = await supabase
      .from("content_scores")
      .upsert(
        {
          content_id: contentId,
          clarity: result.clarity.value,
          conciseness: result.conciseness.value,
          message_alignment: result.messageAlignment.value,
          audience_relevance: result.audienceRelevance.value,
          cta_strength: result.ctaStrength.value,
          explanations: {
            clarity: result.clarity.explanation,
            conciseness: result.conciseness.explanation,
            message_alignment: result.messageAlignment.explanation,
            audience_relevance: result.audienceRelevance.explanation,
            cta_strength: result.ctaStrength.explanation,
          },
          suggestions: result.suggestions,
        },
        { onConflict: "content_id" }
      );

    if (saveError) {
      return NextResponse.json(
        { error: "Failed to save scores", details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ scores: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
