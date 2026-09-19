# CREATIVE TOOLCHAIN & MOTION PRODUCTION SPEC

The visual ambition of Metaphor requires a deliberate creative production stack.
Do not interpret "use advanced tools" as "install every animation library."
Use each tool only where it materially improves the experience.
Before adding a dependency, inspect the existing stack and determine whether the requirement can already be handled cleanly.

---

# 1. PRIMARY RUNTIME STACK

The default frontend stack should remain:
* Next.js
* React
* TypeScript
* Tailwind / CSS
* existing state management
* existing Metaphor APIs

Do not replace the core frontend framework.

---

# 2. MOTION STACK

## Motion
Use Motion for React as the default animation layer.
Use it for:
* component transitions
* hover
* press
* focus
* drag
* layout transitions
* shared-element transitions
* spring physics
* enter/exit states

Prefer Motion over introducing another animation system for ordinary React interactions.

---

# 3. GSAP

Use GSAP only where Motion becomes awkward or insufficient.
Primary use cases:
* cinematic timelines
* multi-object choreography
* complex sequencing
* synchronised transition sequences
* advanced scroll choreography

Do not use GSAP merely because it exists. Keep normal UI declarative and simple.

---

# 4. LENIS

Use Lenis where smooth scrolling materially improves the experience.
Appropriate uses:
* Home cinematic scrolling
* contextual storytelling
* parallax
* World entry transitions
* synchronising scroll with WebGL/GSAP

Do not break normal browser scrolling semantics.
Respect: keyboard navigation, browser find, sticky positioning, accessibility, reduced motion.

---

# 5. THREE.JS + REACT THREE FIBER

For genuinely spatial experiences, use:
```text
three
@react-three/fiber
@react-three/drei
```
Use this primarily for:
* World
* deep contextual exploration
* the Context Field where genuinely useful
* special spatial transitions
* high-depth visual states

Do not put a Three.js canvas behind every page.

---

# 6. REACT POSTPROCESSING

Where a 3D scene genuinely benefits from it, use:
```text
@react-three/postprocessing
```
Potential effects: restrained bloom, depth of field, subtle noise, vignette, atmospheric depth.
Use these as finishing tools, not as decoration. Avoid overprocessing.

---

# 7. SPLINE

Use Spline when an interaction benefits from a highly authored 3D scene that would be inefficient to construct manually.
Do not embed large Spline scenes when a lightweight custom WebGL scene is more appropriate.
Do not use Spline for ordinary layout.

---

# 8. THEATRE.JS

Use Theatre.js when designers need frame-level control over complex motion choreography.
Good use cases: camera choreography, 3D scene animation, carefully authored transition sequences, synchronised visual storytelling.
Do not use Theatre.js for ordinary button/card interactions.

---

# 9. RIVE

Use Rive selectively for compact, stateful animations (contextual icons, animated status indicators, small living system objects).
Do not use Rive as the global animation framework.

---

# 10. HIGGSFIELD

Higgsfield or an equivalent cinematic-generation system may be used for bespoke visual assets.
Generated video is an **asset**, not a substitute for real-time product interaction.
Do not use video to fake interactions that should be rendered live.

---

# 11. FIGMA

Use Figma as the visual planning/prototyping environment when necessary.
Use it to answer: "Does this interaction feel right?"
Do not create exhaustive static mockups that become disconnected from implementation.

---

# 12. TOOL DECISION MATRIX

```text
Simple interface → CSS
React interaction → Motion
Complex timeline → GSAP
Smooth scroll → Lenis
2D relationship visualization → React Flow
Broad graph exploration → Force Graph
3D React environment → React Three Fiber + Three.js + Drei
3D visual effects → react-postprocessing
Authored interactive 3D scene → Spline
Frame-level motion choreography → Theatre.js
Small stateful animation → Rive
Cinematic generated asset → Higgsfield
```

---

# 13. DO NOT MIX MOTION SYSTEMS UNNECESSARILY

A single interaction should have one clear owner.

---

# 14. MOTION DESIGN SYSTEM

Create shared motion tokens (micro, small, medium, large, cinematic, spectacle).
Define easing, spring stiffness, damping, transition duration, stagger rules, camera movement rules.
Do not randomly choose animation durations.

---

# 15. DEPTH SYSTEM

Define a consistent depth hierarchy: Background, Field, Surface, Elevated surface, Focused object, Spatial object, Foreground control.
Use blur, scale, lighting, parallax, shadow, translation to communicate depth.

---

# 16. CONTEXT FIELD ENGINE

Create a reusable `ContextField`. It should never interfere with readable content.

---

# 17. WORLD RENDERING STRATEGY

Do not render all graph nodes.
Use: focused neighbourhood ↓ progressive expansion ↓ LOD ↓ deep spatial exploration.

---

# 18. CAMERA PHILOSOPHY

Camera movement should have meaning. Never move the camera randomly for spectacle.

---

# 19. FIRST ENTRY

Target: 2–3 seconds. Do not replay the full sequence on every visit.

---

# 20. SPECTACLE BUDGET

Ordinary interaction: 10–20% visual drama
Important transition: 40–60%
Special exploration: 70–100%
The more meaningful the action, the more visual attention it is allowed to command.

---

# 21. PERFORMANCE FALLBACKS

Every advanced visual experience must have a fallback.
The product should never become unusable because a visual effect failed.

---

# 22. CREATIVE ASSET WORKFLOW

Optimize media before production use.

---

# 23. BLENDER

Blender may be introduced when we need a bespoke 3D object that is better authored offline than procedurally.
Do not add Blender-generated geometry merely for decoration.

---

# 24. VISUAL REFERENCES

Before implementing major spectacle moments, gather references. Do not copy another product.
Extract principles: composition, motion, depth, interaction, restraint, transition language.

---

# 25. TOOLCHAIN RULE

The tools are servants of the experience.
If CSS produces the best result, use CSS.
If Motion produces the best result, use Motion.
If a custom WebGL scene produces the best result, use WebGL.

---

# 26. FINAL CREATIVE STANDARD

Before accepting any major visual feature, test:
Does it improve meaning? orientation? communicate state? deepen immersion? create delight? remain usable? perform well?
If the answer is only "It looks cool" do not ship it.
