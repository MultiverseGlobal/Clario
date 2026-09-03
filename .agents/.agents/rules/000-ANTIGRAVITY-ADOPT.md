# Antigravity Adoption Prompt — Read This First

You are adopting this repository’s design operating system as the default standard for every product interface you create, modify, review, or propose. Treat the files referenced below as working rules, not as a mood board. Before writing code, plan the product experience, inspect the existing codebase and assets, and explain the design decisions you are adopting.

Read and apply:

- `@00-design-core.md`
- `@10-tokens-and-themes.md`
- `@20-materials-glass.md`
- `@30-motion.md`
- `@40-components-and-content.md`
- `@50-quality-gate.md`
- `@simple-design-process.md`
- `@design-strategist.md`
- `@cross-device-layout-and-ux.md`
- `@libraries-mcp-skills-fonts.md`
- `@premium-prompts.md`
- `@immersive-components-and-animation.md`
- `@user-taste-and-wonder-profile.md`


## Immersive quality

Use `@immersive-components-and-animation.md` when the product needs expressive interaction, stateful animation, spatial continuity, data storytelling, or a memorable signature. Use `@user-taste-and-wonder-profile.md` to understand the project’s preference for high taste, restraint, strategic challenge, wonder, and cross-device craft. Immersion must remain useful, accessible, interruptible, performant, and understandable without effects.

## Mandatory adoption process

1. Inspect the product, repository, stack, routes, existing components, current tokens, assets, and constraints. Do not assume the target is a desktop website. Determine whether it is web, mobile, tablet, desktop, native, responsive, or multi-platform.
2. Identify the audience, context of use, primary user goal, user flow, critical states, content hierarchy, and business or product constraint.
3. Propose a compact design direction: named semantic tokens, type roles, layout model, component grammar, motion intent, material strategy, accessibility approach, and one product-specific signature.
4. Critique your own direction before implementation. Explicitly identify generic AI defaults, unnecessary effects, risky assumptions, accessibility risks, performance risks, and likely failure points on other devices.
5. If the brief is ambiguous, make a reasonable assumption, state it, and ask only the smallest number of questions that materially affect the product. Never block progress over a minor preference.
6. Build the user flow and content structure before visual decoration. Use real or realistic content lengths. Implement states, responsiveness, keyboard behavior, reduced motion, reduced transparency, and error recovery before polish.
7. Use component libraries and MCPs selectively. Reuse accessible primitives for foundations, animated libraries for optional expression, and Figma or browser context only when it improves fidelity. Audit every imported effect.
8. Test at mobile, tablet, laptop, desktop, wide desktop, touch, keyboard, reduced motion, high contrast, slow network, and long-content conditions. Treat cross-device behavior as part of design, not a later engineering task.
9. Run the quality gate. Take screenshots or inspect rendered output. Fix the most damaging issue first. Remove one unnecessary decoration before delivery.
10. Report the final decisions, checks completed, unresolved risks, and the next highest-value improvement.

## Taste standard

Have taste by making fewer, stronger decisions. Do not combine glassmorphism, gradients, bento grids, huge type, neon, parallax, floating cards, and excessive rounding by default. Choose the product’s own world, audience, content, and interaction model as the source of personality. Spend boldness in one signature element and keep the rest disciplined.

Outthink the request when it would produce a weak or unsafe result. If a requested design harms hierarchy, accessibility, performance, comprehension, or cross-device usability, explain the problem and propose a better option. Preserve the user’s intent while improving the method. Do not silently change core requirements.

## Non-negotiable output behavior

Never claim that an interface is premium, production-ready, or error-free without running the quality gate. Never remove focus rings, suppress reduced motion, rely on hover alone, use color as the only state cue, ship unlicensed fonts, copy proprietary brand assets, or hardcode visual values when semantic tokens exist. The target is not to make a screenshot look expensive. The target is to make the entire experience feel considered, coherent, useful, accessible, fast, and specific to its product.
