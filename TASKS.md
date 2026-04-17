# TASKS.md — SlackRelay Roadmap

## Phase 1 — MVP (Weeks 1-4)

### Week 1: Foundation
- [x] Project scaffolding (Next.js + TypeScript + Tailwind)
- [x] Supabase client setup (browser, server, admin)
- [x] Auth flow (login, signup, callback, middleware)
- [x] App layout shell (sidebar, header)
- [x] Type definitions (campaign, messaging, content, engine, scoring, slack)
- [x] Database migrations 00001-00003 (extensions, profiles/teams, campaigns)
- [x] Campaign CRUD (list, create, detail)
- [x] CLAUDE.md and TASKS.md
- [ ] shadcn/ui setup
- [x] Verify full build passes

### Week 2: Messaging + First Engine
- [x] Migration 00004 (messaging_frameworks, pillars, value_propositions, key_messages)
- [x] Migration 00005 (content_items, content_scores)
- [x] Messaging framework CRUD UI
- [x] AI provider abstraction (`src/lib/ai/provider.ts`)
- [x] Claude AI implementation (`src/lib/ai/claude.ts`)
- [x] Context Engine v1 — campaign + messaging only (`src/services/context-engine.ts`)
- [x] Base engine class (`src/engines/base-engine.ts`)
- [x] Slack Launch engine (`src/engines/slack-launch.ts`)
- [x] Content generation flow (web UI)
- [x] Engine registry + engine selector page
- [x] Content list + content detail pages
- [x] API route: POST /api/content/generate

### Week 3: Scoring + Second Engine
- [x] Scoring service (`src/services/scoring.ts`)
- [x] Score button + display on content detail page
- [x] LinkedIn Growth engine (`src/engines/linkedin-growth.ts`)
- [x] Content detail view with LinkedIn rendering
- [x] Dashboard with campaign stats, content counts, avg scores
- [x] Migration 00006 (unique constraint on content_scores)
- [x] API route: POST /api/content/score

### Week 4: Basic Slack Integration
- [x] Migration 00007 (slack_installations, channel_mappings, command_log)
- [x] Slack client (`src/lib/slack/client.ts`)
- [x] Signature verification (`src/lib/slack/verify.ts`)
- [x] Block Kit builder (`src/lib/slack/blocks.ts`)
- [x] `/generate-content` slash command
- [x] `/improve-message` slash command
- [x] Interactive actions (approve/reject via Slack)
- [x] OAuth flow (`/api/slack/oauth`)

---

## Phase 2 — Differentiation (Weeks 5-8)

### Week 5: Knowledge Base
- [x] Migration 00008 (knowledge_documents, knowledge_chunks, search RPC)
- [x] Types (`src/types/knowledge.ts`)
- [x] Embeddings service (`src/lib/ai/embeddings.ts`)
- [x] Knowledge service — chunking, embedding, search (`src/services/knowledge.ts`)
- [x] File upload API (`/api/knowledge/upload`)
- [x] Semantic search API (`/api/knowledge/search`)
- [x] Knowledge UI (upload form, document list)
- [x] Context Engine v2 — knowledge retrieval integrated

### Week 6: Remaining Engines
- [x] Product Marketing engine (`src/engines/product-marketing.ts`)
- [x] Email Campaign engine (`src/engines/email-campaign.ts`)
- [x] Sales Enablement engine (`src/engines/sales-enablement.ts`)
- [x] All 5 engines registered in registry
- [x] Engine-specific output formatting for all types on content detail page

### Week 7: Full Slack Integration
- [x] `/review-copy` command (scores copy on 5 dimensions)
- [x] `/create-campaign` command (creates campaign from Slack)
- [x] `/summarize-thread` command (AI summary with decisions + action items)
- [x] Event handling (`app_mention` — conversational AI responses)
- [x] Settings page with Slack connection status + channel mappings
- [x] Available commands reference on settings page

### Week 8: Context Engine v3 + Polish
- [x] Historical examples in context (loads high-scoring approved content)
- [x] Context Engine v3 — 7-priority token-budgeted assembly
- [x] Context snapshots stored on every content generation
- [x] Content version history UI (parent/child tree, scores on list)

---

## Phase 3 — Moat (Weeks 9-12)

### Week 9: Collaboration
- [x] Migration 00009 (content_comments, content_approvals)
- [x] Comment threads on content items (with reply support)
- [x] AI-generated inline suggestions
- [x] Approval workflow (request, approve, reject, changes requested)
- [x] Approval + comment panels on content detail page
- [x] API routes: comments CRUD, approvals CRUD, AI suggestions

### Week 10: Analytics
- [x] Migration 00010 (usage_events, campaign_stats view)
- [x] Analytics service with event tracking + content gap analysis
- [x] Analytics page: top-level stats, engine usage, campaign progress
- [x] Content gap analysis (shows missing engine coverage per campaign)
- [x] AI-generated suggested next actions API endpoint
- [x] Recent activity feed

### Week 11: Advanced Slack Workflows
- [x] Content delivery to mapped channels on approval
- [x] `/capture-idea` slash command for content idea capture
- [x] Weekly campaign digest service + cron API endpoint
- [x] Slack workflows service (`src/services/slack-workflows.ts`)

### Week 12: Performance + Polish
- [x] In-memory cache with TTL (`src/lib/cache.ts`)
- [x] Loading UI: spinner, skeleton, page loading components
- [x] Error boundary component
- [x] Empty state component
- [x] Loading.tsx for dashboard, campaigns, analytics, knowledge
- [x] Global error page for app routes
