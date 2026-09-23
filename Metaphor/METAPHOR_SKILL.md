# Metaphor Design Skill & Specification (METAPHOR_SKILL.md)

This specification governs all visual, structural, and copy decisions for the Metaphor interface.

## 1. Core Visual Principles
1. **Light-Mode First**: Metaphor lives on pure `#FFFFFF`. Clarity and confidence over dark atmosphere.
2. **One Signal Accent**: Indigo `#6366F1` (`--color-primary`). Represents precision, coordination, and network activity. Never introduce arbitrary tertiary accent colors or gradients.
3. **Ink Color (`--color-ink`)**: Hardcoded `#111315`. Used for display headings, primary body text, active indicators, and high-contrast lines.
4. **Surfaces**: Transparent or subtle glass (`backdrop-blur-xl`, `rgba(255, 255, 255, 0.80)`). Heavy dropshadows, nested card boxes, and opaque white panels are strictly forbidden.
5. **Hairline Boundaries**: `rgba(10, 10, 10, 0.06)` for structure, `rgba(10, 10, 10, 0.12)` for interactive controls.

## 2. Typography Contract
- **Display Headings**: `Cormorant Garamond` (serif, `font-weight: 400`, italic flourishes for editorial authority).
- **Body & Inputs**: `Geist` / `Satoshi` (`font-weight: 400` / `500`, tracking `-0.015em`).
- **Metadata, Code & Timestamps**: `JetBrains Mono` (`font-size: 11px–12px`, tracking `0.02em`).

## 3. Motion & Cursor Policy
- **Native Cursor**: Never inject `* { cursor: none !important; }`. The user's system pointer must remain visible and unobstructed.
- **Fluid Wake**: Rendered on `<canvas>` beneath all UI using wall-clock `performance.now()` with a 600ms decay window.
- **Ripples**: Click initiates a 36px expanding wave; holding mousedown for >200ms holds a 12px ring until mouse release.
- **Accessibility**: When `prefers-reduced-motion: reduce` is active, canvas rendering is disabled and replaced with a static 24px dot-grid.

## 4. Copy Guidelines
- **Landing Page**: Restrained, editorial, thought-provoking. Focused on "Make your AI tools work as one."
- **Onboarding**: Question-led ("What are you working on?"). No dense bullet matrices.
- **Auth**: Direct, minimal, one sentence max ("Save your credentials to initialize your persistent context graph.").
- **Connected World**: Functional, quiet, ledger-oriented.
