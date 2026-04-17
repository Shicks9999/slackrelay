import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const PURPOSE_LABELS: Record<string, string> = {
  content_delivery: "Content Delivery",
  review: "Review & Approval",
  notifications: "Notifications",
};

export default async function SettingsPage() {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  let installation: { slack_team_name: string; slack_team_id: string; scopes: string[]; created_at: string } | null = null;
  let mappings: { id: string; slack_channel_id: string; slack_channel_name: string | null; campaign_id: string | null; purpose: string }[] = [];

  if (skipAuth) {
    const admin = createAdminClient();
    const { data: inst } = await admin
      .from("slack_installations")
      .select("slack_team_name, slack_team_id, scopes, created_at")
      .limit(1)
      .single();
    installation = inst;

    if (inst) {
      const { data: maps } = await admin
        .from("slack_channel_mappings")
        .select("id, slack_channel_id, slack_channel_name, campaign_id, purpose")
        .order("created_at", { ascending: false });
      mappings = maps ?? [];
    }
  } else {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .single();

    if (profile?.team_id) {
      const { data: inst } = await supabase
        .from("slack_installations")
        .select("slack_team_name, slack_team_id, scopes, created_at")
        .eq("team_id", profile.team_id)
        .single();
      installation = inst;

      const { data: maps } = await supabase
        .from("slack_channel_mappings")
        .select("id, slack_channel_id, slack_channel_name, campaign_id, purpose")
        .order("created_at", { ascending: false });
      mappings = maps ?? [];
    }
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {/* Slack Connection */}
      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Slack Integration</h2>

        {installation ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                Connected
              </span>
              <span className="text-sm font-medium">
                {installation.slack_team_name ?? installation.slack_team_id}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Installed {new Date(installation.created_at).toLocaleDateString()}
              {" · "}
              {installation.scopes.length} scopes
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-zinc-500">
              Connect your Slack workspace to use slash commands and content
              delivery.
            </p>
            {clientId ? (
              <a
                href={`https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=commands,chat:write,app_mentions:read&redirect_uri=${encodeURIComponent(`${appUrl}/api/slack/oauth`)}`}
                className="mt-3 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Add to Slack
              </a>
            ) : (
              <p className="mt-2 text-sm text-yellow-600">
                SLACK_CLIENT_ID not configured. Set it in your environment variables.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Channel Mappings */}
      {installation && (
        <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Channel Mappings</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Map Slack channels to campaigns for targeted content delivery.
          </p>

          {mappings.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              No channel mappings configured. Mappings will be created when you
              associate Slack channels with campaigns.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium">
                      #{mapping.slack_channel_name ?? mapping.slack_channel_id}
                    </span>
                    <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {PURPOSE_LABELS[mapping.purpose] ?? mapping.purpose}
                    </span>
                  </div>
                  {mapping.campaign_id && (
                    <Link
                      href={`/campaigns/${mapping.campaign_id}`}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      View campaign
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Available Commands */}
      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Available Slash Commands</h2>
        <div className="mt-4 space-y-3">
          {[
            { cmd: "/generate-content", desc: "Generate campaign content using any engine" },
            { cmd: "/improve-message", desc: "Rewrite a message to be clearer and more engaging" },
            { cmd: "/review-copy", desc: "Score copy on 5 quality dimensions" },
            { cmd: "/create-campaign", desc: "Create a new campaign from Slack" },
            { cmd: "/summarize-thread", desc: "Summarize a thread with decisions and action items" },
          ].map((item) => (
            <div key={item.cmd} className="text-sm">
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
                {item.cmd}
              </code>
              <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
