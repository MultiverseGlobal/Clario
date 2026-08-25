---
name: "Pseudonyms Cognitive Design System (PDS-v3)"
version: "3.0.0"
standard: "Google Labs DESIGN.md / VoltAgent Craft Standard"
author: "Benjamin"
theme:
  mode: "dark"
  appearance: "obsidian-glass-minimal"
  contrast: "high"

tokens:
  colors:
    canvas:
      base: "#07080c"
      subtle: "#0b0d13"
      overlay: "rgba(7, 8, 12, 0.85)"
    surfaces:
      surface-1: "#10131b"
      surface-2: "#151924"
      surface-3: "#1b202e"
      surface-glass: "rgba(16, 19, 27, 0.75)"
      surface-glass-hover: "rgba(21, 25, 36, 0.85)"
      surface-glass-active: "rgba(27, 32, 46, 0.95)"
    borders:
      subtle: "rgba(255, 255, 255, 0.06)"
      default: "rgba(255, 255, 255, 0.09)"
      strong: "rgba(255, 255, 255, 0.16)"
      glow: "rgba(139, 92, 246, 0.35)"
    text:
      primary: "#f3f4f6"
      secondary: "#9ca3af"
      muted: "#6b7280"
      dim: "#4b5563"
      inverse: "#07080c"
    accents:
      master:
        name: "Electric Violet (Pseudonyms ID)"
        base: "#8b5cf6"
        hover: "#7c3aed"
        subtle: "rgba(139, 92, 246, 0.12)"
        border: "rgba(139, 92, 246, 0.28)"
        glow: "0 0 24px rgba(139, 92, 246, 0.40)"
      orion:
        name: "High-Frequency Cyan (Orion Mobile)"
        base: "#00f0ff"
        subtle: "rgba(0, 240, 255, 0.12)"
        border: "rgba(0, 240, 255, 0.28)"
        glow: "0 0 24px rgba(0, 240, 255, 0.35)"
      atlas:
        name: "Revenue Emerald (Atlas io)"
        base: "#10b981"
        subtle: "rgba(16, 185, 129, 0.12)"
        border: "rgba(16, 185, 129, 0.28)"
      clario:
        name: "Studio Magenta (Clario)"
        base: "#ec4899"
        subtle: "rgba(236, 72, 153, 0.12)"
        border: "rgba(236, 72, 153, 0.28)"
      metaphor:
        name: "Deep Indigo (Metaphor OS)"
        base: "#6366f1"
        subtle: "rgba(99, 102, 241, 0.12)"
        border: "rgba(99, 102, 241, 0.28)"
      weave:
        name: "Swarm Amber (Weave)"
        base: "#f59e0b"
        subtle: "rgba(245, 158, 11, 0.12)"
        border: "rgba(245, 158, 11, 0.28)"
    feedback:
      success: "#10b981"
      warning: "#f59e0b"
      danger: "#ef4444"
      info: "#3b82f6"

  typography:
    fonts:
      ui: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      mono: "'JetBrains Mono', 'IBM Plex Mono', SFMono-Regular, Consolas, monospace"
      display: "'Fraunces', Georgia, serif"
    weights:
      normal: 400
      medium: 500
      semibold: 600
      bold: 700
    tracking:
      tighter: "-0.03em"
      tight: "-0.015em"
      normal: "0em"
      wide: "0.025em"
      wider: "0.05em"

  spacing:
    unit: 4
    scale:
      1: "4px"
      2: "8px"
      3: "12px"
      4: "16px"
      5: "20px"
      6: "24px"
      8: "32px"
      10: "40px"
      12: "48px"
      16: "64px"

  radius:
    sm: "6px"
    md: "10px"
    lg: "14px"
    xl: "20px"
    full: "9999px"

  effects:
    glass:
      backdrop-filter: "blur(20px) saturate(180%)"
      card-highlight: "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.00) 100%)"
    transition:
      fast: "150ms cubic-bezier(0.16, 1, 0.3, 1)"
      smooth: "240ms cubic-bezier(0.16, 1, 0.3, 1)"
      bounce: "400ms cubic-bezier(0.34, 1.56, 0.64, 1)"

components:
  card:
    bg: "var(--color-surface-1)"
    border: "1px solid var(--color-border-default)"
    radius: "var(--radius-lg)"
    padding: "var(--spacing-6)"
  button-primary:
    bg: "var(--color-accent-master)"
    text: "#ffffff"
    radius: "var(--radius-md)"
    font-weight: 500
  waffle-switcher:
    grid: "3x3"
    size: "380px"
    bg: "var(--color-surface-glass)"
---

# Pseudonyms Cognitive Design System (PDS-v3)
> *The AI-Native Design Specification & Portable Design Token Standard for Pseudonyms ID, Atlas, Orion, Clario, Metaphor, and Weave.*

---

## 1. Visual Philosophy: High-Craft Cognitive Minimalist

Drawing from **Linear, Apple HIG, Raycast, and Vercel Geist**, this system rejects loud, amateur SaaS dashboards in favor of calm, high-density, focus-first computing surfaces.

### Core Principles
1. **Typography & Whitespace over Box-Heavy Borders:** Structure screens using type scale, optical letter-spacing, and strict baseline margins rather than stacking colored container boxes inside container boxes.
2. **True Dark Canvas (Obsidian Layering):** Never use washed-out gray backgrounds (`#333`). Base is pure Deep Obsidian (`#07080c`), stepped up through layered card elevations (`#10131b` → `#151924` → `#1b202e`) with hairline specular highlights.
3. **Restrained Color Semantics:** Color is functional telemetry and brand accent, never decorative noise. Each Pseudonym has one signature hue.
4. **Physicality & Micro-Interactions:** Subtle hover lifts, soft spring animations, and instant feedback. Everything feels crisp, tactile, and fast.

---

## 2. The 8-Pillar Universal Ecosystem Standards

Every application in the workspace must adhere to the 8 Universal Ecosystem Pillars:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PSEUDONYMS ID ECOSYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Sovereign Identity (SSO)      │ 2. Universal Vault (Shared Memory)       │
│ 3. Global Spotlight (Cmd+K)      │ 4. Inter-App Data Pipelines              │
│ 5. Real-Time Activity Feed       │ 6. Central Action & Approval Center      │
│ 7. Device Continuity (Handoff)   │ 8. Developer & MCP Gateway               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mandatory Ecosystem UI Elements
* **The 9-Dot "Waffle" Switcher:** Present on every topbar, allowing 1-click seamless switching between Atlas, Clario, Metaphor, Weave, and Orion.
* **Universal Omnisearch (`Cmd+K` / `Ctrl+K`):** Instant search indexing vault nodes, leads, notes, and system actions.
* **Unified Session Header:** `Authorization: Bearer <Ecosystem-JWT>` issued by Pseudonyms ID.

---

## 3. Strict Negative Constraints (Banned Patterns)

To prevent AI styling drift and generic "AI slop", the following are **strictly forbidden**:

- ❌ **NO arbitrary bright primary colors:** No raw Bootstrap blues (`#007bff`), pure reds, or neon yellows.
- ❌ **NO light-mode defaults:** The system is dark-first by default.
- ❌ **NO fake analytics:** No arbitrary "98% AI Health" widgets, fake trend lines, or meaningless stat gauges.
- ❌ **NO heavy shadows:** Use hairline specular borders (`rgba(255, 255, 255, 0.08)`) and subtle ambient glows instead of heavy, muddy box shadows.
- ❌ **NO sluggish animations:** Transitions must be crisp (150ms–250ms with ease-out cubic-bezier curves).

---

## 4. Typography Hierarchy & Rules

| Role | Font Family | Size | Weight | Tracking | Case | Usage |
|---|---|---|---|---|---|---|
| **Display / H1** | `Inter` / `Fraunces` | 28px–36px | 600–700 | `-0.025em` | Sentence | Page Hero, Major Titles |
| **Section / H2** | `Inter` | 18px–22px | 600 | `-0.015em` | Sentence | Card Headers, Modals |
| **Body / Prose** | `Inter` | 14px–15px | 400 | `0em` | Normal | Paragraphs, Descriptions |
| **Eyebrow / Badge** | `Inter` | 11px–12px | 600 | `+0.05em` | ALL CAPS | Status, Categories |
| **Telemetry / Data** | `JetBrains Mono` | 12px–13px | 500 | `0em` | Monospace | IDs, Ports, Hashes, Tokens |

---

## 5. Standard Component Blueprints

### A. Surface Card
```html
<div className="bg-[#10131b]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 transition-all duration-200">
  ...
</div>
```

### B. Primary Action Button
```html
<button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium px-4 py-2 rounded-lg transition-all duration-150 shadow-[0_0_20px_rgba(139,92,246,0.35)] active:scale-[0.98]">
  Action
</button>
```

### C. Status Telemetry Pill
```html
<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
  PORT 3005 • READY
</div>
```
