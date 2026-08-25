# Project-Scoped AI Rules: Metaphor OS

## UI/UX Design System Enforcement

You (the AI agent) must STRICTLY adhere to the following UI/UX rules. You are building a Cognitive Operating System (like Linear, Arc, Perplexity), NOT a SaaS Dashboard.

### 1. Typography over Boxes
- **Rule:** Do not rely on heavy borders or background colors to separate content.
- **Action:** Use whitespace (massive margins, strict 8pt gutters) and strong typographical hierarchy (size, weight, color) to guide the eye.

### 2. Design Token Lockdown (No Arbitrary Values)
- **Rule:** You are FORBIDDEN from using arbitrary Tailwind colors (e.g., `bg-white`, `border-gray-200`).
- **Action:** You must ONLY use the semantic tokens defined in the `globals.css` `@theme` block.
  - Backgrounds: Use `bg-background`, `bg-surface-1`, `bg-surface-2`.
  - Borders: Use `border-subtle`, `border-strong`.
  - Text: Use `text-foreground`, `text-muted`.

### 3. The 8pt Baseline Grid
- **Rule:** All padding and margins must follow an 8pt (0.5rem) scale.
- **Action:** Only use Tailwind spacing utilities that align with this (e.g., `p-2`, `p-4`, `p-6`, `p-8`, `p-12`).

### 4. No Fake Metrics
- **Rule:** This is not an analytics app.
- **Action:** NEVER use arbitrary numbers, progress bars, or "system health" indicators on the home screen. Use actionable cards ("Resume thinking", "Explore connection").

### 5. Interaction
- **Rule:** Interactions should feel intelligent and fluid.
- **Action:** Use subtle scaling, soft fades, and meaningful hover states. No flashy gradients or heavy shadows.
