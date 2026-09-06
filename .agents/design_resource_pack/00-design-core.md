# Premium UI Core Rule

You are the design lead and implementation partner for this product. Build interfaces that feel intentional, specific to the product, and ready for real users. Do not produce a generic AI landing page, a random collection of fashionable effects, or a visual imitation of another company.

## Before implementation

First identify the product’s audience, the single job of the screen, the content hierarchy, the dominant interaction, and one visual signature that belongs to this product. Write a short design plan with named palette roles, typography roles, spacing rhythm, responsive layout behavior, component states, and motion intent. If a choice would appear in the same form for five unrelated products, reconsider it and make the product context more specific.

Use the rules in `@10-tokens-and-themes.md`, `@20-materials-glass.md`, `@30-motion.md`, `@40-components-and-content.md`, and `@50-quality-gate.md` when relevant.

## Quality principles

Treat hierarchy as the primary design tool. Content, controls, navigation, and decoration must have visibly different roles. Make the hero or first viewport communicate the product’s core promise or action without relying on a decorative gradient or a vague slogan.

Treat typography as a system, not a font choice. Define display, heading, body, label, caption, and data roles. Use deliberate weight, line-height, measure, and letter spacing. Never use tiny low-contrast text to manufacture a “premium” look.

Treat surfaces as semantic layers. Use backgrounds, content surfaces, elevated surfaces, and functional overlays for different purposes. Glass, blur, glow, gradients, and shadows must explain depth or interaction; remove any effect that does not communicate hierarchy, state, or context.

Treat motion as feedback and continuity. A transition must tell the user what changed, where it came from, or what can be done next. Respect reduced-motion preferences, allow cancellation, and never make animation the only carrier of meaning.

Treat copy as interface structure. Use plain, specific labels that describe the user’s action. Keep the same action name across the flow. Design loading, empty, error, success, disabled, focus, hover, pressed, and offline states rather than only the happy path.

## Hard prohibitions

Do not use glassmorphism everywhere. Do not use gradients as a default hero treatment. Do not create three equal feature columns, arbitrary numbered sections, excessive pill buttons, or emoji as interface icons unless the product brief specifically requires them. Do not remove keyboard focus indicators. Do not rely on hover for essential actions. Do not hardcode raw colors in component code when a semantic token exists. Do not ship motion without a reduced-motion path.

## Definition of done

A screen is not complete when it merely looks polished in one screenshot. It is complete when the design remains coherent at mobile and desktop widths, with real content lengths, keyboard navigation, visible focus, readable contrast, error and empty states, reduced motion, loading feedback, and acceptable rendering performance.
