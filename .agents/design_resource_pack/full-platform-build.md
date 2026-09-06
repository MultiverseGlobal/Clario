# Full Platform Build Workflow

Use this workflow for a new product, major feature, or cross-platform release. Start by inspecting the repository and stop at each gate when a decision is missing or a check fails.

## Step A — Brief

Return the audience, problem, promise, non-goals, platforms, launch scope, constraints, existing files, assumptions, and success criteria. Mark each item as known, assumed, or unknown.

## Step B — Experience

Return the primary user flow, page and screen inventory, navigation model, information architecture, content hierarchy, states, error recovery, mobile differences, and responsive behavior. Identify the first valuable vertical slice.

## Step C — Design

Return visual direction, semantic tokens, typography, component grammar, materials, motion, immersive signature, accessibility, and performance budgets. Identify generic patterns being rejected.

## Step D — Architecture

Return client and server boundaries, navigation structure, state strategy, authentication, authorization, database ownership, API contracts, integrations, error strategy, environment strategy, deployment target, observability, and failure modes. Mark existing versus to-create files.

## Step E — Contract

Define schema, migration, query helper, procedure or endpoint, input and output types, errors, permissions, pagination, idempotency, side effects, and test cases. Verify that no client call points to a nonexistent route or field.

## Step F — Vertical slice

Implement one complete flow from UI to server or local persistence and back. Include loading, empty, success, validation error, permission error, offline or retry behavior, accessibility labels, responsive/mobile behavior, and tests. Stop for review.

## Step G — Shared foundations

Only after the vertical slice proves the direction, extract tokens, navigation shells, shared components, API helpers, state utilities, error boundaries, logging, and test utilities. Do not abstract hypothetical use cases.

## Step H — Feature passes

Implement remaining features in user-value order. For each feature, repeat schema or contract, server, client, states, navigation, accessibility, performance, tests, and review. Keep ownership boundaries clear.

## Step I — Hardening

Run typecheck, lint, unit tests, integration tests, component tests, navigation tests, end-to-end tests, builds, accessibility review, visual review, and performance checks. Test web widths and mobile iOS/Android behavior when supported.

## Step J — Release

Verify production configuration, migrations, authentication callbacks, mobile builds, web deployment, secrets, app metadata, crash reporting, analytics, logging, rollback, support, and release notes. Produce a verified/partial/not-tested report.

## Stop conditions

Stop and ask for a decision if the product goal is contradictory, a required API or database fact is unknown, a destructive migration is unsafe, authorization is unclear, a dependency license is unclear, a core flow has no recovery path, or the result cannot be tested on an intended platform. Do not compensate for missing truth by inventing code.
