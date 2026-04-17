import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch campaigns, content counts, and average scores in parallel
  const [campaignsResult, contentResult, scoresResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("content_items")
      .select("id, campaign_id, engine, status, created_at"),
    supabase
      .from("content_scores")
      .select("overall"),
  ]);

  const campaigns = campaignsResult.data ?? [];
  const contentItems = contentResult.data ?? [];
  const scores = scoresResult.data ?? [];

  // Compute stats
  const activeCampaigns = campaigns.filter(
    (c) => c.status === "active" || c.status === "planning"
  ).length;
  const totalContent = contentItems.length;
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.overall ?? 0), 0) / scores.length
      : null;

  // Content by engine
  const engineCounts: Record<string, number> = {};
  for (const item of contentItems) {
    engineCounts[item.engine] = (engineCounts[item.engine] ?? 0) + 1;
  }

  // Content per campaign (for the campaign list)
  const campaignContentCounts: Record<string, number> = {};
  for (const item of contentItems) {
    campaignContentCounts[item.campaign_id] =
      (campaignContentCounts[item.campaign_id] ?? 0) + 1;
  }

  const ENGINE_LABELS: Record<string, string> = {
    slack_launch: "Slack Launch",
    linkedin_growth: "LinkedIn Growth",
    product_marketing: "Product Marketing",
    email_campaign: "Email Campaign",
    sales_enablement: "Sales Enablement",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Link
          href="/campaigns/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Campaign
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Campaigns" value={campaigns.length} />
        <StatCard label="Active / Planning" value={activeCampaigns} />
        <StatCard label="Content Generated" value={totalContent} />
        <StatCard
          label="Avg Score"
          value={avgScore !== null ? avgScore.toFixed(1) : "—"}
          subtitle={scores.length > 0 ? `${scores.length} scored` : "No scores yet"}
        />
      </div>

      {/* Content by Engine */}
      {Object.keys(engineCounts).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Content by Engine</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(engineCounts).map(([engine, count]) => (
              <div
                key={engine}
                className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800"
              >
                <span className="text-sm font-medium">
                  {ENGINE_LABELS[engine] ?? engine}
                </span>
                <span className="ml-2 text-sm text-zinc-500">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Campaigns */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Recent Campaigns</h2>
        {campaignsResult.error ? (
          <p className="text-sm text-red-600">Failed to load campaigns.</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500">No campaigns yet.</p>
            <Link
              href="/campaigns/new"
              className="mt-2 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{campaign.name}</span>
                  {(campaignContentCounts[campaign.id] ?? 0) > 0 && (
                    <span className="text-xs text-zinc-400">
                      {campaignContentCounts[campaign.id]} content
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {campaign.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
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
