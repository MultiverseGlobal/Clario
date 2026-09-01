# Pseudonyms Brand Guidelines (PDS-v5)

> The definitive design state for the Pseudonyms ecosystem. One palette. Five personalities. Zero compromises.

---

## 1. Brand Soul

Cinematic meets alive. Clean, precise, and stunning. The interface breathes, responds, and feels like it has intention behind every pixel. Core references: Pillowtalk iOS and Natural AI iOS — clean surfaces, premium typography, motion-forward design.

---

## 2. Mode Strategy: Light First, Dark Override

**Light mode is the default.** Every app opens on a porcelain canvas. Dark mode is activated by adding `class="dark"` to the `<html>` element.

```
:root        → Light canvas  (#F8F7F4 porcelain, #111318 obsidian text)
.dark :root  → Dark canvas   (#07080c warm obsidian, #eef0f8 crisp off-white)
```

The apps feel distinct via layout, density, and typography — not via color variation between modes.

---

## 3. The Unified Palette

We do **not** use different accent colors across apps. The entire ecosystem shares exactly the same clean palette. App identity comes from **font personality and layout density**, not color.

### Light Mode (Default)
| Token | Value | Role |
|---|---|---|
| Canvas | `#F8F7F4` | Porcelain page background |
| Surface-1 | `#FFFFFF` | Cards, panels |
| Surface-2 | `#F1F0EC` | Recessed areas |
| Surface-3 | `#EBEBE6` | Hover states |
| Text Primary | `#111318` | Obsidian — all body copy |
| Text Secondary | `#6B7280` | Secondary labels |
| Text Muted | `#9CA3AF` | Hints, placeholders |
| Border Subtle | `rgba(17,19,24,0.06)` | Hairline dividers |
| Border Mid | `rgba(17,19,24,0.12)` | Card borders |
| Border Strong | `rgba(17,19,24,0.20)` | Active / focus borders |
| Accent | `#111318` | Primary CTA — obsidian ink on porcelain |
| Accent Dim | `rgba(17,19,24,0.06)` | Ghost hover states |

### Dark Mode (`.dark` class)
| Token | Value | Role |
|---|---|---|
| Canvas | `#07080c` | Warm obsidian |
| Surface-1 | `rgba(14,16,24,0.60)` | Frosted glass panels |
| Surface-2 | `rgba(20,23,32,0.75)` | Elevated panels |
| Surface-3 | `rgba(27,31,44,0.85)` | Modals |
| Text Primary | `#eef0f8` | Crisp off-white |
| Text Secondary | `rgba(238,240,248,0.60)` | Secondary |
| Text Muted | `rgba(238,240,248,0.40)` | Muted |
| Border Subtle | `rgba(255,255,255,0.055)` | Specular hairline |
| Border Mid | `rgba(255,255,255,0.10)` | Cards |
| Border Strong | `rgba(255,255,255,0.18)` | Active |
| Accent | `#ffffff` | Pure white CTA on obsidian |
| Accent Glow | `rgba(255,255,255,0.15)` | Specular hover glow |

### Semantic Status (Both Modes)
| Token | Value | Usage |
|---|---|---|
| Success | `#22c55e` | Confirmations |
| Warning | `#f59e0b` | Caution states |
| Danger | `#ef4444` | Errors |
| Info | `#38bdf8` | Informational |

---

## 4. Per-App Typography

Every app shares the same color palette. Typography is the primary differentiator between app personalities. All fonts are licensed/system fonts. CSS declares `@font-face` with fallbacks.

| App | Display / Headers | Body / UI | Personality |
|---|---|---|---|
| **Atlas** | **Epic Pro** *(Impact, Arial Black fallback)* | **Arial** *(Helvetica fallback)* | The strategist's war room. Block caps authority. Dense data. Zero ornament. |
| **Clario** | **Vanguard** *(Impact, Oswald fallback)* | **Athelas** *(Georgia, serif fallback)* | The editor's studio. Cinematic bold weight. Refined editorial serif body. |
| **Metaphor** | **Times New Roman MT** *(Times New Roman, serif)* | **Inter** *(system-ui fallback)* | The writer's canvas. Canonical literary serif. Distraction-free. |
| **PseudonymsID** | **STIX** *(Georgia, Times New Roman fallback)* | **Archivo** *(Arial fallback)* | The identity layer. Institutional, legal gravity. Neutral professional body. |
| **Orion** | **Tempting** *(cursive, Georgia italic fallback)* | **Switzer** *(Inter, system-ui fallback)* | The voice interface. Fluid italic script energy. Clean geometric UI. |

**Shared tracking:**
- UI density elements: `-0.015em`
- Display headlines: `-0.025em` to `-0.035em`
- Mono/data labels: `+0.05em` uppercase

---

## 5. Glassmorphism & Motion

### Glassmorphism
Heavy use of `backdrop-filter: blur()`, specular highlights, and translucent surfaces layering over each other to create deep Z-axis space.

```css
/* Light glass panel */
background: rgba(255, 255, 255, 0.70);
backdrop-filter: blur(24px);
border: 1px solid rgba(17, 19, 24, 0.08);

/* Dark glass panel (.dark) */
background: rgba(14, 16, 24, 0.60);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.08);
```

### Motion Principles
- **Spring easing**: `cubic-bezier(0.175, 0.885, 0.32, 1.05)` — for elements entering the stage
- **Ease out**: `cubic-bezier(0.16, 1, 0.3, 1)` — for elements exiting or expanding
- **Fast**: `150ms` — micro-interactions (hover, focus)
- **Base**: `300ms` — state transitions
- **Slow**: `500ms` — page-level entries, modals

Elements must **never just appear**. They fade, slide, scale, and blur into view.

---

## 6. Architectural Shadows

Shadows separate Z-layers. Glow is reserved for interactive hover states only.

### Light Mode
```css
--shadow-sm:    0 1px 2px rgba(17,19,24,0.04);
--shadow-md:    0 4px 12px rgba(17,19,24,0.06), 0 1px 3px rgba(17,19,24,0.03);
--shadow-lg:    0 16px 32px rgba(17,19,24,0.08), 0 4px 8px rgba(17,19,24,0.04);
--shadow-float: 0 24px 48px rgba(17,19,24,0.10), 0 8px 16px rgba(17,19,24,0.05);
```

### Dark Mode
```css
--shadow-sm:   0 1px 2px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.05);
--shadow-md:   0 4px 12px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.08);
--shadow-lg:   0 16px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.10);
--shadow-glow: 0 0 24px -4px rgba(255,255,255,0.15);
```

---

## 7. Component Anatomy

### Buttons

**Primary (light):** Obsidian fill `#111318`, white text, `border-radius: 8px`, `padding: 8px 16px`. Hover: lift `translateY(-1px)` + shadow-md.

**Primary (dark):** White fill `#ffffff`, obsidian text `#07080c`. Hover: `opacity: 0.90` + glow.

**Ghost:** `background: transparent`, border `rgba(17,19,24,0.12)` (light) / `rgba(255,255,255,0.10)` (dark). Hover: background dim fill.

**Destructive:** `background: rgba(239,68,68,0.10)`, `color: #ef4444`, border `rgba(239,68,68,0.25)`.

### Inputs
```
border: 1px solid var(--pds-border-mid)
background: var(--pds-surface-1)
border-radius: 8px
padding: 10px 14px
font-family: var(--pds-font-body)  /* app's body font */
font-size: 14px
```
Focus ring: `box-shadow: 0 0 0 3px var(--pds-accent-dim)`, border upgrades to `--pds-border-strong`.

### Cards
```
background: var(--pds-surface-1)
border: 1px solid var(--pds-border-subtle)
border-radius: 12px
box-shadow: var(--pds-shadow-sm)
transition: transform 300ms ease-out, box-shadow 300ms ease-out
```
Hover: `transform: translateY(-2px)`, `box-shadow: var(--pds-shadow-md)`, border upgrades to `--pds-border-mid`.

### Badges / Tags
```
display: inline-flex; align-items: center; gap: 4px
padding: 2px 8px; border-radius: 99px
font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase
background: var(--pds-accent-dim); color: var(--pds-text-secondary)
border: 1px solid var(--pds-border-subtle)
```

### Modals
Glass elevated panel: `backdrop-filter: blur(32px)`, `background: var(--pds-surface-3)`, `border: 1px solid var(--pds-border-mid)`, `box-shadow: var(--pds-shadow-lg)`.
Entry animation: `pds-slide-up-fade` 500ms spring.
Overlay: `background: rgba(0,0,0,0.40)` (light) / `rgba(0,0,0,0.70)` (dark).

---

## 8. The 9-Dot Waffle Switcher

Every web app carries the 9-dot waffle menu in the top-right corner. It is a universal 3×3 grid of app icons that opens as a frosted glass floating panel, allowing instant context-switching across the Pseudonyms ecosystem (Atlas, Clario, Metaphor, Orion, Weave, PseudonymsID).

Built as a shared React component in `packages/ui/src/WaffleSwitcher.tsx`.

---

## 9. Banned Patterns

| ❌ Banned | ✅ Instead |
|---|---|
| Purple / violet (`#8b5cf6`, `#7c3aed`) | White or obsidian accents only |
| Pink (`#ec4899`, `#f472b6`) | Unified PDS accent |
| Per-app rainbow accent colors | One palette, personality via typography |
| Cormorant Garamond, any other serif in UI elements | App-specific display font + clean body |
| Flat, sharp borders (solid grey) | Specular `rgba(17,19,24,0.10)` or `rgba(255,255,255,0.10)` |
| Hard state jumps (no transition) | Every state change animated via CSS or Framer Motion |
| Generic SaaS flat design | Glassmorphism, layered surfaces, micro-animations |
| Purple glow shadows | Ink shadows (light) or white glow (dark only) |
| `background: white` or `background: black` plain fills | PDS token surfaces only |
| Per-app `globals.css` without `.dark {}` override | Every CSS file must have both `:root` (light) and `.dark {}` |
