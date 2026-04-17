import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ENGINE_LABELS: Record<string, string> = {
  slack_launch: "Slack Launch",
  linkedin_growth: "LinkedIn Growth",
  product_marketing: "Product Marketing",
  email_campaign: "Email Campaign",
  sales_enablement: "Sales Enablement",
};

export default async function AnalyticsPage() {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const supabase = skipAuth ? createAdminClient() : await createClient();

  // Load campaign stats
  const { data: stats } = await supabase
    .from("campaign_stats")
    .select("*")
    .order("campaign_created_at", { ascending: false });

  // Load recent events
  const { data: recentEvents } = await supabase
    .from("usage_events")
    .select("event_type, entity_type, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Aggregate totals
  const campaignStats = (stats ?? []) as {
    campaign_id: string;
    campaign_name: string;
    campaign_status: string;
    content_count: number;
    approved_count: number;
    draft_count: number;
    scored_count: number;
    avg_score: number;
    engine_count: number;
    engines_used: string[] | null;
    last_content_at: string | null;
  }[];

  const totalContent = campaignStats.reduce((s, c) => s + c.content_count, 0);
  const totalApproved = campaignStats.reduce((s, c) => s + c.approved_count, 0);
  const totalScored = campaignStats.reduce((s, c) => s + c.scored_count, 0);
  const avgScore =
    totalScored > 0
      ? campaignStats.reduce((s, c) => s + c.avg_score * c.scored_count, 0) /
        totalScored
      : 0;

  // Engine usage across all campaigns
  const engineUsage: Record<string, number> = {};
  for (const c of campaignStats) {
    for (const engine of c.engines_used ?? []) {
      engineUsage[engine] = (engineUsage[engine] ?? 0) + 1;
    }
  }

  // Approval rate
  const approvalRate =
    totalContent > 0
      ? Math.round((totalApproved / totalContent) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      {/* Top-level Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Campaigns" value={campaignStats.length} />
        <StatCard label="Total Content" value={totalContent} />
        <StatCard label="Approved" value={totalApproved} subtitle={`${approvalRate}% approval rate`} />
        <StatCard label="Scored" value={totalScored} />
        <StatCard
          label="Avg Score"
          value={avgScore > 0 ? avgScore.toFixed(1) : "—"}
          subtitle={totalScored > 0 ? "out of 10" : "No scores"}
        />
      </div>

      {/* Engine Usage */}
      {Object.keys(engineUsage).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Engine Usage</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(engineUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([engine, count]) => (
                <div
                  key={engine}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <p className="text-sm font-medium">
                    {ENGINE_LABELS[engine] ?? engine}
                  </p>
                  <p className="text-xl font-semibold">{count}</p>
                  <p className="text-xs text-zinc-400">campaigns</p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Campaign Progress */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Campaign Progress</h2>
        {campaignStats.length === 0 ? (
          <p className="text-sm text-zinc-500">No campaigns yet.</p>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {campaignStats.map((c) => (
              <Link
                key={c.campaign_id}
                href={`/campaigns/${c.campaign_id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.campaign_name}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {c.campaign_status}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                    <span>{c.content_count} content</span>
                    <span>{c.approved_count} approved</span>
                    <span>{c.draft_count} drafts</span>
                    {c.avg_score > 0 && (
                      <span
                        className={
                          c.avg_score >= 7
                            ? "text-green-600"
                            : c.avg_score >= 5
                              ? "text-yellow-600"
                              : "text-red-600"
                        }
                      >
                        avg {c.avg_score.toFixed(1)}/10
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {c.content_count > 0 && (
                    <div className="mt-2 h-1.5 w-48 rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{
                          width: `${Math.round((c.approved_count / c.content_count) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(c.engines_used ?? []).map((engine) => (
                    <span
                      key={engine}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800"
                    >
                      {ENGINE_LABELS[engine]?.split(" ")[0] ?? engine}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Content Gap Analysis */}
      <ContentGapSection campaignStats={campaignStats} />

      {/* Recent Activity */}
      {recentEvents && recentEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Recent Activity</h2>
          <div className="space-y-1">
            {recentEvents.map((event, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {formatEventType(event.event_type)}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}

function ContentGapSection({
  campaignStats,
}: {
  campaignStats: {
    campaign_id: string;
    campaign_name: string;
    content_count: number;
    engines_used: string[] | null;
  }[];
}) {
  const allEngines = Object.keys(ENGINE_LABELS);
  const gaps: { campaign: string; campaignId: string; missing: string[] }[] = [];

  for (const c of campaignStats) {
    const used = new Set(c.engines_used ?? []);
    const missing = allEngines.filter((e) => !used.has(e));
    if (missing.length > 0 && c.content_count > 0) {
      gaps.push({
        campaign: c.campaign_name,
        campaignId: c.campaign_id,
        missing,
      });
    }
  }

  if (gaps.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Content Gaps</h2>
      <p className="text-sm text-zinc-500">
        Campaigns that haven&apos;t used all available engines.
      </p>
      <div className="space-y-2">
        {gaps.map((gap) => (
          <div
            key={gap.campaignId}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <Link
              href={`/campaigns/${gap.campaignId}`}
              className="text-sm font-medium hover:underline"
            >
              {gap.campaign}
            </Link>
            <div className="mt-1 flex flex-wrap gap-1">
              {gap.missing.map((engine) => (
                <Link
                  key={engine}
                  href={`/engines/${engine}`}
                  className="rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300"
                >
                  + {ENGINE_LABELS[engine]}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    "content.generated": "Content generated",
    "content.scored": "Content scored",
    "content.approved": "Content approved",
    "content.rejected": "Content rejected",
    "campaign.created": "Campaign created",
    "campaign.updated": "Campaign updated",
    "knowledge.uploaded": "Document uploaded",
    "knowledge.ingested": "Document ingested",
    "slack.command": "Slack command used",
    "comment.created": "Comment posted",
    "approval.requested": "Approval requested",
    "approval.decided": "Approval decided",
  };
  return labels[type] ?? type;
}
