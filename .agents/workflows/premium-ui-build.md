# Premium UI Build Workflow

## Description

Plan, implement, and review a product-specific interface using the premium design rules.

## Steps

1. Inspect the repository, existing routes, stack, assets, and current design tokens. Do not assume a framework or overwrite existing design decisions without evidence.
2. State the user, screen job, content hierarchy, dominant interaction, and one product-specific visual signature.
3. Draft a compact design plan with semantic color roles, type roles, spacing, radii, surfaces, component states, responsive behavior, and motion intent.
4. Compare the plan against generic AI defaults. Remove any effect or pattern that is present only because it is fashionable rather than useful.
5. Implement tokens and layout primitives first. Then implement components and states. Then add the signature interaction or art direction.
6. Add reduced-motion, reduced-transparency, keyboard focus, accessible names, error, empty, loading, disabled, and responsive states before visual polish.
7. Run the quality gate from `@50-quality-gate.md`. Capture screenshots at multiple widths and fix the most visible issue first.
8. Report what was built, what was verified, what remains uncertain, and which design decisions are intentionally product-specific.
