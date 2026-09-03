---
name: "design-system"
description: "Applies the Pseudonyms Cognitive Design System (PDS-v3) and Google Labs DESIGN.md standards. Use when building or styling web and mobile UI across Pseudonyms ID, Atlas, Orion, Clario, Metaphor, and Weave."
disable-model-invocation: false
---

# Skill: Pseudonyms Design System (PDS-v3)

## Read First
- Read [`c:/Users/SUDO/Documents/Pseudonyms/DESIGN.md`](file:///c:/Users/SUDO/Documents/Pseudonyms/DESIGN.md) for full YAML tokens and component specs.
- Read [`.agents/rules/ecosystem_design.md`](file:///c:/Users/SUDO/Documents/Pseudonyms/.agents/rules/ecosystem_design.md).

## Core Directives
1. **Canvas & Surfaces:**
   - Canvas: Deep Obsidian (`#07080c`).
   - Cards: Surface-1 (`#10131b`), Surface-2 (`#151924`), Surface-3 (`#1b202e`) with hairline specular border (`rgba(255, 255, 255, 0.08)`).
   - Glassmorphism: `backdrop-blur-xl bg-[#10131b]/80`.
2. **Typography:**
   - UI & Headings: `Inter` with tight tracking (`-0.015em` to `-0.025em`).
   - Data & Telemetry: `JetBrains Mono` / `IBM Plex Mono`.
3. **Ecosystem Elements:**
   - Always include the **9-Dot Waffle Switcher** and **Cmd+K Command Palette** for navigation across apps (Atlas, Clario, Metaphor, Orion, Weave).
4. **Banned Patterns:**
   - No generic saturated blues (`#007bff`), no pure white backgrounds, no fake progress metric bars, no muddy drop shadows.
