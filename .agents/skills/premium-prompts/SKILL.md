---
name: premium-prompts
description: A library of premium prompts for adopting design systems, calibrating taste, and auditing motion/material.
---

# Premium Antigravity Prompt Library

## Adopt and plan

> Read `@000-ANTIGRAVITY-ADOPT.md` and all referenced rules. Inspect the repository before changing code. Create a concise design plan for this product: audience, context, screen job, primary user flow, information architecture, content hierarchy, semantic tokens, type roles, layout model, component states, material strategy, motion intent, cross-device behavior, accessibility risks, performance risks, and one product-specific signature. Identify generic AI defaults you are rejecting. Do not implement until the plan is coherent.

## Taste calibration

> Act as a demanding design director. Review this direction for hierarchy, specificity, restraint, typography, spacing, content quality, user flow, accessibility, responsiveness, and performance. Identify the three choices that make it feel generic, the one effect that is trying too hard, the most valuable product-specific signature, and the single change that would most improve perceived quality. Preserve the product intent while removing decoration that does not help comprehension or trust.

## Page layout master

> Design this page from information architecture outward. State the first thing users must understand, the first action they must take, the supporting information they need, and the recovery path if they fail. Produce a responsive layout plan for phone, tablet, laptop, desktop, and wide desktop. Define container width, grid behavior, type measure, spacing rhythm, hierarchy, sticky or floating elements, and where the eye should move. Do not use a decorative hero, bento grid, gradient, or oversized type unless the content gives it a reason.

## User-flow master

> Map the complete flow from entry to success. Include first-time, returning, empty, loading, validation error, permission denied, offline, cancellation, retry, and success states. Identify every decision, the user’s likely uncertainty, the system’s feedback, and the next action. Simplify the flow by removing unnecessary decisions and preserving user work. Then define the screens and components required to implement it.

## Cross-device master

> Re-evaluate this feature across touch, mouse, trackpad, keyboard, screen reader landmarks, mobile portrait, tablet, laptop, desktop, wide desktop, zoom, large text, dark mode, high contrast, reduced motion, reduced transparency, slow network, and long content. List what changes, what stays invariant, and which interaction patterns must be replaced rather than merely resized.

## Motion and material audit

> Audit every animation, blur, gradient, shadow, shader, parallax effect, and translucent surface. For each, state its user-facing purpose, trigger, duration, interruption behavior, reduced-motion fallback, performance risk, and whether it belongs to the functional or content layer. Remove any effect with no clear job.

## Final quality gate

> Run `@50-quality-gate.md`. Inspect or capture representative renders. Report passes, failures, evidence, fixes, and unresolved risks. Do not describe the result as premium or production-ready until the core flow, states, keyboard behavior, reduced motion, reduced transparency, responsive behavior, realistic content, and performance risks have been checked.

## When the user asks for something weak

> Keep the requested outcome, but challenge the proposed method. Explain the risk in plain language, offer a stronger alternative, and ask only if the decision materially changes product behavior, brand direction, or implementation cost. If the change is low-risk, make the improvement and document it.
