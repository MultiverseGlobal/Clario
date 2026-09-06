# Plan Comparison and Upgrade

## Executive judgment

The attached plan had the right central insight: an agent becomes valuable when it has a visual constitution, specialist capabilities, real references, browser feedback, and a repeated critique loop. Its strongest phrase is the loop: **understand → reference → design → build → inspect → compare → critique → refine → verify**. That is more useful than a single “make it beautiful” prompt.

The plan needed improvement in five places. It treated a broad MCP stack as more central than the product’s source of truth. It described many libraries and skills without a strict loading strategy. It focused heavily on visual frontend quality while giving less operational detail to data contracts, API reality, authentication, migrations, security, release, and mobile-native behavior. It used some current-version claims that should be rechecked at installation time. It also presented the idea of “no errors” too absolutely; a responsible system should instead require tests, explicit failure states, observability, and a verified/not-verified report.

## Comparison

| Area | Attached proposal | Improved system |
|---|---|---|
| Core idea | Build a design machine with vision, skills, tools, references, and QA. | Keep the machine, but make product purpose and verified repository truth the highest authority. |
| Taste | Design Director plus ten taste criteria. | Added `taste-engine.md` with brief inference, variance/motion/density dials, anti-slop locks, reference discipline, mobile taste, and hard pre-flight. |
| MCPs | Recommended Figma, Playwright, GitHub, filesystem, Context7, and future custom MCPs. | Use a minimum connector set by job: Figma for design context, Playwright for verification, research MCP only when needed. Avoid tool pollution and permission sprawl. |
| Motion | Motion for routine UI, GSAP for cinematic sequences, Three.js/R3F/Drei for 3D. | Retained the separation, added state machines, fallbacks, reduced motion, device budgets, and a rule that immersive effects must earn their cost. |
| Components | shadcn as infrastructure and custom visual language above it. | Added database/API/client boundaries and a platform-specific component strategy for web versus Expo. |
| Skills | Many specialist skills in `.agents/skills`. | Added a taste engine and documented when to load specialized rules. Keep each skill small, reviewed, and non-duplicative. |
| References | Figma, screenshots, design systems, and named product worlds. | Added source/provenance, extracted principle, deliberate non-copying, license, and verification fields. |
| Backend | Mostly absent. | Added full phase map, architecture, database/API/backend contracts, security, performance, testing, release, and operations. |
| Mobile | Mostly implied by responsive design and mobile image skills. | Added explicit Expo/React Native rule for safe areas, navigation, touch, gestures, haptics, offline, iOS/Android differences, and low-power performance. |
| QA | Browser and visual QA loop. | Added unit, integration, contract, navigation, accessibility, end-to-end, device, performance, security, deployment, and rollback checks. |
| Completion | Implied high-quality final interface. | Requires verified/partially verified/not tested reporting and forbids claims of “error-free” without evidence. |

## What to adopt from the attached plan

Adopt the constitution, the design-director role, the reference-to-principle translation step, the taste criteria, the separation between everyday motion and cinematic motion, the “3D atmospheric rather than demonstrative” rule, the material hierarchy, and the inspect/compare/refine loop.

Do not adopt every MCP or library by default. Do not use an external taste skill as an unquestioned authority. Do not let a visual reference override brand, accessibility, product purpose, API reality, or mobile conventions. Do not turn “million-dollar” into permission for visual excess.

## Recommended operating order

Use this order in Antigravity:

```text
1. Inspect the real repository and existing product truth.
2. Infer the brief and choose variance, motion, and density.
3. Plan UX, content, navigation, and states.
4. Define visual direction, tokens, and one signature.
5. Define architecture, schema, API contracts, and failure modes.
6. Build one vertical slice.
7. Inspect browser/device output.
8. Run taste, accessibility, performance, security, and contract reviews.
9. Fix the largest problem.
10. Expand feature by feature.
```

This order prevents the common failure mode of producing a beautiful first screen that is disconnected from a real database, API, user flow, or mobile navigation model.

## Taste Skill finding

The likely skill the user saw is [Taste Skill](https://www.tasteskill.dev/), an open-source framework for AI coding agents. Its current default is `design-taste-frontend` v2 experimental. Its documentation describes brief inference, design-system mapping, dual-mode contrast, redesign audits, animation skeletons, anti-slop bans, a block-library schema, and a hard pre-flight. The GitHub repository showed 84k+ stars and an MIT license during research. [1] [2]

The correct approach is to add a **Pseudonyms-adapted taste engine**, not blindly install the whole bundle. The local `taste-engine.md` in this pack preserves the useful concepts while making them subordinate to Pseudonyms’ product purpose, existing brand files, Expo behavior, backend truth, licensing, accessibility, and performance.

If you want to test the official skill separately, use the official command from its documentation in a branch or temporary copy first:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Review its generated files before combining them with this pack. Do not install every Taste Skill variant at once; v2 is explicitly experimental and multiple overlapping skills can create contradictory instructions.

## References

[1]: https://github.com/Leonxlnx/taste-skill “Taste Skill repository, stars, license, skills, and installation”
[2]: https://www.tasteskill.dev/docs “Taste Skill documentation and v2 behavior”
[3]: https://github.com/figma/mcp-server-guide “Figma MCP Server Guide”
[4]: https://github.com/microsoft/playwright-mcp “Microsoft Playwright MCP”
[5]: https://developer.apple.com/design/human-interface-guidelines/immersive-experiences “Apple immersive experiences guidance”
