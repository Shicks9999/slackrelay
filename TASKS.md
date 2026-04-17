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
- [ ] Scoring service (`src/services/scoring.ts`)
- [ ] Score display components
- [ ] LinkedIn Growth engine (`src/engines/linkedin-growth.ts`)
- [ ] Content list/detail views with version history
- [ ] Basic dashboard with campaign stats

### Week 4: Basic Slack Integration
- [ ] Migration 00009 (slack_installations, channel_mappings, command_log)
- [ ] Slack app setup (OAuth, signature verification)
- [ ] `/generate-content` slash command
- [ ] `/improve-message` slash command
- [ ] Block Kit message formatting
- [ ] Interactive actions (approve/save)

---

## Phase 2 — Differentiation (Weeks 5-8)

### Week 5: Knowledge Base
- [ ] Migration 00006 (knowledge_documents, knowledge_chunks)
- [ ] File upload to Supabase Storage
- [ ] Ingestion pipeline (extract text, chunk, embed)
- [ ] Semantic search RPC function
- [ ] Knowledge UI (upload, document list)
- [ ] Context Engine v2 — add knowledge retrieval

### Week 6: Remaining Engines
- [ ] Product Marketing engine
- [ ] Email Campaign engine
- [ ] Sales Enablement engine
- [ ] Engine selector UI
- [ ] Engine-specific output formatting

### Week 7: Full Slack Integration
- [ ] `/review-copy` command
- [ ] `/create-campaign` command (modal)
- [ ] `/summarize-thread` command
- [ ] Event handling (app_mention)
- [ ] Approval workflow via Slack actions
- [ ] Channel mapping configuration

### Week 8: Context Engine v3 + Polish
- [ ] Historical examples in context
- [ ] Token optimization and budget management
- [ ] Context snapshot storage for reproducibility
- [ ] Fallback logic implementation
- [ ] Content version history UI

---

## Phase 3 — Moat (Weeks 9-12)

### Week 9: Collaboration
- [ ] Migration 00007 (comments, approvals)
- [ ] Comment threads on content items
- [ ] Inline suggestions
- [ ] Approval workflow (web UI)
- [ ] Realtime updates via Supabase Realtime

### Week 10: Analytics
- [ ] Migration 00008 (usage_events, campaign_stats view)
- [ ] Usage event tracking
- [ ] Campaign progress dashboard
- [ ] Content gap analysis
- [ ] AI-generated suggested next actions

### Week 11: Advanced Slack Workflows
- [ ] Scheduled content delivery to channels
- [ ] Content idea capture from channels
- [ ] Weekly campaign digest messages

### Week 12: Performance + Polish
- [ ] Response time optimization (caching)
- [ ] Prompt optimization based on scoring data
- [ ] UI polish (loading states, error handling, empty states)
- [ ] Documentation
