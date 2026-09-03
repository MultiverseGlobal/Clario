# Premium Product Design System for Antigravity

**Purpose.** This pack gives Antigravity a durable design language for building high-value product interfaces: clear hierarchy, premium typography, restrained materials, purposeful motion, accessible interaction, and a repeatable review workflow.

A design system cannot guarantee a valuation or a “million-dollar asset.” It can, however, raise the quality floor, reduce generic AI output, and make design decisions consistent across a product ecosystem. The pack therefore treats premium quality as a measurable practice rather than a decorative style.

## Install in Antigravity

Copy the files into the project repository as follows:

```text
.agents/
  rules/
    00-design-core.md
    10-tokens-and-themes.md
    20-materials-glass.md
    30-motion.md
    40-components-and-content.md
    50-quality-gate.md
  workflows/
    premium-ui-build.md
    premium-ui-review.md
```

Create or edit `00-design-core.md` as an **Always On** workspace rule. Make the other files **Model Decision** or **Glob** rules where appropriate. Antigravity supports Markdown Rules under `.agents/rules`, allows `@filename` references, and limits each Rule or Workflow file to 12,000 characters. The global equivalent is `~/.gemini/GEMINI.md`. [1]

## Recommended rule composition

The core rule defines the non-negotiable product-quality standard. Token, material, motion, component, and quality-gate rules provide specialized detail without exceeding the per-file limit. The build workflow forces the agent to plan before coding; the review workflow forces it to critique screenshots, keyboard behavior, responsive states, and reduced-motion behavior before calling the work complete.

## Research basis

The pack combines Apple’s Human Interface Guidelines and Liquid Glass announcement, Material Design token architecture, Motion for React accessibility guidance, W3C accessibility guidance, MDN implementation documentation, web.dev performance guidance, first-hand design-system commentary, and open-source DESIGN.md / frontend-design practice. The source register is in `sources.md`.

## Operating principle

> **Use a distinctive point of view, but spend boldness in one place. Keep the rest of the interface quiet, legible, and disciplined.**

Every project should choose one product-specific signature: for example, a tactile material transition, a content-first editorial layout, a distinctive data visualization, or a memorable interaction. Do not combine glass, gradients, bento cards, oversized type, parallax, neon, and excessive rounding merely because each is fashionable.

## Expanded operating system

The first file to install or read is `000-ANTIGRAVITY-ADOPT.md`. It is an adoption prompt, not a style sheet: it tells Antigravity how to inspect the project, plan the product, absorb the rules, challenge weak methods, design for all devices, and run the quality gate.

The new files are:

| File | Purpose |
|---|---|
| `000-ANTIGRAVITY-ADOPT.md` | Adoption prompt and default operating contract. |
| `simple-design-process.md` | Five-stage daily process: understand, structure, direct, build, critique. |
| `design-strategist.md` | Product strategy, information architecture, user-flow, and decision-record guidance. |
| `cross-device-layout-and-ux.md` | Phone-to-wide-desktop layout, input modes, stress tests, and UX resilience. |
| `libraries-mcp-skills-fonts.md` | Component libraries, Motion, Figma MCP, agent skills, fonts, licenses, and security filters. |
| `premium-prompts.md` | Reusable prompts for planning, taste, layout, user flow, cross-device review, and final critique. |

Install `000-ANTIGRAVITY-ADOPT.md` as the first workspace Rule, preferably Always On. Keep the specialized files in the same directory so the `@filename` references resolve. Use the prompt library as slash-workflow content or copy individual prompts into an Antigravity session.

| `immersive-components-and-animation.md` | Stateful immersive components, animated UI families, Rive/Lottie/Motion/GSAP roles, fallbacks, comfort, and performance budgets. |
| `user-taste-and-wonder-profile.md` | Project preference layer for high taste, restraint, strategic challenge, wonder, and product-specific signatures. |

The adoption prompt now references both files automatically. Set the immersive rule to **Model Decision** and the taste profile to **Always On** or **Model Decision**, depending on whether you want the preference layer applied to every interface task.
