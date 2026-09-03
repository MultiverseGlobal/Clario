# Premium Product UI Research for Antigravity

**Prepared by Manus AI — 1 September 2026**

## Executive summary

The strongest reusable design system for AI-generated products is not a visual style prompt. It is a layered operating system: semantic tokens, product-specific typography and composition, restrained materials, purposeful motion, accessible states, responsive behavior, and a review loop that rejects generic output. Apple’s current guidance is valuable because it treats materials and motion as functional communication rather than ornament. Material Design’s token model is valuable because it separates raw options from semantic decisions and component bindings. W3C and web-platform guidance are essential because visual polish that harms legibility, motion safety, or performance is not premium quality.

The practical recommendation is to give Antigravity a small always-on core rule plus specialized Markdown rules and workflows. Google’s documentation states that workspace Rules live in `.agents/rules`, can be activated manually, always, by model decision, or by glob, can reference other files with `@filename`, and are limited to 12,000 characters each. [1] This makes a modular pack more reliable than a single enormous prompt.

> “A material is a visual effect that creates a sense of depth, layering, and hierarchy between foreground and background elements.” — Apple Human Interface Guidelines [5]

> “Design tokens are the building blocks of all UI elements. The same tokens are used in designs, tools, and code.” — Material Design [2]

## 1. Evidence hierarchy

Use sources according to their authority and purpose. First-party platform guidelines and standards establish constraints. Implementation references explain how to realize those constraints. Reverse-engineered design files reveal concrete patterns and token granularity. Social posts and visual galleries are useful for current discovery, but they are not reliable specifications and should not be treated as evidence without verification.

| Tier | Source type | Use |
|---|---|---|
| 1 | Apple HIG, W3C, MDN, web.dev, official platform documentation | Establish accessibility, material, motion, and performance constraints. |
| 2 | Material Design, Motion, Radix, established design-system documentation | Choose implementation patterns, token structures, and component behavior. |
| 3 | Open-source DESIGN.md and agent skills | Study how to encode visual language for AI agents and how to prevent template output. |
| 4 | Social posts, Dribbble, Mobbin, Pinterest, creator videos | Discover references, trends, and examples; verify before adoption. |

## 2. Apple-inspired design without imitation

Apple’s current Liquid Glass announcement describes a translucent material that reflects and refracts surroundings, adapts to context, uses real-time rendering, and reacts to movement with specular highlights. Controls and navigation sit as a distinct functional layer above content; tab bars and sidebars can morph as the user scrolls or asks for more options. [4] The transferable principle is not “make everything glass.” It is **make functional layers visually distinct while allowing content to remain the subject**.

Apple’s Materials guidance is unusually explicit: do not use Liquid Glass in the content layer, use it sparingly, use regular-like materials where text density creates legibility risk, and reserve clear-like materials for visually rich backgrounds. [5] A premium web system should therefore use an opaque canvas for reading and working, standard surfaces for grouped content, and one or two translucent overlays for navigation or transient controls.

The open-source Apple DESIGN.md analysis shows how a visual language can be encoded for an agent: named color roles, typography roles with size/weight/line-height/letter-spacing, spacing and radius scales, component recipes, and anti-patterns. Its analysis identifies a photography-first composition, alternating light and dark surfaces, a single quiet blue action color, restrained elevation, and receding chrome. [14] These are useful structural ideas, not instructions to copy Apple’s brand identity.

## 3. Glassmorphism as a semantic material system

Glass is appropriate when it preserves context or establishes a functional layer over content. It is inappropriate when it makes every surface compete for attention. On the web, `backdrop-filter` applies effects to the pixels behind an element, so the element must be transparent or partially transparent for the effect to be visible. [6] The system should always provide an opaque fallback for reduced-transparency settings, unsupported browsers, high-contrast contexts, and constrained devices.

The recommended recipe is a translucent semantic fill, subtle border, limited blur, and a shadow only when the overlay is genuinely elevated. Use a regular-like variant for text-heavy overlays and a clear-like variant over media, with a darkening layer when a bright background weakens contrast. Keep glass out of long-form reading surfaces and content grids unless a clear interaction purpose exists.

## 4. Motion that feels expensive because it is precise

Apple advises that motion should be purposeful, optional, brief, precise, realistic, and cancellable. [7] W3C’s guidance says that non-essential motion triggered by interaction should be disableable, because animation can cause distraction, dizziness, headaches, or nausea for some users. [8] The premium interpretation is simple: motion should reduce uncertainty, not advertise the animation system.

Use four motion intents: state feedback, spatial continuity, attention guidance, and atmosphere. Keep state feedback short. Use spatial continuity when the user needs to understand where a panel or detail view came from. Use attention guidance sparingly. Treat atmosphere as optional and removable.

For implementation, prefer `transform` and `opacity` for animation, avoid layout-triggering properties when a transform communicates the same change, and profile before adding `will-change`. [9] Motion for React provides a useful accessibility contract: `reducedMotion="user"` can disable transform and layout animation while preserving opacity and background-color transitions, and `useReducedMotion` can replace transforms with fades or disable parallax and autoplay video. [10]

> “Do not add motion for the sake of adding motion.” — Apple Human Interface Guidelines [7]

## 5. Token architecture for a product ecosystem

A scalable ecosystem should use reference, semantic, and component token tiers. Reference tokens hold raw options such as `blue-600` or `space-4`. Semantic tokens express intent such as `color-action-primary` or `color-text-secondary`. Component tokens bind semantic decisions to an element such as `button-primary-bg` or `input-border-invalid`. Material Design recommends this separation and supports contextual values for themes, form factors, density, and right-to-left writing systems. [2]

First-hand design-system commentary from Nils Wiere emphasizes that tokens are a platform-agnostic way to express decisions, that raw values have no semantic meaning, and that shared language is more important than tooling. [3] The system should therefore begin with colors, typography, spacing, radii, and states. Only then should it add composite tokens for shadows, materials, charts, or animation choreography.

## 6. Quality floor

Premium quality is observable. Use a 44px-or-larger target where practical, semantic HTML, accessible names, visible focus, state cues beyond color, useful errors and empty states, and responsive behavior under realistic content. W3C’s Focus Appearance guidance provides a strong benchmark: a focus indicator should be at least equivalent to a 2px perimeter and show at least 3:1 contrast between focused and unfocused states. [11]

The quality gate in this pack requires a screenshot critique at representative sizes. The reviewer must identify the first visual focal point, verify that it is the intended focal point, remove one unnecessary decoration, test keyboard and reduced-motion behavior, inspect long content, and profile expensive visual effects. This is how the system avoids the familiar AI failure mode in which an interface is attractive in a static screenshot but incoherent or inaccessible in use.

## 7. What to use from social and community sources

Social and community references are valuable for discovery, especially when they show a working prototype, a before/after, a concrete token file, or a detailed critique. The research set includes practitioner discussions about Liquid Glass, glassmorphism and liquid animation, Lottie UI motion, Dribbble and Mobbin galleries, and the Apple Design X account. These sources should be used to collect motifs and questions, not to copy assets or assume that a post’s engagement proves quality.

| Discovery source | Best use | Guardrail |
|---|---|---|
| LinkedIn practitioner posts | Identify current debates and implementation examples. | Verify claims against Apple, W3C, or implementation documentation. |
| Dribbble and Pinterest | Generate visual directions and compare composition. | Do not copy unverified patterns into production. |
| Mobbin | Study real mobile information architecture and screen patterns. | Extract interaction logic, not brand identity. |
| X and Instagram | Monitor emerging visual language and creator references. | Authorship, engagement, and context can change. |
| YouTube talks and demos | Hear first-hand rationale and see implementation in context. | Cross-check quotes and technical claims. |

## 8. Recommended Antigravity ecosystem

The pack’s file layout is intentional. `00-design-core.md` is always on. The token, material, motion, component, and quality rules can be enabled by model decision or glob. `premium-ui-build.md` is a repeatable build workflow. A second workflow should run the review gate before launch. The structure keeps each file under Antigravity’s documented limit and makes it possible to evolve the design system without rewriting the entire instruction set. [1]

The ecosystem should have one source of truth for semantic tokens, one source of truth for components, and one source of truth for quality checks. The Markdown files are the agent-facing contract; the codebase remains the implementation source. If the product expands to multiple apps, publish transformed tokens for each platform while preserving shared semantic names.

## Final recommendation

Install the supplied pack as a baseline, then create a product-specific override for each product or major surface. Do not ask Antigravity to “make it premium” without giving it the product’s audience, content, signature, constraints, and review criteria. The strongest result will come from a disciplined combination of **specificity, restraint, semantics, motion literacy, and repeated critique**—not from adding more effects.

## References

[1]: https://antigravity.google/docs/rules-workflows/ “Google Antigravity Rules”
[2]: https://m3.material.io/foundations/design-tokens “Material Design: Design Tokens”
[3]: https://www.youtube.com/watch?v=uMb4M7VCRCE “The Evolution of Design Tokens — Nils Wiere”
[4]: https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ “Apple introduces a delightful and elegant new software design”
[5]: https://developer.apple.com/design/human-interface-guidelines/materials “Apple Human Interface Guidelines: Materials”
[6]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter “MDN: backdrop-filter”
[7]: https://developer.apple.com/design/human-interface-guidelines/motion “Apple Human Interface Guidelines: Motion”
[8]: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html “W3C: Animation from Interactions”
[9]: https://web.dev/articles/animations-guide “web.dev: How to create high-performance CSS animations”
[10]: https://motion.dev/docs/react-accessibility “Motion for React: Accessibility”
[11]: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance “W3C: Focus Appearance”
[12]: https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md “Anthropic Frontend Design Skill”
[13]: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill “UI/UX Pro Max Skill”
[14]: https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/apple/DESIGN.md “VoltAgent Apple DESIGN.md analysis”
