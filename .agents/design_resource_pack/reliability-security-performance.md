# Reliability, Security, Testing, and Performance Rule

Apply before and during implementation of every serious feature. “No errors” means the system has explicit failure behavior, automated checks, and observable production behavior—not that an agent can promise zero defects.

## Testing pyramid

Write focused unit tests for pure logic and validation, integration tests for database and API behavior, component tests for important UI states, navigation tests for critical flows, and end-to-end tests for the highest-value journeys. Test both success and failure. A test that only renders the happy path is incomplete.

## Verification loop

After each meaningful change, run the smallest relevant check: typecheck, lint, unit test, integration test, build, or device/browser smoke test. Before delivery, run the full project test and build commands actually defined by the repository. Do not invent commands without inspecting `package.json` or project documentation. Report commands run and results.

## Performance budgets

Measure startup or first render, route transition, input response, list scrolling, image loading, bundle size, API latency, database query latency, memory, and error rate. Optimize the critical path first. Virtualize long lists, paginate large data, debounce expensive searches, avoid unnecessary re-renders, reserve media space, lazy-load non-critical content, and pause offscreen animation. Treat blur, shaders, 3D, video, large shadows, and continuous canvas work as explicit budgets.

## Web performance

Avoid layout shift, oversized client bundles, waterfall requests, unnecessary hydration, unbounded DOM lists, and images shipped at larger dimensions than displayed. Keep keyboard input immediate. Use semantic HTML and progressive rendering where appropriate.

## Expo performance

Use virtualized lists for long data, keep expensive computation off the render path, optimize images, avoid recreating large style and data objects, and test on a lower-powered physical device or realistic throttled environment. Check iOS, Android, and web separately when supported. Do not assume an effect that is fast in a desktop browser is acceptable on a phone.

## Security baseline

Validate and constrain all input on the server. Enforce authentication and authorization at every protected operation. Keep secrets out of source code and client bundles. Review file uploads, storage permissions, redirect URLs, external API credentials, rate limits, logs, dependency vulnerabilities, and error messages. Never expose stack traces, tokens, private identifiers, or sensitive payloads to users or logs.

## Data safety

Define data ownership, retention, deletion, backup, migration, and recovery behavior. Avoid collecting data that is not needed. Make destructive actions explicit and recoverable where possible. Ensure tenant or user boundaries are tested with another user’s identifiers.

## Release readiness

Before release, verify environment variables, database migrations, build profiles, mobile app identifiers, web configuration, authentication callbacks, analytics, crash reporting, logging, rollback, and support paths. Test production-like builds, not only a development server.

## Evidence-based completion

The final report must distinguish **verified**, **partially verified**, and **not tested**. It must list known errors, performance risks, security risks, device coverage, browser coverage, and the next recommended check. Never claim “error-free,” “secure,” or “fast” without evidence.
