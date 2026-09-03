# Motion Rule

Motion must explain change. Apple’s motion guidance recommends purposeful, optional, brief, precise, realistic, and cancellable motion; W3C guidance says non-essential animation triggered by interaction should be disableable. [7] [8]

## Motion taxonomy

Use four intent levels. **State feedback** confirms a press, save, error, or completion. **Spatial continuity** shows where a panel, menu, or detail view came from. **Attention guidance** directs focus to a newly relevant element. **Atmosphere** adds personality but must never compete with the task.

Prefer opacity, transform, and clip-path for lightweight transitions. Avoid animating layout-triggering properties such as top, left, width, and height when a transform can communicate the same change. Use `will-change` sparingly and only after profiling. [9]

## Timing guidance

Use a short duration for direct feedback, a medium duration for local state changes, and a longer duration only for a meaningful spatial transition. Easing should match intent: responsive ease-out for entering content, ease-in for leaving content, and a smooth symmetric curve for repositioning. Do not use one duration for every animation. Never make a user wait for a decorative animation before continuing.

## Accessibility contract

Implement a global reduced-motion path. With Motion for React, `MotionConfig reducedMotion="user"` automatically disables transform and layout animation while preserving useful opacity and color transitions. For bespoke cases, `useReducedMotion` can replace transforms with opacity and disable autoplay video or parallax. [10]

```tsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

Also support `prefers-reduced-motion: reduce` in CSS. Disable decorative parallax and looping motion. Keep essential feedback, but communicate it through text, icon state, color, haptics, or audio as appropriate. Do not rely on motion alone to signal status.

## Interaction rules

Tie motion to the user’s action and preserve spatial logic. A view that enters from the bottom should generally dismiss toward the bottom. Keep frequently repeated controls quiet. Let users interrupt or cancel transitions. Avoid peripheral, full-screen, or oscillating motion, especially in immersive or media-heavy contexts.

## Motion review

Test at normal speed, keyboard-only, touch, trackpad, mobile, and reduced-motion settings. Verify that no important state is hidden when animation is removed. Check frame rate and paint cost in browser tooling before adding more choreography.
