# Full-Platform Architecture Rule

Apply when designing or modifying a product that has web, Expo/React Native, a backend, a database, integrations, authentication, or multiple clients.

## Source of truth

Inspect the existing repository before proposing architecture. Use the actual package manifest, routes, schema, environment definitions, server helpers, API router, navigation layouts, and shared types. Never invent a route, table, procedure, environment variable, component, hook, or service and present it as existing. Mark every proposed artifact as **existing**, **to create**, or **unknown**.

## Simplicity boundary

Prefer a modular monolith and a single typed contract layer until scale or team ownership proves otherwise. Do not introduce microservices, event buses, realtime infrastructure, background queues, multiple state libraries, or a second API style without a documented requirement. Each new dependency must have a job, owner, license, maintenance signal, and removal path.

## Layer ownership

Keep responsibilities explicit. The database owns durable data constraints. Server helpers own queries and transformations. API procedures own authentication, authorization, input validation, output shape, and domain operations. Clients own presentation, local interaction state, cache use, and platform-specific interaction. Shared types and schemas describe contracts but do not hide business behavior.

## Client parity

Web and Expo clients should share product semantics, tokens, content rules, and API contracts while respecting platform conventions. Do not force DOM components into React Native or native components into web. Define where behavior is shared and where presentation is platform-specific.

## Change planning

Before a cross-layer change, state the dependency order: schema or data shape, migration, server helper, API contract, client data hook, UI states, navigation, tests, observability, and release configuration. Implement in a vertical slice first. Do not update the UI to consume a contract that does not exist.

## Failure and recovery

For every network or data operation, define loading, empty, success, validation failure, authorization failure, not-found, conflict, offline, timeout, retry, cancellation, and unexpected-error behavior. Preserve user work where possible. Do not swallow errors or show success before the server confirms a critical operation.

## Environment and deployment

Use typed environment access. Keep secrets server-side. Never commit `.env` files or expose private keys in client bundles. Document development, preview, and production differences. A deployment plan must include migrations, seed or fixture behavior, build configuration, rollback, and observability.

## Architecture review

Before implementation, produce a short architecture record: current state, target state, decisions, alternatives rejected, data ownership, API contract, platform differences, failure modes, security risks, performance risks, and verification plan.
