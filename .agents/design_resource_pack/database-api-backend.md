# Database, API, and Backend Rule

Apply whenever a feature stores data, reads server data, mutates state, integrates an external service, or requires authentication.

## Contract-first sequence

Follow this order unless the existing architecture proves a better one: define the domain behavior; model or update the database schema; generate and inspect the migration; apply the migration in the intended environment; add server query helpers; add the typed API procedure or endpoint; add authorization and validation; wire the client query or mutation; implement all UI states; then add tests and observability.

In the Manus full-stack template, use `drizzle/schema.ts`, generate migrations with `pnpm drizzle-kit generate`, inspect the generated SQL, add helpers in `server/db.ts`, add procedures in `server/routers.ts`, and consume them through `trpc.*.useQuery` or `trpc.*.useMutation`. Do not introduce Axios, ad-hoc REST routes, or duplicate contract files when the existing tRPC architecture already provides the contract.

## Data modeling

Model ownership and lifecycle explicitly. Use foreign keys, unique constraints, not-null rules, enums or constrained values, timestamps, soft deletion only when justified, and indexes based on real query patterns. Keep user-owned data scoped to the authenticated user or tenant. Avoid duplicating derived values unless there is a measured performance need and a clear invalidation strategy.

Every schema change requires a migration, an inspection of the generated SQL, a rollback or recovery consideration, and a test or verification query. Never change the TypeScript schema while leaving the actual database behind.

## API contracts

Every operation must define name, purpose, authenticated roles, input schema, output schema, error codes, pagination or filtering behavior, idempotency, side effects, and observability. Keep response shapes stable and typed. Return explicit empty results rather than `undefined` when the client needs to distinguish empty from not loaded. Never make the client guess field names or construct database queries.

Use optimistic updates only for reversible, low-risk operations such as list edits, toggles, or profile drafts. For authentication, payments, destructive operations, permissions, and irreversible changes, show explicit pending state and invalidate or refetch from the confirmed server result.

## Backend boundaries

Keep business decisions on the server. Validate all client input on the server even if the client validates it first. Normalize external data at the integration boundary. Set timeouts, handle retries only when safe, prevent duplicate side effects, and record correlation information without logging secrets or sensitive payloads.

## Authentication and authorization

Use the existing authentication context. Public procedures must be intentionally public; protected procedures must verify the current user and ownership or role for every operation. Do not trust user IDs, roles, prices, permissions, or feature flags sent by the client. Check authorization again on the server for every mutation.

## Client integration

The client should use the existing typed client and show loading, empty, error, success, disabled, retry, and permission states. Do not display fake numbers or placeholder records as if they are real. After a mutation, update the cache optimistically only when safe or invalidate the relevant query after confirmed success.

## Contract verification

Before declaring a feature complete, verify the full path: database row or external source → server helper → API procedure → typed client data hook → state transformation → screen rendering → navigation or next action. Test valid input, invalid input, unauthorized access, missing data, duplicate requests, network failure, and the expected empty state.
