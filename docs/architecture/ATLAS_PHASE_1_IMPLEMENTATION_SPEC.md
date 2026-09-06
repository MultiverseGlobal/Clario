# ATLAS PHASE 1 — FROZEN IMPLEMENTATION HANDOFF SPECIFICATION

> **Status:** FROZEN & LOCKED FOR IMPLEMENTATION  
> **Target Developer:** Antigravity  
> **Directive:** Build *exactly* this vertical slice. Nothing outside it.  
> **Escalation Rule:** If you encounter any ambiguity or design decision not explicitly resolved in this document, **STOP and ask the founder**. Do NOT improvise, expand scope, or invent platform features.

---

## 1. THE V1 PROOF GOAL & OPERATING THESIS

### The Proof Question
> **Can Atlas take a founder's commercial intent and reliably produce a small set of genuinely qualified, evidence-backed opportunities that the founder can act on?**

### The Operating Question (Morning Focus)
> **"Which three opportunities deserve my attention today, and what should I do next?"**

### The 3 Core Surfaces (No 6-screen sprawling bloat)
1. **`/objectives` — Define the Hunt**: Founder Intent $\rightarrow$ AI Search Thesis $\rightarrow$ Founder Edit $\rightarrow$ Lock Approved Version.
2. **`/` — Run the Day (Morning Focus)**: Top 3 Qualified Opportunities $\rightarrow$ Transparent Point Breakdown $\rightarrow$ Next Action.
3. **`/opportunities/:id` — Do the Work**: Immutable Evidence Dossier $\rightarrow$ Verified Contact $\rightarrow$ Grounded Outreach Draft $\rightarrow$ Copy & Manual Send $\rightarrow$ Send Confirmation $\rightarrow$ Follow-up $+3$ business days $\rightarrow$ Manual Deal Outcome.

---

## 2. THE 6 LOCKED DECISIONS

| Decision | Locked Mandate |
| :--- | :--- |
| **1. What V1 Proves** | Atlas turns commercial intent into a small number of real, evidence-backed opportunities worth acting on. |
| **2. The First ICP** | 5–30 person digital/web/marketing agencies in the US and UK with observable operational bottlenecks. |
| **3. Acquisition Source** | Controlled agency feed (`controlled_agency_feed.json`). **Strictly NO web scrapers, NO YC, NO Hacker News.** |
| **4. Outreach Exit** | Manual copy & send via founder's native email or LinkedIn client. **Zero automated Resend sending.** |
| **5. Canonical Truth** | `atlas_*` PostgreSQL schema is canonical. Legacy consumers read via a one-way security-invoker view; **zero bidirectional sync.** |
| **6. Build Boundary** | Strictly the vertical slice. No autonomous agents, no mass mailers, no complex accounting, no cross-app database coupling. |

---

## 3. PRE-IMPLEMENTATION SECURITY & ISOLATION INVARIANTS

1. **Client Invariant**: The browser client receives ONLY the public Supabase publishable/anon key. It is strictly forbidden from holding LLM API keys, mailer keys, database passwords, or service-role keys.
2. **Server Runtime Invariant**: Privileged operations (LLM synthesis, admin runs) run strictly in the backend.
3. **Schema Isolation (One Database $\neq$ One Schema)**:
   Atlas data lives strictly in `atlas_*` tables. Orion data lives strictly in `orion_*` tables. Shared infrastructure is anchored exclusively at `auth.users`. No cross-app foreign keys.
4. **Credential Rotation Requirement**:
   Prior to live customer acquisition, rotate Resend (`re_9...`), Supabase DB password (`sqthvliapkauoxieiwfb`), Supabase service-role (`imguadokkmkckvukkmjg`), Google AI Studio (`AQ.A...`), and OpenRouter (`sk-o...`). Never write secret values into source code or test fixtures.

---

## 4. EXACT DATABASE MIGRATION DDL

Save as `Atlas io/supabase/migrations/20260907000000_atlas_v1_vertical_slice.sql`.

```sql
-- ==============================================================================
-- PSEUDONYMS ATLAS V1 — CANONICAL DATABASE SCHEMA
-- Migration: 20260907000000_atlas_v1_vertical_slice.sql
-- ==============================================================================

-- 1. OBJECTIVES (Founder Commercial Intent)
CREATE TABLE IF NOT EXISTS public.atlas_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_summary TEXT NOT NULL,
  target_hypothesis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ICP PROFILES (Version Numbers Represent Approved Versions)
CREATE TABLE IF NOT EXISTS public.atlas_icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.atlas_objectives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT, -- NULL when status = 'draft'; 1, 2, 3... when approved
  title TEXT NOT NULL,
  buyer_persona JSONB NOT NULL DEFAULT '{"role": "Managing Director / Founder", "seniority": "Executive"}',
  target_geography TEXT[] NOT NULL DEFAULT ARRAY['US', 'UK'],
  employee_range_min INT NOT NULL DEFAULT 5,
  employee_range_max INT NOT NULL DEFAULT 30,
  industry_keywords TEXT[] NOT NULL DEFAULT ARRAY['digital agency', 'web agency', 'design studio', 'marketing agency'],
  pain_signals TEXT[] NOT NULL DEFAULT ARRAY['delivery overhead', 'retainer management chaos', 'automation hiring'],
  buying_signals TEXT[] NOT NULL DEFAULT ARRAY['scaling operations', 'tech stack adoption'],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ACQUISITION RUNS (Batch Jobs Storing Frozen ICP Snapshot)
CREATE TABLE IF NOT EXISTS public.atlas_acquisition_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icp_profile_id UUID NOT NULL REFERENCES public.atlas_icp_profiles(id) ON DELETE RESTRICT,
  icp_version_snapshot INT NOT NULL,
  icp_snapshot JSONB NOT NULL, -- Frozen copy of the exact approved search thesis
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_connector TEXT NOT NULL DEFAULT 'controlled_agency_feed',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  items_discovered INT NOT NULL DEFAULT 0,
  items_qualified INT NOT NULL DEFAULT 0,
  run_telemetry JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. OPPORTUNITIES (Evaluated Organizations with Transparent Fit Score)
CREATE TABLE IF NOT EXISTS public.atlas_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.atlas_acquisition_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  primary_domain TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'Digital Agency',
  employee_count_est INT,
  country TEXT,
  pipeline_stage TEXT NOT NULL DEFAULT 'discovered' 
    CHECK (pipeline_stage IN ('discovered', 'qualified', 'outreach_ready', 'contacted', 'engaged', 'closed_won', 'closed_lost', 'disqualified')),
  fit_score INT NOT NULL DEFAULT 0 CHECK (fit_score BETWEEN 0 AND 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_action_recommendation TEXT,
  next_action_due_at TIMESTAMPTZ,
  deal_value_usd NUMERIC,
  deal_closed_at TIMESTAMPTZ,
  deal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_atlas_org_domain UNIQUE (user_id, primary_domain)
);

-- 5. EVIDENCE (Truly Immutable Append-Only Grounded Signals)
CREATE TABLE IF NOT EXISTS public.atlas_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('employee_fit', 'geo_fit', 'industry_fit', 'pain_signal', 'buying_signal', 'decision_maker')),
  raw_snippet TEXT NOT NULL,
  source_url TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Evidence Trigger: Hard block on UPDATE or DELETE
CREATE OR REPLACE FUNCTION public.trg_fn_prevent_evidence_mutation() 
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'atlas_evidence records are strictly append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON public.atlas_evidence;
CREATE TRIGGER trg_prevent_evidence_mutation 
  BEFORE UPDATE OR DELETE ON public.atlas_evidence
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_prevent_evidence_mutation();

-- 6. CONTACTS (Decision Makers with Rigorous Provenance Tier)
CREATE TABLE IF NOT EXISTS public.atlas_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  verification_tier TEXT NOT NULL DEFAULT 'email_discovered'
    CHECK (verification_tier IN ('email_discovered', 'email_domain_valid', 'email_verified', 'person_email_verified', 'user_provided')),
  provenance_source TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. OUTREACH (Human-Approved Pitch Copy for Manual Send)
CREATE TABLE IF NOT EXISTS public.atlas_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.atlas_opportunities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.atlas_contacts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'linkedin')),
  draft_subject TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'manually_sent', 'replied', 'declined')),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  manual_send_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. FOLLOWUPS (Deterministic Next Best Actions)
CREATE TABLE IF NOT EXISTS public.atlas_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id UUID NOT NULL REFERENCES public.atlas_outreach(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  action_strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ROW LEVEL SECURITY (Tenant Isolation)
ALTER TABLE public.atlas_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_acquisition_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_isolation_objectives" ON public.atlas_objectives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_icp" ON public.atlas_icp_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_runs" ON public.atlas_acquisition_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_opps" ON public.atlas_opportunities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_evidence" ON public.atlas_evidence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_contacts" ON public.atlas_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_outreach" ON public.atlas_outreach FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_followups" ON public.atlas_followups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. ONE-WAY COMPATIBILITY READ ADAPTER (Read-Only Projection for Legacy Consumers)
CREATE OR REPLACE VIEW public.legacy_kuro_sync 
WITH (security_invoker = true) AS
  SELECT 
    id,
    user_id,
    organization_name AS company_name,
    primary_domain AS domain,
    pipeline_stage AS status,
    fit_score AS score,
    created_at
  FROM public.atlas_opportunities;

-- Explicitly block all writes through the compatibility view
REVOKE INSERT, UPDATE, DELETE ON public.legacy_kuro_sync FROM authenticated, anon, public;
```

---

## 5. EXACT API CONTRACTS & PROCEDURES

Implemented in `Atlas io/src/lib/atlas/api.ts` (or backend route handlers).

### 1. Propose ICP (Search Thesis)
* **Endpoint**: `POST /api/v1/atlas/objectives/propose-icp`
* **Input**:
  ```typescript
  export interface ProposeIcpInput {
    offerSummary: string; // e.g. "AI operations automation"
    targetHypothesis: string; // e.g. "5-30 person digital agencies in US/UK"
  }
  ```
* **Output**:
  ```typescript
  export interface ProposeIcpOutput {
    objectiveId: string;
    icpDraft: {
      id: string;
      version: null; // Draft has no version number yet
      status: "draft";
      title: string;
      buyerPersona: { role: string; seniority: string };
      targetGeography: string[];
      employeeRangeMin: number;
      employeeRangeMax: number;
      industryKeywords: string[];
      painSignals: string[];
      buyingSignals: string[];
    };
  }
  ```

### 2. Approve ICP (Version Lock)
* **Endpoint**: `POST /api/v1/atlas/icps/approve`
* **Input**:
  ```typescript
  export interface ApproveIcpInput {
    icpId: string;
    edits?: Partial<ProposeIcpOutput["icpDraft"]>;
  }
  ```
* **Output**:
  ```typescript
  export interface ApproveIcpOutput {
    icpId: string;
    version: number; // Exactly 1 on first approval, 2 on subsequent
    status: "approved";
    approvedAt: string;
  }
  ```
* **Logic**: Look up existing maximum `version` for this `objective_id`. If `version` is NULL/unapproved, set `version = COALESCE(max_version, 0) + 1`, `status = 'approved'`, `approved_at = now()`.

### 3. Dispatch Acquisition Run
* **Endpoint**: `POST /api/v1/atlas/runs/dispatch`
* **Input**: `{ icpId: string; maxRecords?: number }`
* **Output**: `{ runId: string; status: "queued" }`
* **Logic**: Fetches approved ICP record. Snapshots its entire payload into `icp_snapshot JSONB`. Inserts into `atlas_acquisition_runs` with `status: 'queued'`.

### 4. Morning Focus (Top 3 Daily Opportunities)
* **Endpoint**: `GET /api/v1/atlas/opportunities/morning-focus`
* **Deterministic Query**:
  ```sql
  SELECT * FROM public.atlas_opportunities
  WHERE user_id = auth.uid()
    AND pipeline_stage = 'qualified'
    AND fit_score >= 60
    AND id NOT IN (
      SELECT opportunity_id FROM public.atlas_outreach 
      WHERE status IN ('manually_sent', 'replied')
    )
  ORDER BY fit_score DESC, created_at ASC
  LIMIT 3;
  ```
* **Output**:
  ```typescript
  export interface MorningFocusResponse {
    focusDate: string; // YYYY-MM-DD
    opportunities: Array<{
      id: string;
      organizationName: string;
      primaryDomain: string;
      fitScore: number;
      scoreBreakdown: {
        employeeFit: { points: 0 | 25; observed: number | null };
        geoFit: { points: 0 | 15; observed: string | null };
        industryFit: { points: 0 | 15; observed: string };
        painSignal: { points: 0 | 20; snippet: string; sourceUrl: string };
        buyingSignal: { points: 0 | 15; snippet?: string; sourceUrl?: string };
        decisionMaker: { points: 0 | 10; name?: string; title?: string };
      };
      primaryEvidenceSnippet: string;
      primaryEvidenceUrl: string;
      decisionMaker?: {
        fullName: string;
        jobTitle: string;
        email: string;
        verificationTier: "email_discovered" | "email_domain_valid" | "email_verified" | "person_email_verified" | "user_provided";
      };
      recommendedNextAction: string;
    }>;
  }
  ```

### 5. Generate Grounded Outreach Draft
* **Endpoint**: `POST /api/v1/atlas/outreach/draft`
* **Input**: `{ opportunityId: string; contactId?: string }`
* **Output**:
  ```typescript
  export interface OutreachDraftOutput {
    outreachId: string;
    draftSubject: string;
    draftBody: string;
    evidenceCitations: Array<{ snippet: string; sourceUrl: string }>;
  }
  ```
* **Prompt Rule**: LLM prompt receives ONLY the company domain, decision maker name/title, and the verified records in `atlas_evidence`. The LLM is instructed: *"You are drafting a direct, concise 3-paragraph cold email from a founder. Every claim must cite an observed pain or business fact from the provided evidence. NEVER invent details."*

### 6. Confirm Manual Send & Schedule Follow-up
* **Endpoint**: `POST /api/v1/atlas/outreach/:id/confirm-manual-send`
* **Input**: `{ notes?: string; userTimezone?: string }`
* **Output**: `{ outreachId: string; status: "manually_sent"; nextActionDueAt: string }`
* **Logic**:
  1. Sets `atlas_outreach.status = 'manually_sent'`, `sent_at = now()`.
  2. Updates `atlas_opportunities.pipeline_stage = 'contacted'`.
  3. Calculates `nextActionDueAt = addBusinessDays(now(), 3, userTimezone || 'UTC')`.
  4. Inserts row into `atlas_followups` with `scheduled_for = nextActionDueAt`, `action_strategy = 'Follow up with specific automation case study'`.

### 7. Record Manual Deal Outcome
* **Endpoint**: `PATCH /api/v1/atlas/opportunities/:id/deal`
* **Input**: `{ stage: "closed_won" | "closed_lost"; dealValueUsd?: number; dealNotes?: string }`
* **Output**: `{ opportunityId: string; pipelineStage: string }`

---

## 6. EXACT WORKER BEHAVIOR & CONTROLLED FEED

The acquisition runner is a deterministic processor over `data/fixtures/controlled_agency_feed.json`.

### 1. Feed Schema (`controlled_agency_feed.json`)
The feed contains 5 real agency entries structured as follows:
```json
[
  {
    "organization_name": "Apex Digital Studio",
    "domain": "apexdigital.co.uk",
    "country": "UK",
    "employee_count": 14,
    "industry": "Digital Agency",
    "source_url": "https://apexdigital.co.uk/about",
    "pain_signal": "Struggling with project management overhead and custom client onboarding delays",
    "pain_source_url": "https://apexdigital.co.uk/careers/operations-lead",
    "buying_signal": "Recently adopted modern tool stack and hiring dedicated operations specialist",
    "buying_source_url": "https://apexdigital.co.uk/blog/our-2026-stack",
    "contact_name": "Marcus Vance",
    "contact_title": "Founder & Managing Director",
    "contact_email": "marcus@apexdigital.co.uk",
    "contact_source_url": "https://apexdigital.co.uk/contact",
    "contact_verification_tier": "email_domain_valid"
  }
]
```

### 2. Worker Processing Pipeline
For each record in the feed:
1. **Domain Normalization**: Run `psl.get(domain)` to strip subdomains and normalize to lowercase.
2. **Deduplication**: Query `atlas_opportunities` where `user_id = auth.uid()` AND `primary_domain = normalizedDomain`. If exists, skip.
3. **Insert Opportunity**:
   - Insert row with `pipeline_stage = 'discovered'`.
4. **Insert Evidence (Append-Only)**:
   - Insert `employee_fit` snippet with source URL.
   - Insert `geo_fit` snippet with source URL.
   - Insert `industry_fit` snippet with source URL.
   - Insert `pain_signal` snippet with source URL.
   - If buying signal present, insert `buying_signal` snippet with source URL.
5. **Compute Deterministic Fit Score**:
   ```typescript
   let score = 0;
   const breakdown: FitScoreBreakdown = { ... };

   // 1. Employee Fit (+25)
   if (emp >= icp.employeeRangeMin && emp <= icp.employeeRangeMax) {
     score += 25;
     breakdown.employeeFit = { points: 25, observed: emp };
   }
   // 2. Geo Fit (+15)
   if (icp.targetGeography.includes(country)) {
     score += 15;
     breakdown.geoFit = { points: 15, observed: country };
   }
   // 3. Industry Fit (+15)
   if (industryMatch) {
     score += 15;
     breakdown.industryFit = { points: 15, observed: industry };
   }
   // 4. Pain Signal (+20)
   if (painSnippet) {
     score += 20;
     breakdown.painSignal = { points: 20, snippet: painSnippet, sourceUrl: painUrl };
   }
   // 5. Buying Signal (+15)
   if (buyingSnippet) {
     score += 15;
     breakdown.buyingSignal = { points: 15, snippet: buyingSnippet, sourceUrl: buyingUrl };
   }
   // 6. Decision Maker (+10)
   if (contactName) {
     score += 10;
     breakdown.decisionMaker = { points: 10, name: contactName, title: contactTitle };
   }
   ```
6. **Update Opportunity Score & Stage**:
   - Update `atlas_opportunities` with `fit_score = score`, `score_breakdown = breakdown`.
   - If `score >= 60`, set `pipeline_stage = 'qualified'`; else set `pipeline_stage = 'disqualified'`.
7. **Insert Contact**:
   - Insert row into `atlas_contacts` with `verification_tier = contact_verification_tier`.
8. **Telemetry Update**: Increment `items_discovered` and `items_qualified`.

---

## 7. EXACT BUSINESS DAY CALCULATION HELPER

In `Atlas io/src/lib/atlas/dateUtils.ts`:

```typescript
/**
 * Adds N business days (Monday-Friday) to a given start date.
 * Weekend dates roll forward to the next business day before counting.
 */
export function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate);
  let added = 0;

  while (added < daysToAdd) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return result;
}
```
* Friday $\rightarrow$ Wednesday (+3 business days).
* Saturday $\rightarrow$ Wednesday.
* Sunday $\rightarrow$ Wednesday.
* Monday $\rightarrow$ Thursday.
* Tuesday $\rightarrow$ Friday.

---

## 8. EXACT UI BEHAVIOR & THE 3 SURFACES

All UI is built inside `Atlas io/src` reusing `HqShell`, Radix UI primitives, and PDS-v5 design tokens.

### Surface 1: `/objectives` — Define the Hunt
* **Input Box**: Two clean textarea fields: "Your Commercial Offer" and "Target Market Hypothesis".
* **Generate Button**: `[Propose Search Thesis]`. Triggers `POST /api/v1/atlas/objectives/propose-icp`.
* **Search Thesis Card**: Renders proposed target buyer title, employee range chips (`5–30`), geography chips (`US`, `UK`), and pain signal tags.
* **Approval Action**: `[Approve & Lock Search Thesis]`. Calls `POST /api/v1/atlas/icps/approve`, locks `Version 1`, and enables `[Run Acquisition]` button.

### Surface 2: `/` — Run the Day (Morning Focus)
* **Header**: "Morning Focus" with current date.
* **Top 3 Cards**: Shows maximum 3 cards matching the deterministic SQL filter.
* **Card Anatomy**:
  - Organization Name & Domain (e.g., `Apex Digital Studio · apexdigital.co.uk`).
  - Fit Score Badge: `85/100` (emerald badge).
  - Breakdown Chips: `+25 emp` `+15 UK` `+15 agency` `+20 pain` `+10 contact`.
  - Verbatim Pain Snippet: In quotes, with external link to `source_url`.
  - Decision Maker: Name, title, and verification badge (e.g. `domain_valid`).
  - Action Button: `[Review & Outreach]` (opens Surface 3 drawer).

### Surface 3: `/opportunities/:id` (Drawer / Dossier View)
* **Left Column (Evidence Dossier)**:
  - Timeline of immutable evidence records.
  - Formatted as: `Observed Sep 7, 2026 · [Source URL ↗] · "Verbatim quote"`.
  - Non-editable. Append-only view.
* **Right Column (Outreach & Send Studio)**:
  - Copy Editor: Draft Subject and Draft Body (pre-populated by LLM with citations).
  - Subject editable, body editable.
  - Action 1: `[Copy Subject & Body]` (copies to clipboard with checkmark feedback).
  - Action 2: `[Open in Mail Client]` (`mailto:marcus@apexdigital.co.uk?subject=...&body=...`).
  - Action 3: `[Mark as Manually Sent]`. Triggers `POST /api/v1/atlas/outreach/:id/confirm-manual-send`.
  - Success banner: *"Outreach recorded. Follow-up scheduled for Wednesday, Sep 10."*
* **Deal Actions**:
  - `[Mark Won]` / `[Mark Lost]` button opening a simple modal to record `dealValueUsd` and `dealNotes`.

---

## 9. EXACT FILES TO CREATE / MODIFY

```text
CREATE:
├── Atlas io/supabase/migrations/20260907000000_atlas_v1_vertical_slice.sql
├── Atlas io/data/fixtures/controlled_agency_feed.json
├── Atlas io/src/lib/atlas/types.ts               (Full TypeScript interfaces for all 8 entities)
├── Atlas io/src/lib/atlas/scoring.ts             (Deterministic 100-pt scoring logic)
├── Atlas io/src/lib/atlas/scoring.test.ts        (Vitest unit tests for scoring formula)
├── Atlas io/src/lib/atlas/dateUtils.ts           (addBusinessDays helper)
├── Atlas io/src/lib/atlas/dateUtils.test.ts      (Vitest unit tests for business day math)
├── Atlas io/src/lib/atlas/api.ts                 (Typed Supabase client procedures)
├── Atlas io/src/lib/atlas/worker.ts              (Controlled feed ingestion & qualification runner)
├── Atlas io/src/pages/Objectives.tsx             (Surface 1: Intent & Search Thesis)
├── Atlas io/src/components/atlas/MorningFocus.tsx (Surface 2: Top 3 cards)
└── Atlas io/src/components/atlas/OpportunityDossierDrawer.tsx (Surface 3: Evidence & Manual Send)

MODIFY:
├── Atlas io/src/App.tsx                          (Ensure clean routing for / and /objectives)
├── Atlas io/src/pages/Index.tsx                  (Mount MorningFocus as primary dashboard surface)
├── Atlas io/src/components/atlas/HqShell.tsx     (Ensure sidebar routes to / and /objectives)
└── docs/architecture/ATLAS_PHASE_1_IMPLEMENTATION_SPEC.md (This frozen spec)

DO NOT TOUCH:
├── Metaphor/*                                    (Preserve entirely)
├── Orion/*                                       (Preserve entirely)
├── Clario/*                                      (Preserve entirely)
├── PseudonymsID/*                                (Preserve entirely)
├── packages/design-tokens/*                      (Read-only; bind to CSS tokens)
├── packages/ui/*                                 (Read-only; import CrossAppBus, EcosystemSwitcher)
└── supabase/migrations/2026* (legacy files)      (Do NOT drop or alter)
```

---

## 10. EXACT TEST SUITE CONTRACT

Antigravity must run and pass these exact tests:

1. **`scoring.test.ts`**:
   - Verify maximum score equals 100.
   - Verify an agency with 14 employees in UK with pain and contact yields exactly `85/100`.
   - Verify missing pain signal deducts 20 points.
   - Verify out-of-bounds employee count (e.g. 150) awards 0 points for employee fit.
2. **`dateUtils.test.ts`**:
   - Friday + 3 business days = Wednesday.
   - Saturday + 3 business days = Wednesday.
   - Sunday + 3 business days = Wednesday.
   - Monday + 3 business days = Thursday.
3. **Database RLS & Immutability Test (`pgTAP` or Supabase CLI test script)**:
   - Attempting `UPDATE public.atlas_evidence SET raw_snippet = 'tampered'` throws `trg_prevent_evidence_mutation` exception.
   - User B cannot read User A's opportunities.
   - `legacy_kuro_sync` rejects `INSERT` or `UPDATE` statements.
4. **Playwright E2E (`atlas-vertical-slice.spec.ts`)**:
   - Fresh session $\rightarrow$ Navigate to `/objectives`.
   - Input `"Sell AI operations automation to 5-30 person digital agencies in US and UK"`.
   - Click "Propose Search Thesis" $\rightarrow$ Verify proposal card renders.
   - Click "Approve & Lock Search Thesis" $\rightarrow$ Verify badge says "Version 1 (Approved)".
   - Click "Run Acquisition" $\rightarrow$ Dispatches worker over `controlled_agency_feed.json`.
   - Navigate to `/` $\rightarrow$ Confirm 3 cards appear under "Morning Focus" with score breakdown.
   - Click "Review & Outreach" on top card $\rightarrow$ Drawer opens with evidence timeline and draft email.
   - Click "Copy Subject & Body" $\rightarrow$ Clipboard has text.
   - Click "Mark as Manually Sent" $\rightarrow$ Opportunity stage updates to `contacted`; next action displays "Follow up Wednesday".
   - Click "Mark Won", input `$3,500` $\rightarrow$ Verify deal value persisted.

---

## 11. STRICT PROHIBITIONS & BOUNDARY INVARIANTS

```text
STRICTLY FORBIDDEN:
1. DO NOT implement automated email sending or direct Resend API calls. Manual copy/send only.
2. DO NOT build web crawling, headless scrapers, or connect YC/Hacker News directories.
3. DO NOT drop kuro_pipeline_view or pipeline_crm.
4. DO NOT rewrite git history or force-push.
5. DO NOT commit or write private provider secrets into source files.
6. DO NOT couple Atlas database queries to Orion or Metaphor tables.
7. DO NOT use localStorage for business opportunities or scores.
8. DO NOT introduce random score generators or synthetic LLM confidence probabilities.
9. DO NOT build complex billing, invoicing, or double-entry revenue subsystems.
```

If Antigravity encounters any question or trade-off not resolved in this specification:
👉 **STOP IMMEDIATELY AND SURFACE THE DECISION TO THE FOUNDER.**
