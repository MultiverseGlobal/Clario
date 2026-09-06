# PSEUDONYMS ECOSYSTEM AUDIT & ATLAS REBUILD PLAN

**Document ID:** `AUD-2026-PSEUDO-001`  
**Date:** September 6, 2026  
**Auditor:** Antigravity Principal Engineering & Product Agent  
**Status:** Complete Audit — Pending Founder Architectural Review  
**Target Repository:** `c:\Users\SUDO\Documents\Pseudonyms`  
**Guiding Mandate:** `@PSEUDONYMS_ATLAS_FIRST_MASTER_PLAN.md` & `BRAND.md (PDS-v5)`

---

## 1. EXECUTIVE SUMMARY

### 1.1 The Operational Thesis
The core thesis of Pseudonyms is: **Can one capable founder operate with the leverage of an elite cross-functional team?**
To validate this thesis, Pseudonyms must not begin by building five interconnected products simultaneously. It must prove its first **economic loop** in **Atlas**: discovering real opportunities, qualifying real pain with verifiable evidence, preparing founder-approved outreach, and driving deals through a reliable pipeline to real revenue.

### 1.2 State of the Codebase: The Disconnect
An exhaustive audit of the 5 applications, shared packages, and database layers reveals an ecosystem with **exceptional visual craft and sophisticated UI shells**, but **brittle foundations and pervasive "checkbox-tick" simulation**:
1. **Critical State Disconnect:** Atlas's main command interface (`src/pages/Index.tsx`) stores campaign and lead state purely in transient React component state (`useState`), while legacy sourcing pages store prospects in browser `localStorage`. A page refresh or device switch wipes the founder's entire pipeline.
2. **Dual & Fractured Database Schemas:** Atlas contains two competing CRM databases in Supabase: a legacy schema from the predecessor "Kuro" era (`kuro_pipeline_view`—which is actually a physical table, not a view) and a modern `atlas_*` schema (`atlas_deals`, `atlas_contacts`, `atlas_interactions`). The frontend queries both inconsistently.
3. **Severe Credential Exposure:** Active third-party API keys (Resend production mailer), raw PostgreSQL database passwords, Gemini API keys, and OAuth client secrets are committed in plaintext across `.env` files. Furthermore, private mail keys are exposed to the client bundle via `VITE_` prefixes.
4. **Sub-repo Git Entanglement:** The root folder `Pseudonyms` is simultaneously the git repository for `Clario` (`MultiverseGlobal/Clario.git`), while `Atlas io` and `Orion` maintain independent nested `.git` repositories with different remotes (`Atlas-io/Atlas-io.git` and `BenA-G/william-mobile.git`), and Orion server points to an entirely different Supabase cloud instance (`imguadokkmkckvukkmjg.supabase.co` vs `sqthvliapkauoxieiwfb.supabase.co`).
5. **Architectural Boundary Violations:** `PseudonymsID` contains mock vault storage (`INITIAL_VAULT_ITEMS`) attempting to act as a universal shared knowledge and lead broker, directly violating the master plan's strict mandate that Pseudonyms is **only** an identity and product selector layer.
6. **Zero Automated Testing in Revenue Paths:** Atlas has exactly one test file containing `expect(true).toBe(true)`. Orion and PseudonymsID have zero automated tests.

### 1.3 The Turnaround Strategy: Atlas-First
We do not discard the strong UI foundations, design tokens, or visual components. Instead, we execute a disciplined stabilization:
* **Immediate Security Quarantine:** Revoke and rotate leaked keys, scrub `.env` files from version tracking, and route email delivery strictly through authenticated backend procedures.
* **Unified Supabase Schema:** Eliminate the legacy `kuro_*` tables. Implement the canonical Atlas domain schema (`atlas_opportunities`, `atlas_evidence`, `atlas_contacts`, `atlas_outreach`, `atlas_followups`).
* **True Persistence:** Eliminate all `localStorage` and component-local mocks. Connect the Atlas command flow directly to PostgreSQL via Supabase Auth & RLS.
* **Ship Phase 1 Vertical Slice:** Implement the 6-screen Atlas loop (Intent Setup → Opportunity Discovery → Opportunity Detail → Qualification → Outreach Prep → Follow-up).

---

## 2. ECOSYSTEM ARCHITECTURE INVENTORY

### 2.1 Workspace Map & Git Remotes

| Path | Current Name | Target Architecture Role | Git Remote / Repo State | Primary Stack |
|---|---|---|---|---|
| `/` | `Pseudonyms (Root)` | Monorepo Root | `https://github.com/MultiverseGlobal/Clario.git` (`main`) | Turborepo, pnpm/npm |
| `/Atlas io` | `Atlas io` | **Atlas** (Demand Gen & Economic Engine) | `https://github.com/Atlas-io/Atlas-io.git` (`main`) | Vite, React 18, Tailwind, Supabase |
| `/PseudonymsID` | `PseudonymsID` | **Pseudonyms** (Identity & Shell) | No separate git repo (tracked by root) | Next.js 14, Tailwind, Supabase Auth |
| `/Metaphor` | `Metaphor` | **Metaphor** (Context & Knowledge Engine) | Tracked by root repo | Next.js 14 frontend, Python FastAPI backend |
| `/Orion` | `Orion` | **Orion** (Mobile Operator Companion) | `https://github.com/BenA-G/william-mobile.git` (`main`) | Expo 51 (React Native), Express backend |
| `/Clario` | `Clario` | **Clario** (Creative & Media Synthesizer) | Monorepo root origin | Vite, React 18 frontend, Python FastAPI backend |
| `/packages/design-tokens` | `design-tokens` | PDS-v5 Token Source of Truth | Shared Workspace Package | TypeScript, CSS variables |
| `/packages/ui` | `ui` | Ecosystem Shared UI Components | Shared Workspace Package | React, Radix UI, Tailwind |
| `/KuroOS` | `KuroOS` | Legacy Archive | Deprecated artifact folder | Historical reference |
| `/Weave` | `Weave` | Agent Swarm (Planned Phase 6+) | Stub directory | Placeholder |

### 2.2 Cross-App Port & Deployment Allocations

| Product | Local Dev Port | Primary Cloud Deployment | Cloud Service | Auth Mechanism |
|---|---|---|---|---|
| **Pseudonyms ID** | `3005` | `https://id.pseudonyms.com` (planned) | Vercel | Supabase Auth (Master SSO) |
| **Atlas** | `5173` | `https://atlas-scale.vercel.app` | Vercel / Cloudflare | Supabase Auth (`sqthvliapkauoxieiwfb`) |
| **Metaphor** | `3000` (FE) / `8000` (BE) | `https://metaphor-three.vercel.app` | Vercel (FE) / Render (BE) | Supabase Auth / `X-API-Key` |
| **Orion** | `8081` (Metro) / `3005` (API) | `https://william-web-zeta.vercel.app` | Expo EAS / Render | Supabase Auth (`imguadokkmkckvukkmjg` - Divergent!) |
| **Clario** | `5174` (FE) / `8000` (BE) | `http://localhost:49843` | Cloudflare Tunnel / Docker | Supabase Auth + Local session |

---

## 3. APPLICATION-BY-APPLICATION AUDIT

```
+----------------------------------------------------------------------------------------------------+
|                                      PSEUDONYMS ECOSYSTEM                                         |
+----------------------------------+----------------------------------+------------------------------+
|         IDENTITY LAYER           |         COMMERCIAL ENGINE        |       CONTEXT & TOOLS        |
|          Pseudonyms ID           |             Atlas io             |           Metaphor           |
| (Next.js 14 / Supabase SSO)      |   (Vite / React / Supabase CRM)  |  (Next.js + FastAPI backend) |
+----------------------------------+----------------------------------+------------------------------+
|         MOBILE OPERATOR          |         CREATIVE STUDIO          |       REALTIME FABRIC        |
|              Orion               |              Clario              |         CrossAppBus          |
|    (Expo / React Native 74)      |      (Vite + FastAPI + GPU)      |      (Supabase Realtime)     |
+----------------------------------+----------------------------------+------------------------------+
```

### 3.1 Pseudonyms ID
* **Declared Purpose:** Sovereign identity, authentication, account settings, product access rights, and the central ecosystem switcher.
* **Actual Reality:** Clean Next.js 14 application with responsive login, signup, and OAuth callbacks. However:
  * Contains `src/lib/vault.ts` and `src/lib/sdk.ts` which attempt to broadcast and store cross-app business documents, leads, and voice notes.
  * Lacks an account profile and settings editor UI to manage connected provider keys or team permissions.
  * Uses hardcoded mock apps in `src/lib/ecosystem.ts` (`metaphor`, `orion`, `atlas`, `clario`, `weave`).
* **Verdict:** Keep the core Next.js auth shell, strip out the pseudo-vault, and align strictly with Phase 0 identity boundaries.

### 3.2 Atlas io
* **Declared Purpose:** Commercial engine, discovery of qualified high-ticket leads, evidence-grounded ICP scoring, outreach preparation, and pipeline deal management.
* **Actual Reality:**
  * **Visual Presentation:** Impeccable dark/light porcelain command center with radar displays, intervention drawers, and rich layout controls.
  * **Data Reality:** In `src/pages/Index.tsx`, all campaign states, leads, and active drafts are maintained in React `useState`. Reloading the page clears all progress.
  * **Sourcing Simulation:** `src/services/campaignEngine.ts` attempts to query HN Algolia, synthesizes arbitrary founder email addresses (`${author}@${domain}`), fabricates fit scores (`Math.min(97, ...)`), and falls back to hardcoded mock agency profiles ("Julian Price", "Katarina Dahl").
  * **Dual Schema Conflict:** `src/pages/hq/HqRevenueEngine.tsx` queries `atlas_deals` and `kuro_pipeline_view`. `src/pages/hq/HqLeadDetail.tsx` attempts to execute updates against `kuro_pipeline_view` directly.
  * **Over-Engineered Edge Functions:** `sourcing-machine/index.ts` is a 146KB monolithic Deno script with over 90 calls to `Deno.env.get`, mixing scraping, Groq, Kimi, NIM, and OpenAI APIs with fragile regex JSON extraction.
* **Verdict:** High-priority rewrite. Retain the UI design language and components, but connect to a clean PostgreSQL schema with real persistence and deterministic qualification logic.

### 3.3 Metaphor
* **Declared Purpose:** Context graph, project source ingestion, connector hub (GitHub, Notion, Linear), and multi-tenant AI context injection.
* **Actual Reality:**
  * Frontend: Clean Next.js distraction-free editor and graph visualization. Draft editor currently saves to `localStorage`.
  * Backend: FastAPI application with genuine Python unit tests (`test_clarification.py`, `test_mcp_security.py`).
  * FastMCP Server: Implemented in `backend/app/mcp/server.py`, exposing `get_context` over standard input/output.
  * Security Risk: Raw PostgreSQL connection string with password committed in `backend/.env`.
* **Verdict:** Highly reusable backend and MCP service. Defer deeper feature development to Phase 3 after Atlas is validated.

### 3.4 Orion
* **Declared Purpose:** Mobile personal AI, day planning, executive reflection, voice journal, and mobile oversight of Atlas deals.
* **Actual Reality:**
  * Expo SDK 51 application with Skia liquid orb visualizers, Reanimated gestures, and audio recording.
  * Server: Node.js/Express server in `apps/server/src/index.ts` (52KB).
  * Cloud Misconfiguration: Points to a separate Supabase cloud project (`imguadokkmkckvukkmjg.supabase.co`) with its `SERVICE_ROLE_KEY` committed to git.
  * Disconnected Mobile State: Because Atlas stores data in `localStorage` or component state, Orion's mobile screens cannot display desktop pipeline data.
* **Verdict:** Solid mobile shell. Must be repointed to the primary Supabase instance and connected to the canonical Atlas schema during Phase 4.

### 3.5 Clario
* **Declared Purpose:** Multimedia editor, video processing, asset synthesis, and procedural brand canvas.
* **Actual Reality:**
  * Vite frontend at root (`/`) with Python FastAPI backend in `/backend`.
  * Real video processing via Gemini 1.5 Pro and Dockerfile for cloud execution.
  * Currently sits as the root git repository, causing repo confusion with the monorepo root.
* **Verdict:** Keep isolated until Phase 5. Repackage into `apps/clario-web` within the clean monorepo.

---

## 4. SHARED PACKAGES & COMMONS

### 4.1 `@pseudonyms/design-tokens` (`/packages/design-tokens`)
* **File:** `tokens.ts` (141 lines) + `index.css` (104 lines).
* **Evaluation:** Exceptional quality. Adheres faithfully to **PDS-v5**:
  * Light-first porcelain canvas (`#F8F7F4`), obsidian text (`#111318`).
  * Dark mode activated via `.dark` class (`#07080c` canvas).
  * 5 app typography pairings: Atlas (Epic Pro / Arial), Clario (Vanguard / Athelas), Metaphor (Times New Roman / Inter), PseudonymsID (STIX / Archivo), Orion (Tempting / Switzer).
  * Semantic tokens: Success (`#22c55e`), Warning (`#f59e0b`), Danger (`#ef4444`), Info (`#38bdf8`).
* **Disposition:** **PRESERVE AND STANDARDIZE AS THE SINGLE SOURCE OF TRUTH.**

### 4.2 `@pseudonyms/ui` (`/packages/ui`)
* **Components:** `EcosystemSwitcher.tsx`, `CrossAppBus.ts`, `WaffleSwitcher.tsx`, `CommandPalette.tsx`.
* **Evaluation:**
  * `CrossAppBus.ts`: Uses Supabase Realtime broadcast (`channel.send`) to broadcast cross-app events (`atlas:lead_created`, `clario:job_complete`, etc.). Extremely useful for inter-app notification handoffs.
  * `EcosystemSwitcher.tsx`: Accessible 9-dot waffle menu with spring animations and keyboard navigation.
* **Disposition:** **PRESERVE AND IMPORT DIRECTLY INTO ATLAS AND PSEUDONYMS ID.**

---

## 5. DATABASE & BACKEND SERVICES AUDIT

### 5.1 Supabase Cloud Split
The ecosystem is currently configured across two incompatible Supabase cloud instances:
1. **Primary Project:** `sqthvliapkauoxieiwfb.supabase.co`
   * Used by: Atlas, PseudonymsID, Metaphor, Clario.
   * Location: AWS `eu-west-1`.
2. **Secondary Project:** `imguadokkmkckvukkmjg.supabase.co`
   * Used by: Orion server (`apps/server/.env`).
   * Service role key exposed.
* **Correction Required:** All apps must authenticate and read/write against the single canonical Supabase project `sqthvliapkauoxieiwfb`.

### 5.2 Schema Analysis: Legacy vs Modern

```
                     CURRENT FRAGMENTED STATE
                     
      [ Atlas Frontend ]
             |
             +----> Component React State (Index.tsx) --------> Lost on refresh
             +----> localStorage (Sourcing.tsx) --------------> Lost across devices
             +----> kuro_pipeline_view (Legacy table) ---------> Legacy columns
             +----> atlas_deals & atlas_contacts --------------> Modern schema
             
--------------------------------------------------------------------------------

                     TARGET CANONICAL ATLAS SCHEMA
                     
                           [ Atlas Frontend ]
                                  |
                   (Supabase Auth + PostgREST + RLS)
                                  |
                                  v
+-------------------------------------------------------------------+
|                        ATLAS DOMAIN SCHEMA                        |
+--------------------------+----------------------------------------+
| atlas_icp_profiles       | ICP criteria, weights, search queries  |
| atlas_acquisition_runs   | Execution batch metadata and metrics   |
| atlas_opportunities      | Discovered companies, confidence, fit  |
| atlas_evidence           | Raw URL/text citations & pain signals  |
| atlas_contacts           | Verified decision makers & channels    |
| atlas_outreach           | Drafted emails, review status, logs    |
| atlas_followups          | Scheduled reminders & next actions     |
+--------------------------+----------------------------------------+
```

1. **`kuro_pipeline_view` (Legacy):**
   * Created in `20240817_crm_pipeline.sql` as a physical table with ad-hoc columns added in subsequent migrations (`acquisition_run_id`, `opportunity_score`, `outreach_draft`, `research_data`).
   * Still referenced by 12 Supabase edge functions and 2 frontend components.
2. **`atlas_*` Tables (Modern):**
   * `atlas_organizations`, `atlas_deals`, `atlas_contacts`, `atlas_interactions`, `atlas_events`, `atlas_referrals`.
   * Better normalized, but incomplete regarding evidence tracking and qualification scoring.
3. **Missing Critical Tables:**
   * No dedicated `atlas_evidence` table for grounding AI qualification with concrete citations and URLs.
   * No dedicated `atlas_followups` table with scheduling state and reminders.

---

## 6. AI & AGENTIC INFRASTRUCTURE AUDIT

### 6.1 Edge Functions in `Atlas io/supabase/functions/`
* **`sourcing-machine` (146KB):** An unmaintainable monolith combining web crawling, Firecrawl emulation, Groq, Kimi, OpenAI, and NVIDIA NIM calls. Vulnerable to provider timeouts and parsing failures.
* **`generate-outreach` (9.1KB):** Direct calls to Moonshot (Kimi) and Groq. Uses regex JSON extraction. Contains hardcoded fallback strings signed "Best, Ben".
* **`atlas-chat` (16.8KB):** Conversational agent using Gemini and OpenAI.
* **`step-acquisition` (12.8KB):** Multi-step background pipeline for scraping and qualification.

### 6.2 Provider Fragmentation
The codebase attempts to communicate with:
* OpenAI (`gpt-4o`, `gpt-4o-mini`)
* Anthropic (`claude-3-5-sonnet`)
* Google Gemini (`gemini-2.0-flash`, `gemini-1.5-pro`)
* Moonshot / Kimi AI (`moonshot-v1-8k`)
* Groq (`llama3-70b-8192`)
* NVIDIA NIM

**Recommendation:** Consolidate on **Google Gemini 2.0 Flash / Pro** as the primary high-speed reasoning model (with Anthropic Claude 3.5 Sonnet as the complex analytical fallback). Remove unmaintained third-party endpoints.

---

## 7. CRITICAL DEFECTS, FAKE CODE & TECHNICAL DEBT

### 7.1 Severity 1: Critical Security Vulnerabilities
1. **Plaintext Database Password:** `Metaphor/backend/.env` contains `DATABASE_URL="postgresql+asyncpg://postgres.[PROJECT_ID]:[REDACTED_PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"`.
2. **Exposed Mailer Private API Key:** `Atlas io/.env` contains `RESEND_API_KEY="re_..."` and `VITE_RESEND_API_KEY="re_..."` which exposes an unauthenticated email dispatch capability to the public browser client.
3. **Exposed Supabase Service Role Key:** `Orion/apps/server/.env` contains `SUPABASE_SERVICE_ROLE_KEY`, bypassing all Row Level Security.
4. **Committed OAuth Secrets:** GitHub, Notion, and Linear client secrets are stored in `Metaphor/backend/.env` and `render.yaml`.

### 7.2 Severity 2: Simulated & "Checkbox-Tick" Code
1. **Atlas Campaign State Volatility:** `Index.tsx` loses all discovery and campaign progress upon browser refresh.
2. **Fake Lead Generation:** `campaignEngine.ts` fabricates contact email addresses from Hacker News username strings (`${author}@${domain}`) and synthesizes fake agency profiles when queries yield few results.
3. **Fake Qualification Scores:** ICP scores are calculated with random arithmetic: `Math.min(97, Math.max(86, Math.floor(86 + Math.log10(points + 1) * 4) + (idx % 3)))`.
4. **Metaphor Draft Persistence:** The writing studio saves markdown drafts only to browser `localStorage`.
5. **Orion Blank State:** Orion cannot access Atlas deals because Atlas does not write to the shared cloud database.

### 7.3 Severity 3: Architectural Debt & Divergence
1. **Root Git Collision:** The root workspace is cloned from `Clario.git`, causing Git tree conflicts when committing changes across Atlas, Orion, or packages.
2. **Dual CRM Tables:** Simultaneous usage of `kuro_pipeline_view` and `atlas_deals`.
3. **TypeScript Bypasses:** Pervasive `// @ts-nocheck` in Supabase edge functions and `(supabase as any)` casts in UI components.

---

## 8. DESIGN SYSTEM & UX AUDIT

### 8.1 Strengths
* **PDS-v5 Tokens:** Clear definitions in `packages/design-tokens/tokens.ts` for porcelain `#F8F7F4` light mode and `#07080c` dark mode.
* **Component Craft:** Radix-backed primitives in `Atlas io/src/components/ui/` with high polish (sheet drawers, command palettes, custom toasts).
* **Typography Hierarchy:** Distinct, memorable font identities defined for each world.

### 8.2 Deficiencies & Inconsistencies
* **Dark Mode Default Inversion:** `BRAND.md` specifies that **light mode is the default**, with dark mode as a secondary override. However, `Atlas io/src/pages/Index.tsx` defaults to dark mode (`localStorage.getItem("atlas.theme") || true`).
* **Tailwind Divergence:** `Atlas io/tailwind.config.ts` has defined custom color variables that override or do not import from `packages/design-tokens`.
* **Clutter in Command Center:** The Atlas landing page combines spatial canvas, radar scans, auto-pilot timers, and audio synth toggles on a single screen, detracting from the founder's primary morning action: **"Which 3 opportunities deserve my attention today?"**

---

## 9. MONOREPO & MULTI-REPO HYGIENE

### 9.1 Current Flaws
* Git sub-repositories exist inside a parent git repository without proper Git submodule or Git subtree configurations.
* Package dependencies are installed haphazardly across root `node_modules`, `Atlas io/node_modules`, `Orion/node_modules`, and `Metaphor/frontend/node_modules`.

### 9.2 Target Monorepo Structure
We align with the standard defined in `.agents/rules/PSEUDONYMS_ATLAS_FIRST_MASTER_PLAN.md`:

```text
pseudonyms/
├── apps/
│   ├── pseudonyms-web/     # Identity & Ecosystem Selector (Next.js 14)
│   ├── atlas-web/          # Demand Gen & Commercial Engine (Vite / React 18)
│   ├── metaphor-web/       # Context & Knowledge Studio (Next.js 14)
│   ├── clario-web/         # Creative & Video Studio (Vite / React 18)
│   └── orion-mobile/       # Mobile Operator Companion (Expo SDK 51)
├── packages/
│   ├── design-tokens/      # PDS-v5 token definitions (CSS / TS)
│   ├── ui/                 # Shared React primitives & switcher
│   ├── auth/               # Unified Supabase Auth client & helpers
│   ├── api-contracts/      # Typed TypeScript interfaces & DTOs
│   └── config/             # Shared ESLint, Prettier, TypeScript configs
├── supabase/               # Unified ecosystem Supabase migrations & functions
├── docs/                   # Architecture, audit, and SOP specifications
├── package.json            # Root workspace configuration
└── turbo.json              # Turborepo pipeline caching
```

---

## 10. TARGET ARCHITECTURE SPECIFICATION

### 10.1 System Architecture

```
                                  [ FOUNDER ]
                                       |
                   +-------------------+-------------------+
                   |                                       |
           (Desktop / Web)                               (Mobile)
                   |                                       |
          +--------v---------+                    +--------v---------+
          |  PSEUDONYMS ID   |                    |   ORION MOBILE   |
          |  Identity Layer  |                    | (Expo / React N) |
          +--------+---------+                    +--------+---------+
                   |                                       |
                   | (SSO JWT)                             | (Read Pipeline)
                   v                                       v
          +------------------+                    +------------------+
          |     ATLAS        |<==================>|     METAPHOR     |
          | Commercial Engine|   Context Bridge   |  Context Engine  |
          +--------+---------+                    +--------+---------+
                   |                                       |
                   | (PostgREST / RLS)                     | (FastMCP)
                   v                                       v
      +----------------------------------------------------------+
      |               SUPABASE UNIFIED POSTGRESQL                |
      |                     (eu-west-1)                          |
      +----------------------------------------------------------+
```

### 10.2 Canonical Atlas Domain Data Model
To replace `kuro_pipeline_view` and provide full evidence-grounded persistence, the Atlas database schema is defined as:

```sql
-- 1. ICP Targeting Briefs
CREATE TABLE public.atlas_icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_industry TEXT NOT NULL,
  target_geography TEXT DEFAULT 'Global',
  revenue_range TEXT,
  pain_signals TEXT[] NOT NULL DEFAULT '{}',
  inclusion_criteria TEXT[] NOT NULL DEFAULT '{}',
  exclusion_criteria TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Acquisition Runs (Discovery Batches)
CREATE TABLE public.atlas_acquisition_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  icp_profile_id UUID REFERENCES public.atlas_icp_profiles(id) ON DELETE SET NULL,
  intent_prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  source_channels TEXT[] NOT NULL DEFAULT '{}',
  opportunities_found INTEGER NOT NULL DEFAULT 0,
  qualified_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 3. Opportunities (Companies / Prospects)
CREATE TABLE public.atlas_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acquisition_run_id UUID REFERENCES public.atlas_acquisition_runs(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  website_url TEXT NOT NULL,
  industry TEXT,
  estimated_revenue TEXT,
  team_size TEXT,
  icp_fit_score INTEGER NOT NULL CHECK (icp_fit_score BETWEEN 0 AND 100),
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'qualifying', 'qualified', 'disqualified', 'outreach_ready', 'contacted', 'engaged', 'converted', 'archived')),
  primary_bottleneck TEXT,
  founder_thesis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Evidence Citations (Audit trail for why company is qualified)
CREATE TABLE public.atlas_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('website', 'hacker_news', 'job_posting', 'linkedin', 'github', 'custom')),
  source_url TEXT NOT NULL,
  snippet TEXT NOT NULL,
  pain_signal TEXT NOT NULL,
  buying_signal TEXT,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Contacts (Verified Decision Makers)
CREATE TABLE public.atlas_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'bounced')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Outreach Messages
CREATE TABLE public.atlas_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.atlas_contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin_dm', 'loom_script')),
  subject TEXT,
  body TEXT NOT NULL,
  assumptions_made TEXT[] NOT NULL DEFAULT '{}',
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved', 'rejected', 'sent')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Follow-ups and Next Actions
CREATE TABLE public.atlas_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 11. REUSABILITY & DISPOSITION MATRIX

| Asset / File | Current Status | Disposition | Action Required |
|---|---|---|---|
| `packages/design-tokens` | Production quality | **RETAIN & STANDARDIZE** | Use as authoritative token library across all apps |
| `packages/ui` (`CrossAppBus`, `EcosystemSwitcher`) | Functional & clean | **RETAIN & REUSE** | Import directly into Atlas and PseudonymsID |
| `Atlas io/src/components/ui/*` | 49 Radix primitives | **RETAIN & REUSE** | Keep as base component library |
| `Atlas io/src/components/atlas/HqShell.tsx` | High-fidelity navigation shell | **RETAIN & REFACTOR** | Align routes with Phase 1 screens |
| `Atlas io/src/components/atlas/PainEngine.tsx` | Good hypothesis UI | **RETAIN & REFACTOR** | Connect to `atlas_evidence` table |
| `Atlas io/src/components/atlas/OfferBuilder.tsx` | Excellent proposal UI | **RETAIN & REUSE** | Connect to `atlas_outreach` |
| `Atlas io/src/services/campaignEngine.ts` | Simulation / mock math | **REPLACE** | Replace with typed PostgREST client & real discovery services |
| `Atlas io/src/pages/Index.tsx` | Volatile React state | **REPLACE** | Rebuild around the morning focus: top 3 prioritized opportunities |
| `Atlas io/supabase/functions/sourcing-machine` | 146KB monolith | **REFACTOR** | Modularize into discrete edge functions with timeout protection |
| `Atlas io/supabase/functions/generate-outreach` | Hardcoded names & fallback | **REFACTOR** | Use structured Gemini 2.0 Flash schemas without hardcoded personal names |
| `Atlas io/.env` & `Metaphor/backend/.env` | Critical secrets leak | **QUARANTINE & ROTATE** | Scrub from git history, rotate all keys immediately |
| `kuro_pipeline_view` table | Legacy technical debt | **DEPRECATE & MIGRATE** | Migrate live records to `atlas_opportunities` and drop table |
| `PseudonymsID/src/lib/vault.ts` | Data boundary violation | **DISCARD** | Remove pseudo-vault; keep Pseudonyms as pure identity shell |
| `Orion/apps/server/.env` | Divergent Supabase instance | **REPOINT** | Configure to share the primary Supabase project |

---

## 12. ATLAS VERTICAL SLICE IMPLEMENTATION PLAN (PHASE 1)

Atlas must answer the morning question:
> **Which three opportunities deserve my attention today, and what should I do next?**

The implementation is executed across six cohesive screens:

```
+---------------------------------------------------------------------------------------------------+
|                                  PHASE 1 ATLAS VERTICAL SLICE                                     |
+-------------------+-------------------+-------------------+-------------------+-------------------+
|  1. INTENT SETUP  |  2. OPPORTUNITY   |   3. EVIDENCE &   | 4. QUALIFICATION  |    5. OUTREACH    |
|                   |    DISCOVERY      |      DETAIL       |                   |    PREPARATION    |
+-------------------+-------------------+-------------------+-------------------+-------------------+
| Define ICP, niche | Filtered real/    | Audit trail, why  | Explicit rubric   | Founder-approved  |
| constraints &     | fixture list with | it matches, pain  | scoring, known vs | drafts with       |
| verified channels | source indicators | points, citations | unknown facts     | zero auto-send    |
+-------------------+-------------------+-------------------+-------------------+-------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      | 6. FOLLOW-UP & NEXT   |
                                      | Scheduled reminders   |
                                      | & calendar queue      |
                                      +-----------------------+
```

### Screen 1: Intent Setup (`/atlas/intent`)
* **Objective:** Allow the founder to define target intent without pretending search has already finished.
* **UI Controls:** Natural language targeting prompt, select saved ICP Brief, specify target geography, industry keywords, and data sources (Hacker News Show HN, Y Combinator directory, manual domain seed).
* **Execution:** Writes to `atlas_acquisition_runs` with status `queued` and initiates search.

### Screen 2: Opportunity Discovery (`/atlas/opportunities`)
* **Objective:** Display ranked candidates with full provenance.
* **UI Controls:** Opportunity cards displaying company name, domain, ICP fit score (0-100), confidence percentage, detected bottleneck, and evidence freshness badge.
* **Integrity Guarantee:** Labeled data origins (e.g. `[LIVE: YC W24]` or `[FIXTURE: DEV]`). No unverified synthetic leads.

### Screen 3: Opportunity Detail & Evidence Audit (`/atlas/opportunities/:id`)
* **Objective:** Provide a forensic evidence dossier to evaluate the prospect.
* **UI Controls:** Side-by-side view:
  * Left: Company summary, identified decision-makers (`atlas_contacts`), and key operational metrics.
  * Right: Evidence panel displaying direct text quotes, URLs, source timestamps, and confidence assessments.
* **Controls:** Founder actions: "Approve for Qualification", "Disqualify", "Request More Evidence".

### Screen 4: Explicit Qualification (`/atlas/opportunities/:id/qualify`)
* **Objective:** Systematic assessment without hidden automated algorithmic scoring.
* **Rubric:**
  1. High Operational Inefficiency (Documented manual bottleneck).
  2. Direct Founder / Executive Access (Verified contact role).
  3. Economic Ability to Transact (Headcount / revenue signals).
* **Controls:** Checkbox overrides, editable pain thesis, and manual status promotion to `outreach_ready`.

### Screen 5: Outreach Preparation (`/atlas/opportunities/:id/outreach`)
* **Objective:** Precision copy generation requiring human sign-off.
* **Generation Engine:** Structured LLM generation based on `atlas_evidence` pain points and founder thesis.
* **Safety Mandate:** **Zero automated dispatch.** The founder must review, edit subject/body, choose channel (Email via authenticated backend procedure, LinkedIn DM script, or Loom recording blueprint), and click "Approve & Queue".

### Screen 6: Follow-up & Next Action (`/atlas/pipeline`)
* **Objective:** Prevent high-value opportunities from slipping through the cracks.
* **UI Controls:** Chronological timeline showing scheduled follow-ups (`atlas_followups`), contact history, and a prominent "Next Best Action" prompt directing the founder back to the top of the queue.

---

## 13. RISK REGISTER & MITIGATION STRATEGY

| Risk ID | Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | Exposed production credentials in git history | **Critical** | Data compromise, mailer abuse, unauthorized DB access | Immediate key rotation, invalidation of existing tokens, `.env` git scrubbing via BFG/git-filter-repo, add `.gitignore` guards |
| **RSK-02** | Data loss due to browser `localStorage` dependence | **High** | Founder loses active pipeline across browser sessions | Complete transition to Supabase PostgreSQL with RLS; remove `localStorage` state logic |
| **RSK-03** | Monorepo git collisions with Clario root | **High** | Accidental overwrites and broken branch tracking | Migrate to a clean pnpm workspace structure with explicit Turborepo packages or clean Git submodules |
| **RSK-04** | AI hallucination in lead discovery & outreach | **Medium** | Reputational damage from sending fabricated details | Strict evidence grounding (`atlas_evidence`), mandating human approval before any outreach dispatch |
| **RSK-05** | Supabase Edge Function cold starts & timeouts | **Medium** | UI hangs during lead research | Implement async job queues (`atlas_acquisition_runs`) with polling/realtime status updates |

---

## 14. RECOMMENDED FOUNDER DECISIONS

> [!IMPORTANT]
> The founder's explicit approval is requested on the following architectural decisions before Phase 1 implementation proceeds:

### Decision 1: Database Migration & Schema Reset
* **Recommendation:** Execute a clean SQL migration creating the canonical `atlas_*` tables (`atlas_icp_profiles`, `atlas_acquisition_runs`, `atlas_opportunities`, `atlas_evidence`, `atlas_contacts`, `atlas_outreach`, `atlas_followups`) and deprecate the legacy `kuro_pipeline_view` table.
* **Alternative:** Continue patching `kuro_pipeline_view` (Not recommended: compounds technical debt).

### Decision 2: Monorepo Organization
* **Recommendation:** Normalize the repository into a standard Turborepo/pnpm monorepo structure where root represents the ecosystem workspace, and individual apps reside under `/apps/*`.
* **Alternative:** Maintain split multi-repos with independent git remotes (Requires careful coordination to prevent cross-commit desynchronization).

### Decision 3: Security & Credential Quarantine
* **Recommendation:** Rotate all exposed API keys immediately (Supabase Database Password, Resend Mailer Key, Gemini Key, and OAuth secrets) and move email sending from client-side `VITE_` variables to an authenticated backend Edge Function.

### Decision 4: Phased Ecosystem Sequence
* **Recommendation:** Strictly freeze new feature development in Orion, Metaphor, and Clario until the Atlas Phase 1 vertical slice is completed, validated, and used to acquire the first real customer.

---

## 15. IMMEDIATE NEXT ACTIONS

Upon founder confirmation of the decisions above:
1. **Apply Security Fixes:** Rotate compromised API keys and remove `.env` files from version tracking.
2. **Execute Database Migration:** Run the canonical Atlas schema migration in Supabase (`sqthvliapkauoxieiwfb`).
3. **Build Screen 1 & 2 (Intent & Discovery):** Refactor `Atlas io/src/pages/Index.tsx` to read/write from `atlas_acquisition_runs` and `atlas_opportunities`.
4. **Implement Evidence Dossier (Screen 3 & 4):** Connect `atlas_evidence` to the Opportunity Detail view with full citation rendering.
5. **Implement Safe Outreach Generator (Screen 5 & 6):** Refactor `generate-outreach` with strict validation and founder approval workflow.
6. **Automated Verification:** Add end-to-end Vitest and Playwright test suites covering the 6-screen vertical loop.
