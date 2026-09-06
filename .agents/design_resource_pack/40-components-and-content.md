# Components, Content, and Layout Rule

Build a small, composable vocabulary before adding page-specific decoration. Start with layout primitives, typography roles, buttons, links, fields, cards, navigation, overlays, feedback, and data-display components. Every component must define anatomy, semantic purpose, variants, states, content rules, responsive behavior, and accessibility behavior.

## Component states

Design default, hover, focus-visible, pressed, selected, disabled, loading, success, warning, error, empty, and offline states where relevant. State changes must be perceivable without color alone. Icon-only controls require accessible names. Do not use placeholder text as the only field label. Put validation feedback close to the affected control and explain how to recover.

## Layout

Use a clear container strategy with fluid widths and deliberate max-widths. Prefer mobile-first behavior. Preserve readable line length, avoid horizontal scrolling, and let navigation collapse according to information architecture rather than arbitrary breakpoints. Use whitespace to group related content and alignment to establish rhythm.

## Touch and keyboard

Provide targets around 44×44px where practical, maintain enough separation to avoid accidental activation, and ensure every interactive element is reachable by keyboard. Keep focus visible and high contrast. W3C’s Focus Appearance guidance describes a 2px-perimeter-equivalent focus indicator and at least 3:1 contrast between focused and unfocused pixels as the Level AAA target; use this as a strong design benchmark even when the project targets a lower conformance level. [11]

## Typography and content

Use sentence case by default. Write labels as actions: “Save changes,” “Add payment method,” or “View report.” Keep terminology consistent throughout the flow. Use real or realistic content lengths when testing layout. Empty states should tell the user what is missing and what to do next. Errors should state what happened and how to fix it; never hide a failure behind a vague toast.

## Icons and imagery

Use one coherent icon family with consistent optical weight. Do not substitute emoji for interface icons. Give decorative imagery empty alternative text and meaningful imagery useful alternative text. Reserve art direction for moments where it reinforces the product’s subject or brand.

## Premium composition

Choose one dominant focal point per viewport. Use contrast, scale, alignment, and rhythm before adding effects. A distinctive page can be quiet: a rare type treatment, a precise editorial grid, a tactile transition, or a product-specific visual metaphor is stronger than a pile of gradients and shadows. Use one signature element and discipline everything around it.
