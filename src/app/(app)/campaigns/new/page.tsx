"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CHANNEL_OPTIONS = ["slack", "linkedin", "email", "blog", "social"];
const FUNNEL_OPTIONS = ["awareness", "consideration", "decision", "retention"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [funnelStages, setFunnelStages] = useState<string[]>([]);

  function toggleItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Get user's team_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      setError("No team found. Please set up your team first.");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        team_id: profile.team_id,
        created_by: user.id,
        name,
        description: description || null,
        goal: goal || null,
        target_audience: targetAudience || null,
        channels,
        funnel_stages: funnelStages,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      router.push(`/campaigns/${data.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New Campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Campaign name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Q3 Product Launch"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Brief overview of this campaign..."
          />
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <label htmlFor="goal" className="text-sm font-medium">
            Campaign goal
          </label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Drive awareness and signups for the new feature..."
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <label htmlFor="audience" className="text-sm font-medium">
            Target audience
          </label>
          <input
            id="audience"
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Enterprise marketing teams"
          />
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Channels</span>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannels(toggleItem(channels, ch))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  channels.includes(ch)
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Funnel Stages */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Funnel stages</span>
          <div className="flex flex-wrap gap-2">
            {FUNNEL_OPTIONS.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setFunnelStages(toggleItem(funnelStages, stage))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  funnelStages.includes(stage)
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Creating..." : "Create Campaign"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
