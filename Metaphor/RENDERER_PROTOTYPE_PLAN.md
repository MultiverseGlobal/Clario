# CanvasSea Renderer Prototype Specification

**File:** `frontend/src/components/ui/CanvasSea.tsx`

## 1. Overview
The `CanvasSea` component provides a reactive canvas backdrop ("The White Sea") placed beneath all UI layers at `z-index: -1`. It creates a tactile sense of fluid depth without impairing accessibility or layout rendering.

## 2. Technical Architecture
1. **Wall-Clock Timing (`performance.now()`)**:
   - Rather than relying on arbitrary frame counters (`age++`) which fluctuate wildly between 60Hz and 144Hz+ displays, each wake point records `time: performance.now()`.
   - Lifespan is pinned to `WAKE_DURATION_MS = 600ms`.
   - `lifeRatio = 1 - (now - pt.time) / 600`.
   - Older points are automatically pruned during the render loop.

2. **Fluid Wake Rendering**:
   - As the mouse moves, coordinates are appended to the point queue.
   - The canvas draws smooth line segments connecting points with quadratic curve smoothing.
   - Stroke styling: `rgba(17, 19, 21, lifeRatio * 0.12)`, fading seamlessly into white.

3. **Ripple Physics**:
   - **Click**: Expands from radius 0 to 36px over 450ms with cubic ease-out.
   - **Hold (>200ms)**: Anchors a 12px held ripple with a gentle sinusoidal breathing pulse (`HELD_RADIUS = 12px`) until `mouseup`.
   - **Release**: Held ripple dissolves outward to 32px and fades away.

4. **Cursor Preservation**:
   - Native OS cursor is **NEVER hidden**.
   - No `cursor: none !important` rules exist.
   - Text selection, click targets, and interactive states remain 100% natural.
