# Metaphor Route & Component Preservation Audit

**Audit Date:** 2026-09-21  
**Target:** Metaphor Architecture & Workspace Routes  
**Standard:** Maintain active functionality while deprecating legacy project-dashboard patterns.

---

## 1. Route Preservation Inventory

| Route | Historical Status | Target Status | Disposition & Rationale |
|---|---|---|---|
| `/` | Public Landing Page | **Preserved & Aligned** | Core strategic message ("Make your AI tools work as one") preserved. Pure White Sea canvas active. |
| `/onboard/step-1` | Initial Name input | **Preserved & Enhanced** | Bare underline styling with Cormorant Garamond display. Saves project scope to session. |
| `/onboard/step-2` | Tool Selection | **Preserved & Upgraded** | Replaced placeholder vectors with authentic SVG brand marks (OpenAI, Anthropic, GitHub, Notion, Antigravity, Cursor). |
| `/signup` | Shell / 404 in older builds | **Fully Implemented** | Added full Workspace Summary panel (carrying project & connected tools) and validated account form. |
| `/login` | Dense card | **Redesigned** | Replaced with White Sea floating glass capsule and bare underline fields. |
| `/world` | Empty project stub | **Transformed to Main Home** | Converted to "Your Connected World": participants matrix, latency health, activity digest, pending approvals. |
| `/tools` | Seeded card grid | **Redesigned** | Clean registry with hairline dividers, authentic tool marks, and explicit telemetry notice. |
| `/handoffs` | Seeded demo cards | **Redesigned** | Editorial timeline ledger with directional flow, expandable payload drawers, and clear demo notice. |
| `/context` | Boxy search widget | **Redesigned** | Bare underline search field, Cormorant Garamond synthesis display, and provenance drawer. |
| `/connections` | Basic card | **Redesigned** | Minimal MCP server registry and OAuth credentials manager. |
| `/settings` | Config dashboard | **Preserved** | Accessible from floating navigation. |
| `/community`, `/showcase`, `/canvas` | Project-platform routes | **Deprecated from Primary Nav** | Removed from `FloatingNav` to centralize around "Your Connected World". |

---

## 2. Component Preservation & Refactoring

- **`CanvasSea.tsx`**: Preserved fluid wake and ripple dynamics. Fixed cursor visibility by removing `cursor: none !important`. Upgraded to wall-clock `performance.now()` timing (600ms lifespan) and 12px held ripple state. Added static dot-grid fallback for reduced motion.
- **`FloatingNav.tsx`**: Refactored navigation links to reflect the core connected-world architecture:
  `Your Connected World · Tools · Handoffs · Context · Connections · Settings`.
- **`middleware.ts`**: Refactored to never block or bounce unauthenticated visitors away from `/onboard` or `/signup` flows.
