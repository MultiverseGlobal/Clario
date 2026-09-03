# Expanded Research Addendum

**Prepared by Manus AI — 1 September 2026**

## What changed

The original pack established Apple-inspired materials, motion, tokens, accessibility, and Antigravity rules. This expansion adds current discovery across Instagram, YouTube, TikTok-oriented trend research, GitHub component libraries, agent skills, MCP servers, fonts, and reusable prompts. The goal is not to collect every fashionable link. The goal is to make the software-design process simpler while giving the agent enough judgment to avoid weak layouts, broken user flows, inaccessible motion, and single-device thinking.

## Platform research: how to use each channel

| Platform | Use it for | Do not use it for |
|---|---|---|
| TikTok | Fast discovery of practical UI breakdowns, Figma tricks, motion experiments, before/after critiques, and emerging visual vocabulary. Search creators by the exact topic: “UI motion,” “Figma auto layout,” “design systems,” “UX flow,” and “responsive UI.” | Treating viral novelty as proof of usability or copying a visual without understanding the interaction. |
| Instagram | Visual reference, typography studies, motion reels, design-system explainers, and creator portfolios. The research set includes posts discussing Markdown design systems, typography hierarchy, user flow, and current motion trends. | Assuming a carousel or Reel is a complete design specification. Verify the source, license, implementation, and accessibility. |
| YouTube | Long-form first-hand tutorials, design-system talks, Figma/MCP walkthroughs, motion breakdowns, and critiques. The analyzed design-token talk by Nils Wiere supplied practical guidance on token tiers, semantic naming, collaboration, tooling, and risks. [1] | Treating a speaker’s claim as ground truth without checking official documentation or implementation evidence. |
| GitHub | Reusable component code, design-agent Markdown, skills, MCP guides, token tooling, and issue discussions. | Installing unreviewed skills or blindly importing visual effects into the product chassis. |

Social search is best used as a discovery layer. Stable official docs and source repositories are the evidence layer. The pack records links rather than inventing rankings because social engagement is dynamic and search pages often expose incomplete metadata.

## Component and motion library strategy

Begin with an accessible foundation such as Radix UI or shadcn/ui. Use Motion for React for declarative transitions and reduced-motion behavior. Use Aceternity UI, Magic UI, React Bits, Origin UI, and curated shadcn catalogs as pattern libraries and optional expression layers. Aceternity’s official catalog includes navigation, forms, overlays, carousels, layout, text animation, shaders, parallax, magnetic buttons, and Apple-style card patterns. [2]

The agent must audit each imported component. A component that looks impressive but depends on hover, parallax, continuous blur, uncontrolled autoplay, weak focus states, or heavy paint work is not automatically suitable. The internal design system should own semantic tokens, naming, states, responsive rules, and accessibility. External libraries should provide implementation leverage, not design authority.

## GitHub skills and agent resources

The strongest general discovery source found was VoltAgent’s `awesome-agent-skills`, which displayed 33.5k stars and 3.5k forks during research and catalogs more than 1,000 skills compatible with Antigravity and other coding agents. [3] It lists official skills from Anthropic, Google/Gemini, Vercel, Figma, GSAP, Remotion, Firecrawl, Browserbase, and other teams. It also publishes useful quality criteria: specific trigger descriptions, progressive disclosure, no hard-coded absolute paths, and scoped tools.

Its security notice is important: curated does not mean audited. Review every skill for prompt injection, tool poisoning, unsafe file writes, network behavior, hidden dependencies, and excessive permissions before installation. Use three small reviewed skills instead of one giant skill whenever the smaller composition is clearer.

The official Anthropic frontend-design skill is a strong taste reference because it instructs the agent to ground the design in the product’s subject, choose deliberate typography, avoid generic AI defaults, use one meaningful risk, respect reduced motion, and critique screenshots. [4] The open-source DESIGN.md ecosystem is valuable because it turns visual decisions into plain-text rules that an agent can actually apply. [5]

## MCP strategy

Use MCP connectors only when they solve a distinct design problem. Figma MCP is for extracting variables, components, layout data, selected-frame context, Code Connect mappings, and selected design-to-code workflows. Its official guide also documents rate limits, beta status, and Figma terms. [6] Playwright MCP is for structured browser interaction and accessibility snapshots. Firecrawl MCP is for current public research. Community visual-feedback servers such as Frontend Design Loop MCP and Glimpse MCP may help with screenshot-grounded iteration, but they require source and permission review before installation.

The minimal recommended set is shown below.

| Connector | When to use | Output |
|---|---|---|
| Figma MCP | A Figma file is the source of truth or contains real components and variables. | Design context, selected frames, tokens, component mappings. |
| Playwright MCP | A local or preview app needs behavioral and accessibility verification. | Accessibility snapshots, interactions, test evidence. |
| Firecrawl MCP | The agent needs current public research or documentation. | Extracted web context with source links. |
| Visual-feedback MCP | A screenshot diff or DOM-grounded visual review is genuinely needed. | Visual feedback and iteration evidence. |

Do not connect every available server. Connector quantity does not create taste. Clear source-of-truth ownership and a short review loop create taste.

## Fonts and typography

Use Google Fonts and its variable-font resources for accessible discovery, Fontshare for commercially usable free-font options subject to the published license, and Fonts In Use for typographic case studies. [7] [8] [9] Select a display face, body face, and optional utility face by product subject, readability, language coverage, variable axes, loading cost, and license—not by popularity alone.

The design system must define type roles rather than a list of font names. Each role needs family, fallback stack, size range, weight, line-height, letter spacing, optical behavior, maximum measure, and wrapping rules. Test large text, small screens, localization-like expansion, and high zoom. The most expensive-looking type treatment is often precise hierarchy and spacing rather than an exotic font.

## The simplified master process

Use five stages: **Understand, Structure, Direct, Build, Critique**. Understand the user and screen job. Structure the flow and states. Direct the visual language with a small semantic token system and one signature. Build foundations and the core task before decoration. Critique with screenshots, keyboard, reduced motion, realistic content, and cross-device tests.

When the user requests a style adjective such as “premium,” “Apple-like,” “glass,” or “futuristic,” translate it into observable rules. “Premium” becomes hierarchy, restraint, typography, surface quality, motion precision, and robust states. “Glass” becomes a limited functional overlay material with contrast and opaque fallback. “Apple-like” becomes content focus, spatial clarity, platform awareness, and controlled motion—not copied branding.

## Taste and strategic challenge

The agent should think one level above the prompt. It should ask whether the requested visual treatment supports the user’s goal, whether the page structure communicates the product’s value, whether the flow has a recovery path, and whether the result survives devices and input modes. It may challenge the method while preserving the intended outcome. It should not silently change core requirements or invent business assumptions.

The design director’s final questions are: What is the first thing the user notices? Is that the right thing? Where will the user hesitate? Which element is trying too hard? What breaks on a phone or with a keyboard? What disappears when motion and transparency are reduced? What can be removed without reducing comprehension? These questions are more reliable than asking an agent to “make it beautiful.”

## References

[1]: https://www.youtube.com/watch?v=uMb4M7VCRCE “The Evolution of Design Tokens — Nils Wiere”
[2]: https://ui.aceternity.com/components “Aceternity UI Components”
[3]: https://github.com/VoltAgent/awesome-agent-skills “VoltAgent Awesome Agent Skills”
[4]: https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md “Anthropic Frontend Design Skill”
[5]: https://github.com/VoltAgent/awesome-design-md/ “Awesome DESIGN.md”
[6]: https://github.com/figma/mcp-server-guide “Figma MCP Server Guide”
[7]: https://fonts.google.com/variablefonts “Google Fonts Variable Fonts”
[8]: https://www.fontshare.com/ “Fontshare”
[9]: https://fontsinuse.com/ “Fonts In Use”
