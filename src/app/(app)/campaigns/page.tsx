import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, description, status, channels, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <Link
          href="/campaigns/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Campaign
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600">Failed to load campaigns.</p>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <h3 className="text-sm font-medium">No campaigns</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Get started by creating your first campaign.
          </p>
          <Link
            href="/campaigns/new"
            className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold">{campaign.name}</h3>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {campaign.status}
                </span>
              </div>
              {campaign.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                  {campaign.description}
                </p>
              )}
              {campaign.channels && campaign.channels.length > 0 && (
                <div className="mt-3 flex gap-1.5">
                  {campaign.channels.map((ch: string) => (
                    <span
                      key={ch}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
