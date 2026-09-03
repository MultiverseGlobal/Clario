# Materials and Glass Rule

Use glass as a **functional overlay material**, not as a universal decoration. Apple’s guidance defines materials as effects that establish depth, layering, and hierarchy; it explicitly advises against using Liquid Glass in the content layer and recommends using it sparingly for important controls and navigation. [5]

## Material hierarchy

Use an opaque or lightly textured canvas for primary content. Use a standard surface for cards and grouped content. Use a raised surface for deliberate elevation. Use a translucent functional surface only for navigation, toolbars, floating controls, media overlays, or transient controls that need to preserve context.

The underlying content must remain understandable. If a user cannot tell whether a translucent panel is content, a control group, or decoration, the material system has failed.

## Glass recipe

For a web implementation, combine a translucent fill, a subtle border, restrained backdrop blur, and a modest shadow only when elevation is meaningful. `backdrop-filter` affects the pixels behind a partially transparent element; it is not a substitute for a surface color. [6]

```css
.glass-functional {
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-border-strong) 42%, transparent);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  box-shadow: var(--elevation-overlay);
}

@media (prefers-reduced-transparency: reduce) {
  .glass-functional { background: var(--color-surface-raised); backdrop-filter: none; }
}
```

Use `regular`-like glass when text density or background complexity could reduce legibility. Use `clear`-like glass only over visually rich media, and add a darkening layer when a bright background threatens contrast. Apple’s published guidance gives 35% opacity as a consideration for a dark dimming layer over bright content. [5]

## Do and do not

Do use translucency to preserve context, separate a toolbar from content, and make a floating control feel attached to the surface beneath it. Do not apply blur to every card, button, section, and background. Do not put long-form body text over a busy image without a legibility test. Do not use a translucent panel as the only boundary between adjacent interactive controls.

Do provide an opaque fallback for unsupported browsers, reduced-transparency settings, performance-constrained devices, and high-contrast modes. Do not animate large areas of blur or saturate continuously. Test glass over light, dark, colorful, and moving backgrounds.

## Premium restraint

A premium material system is defined as much by what it excludes as by what it includes. Choose one or two functional glass surfaces per screen. Keep blur radii, border opacity, and shadow softness consistent. Let content, typography, and spacing carry most of the visual quality.
