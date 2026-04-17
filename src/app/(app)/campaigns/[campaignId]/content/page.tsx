import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props {
  params: Promise<{ campaignId: string }>;
}

const ENGINE_LABELS: Record<string, string> = {
  slack_launch: "Slack Launch",
  linkedin_growth: "LinkedIn Growth",
  product_marketing: "Product Marketing",
  email_campaign: "Email Campaign",
  sales_enablement: "Sales Enablement",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  published: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default async function CampaignContentPage({ params }: Props) {
  const { campaignId } = await params;
  const supabase = await createClient();

  const { data: contentItems } = await supabase
    .from("content_items")
    .select("id, title, engine, status, channel, version, parent_id, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  // Load scores for all items
  const contentIds = (contentItems ?? []).map((c) => c.id);
  const { data: scores } = contentIds.length > 0
    ? await supabase
        .from("content_scores")
        .select("content_id, overall")
        .in("content_id", contentIds)
    : { data: [] };

  const scoreMap = new Map((scores ?? []).map((s) => [s.content_id, s.overall]));

  // Group by root content (items without parent_id are roots, items with parent_id are versions)
  const roots: typeof contentItems = [];
  const children = new Map<string, NonNullable<typeof contentItems>>();

  for (const item of contentItems ?? []) {
    if (!item.parent_id) {
      roots.push(item);
    } else {
      const siblings = children.get(item.parent_id) ?? [];
      siblings.push(item);
      children.set(item.parent_id, siblings);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <Link
          href={`/engines/slack_launch`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Generate Content
        </Link>
      </div>

      {!contentItems || contentItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <h3 className="text-sm font-medium">No content yet</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Use a content engine to generate your first piece of content.
          </p>
          <Link
            href="/engines"
            className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Browse Engines
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {roots.map((item) => {
            const versions = children.get(item.id) ?? [];
            const score = scoreMap.get(item.id);
            return (
              <div key={item.id}>
                <Link
                  href={`/campaigns/${campaignId}/content/${item.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? STATUS_COLORS.draft}`}
                      >
                        {item.status}
                      </span>
                      {score !== undefined && (
                        <span
                          className={`text-xs font-medium ${
                            score >= 7
                              ? "text-green-600"
                              : score >= 5
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {score.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex gap-3 text-xs text-zinc-500">
                      <span>{ENGINE_LABELS[item.engine] ?? item.engine}</span>
                      {item.channel && <span>#{item.channel}</span>}
                      <span>v{item.version}</span>
                      {versions.length > 0 && (
                        <span className="text-zinc-400">
                          {versions.length} revision{versions.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </Link>
                {/* Version history */}
                {versions.length > 0 && (
                  <div className="border-t border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-950/50">
                    {versions.map((ver) => {
                      const verScore = scoreMap.get(ver.id);
                      return (
                        <Link
                          key={ver.id}
                          href={`/campaigns/${campaignId}/content/${ver.id}`}
                          className="flex items-center justify-between px-4 py-2 pl-8 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">v{ver.version}</span>
                            <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                              {ver.title}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ver.status] ?? STATUS_COLORS.draft}`}
                            >
                              {ver.status}
                            </span>
                            {verScore !== undefined && (
                              <span
                                className={`text-xs font-medium ${
                                  verScore >= 7
                                    ? "text-green-600"
                                    : verScore >= 5
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }`}
                              >
                                {verScore.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400">
                            {new Date(ver.created_at).toLocaleDateString()}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
