# Full-Platform Product Development Phases

Use these phases for any serious web and Expo/React Native product. Do not skip phases silently. A phase may be lightweight for a small feature, but each phase must produce an explicit artifact or decision.

## Phase 0 — Brief and constraints

Capture the audience, product promise, core problem, non-goals, platforms, supported devices, launch scope, business constraints, legal or privacy constraints, existing assets, and success criteria. Separate facts from assumptions. Record open questions that could change the architecture.

**Gate:** The user, problem, platforms, primary outcome, and constraints are clear enough to plan.

## Phase 1 — Product and UX strategy

Define the primary user jobs, user journeys, information architecture, navigation model, page/screen inventory, content hierarchy, critical states, and recovery paths. Include web and mobile differences. Create low-fidelity flow diagrams before styling.

**Gate:** Every primary flow has entry, action, feedback, success, error, cancellation, retry, and return paths.

## Phase 2 — Experience and visual system

Choose the product-specific design direction, semantic tokens, typography, components, content rules, materials, motion, responsive behavior, accessibility requirements, and one distinctive signature. Validate the design against the existing brand files. Avoid implementing visuals that have no product or UX job.

**Gate:** The visual system is specific, tokenized, accessible, and implementable on web and mobile.

## Phase 3 — Technical architecture

Choose the client platforms, navigation structure, state boundaries, data-fetching strategy, server responsibilities, storage, authentication, authorization, integrations, error strategy, observability, and deployment target. Prefer the simplest architecture that can support the real requirements. Do not add microservices, queues, or realtime systems without a concrete need.

**Gate:** The architecture diagram, ownership boundaries, environment strategy, and failure modes are documented.

## Phase 4 — Data model and contracts

Model entities, relationships, ownership, lifecycle, indexes, constraints, privacy, retention, migrations, and seed or fixture strategy. Define API procedures or endpoints with typed inputs, outputs, errors, authorization, pagination, sorting, filtering, idempotency, and versioning expectations. The client must not invent fields, routes, or response shapes.

**Gate:** The database schema, migrations, API contract, and client types agree.

## Phase 5 — Vertical slice

Implement one complete user journey from UI to database and back. Include loading, empty, error, permission, offline or retry behavior, optimistic updates only where safe, analytics or observability events where required, and tests. This slice validates the architecture before broad implementation.

**Gate:** One real flow works end to end on the target platforms.

## Phase 6 — Foundation and shared systems

Build the theme, tokens, navigation shells, authentication boundary, API client, error boundary, form patterns, data-fetching conventions, reusable components, logging, and test utilities. Keep shared code small and purposeful. Avoid abstracting a pattern before its second real use.

**Gate:** Shared foundations reduce duplication without hiding behavior or slowing iteration.

## Phase 7 — Feature implementation

Implement features in user-value order. For each feature, follow the contract loop: schema or contract, server helper, API procedure, client query or mutation, UI states, responsive/mobile behavior, accessibility, tests, and review. Finish a feature before beginning the next unless parallel work has explicit ownership boundaries.

**Gate:** No feature has a dead-end, fake data, unhandled error, or undocumented placeholder.

## Phase 8 — Verification and hardening

Run unit, integration, API contract, navigation, accessibility, visual, and end-to-end tests. Test web at mobile, tablet, laptop, desktop, and wide widths. Test mobile on iOS and Android where supported, plus keyboard, screen reader, large text, reduced motion, offline, slow network, rotation, backgrounding, and permission denial.

**Gate:** Known failures are fixed or documented with an owner and release decision.

## Phase 9 — Performance and security

Measure startup, bundle size, rendering, list scrolling, image loading, network waterfalls, database queries, API latency, memory, and error rates. Review authentication, authorization, secrets, input validation, output safety, rate limits, storage permissions, dependencies, logs, and privacy. Fix data and flow problems before cosmetic optimization.

**Gate:** Performance budgets and security checks pass for the intended launch scope.

## Phase 10 — Release and operations

Prepare environment variables, migrations, build profiles, app metadata, web deployment, mobile builds, crash reporting, analytics, logging, rollback strategy, support paths, and release notes. Verify production configuration without exposing secrets. Use staged rollout where practical.

**Gate:** The product can be deployed, observed, rolled back, and supported.

## Phase 11 — Post-release learning

Review real behavior, errors, performance, retention or task completion, support feedback, and accessibility reports. Prioritize improvements by user impact, confidence, effort, and risk. Do not add features simply because the roadmap contains them.

## Definition of done

A feature is done only when its intended user flow works, its data contract is real, its states are complete, its permissions are correct, it works on target platforms, it has tests, it meets accessibility and performance expectations, and its operational behavior is understood. A beautiful screen with a fake API is not done. A functional API with an unusable flow is not done.
