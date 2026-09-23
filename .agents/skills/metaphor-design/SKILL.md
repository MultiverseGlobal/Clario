---
name: metaphor-design
description: Design standard and token contract for Metaphor — the AI context engine interface. Enforces the White Sea visual language, Cormorant Garamond typography, ink color tokens, and strict copy guidelines.
---

# Metaphor Cognitive Design Specification (PDS-Metaphor)

Metaphor is light-mode first. Clarity over atmosphere. One accent, zero gradients on surfaces, no color pollution.

## 1. The Visual World ("The White Sea")

- **Canvas**: Pure white (`#FFFFFF`). The canvas lives beneath all UI at `z-index: -1` and responds to mouse interaction via an organic ink wake (fading over 600ms) and ripples.
- **Ink Color**: `#111315` (`var(--color-ink)`). This is the single black ink token used for primary display text, headings, borders, and active indicators.
- **Surfaces**: Transparent or subtle glass (`backdrop-blur-xl`, `rgba(255, 255, 255, 0.80)`). Never use opaque white blocks or nested cards with drop shadows.
- **Borders**: Hairline elevation (`rgba(10, 10, 10, 0.06)` for subtle, `rgba(10, 10, 10, 0.12)` for interactive boundaries).
- **Signal**: Indigo `#6366F1` (`--color-primary`). Precision, connection, network signal. Not generic AI purple.

## 2. Typography Rules

- **Display Headings**: `Cormorant Garamond` (or `var(--next-font-display)`, serif). Use `font-weight: 400` with subtle italic flourishes for editorial authority. Never use bold 700+ sans-serif block headers.
- **Body & Controls**: `Geist` / `Satoshi` (`var(--next-font-sans)`). Clean, high legibility, optical tracking `-0.015em`.
- **Metadata & Audit Trails**: `JetBrains Mono` (`var(--next-font-mono)`). Used for timestamps, IDs, status labels, and protocol references.

## 3. Cursor & Motion Philosophy

- **System Cursor**: The native OS cursor MUST remain visible and unblocked at all times. Never inject `* { cursor: none !important; }`.
- **Canvas Sea**: The canvas draws a fluid ink wake behind cursor movements using wall-clock `performance.now()` timing (600ms lifespan).
- **Ripples**: Click initiates a 36px expanding wave. Mousedown held for > 200ms holds a 12px ripple ring until release.
- **Reduced Motion**: If `prefers-reduced-motion: reduce`, the canvas is replaced by a subtle static CSS dot-grid:
  `bg-[radial-gradient(rgba(17,19,21,0.06)_1px,transparent_1px)] [background-size:24px_24px]`.

## 4. Copy Guidelines by Surface

1. **Landing Page**:
   - Editorial, thoughtful, authoritative.
   - Tone: "Make your AI tools work as one."
   - Avoid generic marketing buzzwords ("revolutionize", "seamlessly", "synergy").

2. **Authentication (`/login`, `/signup`)**:
   - Minimal, present tense, one sentence max.
   - Headline: *Sign In.* / *One last thing.*
   - Subtitle: "Enter your workspace to continue your session."

3. **Onboarding (`/onboard/*`)**:
   - Question-led.
   - No bullet point matrices or dense feature checklists.
   - Inputs are bare underline fields with italic serif placeholders.

4. **Authenticated App (`/world`, `/tools`, `/connections`, `/handoffs`, `/context`)**:
   - Functional, restrained, quiet.
   - No marketing slogans.
   - Data and events presented as minimalist timeline feeds and clean tables with hairline dividers.
