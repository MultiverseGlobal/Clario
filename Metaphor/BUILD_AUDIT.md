# Metaphor Build Audit

**Date:** 2026-09-21
**Project:** Metaphor

## 1. Repository and Current Branch
- **Tree:** `C:\Users\SUDO\Documents\Pseudonyms\Metaphor`
- **Frontend App:** `frontend/`
- **Current Branch:** `main` (up to date with `origin/main`)

## 2. Framework, Router, Package Manager, Build Commands
- **Framework:** Next.js (16.2.12)
- **Router:** App Router (`src/app`)
- **Package Manager:** npm
- **Build Commands:**
  - `npm run dev` (next dev --turbo)
  - `npm run build` (next build --webpack)
  - `npm run start` (next start)
  - `npm run lint` (eslint)

## 3. Existing Route Map
- **Public:**
  - `/` (Landing page)
  - `/onboard`, `/onboard/step-1`, `/onboard/step-2`, `/onboard/connecting/[tool]`, `/onboard/ready`
- **Authenticated (`(app)` group):**
  - `/home`, `/work`, `/world`, `/context`, `/profile`, `/projects`, `/settings`, `/focus`, `/identity`, `/inbox`, `/integrations`, `/partitions`
- **API:**
  - `/api/copilot`
- **Missing/Incorrect Routes based on brief:**
  - `/signup` (currently missing)
  - `/network` (currently missing)
  - The default authenticated route should be "Your Connected World", replacing the older `/home`/`/projects` setup.
  - New required routes: `/tools`, `/handoffs`, `/connections` (to replace `/network`), `/context` (update to provenance-aware), `/world` (update to specific requirements).

## 4. Existing Landing and Onboarding Implementation
- **Landing Page:** Implemented in `src/app/page.tsx` with cinematic GSAP ScrollTriggers (The Context Gap, The Shared Layer), white canvas, and indigo accents. Missing the complete interaction sequence (clipboard, messenger, broken-bridge, context-preserving handoff sequence). Contains some extra numeric claims that need review/removal.
- **Onboarding:** Multi-step flow implemented, but stops at tool connection UI. State is currently persisted in `sessionStorage`. Inline connection panels and dedicated MCP setup steps are present but need verification and full alignment with the new specification.

## 5. Existing Auth Implementation
- **Auth Provider:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`).
- **Middleware:** `src/middleware.ts` uses `updateSession` from `@/utils/supabase/middleware`.
- **Status:** Auth is real (Supabase connected), but the complete signup and onboarding-state preservation flow is unverified/missing.

## 6. Existing Database, Storage, and Persistence Support
- **Database:** Supabase PostgreSQL.
- **Persistence:** Local `sessionStorage` used for onboarding state. Need to verify database schemas for Metaphor entities (Workspace, Participant, Connection, Capability, Handoff, Context record, etc.).

## 7. Existing API Routes and Server Actions
- `src/app/api/copilot/route.ts` exists but has a TypeScript error regarding `auth` on `SupabaseClient`.
- Most interactions likely use Supabase client directly or server actions (needs deeper inspection of `src/app/api` and `src/app/actions` if they exist).

## 8. Existing MCP or External Connector Support
- **Support:** Stubs exist in `/onboard/connecting/[tool]/page.tsx`.
- **Status:** Needs real transport handling, connection verification, and authorization logic.

## 9. Existing Design Tokens, Fonts, Icon Sources, Logos, and Motion Utilities
- **Tokens/CSS:** Tailwind CSS v4 (`@tailwindcss/postcss`), `globals.css` updated to pure white canvas, glass surfaces, ink black text, indigo (`#6366F1`) signal.
- **Fonts:** Cormorant Garamond (Display) and Satoshi (Body) assumed via CSS/layout. JetBrains Mono used for code/technical text.
- **Icons:** `@phosphor-icons/react` and `lucide-react`.
- **Motion:** `framer-motion` and `gsap`.
- **Logos:** `MetaphorLogo.tsx`.

## 10. Existing Tests, Lint, Typecheck, Browser QA, and Visual Verification Commands
- **Lint:** `npm run lint` (eslint).
- **Typecheck:** `npx tsc --noEmit`.
- **Tests:** No `test` script in `package.json`. No Jest/Vitest/Playwright configured.
- **Browser QA/Visual Verification:** None automated. Must use browser subagent or manual checks.

## 11. Existing Deployment Configuration
- Vercel (Next.js default, indicated by `.next`, `next.config.js`).

## 12. Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_SUPABASE_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 13. Missing Dependencies or Integrations
- No obvious missing base dependencies, but missing specific state management for complex onboarding-to-auth handoff if `sessionStorage` is insufficient.
- No automated testing framework.

## 14. Protected Actions
- Required Authorization: Creating workspace, connecting MCP tools, viewing handoffs, exploring context, modifying settings.
- External Connections: MCP handshakes, token/key exchange for third-party tools (Claude, ChatGPT, etc.).

## 15. Proposed Implementation Sequence
1. **Landing Page Correction:** Fix missing visual story elements (clipboard, messenger, broken-bridge), remove unapproved numeric claims.
2. **Onboarding & Signup Completion:** Build out the inline connection panel, dedicated MCP setup, verify connection flow, implement real `/signup` route, and ensure state persistence from onboarding to authenticated session.
3. **Data Model & Permission Audit:** Verify/implement Supabase schema for Workspace, Tool, Handoff, Context Record, etc.
4. **Authenticated Shell "Your Connected World":** Replace the old prototype shell. Build `/home` (or `/world`) to match the new "Connected World" specification (relationship view, recent movement).
5. **Missing Routes Implementation:** Build `/tools`, `/handoffs`, `/context`, `/connections`, `/world` (graph/list), and refine `/settings`.
6. **Final Verification:** Run all required checks (typecheck, lint, browser QA, auth flow, responsive, motion, etc.) as per the definition of done.
