# Tokens and Themes Rule

Use a three-tier token architecture. Reference tokens hold raw options; semantic tokens express purpose; component tokens bind a purpose to a specific UI part. Prefer aliases over repeated literals so themes, accessibility modes, and product surfaces can change without rewriting markup. This follows Material Design’s reference/system/component model and the practical design-token workflow described by Nils Wiere. [2] [3]

## Reference tokens

Define a restrained base palette, type scale, spacing scale, radius scale, elevation scale, and motion scale. Give values names that describe the option, not its use: `blue-600`, `neutral-950`, `space-4`, `radius-lg`, `duration-fast`.

## Semantic tokens

Map options to meaning: `color-bg-canvas`, `color-surface-raised`, `color-text-primary`, `color-text-secondary`, `color-border-subtle`, `color-action-primary`, `color-focus-ring`, `color-status-success`, `color-status-danger`, `motion-feedback`, and `motion-emphasis`. Components should consume these tokens, not raw hex values.

## Component tokens

Define component-specific decisions only when they are stable and reusable: `button-primary-bg`, `button-primary-text`, `button-primary-focus-ring`, `card-padding`, `dialog-surface`, `input-border-invalid`, and `nav-overlay-blur`. Keep state tokens explicit for default, hover, focus-visible, pressed, disabled, loading, selected, invalid, and reduced-motion variants.

## Suggested token shape

```json
{
  "color": {
    "ref": {
      "blue-600": { "$value": "#0066CC", "$type": "color" },
      "neutral-950": { "$value": "#111113", "$type": "color" }
    },
    "sys": {
      "action-primary": { "$value": "{color.ref.blue-600}", "$type": "color" },
      "text-primary": { "$value": "{color.ref.neutral-950}", "$type": "color" }
    }
  }
}
```

Use metadata such as `$type`, `$description`, and `$deprecated` when the token store supports it. Namespace tokens for the product or system. Add contextual overrides for light, dark, high-contrast, reduced-transparency, compact-density, and mobile contexts.

## Baseline design language

Use a 4px base unit with deliberate exceptions only when optical alignment requires them. Prefer a readable body size around 16–17px, line-height around 1.45–1.6, and minimum interactive targets around 44px. Use a small number of radii: sharp for editorial or dense data, medium for cards and fields, large for major surfaces, and pill only for controls that behave like capsules.

Do not force Apple’s exact values onto every product. The open-source Apple analysis is useful as an example of a coherent system: near-black and parchment surfaces, one quiet blue action color, SF-oriented type roles, large section rhythm, and almost no chrome decoration. [4]

## Theme rules

Theme by semantic role, not by swapping every raw color. Dark mode must preserve hierarchy and contrast rather than simply inverting colors. High-contrast mode must strengthen text, borders, focus, and state differentiation. Reduced-transparency mode must replace translucent layers with opaque semantic surfaces. White-label or product variants must change reference mappings while preserving semantic names.

## Token audit

Before delivery, search the codebase for raw hex colors, one-off spacing values, unexplained z-index values, inconsistent radii, and duplicated animation durations. Either replace them with tokens or document why the exception is necessary.
