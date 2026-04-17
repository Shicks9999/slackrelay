import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    notFound();
  }

  const tabs = [
    { label: "Overview", href: `/campaigns/${campaignId}`, active: true },
    { label: "Messaging", href: `/campaigns/${campaignId}/messaging` },
    { label: "Content", href: `/campaigns/${campaignId}/content` },
    { label: "Knowledge", href: `/campaigns/${campaignId}/knowledge` },
    { label: "Analytics", href: `/campaigns/${campaignId}/analytics` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {campaign.name}
            </h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {campaign.status}
            </span>
          </div>
          {campaign.description && (
            <p className="mt-1 text-sm text-zinc-500">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab.active
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Campaign Details */}
      <div className="grid gap-6 sm:grid-cols-2">
        {campaign.goal && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-xs font-medium uppercase text-zinc-500">
              Goal
            </h3>
            <p className="mt-1 text-sm">{campaign.goal}</p>
          </div>
        )}

        {campaign.target_audience && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-xs font-medium uppercase text-zinc-500">
              Target Audience
            </h3>
            <p className="mt-1 text-sm">{campaign.target_audience}</p>
          </div>
        )}

        {campaign.channels && campaign.channels.length > 0 && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-xs font-medium uppercase text-zinc-500">
              Channels
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {campaign.channels.map((ch: string) => (
                <span
                  key={ch}
                  className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        )}

        {campaign.funnel_stages && campaign.funnel_stages.length > 0 && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-xs font-medium uppercase text-zinc-500">
              Funnel Stages
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {campaign.funnel_stages.map((stage: string) => (
                <span
                  key={stage}
                  className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                >
                  {stage}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
