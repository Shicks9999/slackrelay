# CLAUDE.md — SlackRelay

## What This Is

SlackRelay is an AI Content Operating System for Slack marketing teams. Campaign-first, Slack-native, context-aware. Not a generic AI writing tool.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js route handlers + server actions
- **Database**: Supabase Postgres + pgvector
- **Auth**: Supabase Auth (email/password, OAuth callback at `/callback`)
- **Storage**: Supabase Storage
- **AI**: Provider abstraction — Claude (primary), OpenAI (secondary)
- **Slack**: Slack API (slash commands, events, actions, OAuth)
- **Deploy**: Vercel

## Project Structure

```
src/
  app/              # Next.js App Router pages
    (auth)/         # Login, signup, callback (unauthenticated)
    (app)/          # All authenticated pages (sidebar layout)
    api/            # Route handlers (Slack, content, knowledge)
  lib/              # Infrastructure clients
    supabase/       # Browser, server, admin clients
    ai/             # AI provider abstraction
    slack/          # Slack client, verify, blocks, commands
  services/         # Business logic (campaigns, messaging, context-engine, scoring, etc.)
  engines/          # Content engines (slack-launch, linkedin-growth, etc.)
  components/       # React components by domain
  hooks/            # React hooks
  types/            # TypeScript type definitions
supabase/
  migrations/       # Sequential SQL migrations (00001-00009)
```

## Architecture Decisions

- **Monolith**: Single Next.js app. No microservices.
- **Server actions for CRUD**: Authenticated operations use server actions, not REST.
- **Route handlers for external callers**: Slack commands, webhooks, knowledge ingestion use `/api/` routes.
- **Context Engine** (`src/services/context-engine.ts`): Core differentiator. Assembles campaign + messaging + knowledge + history into every AI call. Token-budgeted with priority-based truncation.
- **Separate scoring calls**: Content is scored by a separate AI call, not self-scored by the generator.
- **Content engines extend a base class**: `src/engines/base-engine.ts`
- **RLS on all tables**: Team-level isolation via `profiles.team_id`.

## Key Patterns

- `createClient()` from `@/lib/supabase/server` for server components
- `createClient()` from `@/lib/supabase/client` for client components
- `createAdminClient()` from `@/lib/supabase/admin` for service-role operations
- Auth middleware in `middleware.ts` — protects all routes except `/login`, `/signup`, `/callback`, `/api/slack/*`, `/api/webhooks/*`
- Path alias: `@/*` maps to `./src/*`

## Database

- Migrations in `supabase/migrations/` — numbered sequentially
- Enums: `campaign_status`, `content_status`, `engine_type`
- All tables have `created_at`, most have `updated_at`
- JSONB used for flexible structured data (audience_persona, brand_voice, body, context_snapshot, etc.)
- pgvector HNSW index on `knowledge_chunks.embedding`

## Conventions

- TypeScript strict mode
- Tailwind for all styling — no CSS modules
- Components organized by domain under `src/components/`
- Types in `src/types/` — one file per domain
- Services in `src/services/` — one file per domain
- Minimal dependencies — don't add packages without justification

## Commit Message Format

```
type: Short description

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>
```
