# Premium UI Quality Gate

Before declaring a screen complete, perform this review and report findings honestly. If a check fails, fix it or document the explicit tradeoff.

## Product and visual direction

State the screen’s single job and confirm that hierarchy makes it obvious. Identify the one memorable signature and remove unrelated decoration. Confirm that palette, typography, spacing, surfaces, and iconography feel like one system rather than a collection of components.

## Consistency

Search for raw colors, unexplained spacing, one-off radii, duplicated component variants, inconsistent labels, and arbitrary motion durations. Verify that components consume semantic tokens and that dark, high-contrast, reduced-transparency, and responsive contexts map intentionally.

## Accessibility

Keyboard through the complete flow. Confirm visible focus, usable labels, sensible tab order, semantic headings, alt text, non-color state cues, readable contrast, and error recovery. Test at increased text size and with reduced motion. Do not hide essential content behind hover, animation, blur, or color alone.

## Responsive behavior

Check narrow mobile, large mobile, tablet, laptop, and wide desktop. Test long titles, long labels, empty states, validation errors, loading states, and localization-like expansion. Confirm that cards, nav, dialogs, tables, and forms do not clip or create horizontal scroll.

## Motion and performance

Verify that motion communicates a meaningful change, can be interrupted, and has a reduced-motion path. Prefer transform and opacity. Profile expensive blur, shadow, filter, and paint-heavy effects. Confirm that images reserve space, lazy loading does not cause layout shift, and animations do not visibly drop frames.

## Screenshot critique

Take screenshots at representative sizes and critique them as a design lead. Ask: What is the first thing I notice? Is it the right thing? Where does the eye go next? Which element is trying too hard? What can be removed without reducing comprehension? Does this look specific to the product or like a familiar AI template?

## Final report

Return a short checklist with passes, failures, and fixes. Do not claim “premium,” “pixel-perfect,” or “production-ready” without evidence from this gate.
