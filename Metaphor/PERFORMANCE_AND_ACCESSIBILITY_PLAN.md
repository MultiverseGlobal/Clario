# Performance & Accessibility Specification

## 1. Accessibility (a11y) & Reduced Motion Contract

1. **`prefers-reduced-motion` Enforcement**:
   - `CanvasSea` actively listens to `(prefers-reduced-motion: reduce)`.
   - When active, the entire canvas render loop and event listeners are torn down.
   - The canvas is replaced with a static CSS radial dot-grid:
     ```tsx
     <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FFFFFF] bg-[radial-gradient(rgba(17,19,21,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
     ```

2. **Keyboard Navigation & ARIA**:
   - All interactive inputs, buttons, and navigation links have distinct focus outlines (`focus-visible:ring-2 ring-[var(--color-ink)]`).
   - Modals and drawers implement Escape key dismissal and focus trapping.
   - Contrast ratio for `--color-ink` (`#111315`) on `#FFFFFF` is `18.1:1`, comfortably exceeding WCAG AAA standards.

## 2. Performance & 60fps Frame Budget

1. **Canvas Lifecycle Optimization**:
   - Canvas is marked with `aria-hidden="true"` and `pointer-events-none`.
   - High-DPI displays are scaled using `window.devicePixelRatio`.
   - Canvas is cleared only when points or ripples exist; idle states consume zero GPU fill rate.
   - `document.visibilityState` listener pauses the animation loop when the browser tab is hidden or backgrounded.

2. **React Re-render Isolation**:
   - Mousemove coordinates are pushed directly to local typed arrays without triggering component state re-renders.
   - Zero React reconciliation overhead during cursor movement.
