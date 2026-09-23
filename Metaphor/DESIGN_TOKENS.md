# Metaphor Design Tokens Contract

All design tokens are defined in `frontend/src/app/globals.css` under the `@theme` block and `:root` scope.

## 1. Palette & Surface Tokens

| Token | CSS Variable | Hex / RGBA Value | Role |
|---|---|---|---|
| Background Canvas | `--color-background` | `#FFFFFF` | Global underlying canvas surface |
| Ink Black | `--color-ink` | `#111315` | Display text, primary headings, boundaries |
| Body Foreground | `--color-foreground` | `#0A0A0A` | Secondary text, high-readability body |
| Subtle Border | `--color-border-subtle` | `rgba(10, 10, 10, 0.06)` | Table dividers, timeline rules, cards |
| Mid Border | `--color-border-mid` | `rgba(10, 10, 10, 0.10)` | Interactive borders, input outlines |
| Strong Border | `--color-border-strong` | `rgba(10, 10, 10, 0.18)` | Hover/focus states, active selections |
| Muted Gray | `--color-muted` | `#6B7280` | Helper text, secondary labels |
| Accent Signal | `--color-primary` | `#6366F1` | The single Indigo accent for precision |
| Primary Dim | `--color-primary-dim` | `rgba(99, 102, 241, 0.08)` | Chip background, active ring tint |
| Success Emerald | `--color-success` | `#16A34A` | Healthy connection dots, active status |
| Warning Amber | `--color-warning` | `#D97706` | Pending approvals, attention notices |
| Danger Red | `--color-danger` | `#DC2626` | Error alerts, disconnected state |

## 2. Typography Tokens

```css
--font-display: var(--next-font-display, 'Cormorant Garamond', Georgia, serif);
--font-sans:    var(--next-font-sans, 'Geist', 'Satoshi', sans-serif);
--font-mono:    var(--next-font-mono, 'JetBrains Mono', monospace);
```

## 3. Glass Surface Tokens

```css
.glass-clear {
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.glass-floating {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.04);
}
```
