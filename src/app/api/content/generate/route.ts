import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/services/context-engine";
import { getEngine } from "@/engines/registry";
import { BaseEngine } from "@/engines/base-engine";
import { NextResponse } from "next/server";
import type { EngineType } from "@/types/engine";

export async function POST(request: Request) {
  const supabase = await createClient();
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  let userId = "mvp-tester";
  if (!skipAuth) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  const body = await request.json();
  const {
    campaignId,
    engineType,
    prompt,
    params,
    channel,
    funnelStage,
  } = body as {
    campaignId: string;
    engineType: EngineType;
    prompt: string;
    params: Record<string, unknown>;
    channel?: string;
    funnelStage?: string;
  };

  if (!campaignId || !engineType || !prompt) {
    return NextResponse.json(
      { error: "campaignId, engineType, and prompt are required" },
      { status: 400 }
    );
  }

  try {
    // Assemble context
    const context = await assembleContext({
      campaignId,
      engine: engineType,
      channel,
      funnelStage,
      userPrompt: prompt,
    });

    // Get engine and generate
    const engine = getEngine(engineType);
    if (!(engine instanceof BaseEngine)) {
      return NextResponse.json(
        { error: "Engine does not support generation" },
        { status: 400 }
      );
    }

    const { output, tokensUsed } = await engine.generate(
      { campaignId, prompt, params: params ?? {} },
      context
    );

    // Save content item
    const { data: contentItem, error: saveError } = await supabase
      .from("content_items")
      .insert({
        campaign_id: campaignId,
        created_by: userId,
        engine: engineType,
        title: output.title,
        body: output.body,
        plain_text: output.plainText,
        channel: channel ?? null,
        funnel_stage: funnelStage ?? null,
        input_params: { prompt, params, channel, funnelStage },
        context_snapshot: {
          sources: context.meta.sources,
          totalTokens: context.meta.totalTokens,
          truncated: context.meta.truncated,
        },
        metadata: { ...output.metadata, tokensUsed },
      })
      .select("id")
      .single();

    if (saveError) {
      return NextResponse.json(
        { error: "Failed to save content", details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contentId: contentItem.id,
      output,
      context: {
        sources: context.meta.sources,
        totalTokens: context.meta.totalTokens,
      },
      tokensUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
