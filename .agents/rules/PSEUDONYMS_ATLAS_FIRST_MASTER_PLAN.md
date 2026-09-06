# Pseudonyms Atlas-First Master Plan

**Status:** Confirmed direction for the next planning cycle

## North star

> **A one-person company opens Pseudonyms and immediately sees who it should talk to next.**

Pseudonyms is not four apps being built in parallel. It is one economic loop first, with additional products added when evidence shows where the founder remains the bottleneck.

## Confirmed product architecture

| Product | V1 platform | Domain responsibility | V1 role |
|---|---|---|---|
| Pseudonyms | Responsive web shell | Identity, authentication, account, product access, selector | Entry point and movement between worlds. |
| Atlas | Responsive web app | Opportunities, qualification, contacts, outreach, follow-up, pipeline | First economic proof and first complete customer-acquisition loop. |
| Metaphor | Responsive web app | Context, files, tools, handoffs, shared project state | Added after Atlas exposes context and tool bottlenecks. |
| Orion | Expo / React Native | Personal AI, planning, journal, memory, goals, tasks, execution | V1 mobile operator, added after the first economic loop is proven. |
| Clario | Responsive web app | References, analysis, rights/provenance, creative production, exports | Added when creative production becomes a measured bottleneck. |

The codebase is one monorepo with independently deployable applications and shared packages. The products share identity conventions, tokens, primitives, types, and utilities, but each owns its domain and maintains its own navigation context.

## Data boundary

Pseudonyms must not become a giant shared database. It owns identity and access. Each product owns its domain data. Cross-product handoffs should use explicit, typed contracts rather than hidden direct table access.

```text
Pseudonyms: accounts, identities, sessions, product access, selector state
Atlas: opportunities, evidence, qualification, contacts, outreach, follow-ups
Metaphor: sources, files, context objects, tools, handoffs, project state
Orion: conversations, plans, journals, memories, goals, tasks, execution
Clario: references, analyses, rights, creative blueprints, exports
```

## Phase 0 — Pseudonyms foundation

Build only identity entry, authentication, account context, product access, the selector/orb direction, and the shared design language. Do not build a generic dashboard or four product modes inside one screen.

**Gate:** A user can enter Pseudonyms, understand the four worlds, select Atlas, and return to the ecosystem without confusion.

## Phase 1 — Atlas economic vertical slice

Atlas should answer the morning question:

> **Which three opportunities deserve my attention today, and what should I do next?**

### Screen 1: Intent setup

The founder states a target in natural language or chooses a saved targeting brief. The system confirms the interpreted target, constraints, source coverage, and what will happen next. It must not pretend that an unrun search has produced results.

### Screen 2: Opportunity discovery

Show a ranked set of real or clearly labeled fixture opportunities. Each item must have a reason for appearing, source/evidence status, confidence, freshness, and a clear next action. Avoid invented metrics and generic lead counts.

### Screen 3: Opportunity detail

Show the evidence panel, why the opportunity matches, relevant contact information, uncertainty, source links, and qualification controls. The founder should be able to approve, reject, save, or request more evidence.

### Screen 4: Qualification

Use a small set of explicit criteria. Show what is known, inferred, and missing. Let the founder change the qualification decision without hiding the evidence or silently changing the score.

### Screen 5: Outreach preparation

Generate a draft only after approval. Show the source context, intended recipient, draft, assumptions, and editable fields. Never send automatically in V1. The founder must approve the message and destination.

### Screen 6: Follow-up and next action

Show scheduled or recommended follow-ups, owner, timing, status, and cancellation or edit controls. A completed action should return the founder to the next highest-value opportunity.

**Atlas gate:** One founder can go from target intent to reviewing evidence, approving an opportunity, preparing outreach, and creating a follow-up without dead ends or fake backend behavior.

## Phase 2 — Use Atlas in reality

Use Atlas on actual opportunities. Record time to first useful opportunity, evidence quality, qualification accuracy, outreach approval rate, follow-up completion, response quality, and where manual work remains. Do not expand the ecosystem until the workflow produces learning.

## Phase 3 — Metaphor

Build only the context loop Atlas needs: connect one source, ingest or receive one context object, review it, approve it, and use it in a handoff. Avoid a giant knowledge graph until the founder needs one.

## Phase 4 — Orion

Build the mobile operator loop around the real bottlenecks discovered in Atlas and Metaphor. Begin with one action such as reviewing opportunities, planning the day, journaling a decision, or coordinating the next step. Keep Expo navigation, safe areas, offline behavior, interruptions, and mobile accessibility explicit.

## Phase 5 — Clario

Build the smallest creative-production proof: reference ingestion, structural analysis, rights/provenance review, original blueprint, and export. Treat Clario as a studio, not a spreadsheet of assets.

## Monorepo shape

```text
pseudonyms/
├── apps/
│   ├── pseudonyms-web/
│   ├── atlas-web/
│   ├── metaphor-web/
│   ├── clario-web/
│   └── orion-mobile/
├── packages/
│   ├── ui/
│   ├── design-tokens/
│   ├── auth/
│   ├── api-contracts/
│   ├── motion/
│   ├── icons/
│   └── config/
├── services/
├── design/
├── .agents/
└── tests/
```

Do not create `services/` until a real server boundary or background process exists. The architecture should be able to begin as a modular monolith with clear domain modules and evolve only when evidence requires separation.

## Decision rules

Build the product that proves the economic loop, not the product that is easiest to decorate. Use real evidence before ranking opportunities. Keep outreach human-approved. Preserve uncertainty. Do not let the orb, glass, animation, graph, or AI language obscure the next action. If an effect makes the workflow slower or less trustworthy, remove it.

## First planning prompt for Antigravity

```text
Adopt the confirmed Pseudonyms direction from @PSEUDONYMS_ATLAS_FIRST_MASTER_PLAN.md.

Pseudonyms is the identity/ecosystem layer. Atlas is the first economic proving ground. Orion is Expo/React Native in V1. Atlas, Metaphor, and Clario are responsive web apps. The products are independent deployables in one monorepo with domain-owned data boundaries.

Do not implement yet. Inspect the current repository and return:

1. Existing files, apps, routes, schemas, APIs, and deploy assumptions.
2. What can be preserved as prototype research and what must be discarded.
3. The Atlas vertical slice from intent to follow-up.
4. The database entities and relationships required for that slice.
5. The typed API contracts and authorization rules.
6. The Pseudonyms shell and Atlas screen plan.
7. The mobile/web boundaries.
8. Test, performance, accessibility, and security gates.
9. Unknowns that must be resolved before implementation.

Do not invent routes, fields, APIs, data, or existing components. Wait for approval before changing files.
```
