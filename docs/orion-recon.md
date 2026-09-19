# ORION PHASE 0 — RECONNAISSANCE & AUDIT REPORT
**Document ID:** `DOC-ORION-RECON-V1`  
**Date:** September 16, 2026  
**Target Repository:** `c:\Users\SUDO\Documents\Pseudonyms`  
**Status:** Complete Audit — Ready for Phase 1 Foundation  
**Primary Architect:** Antigravity AI  

---

## 1. Current Tech Stack

| Layer | Technology | Current Workspace Location | Status |
| :--- | :--- | :--- | :--- |
| **Monorepo** | Turborepo / npm workspaces | Root (`/`) and Sub-repo (`/Orion`) | Dual workspace configuration |
| **Mobile Client** | Expo SDK 51 (React Native 0.81.5), React 19, Expo Router, `@shopify/react-native-skia` (2.2.12), `react-native-reanimated` (4.1.1), `zustand`, `immer` | `/Orion/apps/mobile` | Solid UI shell & fluid Skia visualizers |
| **Server Runtime** | Node.js (v20+), Express 4.21, `tsx`, `typescript` | `/Orion/apps/server` | Express API on port 3005 |
| **Local Database** | SQLite 3 (`sqlite3` / `sqlite` package), `william.db` | `/Orion/apps/server/william.db` | Active file database |
| **Cloud Database** | PostgreSQL via Supabase (`@supabase/supabase-js` 2.48), `pgvector` | Root `supabase/` and Cloud | Dual-project discrepancy identified |
| **Context Graph** | Python 3.11, FastAPI, SQLModel, FastMCP, ChromaDB | `/Metaphor/backend` | Live on port 8000 |
| **Web Clients** | Vite 8, React 19, Framer Motion | `/Orion/apps/web`, `/Orion/apps/web-v2` | Secondary desktop shells |
| **AI Runtime** | Google Gemini (1.5/2.0), Claude, OpenAI via `BrainGateway` | `/Orion/apps/server/src/services/brainGateway.ts` | Multi-provider fallback & streaming |

---

## 2. Existing Architecture Overview

```
                                  USER (Ben)
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
         ORION MOBILE CLIENT                     ORION WEB CLIENT
         (Expo / Skia / Reanimated)             (Vite / React 19)
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │ HTTP / SSE
                                      ▼
                              ORION SERVER (:3005)
                        Express + Tsx + BrainGateway
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   LOCAL STORAGE LAYER         HYBRID SYNC BUS            EXTERNAL SERVICES
   - SQLite (william.db)       - Supabase Postgres        - Metaphor (:8000)
   - In-memory graph           - Realtime broadcast       - Atlas Webhook
                                                          - Clario Buckets
```

- **Client Layer (`/Orion/apps/mobile`):** Implements an Expo Router structure with advanced gesture handling, animated breathing/zooming orbs (`CommandOrb.tsx`), Skia particle shaders (`ParticleSphere.tsx`), voice input listeners, and handoff listeners.
- **Server Layer (`/Orion/apps/server`):** Houses an Express application containing:
  - Atlas webhook listener (`POST /api/webhooks/atlas`)
  - Metaphor context synchronization poller (runs every 3 seconds against `/api/v1/system/active-context`)
  - `BrainGateway`: Multi-provider router handling Gemini, Claude, and OpenAI with token streaming
  - Legacy `memoryAdapter.ts` reading/writing portraits, journeys, and chronicles.

---

## 3. Existing Auth & Database Configuration

### 3.1 The Supabase Cloud Split
A critical discrepancy exists between the projects:
- **Root Repository (`bootstrap.sql` / Atlas / Clario):** Targets Supabase reference `sqthvliapkauoxieiwfb`.
- **Orion Server (`/Orion/apps/server`):** Hardcoded and configured for a separate reference `imguadokkmkckvukkmjg`.
- **Resolution for Phase 1:** All cloud tables must be unified under the canonical Supabase instance `sqthvliapkauoxieiwfb`.

### 3.2 Database Strategy (Hybrid Architecture)
Per Founder instruction, Orion utilizes a **Hybrid Strategy**:
1. **Local SQLite (`orion.db`):** Primary low-latency, offline-capable database on the server/device holding local state, active context, and fast operations.
2. **Supabase PostgreSQL:** Central cloud database mirroring the 17 core entities to enable continuous background sync across Mobile Expo, Desktop Web, and cross-app agents.

---

## 4. Reusable UI & Visual Components

The mobile application contains high-craft, reusable components that directly align with Orion Phase 6 Home UX:

1. **`CommandOrb.tsx` (`/Orion/apps/mobile/src/components/CommandOrb.tsx`):**
   - High-performance Reanimated 4 loop with non-linear bezier breathing curves (`Easing.bezier(0.4, 0, 0.2, 1)`), radial glow bloom, and interactive spring scaling.
   - Readily extensible to map the 10 required Orb states: `IDLE`, `ATTENTIVE`, `THINKING`, `RESEARCHING`, `PREPARING`, `EXECUTING`, `WAITING`, `WARNING`, `COMPLETED`, `ERROR`.
2. **`ParticleSphere.tsx` & `OrbConstellationView.tsx`:**
   - GPU-accelerated Skia shaders simulating liquid/particle density, perfect for ambient status.
3. **`ChatView.tsx` & `ExecutiveDock.tsx`:**
   - Conversational interaction frame with natural voice toggle, prompt suggestion chips, and spring bottom sheet docks.
4. **Design Tokens (`@pseudonyms/design-tokens` & `theme/colors.ts`):**
   - Implements PDS-v5 porcelain canvas (`#F8F7F4`), dark obsidian canvas (`#07080C`), frosted glass overlays, and semantic signal indicators.

---

## 5. Existing Pseudonyms / Atlas / Clario Interfaces

| Target Product | Existing Connection Point | Current Behavior | Gap Against Orion Spec |
| :--- | :--- | :--- | :--- |
| **Atlas** | `POST /api/webhooks/atlas` | Ingests prospect object (`companyName`, `painHypothesis`) into `action_log` | One-way webhook only; lacks bidirectional query (`get_pipeline_state`, `get_prospect`, `get_campaign_state`, `get_blockers`) |
| **Metaphor** | `GET /api/v1/pipeline/brief`<br>`POST /api/v1/pipeline/intake`<br>`FastMCP` | Polling active context every 3s; fetches goals, constraints, open decisions | Orion acts as a passive consumer rather than using the formal `MemoryProvider` interface with classification & promotion |
| **Clario** | `clario-exports` & `clario-frames` Supabase storage buckets | Shared cloud storage configuration | No procedural pipeline invocation from Orion (`get_content_pipeline`, `get_pending_work`) |
| **Pseudonyms ID** | Supabase SSO JWT | Common user token generation | Orion needs to validate user session and permissions from ID claims |

---

## 6. Existing MCP & Tool Infrastructure

- **Metaphor MCP:** Implements Python FastMCP in `Metaphor/backend/app/mcp/server.py`, exposing `get_context` and knowledge tools.
- **Orion Tool Engine Status:**
  - `actionDispatcher.ts` in Orion server currently has rudimentary action routing (e.g. `slack`, `email`, `calendar`) without risk categorization.
  - **Missing Invariants:**
    - No `OrionTool` contract (`name`, `capabilities()`, `execute()`, `verify()`).
    - No 3-tier risk classification (`Low`, `Medium`, `High`).
    - No post-action verification step (it marks actions completed prior to actual verification).
    - No idempotency keys to prevent duplicate emails, calendar events, or database writes.

---

## 7. Existing Memory & Context Systems

- **Current Memory Storage:**
  - `memoryAdapter.ts`: Reads/writes `portrait` (values, identity, cognitive profile), `journeys`, `library`, `chronicle`, `chats`.
  - `memoryGraph.ts`: In-memory graph nodes with exponential confidence decay (`decayConfidence`).
  - `supabase_memory_setup.sql`: `semantic_memories` table with pgvector cosine similarity search (`match_memories`).
- **Critical Architectural Gaps:**
  - **Memory != Context != Reasoning:** The current implementation conflates static user profile attributes (`portrait`) directly with active reasoning context.
  - **Zero Memory Promotion Logic:** It does not classify incoming statements into `FACT`, `GOAL`, `OUTCOME`, `COMMITMENT`, `RULE`, `PREFERENCE`, `DECISION`, `PATTERN`.
  - **No Supersession or Forgetting:** When preferences or decisions change, previous records are naively overwritten rather than marked `SUPERSEDED` or `ARCHIVED`.

---

## 8. Gaps Against Orion Build Specification V1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORION BUILD SPEC V1                               │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ SPEC REQUIREMENT              │ CURRENT REPOSITORY STATUS                   │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 17 Core Entity Schema         │ Partial: Only legacy portrait/journeys      │
│ Context Pack Pipeline         │ Missing: Raw text prompt concatenation      │
│ Reasoning Engine ("Can Say No")│ Missing: Single LLM prompt without trade-offs│
│ Outcome Planning Engine       │ Missing: Basic static command suggestions   │
│ Agency & Permission State Mach│ Incomplete: Dispatches actions without gate │
│ Mandatory Post-Verification   │ Missing: Success assumed on HTTP send       │
│ Event Ingestion & Proactivity │ Incomplete: Basic 3s poller only            │
│ Semantic Email Workflow       │ Missing: No thread parsing or triage        │
│ Click-Worthy Browser Filter   │ Missing: No browser extraction pipeline     │
│ Cross-Pseudonyms Reasoning    │ Partial: Only Atlas webhook payload         │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 9. Architectural Conflicts & Mitigations

1. **Conflict: Legacy "William / Kuro" Naming vs Orion Domain Model**
   - *Issue:* Files, database tables, and routes use `william.db`, `kuro_pipeline_view`, `Command`, `Portrait`.
   - *Mitigation:* Clean deprecation. Introduce canonical `@orion/domain` entities without breaking active mobile screens; map legacy fields through compatibility getters until replaced.
2. **Conflict: Hardcoded Supabase Project Ref in Server**
   - *Issue:* Server `.env` and `memoryAdapter.ts` target an orphaned Supabase project (`imguadokkmkckvukkmjg`).
   - *Mitigation:* Re-point server environment variables to the ecosystem project (`sqthvliapkauoxieiwfb`).
3. **Conflict: Unverified External Execution**
   - *Issue:* `actionDispatcher.ts` dispatches actions and logs status as completed without verifying the provider result.
   - *Mitigation:* Enforce the action lifecycle: `PROPOSED -> PERMISSION_CHECK -> WAITING_APPROVAL -> READY -> EXECUTING -> VERIFYING -> (COMPLETED | FAILED)`.

---

## 10. Exact Phase 1 (Foundation) Implementation Plan

Phase 1 establishes the structural and data foundations for Orion without breaking existing mobile and server workflows:

### Step 1.1: Shared Domain Package (`@orion/domain` / `@orion/types`)
- Create standard TypeScript models for the 17 core entities:
  - `User`, `Value`, `Goal`, `Outcome`, `Project`, `Commitment`, `Rule`, `Preference`, `Decision`, `Pattern`, `CurrentState`, `Relationship`, `Knowledge`, `Resource`, `Permission`, `Action`, `ActionStep`, `Event`, `Notification`.
- Define the `ContextPack`, `Intent`, `Recommendation`, `AuthorityCheck`, and `ToolResult` contracts.

### Step 1.2: Hybrid Database Schema & Migrations
- Write SQLite schema migration for local database (`packages/domain/src/database/schema.sqlite.sql`).
- Write PostgreSQL schema migration for Supabase cloud database (`packages/domain/src/database/schema.postgres.sql`).
- Include index definitions, status enums, foreign keys, and idempotency constraints `(source, source_event_id)`.

### Step 1.3: Personal Model Service
- Implement type-safe CRUD repository for Personal Model entities:
  - Goals, Outcomes, Commitments, Rules, Preferences, Decisions, Patterns, Current State.
  - Built on a clean database abstraction that operates locally on SQLite with asynchronous sync hooks for Supabase.

### Step 1.4: Server Integration & Health Verification
- Expose the Personal Model API routes in `Orion/apps/server/src/routes/personalModel.ts`.
- Mount routes into `index.ts`.
- Run automated unit tests validating entity persistence, supersession, and relationship integrity.

---
*End of Phase 0 Reconnaissance Report.*
