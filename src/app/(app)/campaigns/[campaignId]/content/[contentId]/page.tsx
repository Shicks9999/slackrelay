import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreButton } from "@/components/content/score-button";

interface Props {
  params: Promise<{ campaignId: string; contentId: string }>;
}

const ENGINE_LABELS: Record<string, string> = {
  slack_launch: "Slack Launch",
  linkedin_growth: "LinkedIn Growth",
  product_marketing: "Product Marketing",
  email_campaign: "Email Campaign",
  sales_enablement: "Sales Enablement",
};

export default async function ContentDetailPage({ params }: Props) {
  const { campaignId, contentId } = await params;
  const supabase = await createClient();

  const { data: content, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentId)
    .single();

  if (error || !content) {
    notFound();
  }

  // Load scores if they exist
  const { data: scores } = await supabase
    .from("content_scores")
    .select("*")
    .eq("content_id", contentId)
    .single();

  interface SlackBody {
    headline?: string;
    body?: string;
    bulletPoints?: string[];
    cta?: string;
    threadFollowUp?: string;
    channelVariants?: { channel: string; message: string }[];
  }
  interface LinkedInBody {
    hook?: string;
    body?: string;
    cta?: string;
    hashtags?: string[];
    commentPrompt?: string;
    variants?: { angle: string; post: string }[];
  }
  const body = content.body as SlackBody & LinkedInBody;
  const isLinkedIn = content.engine === "linkedin_growth";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {content.title}
            </h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {content.status}
            </span>
          </div>
          <div className="mt-1 flex gap-3 text-sm text-zinc-500">
            <span>{ENGINE_LABELS[content.engine] ?? content.engine}</span>
            {content.channel && <span>#{content.channel}</span>}
            <span>v{content.version}</span>
            <span>{new Date(content.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreButton contentId={contentId} />
          <Link
            href={`/campaigns/${campaignId}/content`}
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Back to content
          </Link>
        </div>
      </div>

      {/* Content Body */}
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        {/* Hook / Headline */}
        {(body.headline || body.hook) && (
          <h2 className="text-lg font-bold">{body.headline ?? body.hook}</h2>
        )}

        {body.body && (
          <div className="mt-3 whitespace-pre-wrap text-sm">{body.body}</div>
        )}

        {body.bulletPoints && body.bulletPoints.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {body.bulletPoints.map((bp, i) => (
              <li key={i}>{bp}</li>
            ))}
          </ul>
        )}

        {body.cta && (
          <div className="mt-4 rounded bg-zinc-50 p-3 text-sm font-medium dark:bg-zinc-900">
            CTA: {body.cta}
          </div>
        )}

        {/* LinkedIn: Hashtags */}
        {isLinkedIn && body.hashtags && body.hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {body.hashtags.map((tag, i) => (
              <span
                key={i}
                className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* LinkedIn: Comment Prompt */}
        {isLinkedIn && body.commentPrompt && (
          <div className="mt-4 border-l-2 border-blue-300 pl-3 text-sm text-zinc-600 dark:border-blue-700 dark:text-zinc-400">
            <span className="text-xs font-medium uppercase text-zinc-400">
              Suggested first comment
            </span>
            <br />
            {body.commentPrompt}
          </div>
        )}

        {/* Slack: Thread follow-up */}
        {body.threadFollowUp && (
          <div className="mt-4 border-l-2 border-zinc-300 pl-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <span className="text-xs font-medium uppercase text-zinc-400">
              Thread follow-up
            </span>
            <br />
            {body.threadFollowUp}
          </div>
        )}

        {/* Slack: Channel Variants */}
        {body.channelVariants && body.channelVariants.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">Channel Variants</h3>
            {body.channelVariants.map((variant, i) => (
              <div
                key={i}
                className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <span className="text-xs font-medium text-zinc-500">
                  {variant.channel}
                </span>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {variant.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* LinkedIn: Angle Variants */}
        {isLinkedIn && body.variants && body.variants.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">Alternate Angles</h3>
            {body.variants.map((variant, i) => (
              <div
                key={i}
                className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <span className="text-xs font-medium text-zinc-500">
                  {variant.angle}
                </span>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {variant.post}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scores */}
      {scores && (
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Performance Scores</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Clarity", value: scores.clarity },
              { label: "Conciseness", value: scores.conciseness },
              { label: "Message Alignment", value: scores.message_alignment },
              { label: "Audience Relevance", value: scores.audience_relevance },
              { label: "CTA Strength", value: scores.cta_strength },
              { label: "Overall", value: scores.overall },
            ].map((score) => (
              <div
                key={score.label}
                className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <span className="text-xs text-zinc-500">{score.label}</span>
                <div
                  className={`text-xl font-bold ${
                    score.value >= 7
                      ? "text-green-600"
                      : score.value >= 5
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {score.value?.toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          {scores.explanations && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium">Explanations</h3>
              {Object.entries(
                scores.explanations as Record<string, string>
              ).map(([key, explanation]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {explanation}
                  </span>
                </div>
              ))}
            </div>
          )}

          {scores.suggestions &&
            Array.isArray(scores.suggestions) &&
            scores.suggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium">Suggestions</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                  {(scores.suggestions as string[]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Context Snapshot */}
      {content.context_snapshot && (
        <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium text-zinc-500">
            Context used for generation
          </summary>
          <pre className="mt-2 overflow-auto text-xs text-zinc-500">
            {JSON.stringify(content.context_snapshot, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
