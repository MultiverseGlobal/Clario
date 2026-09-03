# Cross-Device Layout and UX Rule

Design the experience as one system that adapts across devices, not as a desktop page squeezed onto a phone. Start with content priority, interaction priority, and available space. Let layout, navigation, density, and input behavior change when the context changes.

## Device matrix

Test at small phone, large phone, tablet portrait, tablet landscape, laptop, desktop, and wide desktop. Test touch, mouse, trackpad, keyboard, screen reader landmarks, increased text size, zoom, reduced motion, reduced transparency, dark mode, and slow network. Do not use device names as a substitute for actual constraints.

## Layout behavior

Use fluid containers with intentional max-widths. Protect readable line length. Allow cards and grids to reflow. Prefer content-driven breakpoints. Keep primary actions reachable and visible. Do not hide essential functions only inside hover, a tiny icon, or an overflow menu on small screens.

On mobile, prioritize the primary task, simplify navigation, preserve context, and use bottom sheets or full-screen routes only when they improve reachability. On tablets, exploit additional width without creating empty expanses. On desktop, use panels and side-by-side views only when comparison or workflow speed benefits. On wide displays, avoid stretching text and controls across the full viewport.

## User-flow resilience

Every important flow must support refresh, back navigation, deep links where appropriate, cancellation, validation failure, offline or slow states, and return to the prior context. Preserve draft work. Keep system feedback near the action that caused it. Do not make a visual transition the only explanation of a state change.

## Content stress tests

Test long names, long headings, translated-like expansion, large numbers, missing images, broken images, empty lists, no permissions, multiple errors, and first-time users. If a layout works only with ideal placeholder copy, it is not finished.

## Performance

Reserve image space to reduce layout shift. Prefer responsive images and modern formats when supported. Lazy-load non-critical media. Keep animated work on transform and opacity where possible. Treat blur, filters, shaders, large shadows, video, and canvas effects as performance budgets, not free decoration.

## Accessibility baseline

Use semantic structure, visible focus, accessible names, sufficient contrast, non-color state cues, and reduced-motion and reduced-transparency paths. A premium experience is one that remains understandable when the user cannot see every effect, cannot hover, prefers less motion, or uses a small screen.
