import Link from "next/link";

const engines = [
  {
    type: "slack_launch",
    name: "Slack Campaign Launch",
    description:
      "Generate Slack announcements with channel variants, bullet points, and thread follow-ups.",
    status: "available" as const,
  },
  {
    type: "linkedin_growth",
    name: "LinkedIn Growth",
    description:
      "Create LinkedIn posts with hooks, hashtags, A/B variants, and carousel slides.",
    status: "coming_soon" as const,
  },
  {
    type: "product_marketing",
    name: "Product Marketing",
    description:
      "Generate one-pagers, battle cards, feature briefs, and competitive comparisons.",
    status: "coming_soon" as const,
  },
  {
    type: "email_campaign",
    name: "Email Campaign",
    description:
      "Create email sequences with subject lines, preview text, and personalization.",
    status: "coming_soon" as const,
  },
  {
    type: "sales_enablement",
    name: "Sales Enablement",
    description:
      "Build objection handlers, discovery questions, talk tracks, and email templates.",
    status: "coming_soon" as const,
  },
];

export default function EnginesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Content Engines
      </h1>
      <p className="text-sm text-zinc-500">
        Select an engine to generate campaign content. Each engine is optimized
        for a specific channel and content type.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {engines.map((engine) => (
          <div
            key={engine.type}
            className={`rounded-lg border p-5 ${
              engine.status === "available"
                ? "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                : "border-zinc-100 opacity-60 dark:border-zinc-900"
            }`}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold">{engine.name}</h3>
              {engine.status === "coming_soon" && (
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{engine.description}</p>
            {engine.status === "available" && (
              <Link
                href={`/engines/${engine.type}`}
                className="mt-3 inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Generate Content
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
