# Practical Library and Discovery Catalog

## Foundation libraries

Use [Radix UI](https://www.radix-ui.com/) for accessible low-level primitives and [shadcn/ui](https://ui.shadcn.com/) for editable application components built around primitives. These should form the internal foundation when the project uses React. The product’s own tokens and state rules remain the source of truth.

## Expression libraries

Use [Motion](https://motion.dev/) for controlled React animation. Explore [Aceternity UI](https://ui.aceternity.com/components), [Magic UI](https://magicui.design/), [React Bits](https://github.com/eb0.php/react-bits), and [Origin UI](https://originui.com/) for optional motion, visual effects, blocks, and layout ideas. Verify the React Bits URL and repository provenance before installing; social posts and search results sometimes surface mirrors or renamed repositories.

Use [awesome-shadcn/ui](https://github.com/birobirobiro/awesome-shadcn-ui) to compare community-maintained shadcn-compatible libraries. Treat star count as a discovery signal, not a quality guarantee. Confirm license, recent maintenance, documentation, accessibility, dependency cost, and whether the component is appropriate for the product’s actual flow.

## Agent skills

Start with official or clearly maintained sources:

| Resource | Role |
|---|---|
| [VoltAgent awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | Cross-agent catalog with Antigravity-compatible paths and quality/security guidance. |
| [Anthropic frontend-design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) | Distinctive direction, anti-template checks, critique, and responsive/accessibility baseline. |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Searchable UX, typography, color, style, stack, and pre-delivery guidance. |
| [Figma skills and MCP guide](https://github.com/figma/mcp-server-guide) | Design context, Code Connect, selected frames, and workflow skills. |
| [Claude Code Frontend Design Toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit) | Community collection of frontend skills, plugins, MCPs, and instruction patterns. |

Install only what the project needs. Read the source, check file operations and network access, and remove anything that duplicates the core design rules.

## MCPs

Use [Figma MCP](https://github.com/figma/mcp-server-guide) for design context, [Playwright MCP](https://github.com/microsoft/playwright-mcp) for browser and accessibility verification, and [Firecrawl MCP](https://github.com/firecrawl/firecrawl-mcp-server) for current public research. Use [Frontend Design Loop MCP](https://github.com/alexalexalex222/frontend-design-loop-mcp) or [Glimpse MCP](https://github.com/AmirMakir/glimpse-mcp) only after reviewing code, permissions, maintenance, and data handling.

## Fonts

Use [Google Fonts](https://fonts.google.com/) and [variable fonts](https://fonts.google.com/variablefonts) for broad discovery, [Fontshare](https://www.fontshare.com/) for free-font options under published licenses, and [Fonts In Use](https://fontsinuse.com/) to study real typographic applications. Always verify the specific family’s license, glyph coverage, webfont availability, loading strategy, and fallback behavior.

## Platform search recipes

Use these searches on TikTok, Instagram, YouTube, and GitHub:

| Goal | Search terms |
|---|---|
| Motion UI | `UI motion design`, `microinteraction`, `interaction design`, `motion system`, `reduced motion` |
| Layout | `responsive layout`, `editorial grid UI`, `information architecture`, `dashboard hierarchy`, `mobile UX flow` |
| Typography | `product typography`, `type scale UI`, `variable fonts interface`, `font pairing product design` |
| Design systems | `design tokens`, `component states`, `design system audit`, `Figma variables`, `Code Connect` |
| Glass/materials | `glass UI accessibility`, `Liquid Glass design`, `backdrop-filter performance`, `translucent navigation` |
| Agent building | `DESIGN.md`, `AGENTS.md frontend`, `Antigravity skills`, `AI frontend design`, `screenshot UI review` |

On TikTok and Instagram, prioritize creators who show the reasoning, intermediate states, interaction behavior, and implementation—not accounts that only show fast visual montages. On YouTube, prioritize full tutorials, conference talks, code walkthroughs, critique sessions, and first-party product demos. On GitHub, sort by stars for discovery, then check issues, releases, commit activity, license, dependencies, and security.

## Selection score

Score any candidate from 0–2 on each dimension: authority, maintenance, accessibility, implementation clarity, product fit, performance, license clarity, and agent usefulness. Reject a library with a zero on license clarity or security. Do not adopt a library solely because it is popular or visually impressive.
