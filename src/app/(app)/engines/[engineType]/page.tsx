"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EngineType } from "@/types/engine";

interface Campaign {
  id: string;
  name: string;
}

interface GenerationResult {
  contentId: string;
  output: {
    title: string;
    body: Record<string, unknown>;
    plainText: string;
  };
  tokensUsed: number;
}

// Engine input schemas (client-side mirror of server schemas)
const ENGINE_SCHEMAS: Record<
  string,
  { name: string; fields: { name: string; label: string; type: string; options?: { label: string; value: string }[]; placeholder?: string }[] }
> = {
  slack_launch: {
    name: "Slack Campaign Launch",
    fields: [
      {
        name: "launchType",
        label: "Launch type",
        type: "select",
        options: [
          { label: "Product Launch", value: "product_launch" },
          { label: "Feature Update", value: "feature_update" },
          { label: "Company News", value: "company_news" },
          { label: "Event", value: "event" },
          { label: "Initiative", value: "initiative" },
        ],
      },
      {
        name: "targetChannels",
        label: "Target Slack channels",
        type: "text",
        placeholder: "#general, #product, #engineering",
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        options: [
          { label: "Routine", value: "routine" },
          { label: "Important", value: "important" },
          { label: "Critical", value: "critical" },
        ],
      },
      {
        name: "maxLength",
        label: "Length",
        type: "select",
        options: [
          { label: "Short (1-2 paragraphs)", value: "short" },
          { label: "Medium (3-4 paragraphs)", value: "medium" },
          { label: "Detailed (5+)", value: "detailed" },
        ],
      },
      {
        name: "cta",
        label: "Call to action",
        type: "text",
        placeholder: "Sign up for the beta",
      },
    ],
  },
};

export default function EngineGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const engineType = params.engineType as string;

  const schema = ENGINE_SCHEMAS[engineType];

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [prompt, setPrompt] = useState("");
  const [engineParams, setEngineParams] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    async function loadCampaigns() {
      const supabase = createClient();
      const { data } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("created_at", { ascending: false });
      setCampaigns(data ?? []);
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    }
    loadCampaigns();
  }, []);

  if (!schema) {
    return (
      <div className="text-sm text-zinc-500">
        Engine &quot;{engineType}&quot; is not yet available.
      </div>
    );
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaign || !prompt) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          engineType: engineType as EngineType,
          prompt,
          params: engineParams,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {schema.name}
        </h1>
        <button
          onClick={() => router.push("/engines")}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Back to engines
        </button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Campaign Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Campaign *</label>
          {campaigns.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No campaigns found.{" "}
              <a href="/campaigns/new" className="underline">
                Create one first.
              </a>
            </p>
          ) : (
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            What do you want to generate? *
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Describe what you need..."
          />
        </div>

        {/* Engine-specific fields */}
        {schema.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            {field.type === "select" && field.options ? (
              <select
                value={engineParams[field.name] ?? ""}
                onChange={(e) =>
                  setEngineParams({
                    ...engineParams,
                    [field.name]: e.target.value,
                  })
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select...</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={engineParams[field.name] ?? ""}
                onChange={(e) =>
                  setEngineParams({
                    ...engineParams,
                    [field.name]: e.target.value,
                  })
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={generating || !selectedCampaign || !prompt}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {generating ? "Generating..." : "Generate Content"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Generated Content</h2>
            <span className="text-xs text-zinc-400">
              {result.tokensUsed} tokens used
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">{result.output.title}</h3>

            {result.output.body && (() => {
              const body = result.output.body as {
                body?: string;
                bulletPoints?: string[];
                cta?: string;
                threadFollowUp?: string;
              };
              return (
                <div className="space-y-3">
                  {body.body && (
                    <div className="whitespace-pre-wrap text-sm">
                      {body.body}
                    </div>
                  )}

                  {body.bulletPoints && body.bulletPoints.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {body.bulletPoints.map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                  )}

                  {body.cta && (
                    <div className="rounded bg-zinc-50 p-3 text-sm font-medium dark:bg-zinc-900">
                      CTA: {body.cta}
                    </div>
                  )}

                  {body.threadFollowUp && (
                    <div className="border-l-2 border-zinc-300 pl-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                      <span className="text-xs font-medium uppercase text-zinc-400">
                        Thread follow-up:
                      </span>
                      <br />
                      {body.threadFollowUp}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              onClick={() =>
                router.push(
                  `/campaigns/${selectedCampaign}/content`
                )
              }
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              View in Campaign
            </button>
            <button
              onClick={() => {
                setResult(null);
                setPrompt("");
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
