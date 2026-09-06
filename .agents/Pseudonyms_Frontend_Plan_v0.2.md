# Pseudonyms Frontend Plan v0.1

**Status:** Architecture direction locked. Screen-level visual specification still to be workshoped.
**Date:** September 2026

## 1. Product Thesis

Pseudonyms is an ecosystem for a one-person company. The hypothesis is that one capable founder can use Pseudonyms to acquire customers, coordinate AI/tools, create/deliver work, and remain profitable without needing a conventional team.

Pseudonyms itself is **not** the shared context/data layer. It is the ecosystem-level identity/authentication layer and the mechanism for moving between the four independent products.

The four products are:

- **Orion:** personal AI, planning, memory, journaling, reflection, and execution.
- **Metaphor:** shared context and tool layer connecting AI systems, projects, files, state, and handoffs.
- **Atlas:** sales/marketing/distribution system for discovering, qualifying, approaching, and following up with opportunities.
- **Clario:** creative production system for understanding visual references and turning them into original creative workflows/assets.

The desired relationship is:

> **Same soul, four worlds.**

They are separate applications, not four modes of one giant dashboard.

---

# 2. Frontend Design Philosophy

## Core emotional target

The interface should create:

- calm
- presence
- wonder
- clarity
- confidence
- a sense of entering a world rather than operating a dashboard

Working visual direction:

> **Atmospheric Glass**

Glass is a material, not the identity.

The design system can combine atmosphere, light, translucency, soft depth, solid surfaces, texture, and occasional 3D instead of making everything black glass.

## Reference roles

### NaturalAI
Borrow:
- atmosphere
- restraint
- elegance
- spatial calm

Do not copy:
- branding
- exact composition
- proprietary visual elements

### Pillow Talk AI
Borrow:
- intimacy
- conversational presence
- emotional simplicity
- conversational-first layout

Do not copy:
- exact UI
- components
- branding

### Pseudonyms
Own:
- spatial ecosystem navigation
- the Pseudonyms spin/orb/sigil
- four distinct product worlds
- transitions between products

---

# 3. Global Product Rules

1. Calm over busy.
2. Presence over dashboards.
3. Depth over decoration.
4. Whitespace is intentional.
5. Typography carries hierarchy.
6. Motion communicates rather than entertains.
7. Materiality should feel physical and coherent.
8. Do not add UI simply because other SaaS products have it.
9. Avoid generic AI aesthetics: neon, cyberpunk, excessive glow, particle overload, circuitry motifs.
10. Avoid excessive cards, pills, widgets, gradients, borders, and floating controls.
11. Do not make every surface glass.
12. Light and dark themes must both feel designed, not inverted.
13. 3D is atmospheric and functional, never a technology demo.
14. Accessibility and usability outrank novelty.
15. When uncertain, remove complexity before adding it.

### Taste test

A screen should be reviewed for:

- composition
- hierarchy
- restraint
- materiality
- typography
- motion
- spatiality
- identity
- coherence
- usability

If removing an element makes the design stronger without reducing function, remove it.

---

# 4. Ecosystem Navigation

Pseudonyms is not a conventional app launcher.

The signature interaction is a small, elegant **orb/sigil** that can expand or become a spatial selector.

Concept:

`Current product → Pseudonyms orb → spatial selector → select another world → open its independent application`

Important:

- Do not force a literal wheel if another spatial interaction proves more elegant.
- Do not transform Orion into Atlas/Metaphor/Clario inside the same screen.
- Switching products should feel like moving between places.
- Each product retains its own app context and navigation.

---

# 5. Product Visual Personalities

## Orion: Calm / Introspective / Personal

Visual qualities:
- quiet
- intimate
- soft atmospheric depth
- conversational
- human-scale

Primary metaphor:
> a quiet room for thinking and acting

## Metaphor: Expansive / Connected / Intellectual

Visual qualities:
- spatial
- connected
- layered
- information-rich without becoming a dashboard

Primary metaphor:
> a space where ideas and tools can meet

## Atlas: Precise / Purposeful / Capable

Visual qualities:
- sharper hierarchy
- strong information density control
- evidence and confidence
- momentum

Primary metaphor:
> a command room for finding opportunity

## Clario: Expressive / Visual / Creative

Visual qualities:
- richer imagery
- composition
- references
- visual rhythm
- creative play with restraint

Primary metaphor:
> a visual studio

---

# 6. Frontend Architecture

Recommended baseline:

- **Next.js + React + TypeScript** for each product application.
- **pnpm monorepo** for shared packages and consistent tooling.
- **shadcn/ui + Base UI primitives** for accessible foundations, heavily customized.
- **CSS variables/design tokens** as the source of visual values.
- **Motion** for ordinary interface animation and interaction.
- **GSAP** only where advanced timelines or cinematic sequences justify it.
- **Three.js + React Three Fiber + Drei** only for deliberately chosen 3D moments.
- **Playwright** for browser testing and visual verification.

The products remain separate applications while sharing:

- identity/session conventions
- design tokens
- UI primitives
- motion primitives
- iconography rules
- accessibility conventions
- frontend utilities

We do not need a micro-frontend system for V1.

Simple independent apps in one monorepo are preferred.

---

# 7. Suggested Repository Structure

```text
pseudonyms/
├── apps/
│   ├── orion/
│   ├── metaphor/
│   ├── atlas/
│   └── clario/
│
├── packages/
│   ├── ui/
│   ├── design-tokens/
│   ├── motion/
│   ├── icons/
│   ├── shared-types/
│   └── utils/
│
├── design/
│   ├── constitution/
│   ├── tokens/
│   ├── components/
│   ├── motion/
│   ├── materials/
│   ├── references/
│   └── screens/
│
├── .agents/
│   ├── rules/
│   ├── skills/
│   └── workflows/
│
└── tests/
    ├── e2e/
    └── visual/
```

---

# 8. Frontend Build Phases

## Phase 0: Reset + Architecture

### Goal
Create a clean foundation before rebuilding UI.

### Deliverables
- repository reset
- monorepo structure
- app boundaries
- shared package boundaries
- design documentation structure
- agent rules
- frontend coding rules
- baseline tooling

### Gate
No legacy UI or component is kept unless explicitly approved.

---

# Phase 1: Pseudonyms Design System

### Goal
Define the visual language shared by all four worlds.

### Deliverables
- typography system
- color and theme tokens
- spacing scale
- radii
- elevation/depth rules
- material system
- iconography
- accessibility states
- component foundations
- motion principles
- responsive rules
- light/dark/adaptive theme rules

### Important
Do not start by building every component imaginable.

Build only foundations required by the first product flows.

### Gate
We can look at an unbranded component and recognize that it belongs to Pseudonyms.

---

# Phase 2: Pseudonyms Shell + Identity Experience

### Goal
Build the ecosystem-level frontend experience.

### Deliverables
- authentication entry
- account identity
- Pseudonyms mark
- ecosystem shell conventions
- product switcher/orb/sigil
- transitions between products
- responsive behavior
- theme persistence

### Gate
Moving from one product to another feels like moving between worlds, not navigating a SaaS sidebar.

---

# Phase 3: Orion UX First

Orion is the first product to fully design and implement because it is the operator's primary interface and the first proof surface.

## Orion V1 frontend surfaces

### 1. Splash / entry

Purpose:
- establish atmosphere
- introduce the product mark
- transition into Orion

Rules:
- minimal
- roughly one second or less
- no loading spectacle
- no clutter

### 2. Orion Home

This is **not** a conventional dashboard.

The earlier research draft used the phrase “Home Dashboard,” but our discussion has moved away from that model.

Home should feel like Orion's presence is already there.

Potential information:
- current state
- what requires attention
- active priorities
- recent meaningful context
- conversational entry
- Pseudonyms orb

The exact composition is **not yet locked** and must be workshoped before implementation.

### 3. Conversation

This is Orion's primary interaction surface.

Principles:
- conversational first
- spacious
- emotionally calm
- actionable without becoming task-management software

Examples of natural commands:

- “Journal this.”
- “Plan tomorrow.”
- “What am I neglecting?”
- “Remind me about Atlas.”
- “Open my priorities.”

The UI should be capable of turning conversation into structured actions without forcing the user into separate modules.

### 4. Journal / Memory

Purpose:
- capture thoughts
- expose useful remembered context
- allow reflection

The journal should feel quiet and raw.

AI observations should support the user's writing rather than dominate it.

### 5. Pseudonyms selector

Purpose:
- spatially move between Orion, Metaphor, Atlas, and Clario

The final interaction is still open for workshoping. Orb/sigil is the current direction; literal wheel is not mandatory.

### Orion frontend gate

Orion is ready for backend wiring when:

- the home composition is locked
- conversation interaction is locked
- journal/memory structure is locked
- Pseudonyms navigation is locked
- responsive behavior is defined
- motion rules are defined
- accessibility states are defined

---

# 9. Metaphor Frontend Plan

Metaphor should not become another chat application.

Its interface should expose shared context, projects, files, connections, and handoffs.

Core UI concepts:

- project/workspace context
- source/context objects
- connected AI tools
- handoff activity
- files/resources
- permissions
- context history

Core interaction:

`AI A → Metaphor → shared context/tool layer → AI B`

The visual system should feel more spatial and connected than Orion.

V1 should avoid:
- giant knowledge graphs
- elaborate agent maps
- its own general chatbot
- dozens of integrations

---

# 10. Atlas Frontend Plan

Atlas is the distribution surface.

Core loop:

`Find → qualify → approve → contact → follow up`

Core UI concepts:

- opportunity feed
- evidence/proof panel
- qualification state
- contact information
- outreach preparation
- pipeline state
- next action

The key UI metric is not “number of leads.”

The interface should help the founder answer:

> **Which opportunities are worth my attention right now?**

Avoid turning Atlas into a generic CRM.

---

# 11. Clario Frontend Plan

Clario is a creative production environment.

Core loop:

`Reference → understand → reconstruct → produce`

Core UI concepts:

- reference ingestion
- visual analysis
- structural breakdown
- narrative/creative grammar
- original creative blueprint
- prompt generation
- asset/output area

Visual density can be higher than Orion, but hierarchy must remain clear.

Clario should feel like a studio, not a spreadsheet of assets.

---

# 12. Motion System

## Default tool

**Motion** for React interface animation.

Use it for:
- entrances/exits
- shared layout transitions
- menus
- gestures
- conversational states
- spring interactions
- product switching

## Advanced tool

**GSAP** only for:
- complex timelines
- cinematic sequences
- highly choreographed transitions

## Motion rules

- movement must have a reason
- prefer subtle physics
- avoid constant floating
- avoid animation on every element
- respect reduced-motion preferences
- transitions should reinforce spatial relationships

---

# 13. 3D System

Use:

- Three.js
- React Three Fiber
- Drei

Potential uses:

- Pseudonyms orb/sigil
- atmospheric spatial transitions
- subtle material/light interactions
- selected Clario creative surfaces

Rules:

- 3D is optional
- never block primary functionality on 3D
- provide graceful fallback
- do not load heavy 3D by default on mobile unless justified
- measure performance

---

# 14. Responsive Strategy

## Orion

**Mobile-first.**

Primary design target is phone use.

Desktop should be a natural expansion rather than the starting point.

## Metaphor / Atlas / Clario

Responsive web applications.

Desktop can become more information-dense where the work requires it, while preserving the same design language.

## Shared rules

- avoid hard-coded screen-specific layouts when responsive behavior can be expressed semantically
- define component states at mobile/tablet/desktop breakpoints
- test touch targets and keyboard navigation

---

# 15. Accessibility + Performance

Target:

- WCAG 2.2 AA principles
- keyboard-operable controls
- visible focus states
- semantic HTML
- labels for icon-only controls
- sufficient contrast
- reduced-motion support

Performance goals should be treated as design constraints, particularly on Orion mobile.

Do not add:

- heavy videos
- expensive blur everywhere
- unnecessary particle systems
- large 3D scenes
- oversized client-side JavaScript

without a measured reason.

---

# 16. AI Coding Agent Setup

The coding agent must operate inside a design system, not freestyle UI.

## Agent hierarchy

```text
PRODUCT PURPOSE
    ↓
DESIGN CONSTITUTION
    ↓
PRODUCT VISUAL LANGUAGE
    ↓
SCREEN SPECIFICATION
    ↓
DESIGN SYSTEM
    ↓
REFERENCES
    ↓
COMMON UI PATTERNS
    ↓
AGENT INVENTION
```

Lower levels cannot override higher levels.

## Recommended skills

- design-director
- visual-design
- typography
- motion-design
- 3d-design
- responsive-design
- accessibility
- frontend-engineering
- Figma
- browser/Playwright
- visual-QA
- performance

## Recommended MCP/tooling baseline

- Figma MCP
- Playwright / Playwright CLI
- GitHub
- database tooling when needed
- documentation/context tooling such as Context7

Do not install a giant collection of MCP servers by default. Context quality matters more than tool count.

---

# 17. Design → Build → Verify Workflow

For every important screen:

```text
VISION
  ↓
REFERENCE RESEARCH
  ↓
SCREEN SPEC
  ↓
FIGMA
  ↓
AGENT IMPLEMENTATION
  ↓
BROWSER RENDER
  ↓
VISUAL QA
  ↓
ACCESSIBILITY QA
  ↓
PERFORMANCE QA
  ↓
HUMAN REVIEW
  ↓
LOCK
```

Do not give the agent a whole product and say “make it beautiful.”

Build and approve one meaningful surface at a time.

---

# 18. What We Have Actually Finished

## Locked enough to implement

- Pseudonyms is the identity/ecosystem layer, not the shared data layer.
- Four independent applications: Orion, Metaphor, Atlas, Clario.
- Shared visual soul, distinct product atmospheres.
- Orion is mobile-first.
- Pseudonyms uses an orb/sigil/spatial switcher direction.
- NaturalAI is an atmosphere reference.
- Pillow Talk is an intimacy/conversation reference.
- Glass is a material, not the brand identity.
- Motion is the default UI animation system.
- Three.js/R3F is optional for carefully chosen 3D.
- Next.js/React/TypeScript is the frontend baseline.
- shadcn/Base UI is infrastructure, not the visual identity.
- Playwright is part of the visual/interaction QA loop.
- Independent apps in a monorepo are preferred over micro-frontends for V1.
- Design constitution + agent skills/rules are required before large-scale implementation.

## Not finished yet

- exact Pseudonyms landing/auth screens
- exact Pseudonyms orb/switcher geometry and interaction
- exact Orion Home composition
- exact Orion Conversation composition
- exact Orion Journal/Memory composition
- exact Atlas screens
- exact Metaphor screens
- exact Clario screens
- final typeface selection
- final token values
- final theme palettes
- final motion timings
- final 3D visual language
- exact component inventory

These are not architecture problems. They are **workshop/design decisions** and should be resolved before implementation.

---

# 19. Frontend Definition of Done for V1

The frontend is ready for the backend/product proof when:

- Pseudonyms identity flow works.
- Product switching works without feeling like a dashboard.
- Orion can be used naturally on a phone.
- Orion conversation is the primary interaction surface.
- Orion can expose actionable state without becoming a task-management clone.
- Atlas, Metaphor, and Clario have coherent independent shells.
- Shared design primitives are reusable but each product has a distinct visual personality.
- Core transitions feel intentional.
- Mobile and desktop layouts are responsive.
- Critical flows have Playwright coverage.
- Key screens have visual baselines.
- Accessibility issues at the critical/serious level are resolved.
- Performance is measured rather than assumed.

---

# 20. The Strategic Order

We should not build all four products at equal depth immediately.

Recommended order:

```text
Pseudonyms foundation
        ↓
Design system
        ↓
Orion
        ↓
Real workflow with Orion
        ↓
Atlas / Metaphor / Clario integrations as needed
        ↓
First customer
        ↓
Measure leverage + profitability
        ↓
Expand the products based on evidence
```

The frontend is not finished when all screens exist.

It is finished when the interface successfully supports the one-person-company experiment without adding friction, noise, or unnecessary complexity.

## 13. 3D System

3D is optional infrastructure, not a default visual layer.

Recommended:
- Three.js
- React Three Fiber
- Drei

Use 3D for:
- Pseudonyms orb/sigil
- atmospheric surfaces
- subtle spatial transitions
- selected Clario visual interactions
- rare product-specific moments where depth adds meaning

Do not use 3D for:
- decorative particles everywhere
- entire dashboards
- persistent heavy scenes on mobile
- effects that compete with readable content

Every 3D scene must have a 2D/fallback representation and a performance budget.

---

# 14. Responsive Strategy

Pseudonyms is adaptive, not desktop-first with a mobile patch.

### Orion
Mobile-first and touch-first.

Primary target:
- modern phone viewport
- one-handed interaction where practical
- thumb-reachable primary actions
- safe-area awareness
- keyboard-aware conversation layout

Desktop should expand the same experience rather than replace it with a dashboard.

### Metaphor
Desktop and large mobile both matter, but spatial context may expand on larger screens.

### Atlas
Desktop is useful because evidence, qualification and pipeline require more information density. Mobile remains functional for review and next actions.

### Clario
Responsive canvas/workspace behavior with strong emphasis on visual media.

General rule:
> Responsive behavior changes composition, not product identity.

---

# 15. Typography

The typography system must be chosen deliberately rather than relying on framework defaults.

Define:
- display style
- conversational/body style
- metadata style
- numeric style where required
- line-height scale
- tracking rules
- maximum readable text widths
- truncation behavior

Rules:
- hierarchy should be visible without excessive font weights
- long-form text gets generous line height
- conversational content gets comfortable measure
- avoid using color alone to establish hierarchy

Typography is part of the product personality, not decoration added after layout.

---

# 16. Material System

Pseudonyms uses a controlled material vocabulary.

Possible materials:

```text
AIR
LIGHT
GLASS
FROST
SOFT
SOLID
DEEP
```

Each material defines:
- opacity
- blur
- border treatment
- shadow/elevation
- texture/noise if used
- theme behavior
- accessibility constraints

Never apply blur or translucency purely because it looks futuristic.

The material must communicate hierarchy or atmosphere.

---

# 17. Motion Principles

Motion has four jobs:

1. communicate state
2. preserve spatial continuity
3. provide feedback
4. create atmosphere

### Motion hierarchy

**Micro**
- button feedback
- focus
- toggles
- input state

**Component**
- cards
- sheets
- menus
- message appearance

**Spatial**
- Pseudonyms selector
- product transition
- major navigation

**Cinematic**
- rare splash/brand sequences
- exceptional Clario moments

Default behavior:
- short, soft, physically coherent
- spring-like where appropriate
- respect reduced-motion preferences
- avoid animations on every element

A transition should answer:
> What changed, and where did it go?

---

# 18. Accessibility Baseline

Target WCAG 2.2 AA as the baseline.

Required from the beginning:
- semantic HTML
- keyboard navigation
- visible focus states
- accessible names for icon buttons
- sufficient text contrast
- reduced-motion support
- screen-reader friendly status updates
- meaningful form labels/errors
- non-color state indicators
- keyboard alternatives for major gestures
- usable touch targets

A beautiful interaction that only works with a mouse is unfinished.

---

# 19. Component Architecture

Build primitives once and specialize through composition.

Shared primitives should include only genuinely cross-product concerns:
- buttons
- inputs
- typography
- surfaces
- overlays
- sheets
- dialogs
- navigation primitives
- status indicators
- avatars/icons
- command/search primitives where needed

Product-specific components stay inside the product app unless there is a proven reuse case.

Do not create a huge universal component system before real screens exist.

---

# 20. State + Frontend Data Strategy

Frontend state should distinguish:

### Server state
Data fetched from backend:
- conversations
- journal entries
- projects
- opportunities
- context objects
- files

### UI state
Local interaction:
- open panels
- selected product
- modal state
- animation state
- draft input

### Persistent preferences
- theme
- motion preference
- layout preference
- notification preference

Do not put all state into one global store.

Use the simplest mechanism appropriate for each class of state.

---

# 21. API Boundary for Frontend

The frontend should not contain provider secrets or business-critical authorization logic.

Preferred flow:

```text
Frontend
   ↓
Authenticated application/API boundary
   ↓
Domain service logic
   ↓
Database / model providers / external tools
```

Frontend responsibilities:
- rendering
- input collection
- optimistic UI where safe
- navigation
- local interaction state
- displaying server state

Backend responsibilities:
- authorization
- business rules
- model/tool access
- persistence
- usage accounting
- jobs
- integrations

---

# 22. Frontend-to-Backend Contract Principles

Use typed contracts.

For V1:
- REST/JSON or Next.js route handlers are sufficient
- shared TypeScript types are useful
- validate incoming/outgoing data at the boundary
- version only when there is a real compatibility requirement

Every important mutation should have an explicit state lifecycle:

`idle → pending → success | failure`

The UI should never pretend an action succeeded before the server confirms it, except for deliberately designed optimistic interactions that can be safely rolled back.

---

# 23. Pseudonyms Identity Frontend

Pseudonyms owns:
- sign in/sign up
- account identity
- session continuity
- product switching

Pseudonyms does NOT own:
- a shared global project database
- shared AI memory
- product business logic
- a universal chatbot

Each product owns its own domain state.

The frontend should make this boundary invisible to the user while keeping it explicit in architecture.

---

# 24. Product Entry / Switch Flow

Canonical experience:

```text
Pseudonyms identity
        ↓
      Orion
        ↓
 Pseudonyms orb/sigil
        ↓
 spatial selector
        ↓
     Atlas
```

The browser/application may navigate to a separate product application/domain while preserving identity.

The transition itself can be visually continuous even though the applications are technically separate.

---

# 25. Antigravity Operating Model

Antigravity must not be asked to invent the frontend from a single prompt.

Its workflow is:

```text
Read rules
   ↓
Read product vision
   ↓
Read screen specification
   ↓
Inspect design system
   ↓
Inspect references
   ↓
Plan
   ↓
Implement
   ↓
Run app
   ↓
Inspect in browser
   ↓
Visual QA
   ↓
Fix deviations
   ↓
Run tests
   ↓
Present result
```

Relevant skills:
- design-director
- visual-designer
- typography
- motion-designer
- 3d-designer
- frontend-engineer
- responsive-design
- accessibility
- browser-qa
- visual-qa

Relevant integrations:
- Figma MCP
- Playwright/Playwright CLI
- GitHub
- documentation/context tooling
- database tooling only when backend work requires it

The agent must use only the skills and tools relevant to the current task.

---

# 26. Design Approval Workflow

No screen becomes "done" merely because it renders.

A screen passes through:

### 1. Concept
What is this screen supposed to make the user feel and accomplish?

### 2. Composition
Where is the visual center and hierarchy?

### 3. System
Does it use established tokens, materials and components?

### 4. Motion
What moves and why?

### 5. Responsive
What changes across widths and input modes?

### 6. Accessibility
Can it be operated and understood by more users?

### 7. Browser reality
Does the rendered product match the intended design?

### 8. Human approval
Ben approves or rejects the screen.

---

# 27. Visual QA Checklist

For every significant screen, review:

**Composition**
- visual center is clear
- spacing feels intentional
- no accidental crowding

**Hierarchy**
- primary action is obvious
- secondary information stays secondary

**Material**
- surfaces have clear roles
- blur/glass does not destroy readability

**Typography**
- hierarchy is obvious
- line length is comfortable
- no accidental visual noise

**Motion**
- transitions communicate state
- animation is not distracting
- reduced motion works

**Responsive**
- no overflow
- no awkward collapse
- controls remain usable

**Identity**
- unmistakably belongs to Pseudonyms
- product personality is present
- does not look like generic AI SaaS

**Performance**
- no avoidable heavy effects
- 3D is lazy-loaded where appropriate
- media is optimized

---

# 28. Performance Budget

Performance is a design constraint, not a post-launch cleanup task.

Baseline targets should include:
- strong Core Web Vitals
- minimal layout shift
- responsive interaction
- optimized images and fonts
- code splitting for heavy product features
- lazy loading for 3D/media

For Orion in particular:
> the conversation must remain responsive on an ordinary modern phone.

No visual effect is worth making the primary product feel slow.

---

# 29. Screen Specification Template

Every screen we design should have a file containing:

```text
SCREEN NAME

Purpose
User state
Primary action
Secondary actions
Information hierarchy
Layout
Responsive behavior
Materials
Typography
Components
Motion
Accessibility
Empty state
Loading state
Error state
Success state
Edge cases
Reference images
Anti-references
Definition of done
```

This becomes the contract between design and Antigravity.

---

# 30. Final Frontend Build Order

The clean implementation order is:

```text
1. Repository reset
2. Design constitution
3. Design tokens
4. Typography + materials
5. Shared primitives
6. Pseudonyms identity entry
7. Pseudonyms orb/sigil prototype
8. Orion splash
9. Orion home
10. Orion conversation
11. Orion journal/memory
12. Orion product switching
13. Playwright + visual QA
14. Metaphor shell
15. Atlas shell
16. Clario shell
17. Product-specific design expansion
```

We do not build all four products to equal depth immediately.

**Orion becomes the first fully realized product.**

The other three need enough frontend structure to prove that the ecosystem model works, then they deepen according to the validation experiment.

---

# 31. Definition of Done for Pseudonyms Frontend V0

The frontend is considered ready for the first real customer experiment when:

- Pseudonyms identity works
- product switching works
- Orion is visually coherent and usable
- Orion is mobile-first
- Orion conversation works end-to-end
- Orion can expose useful personal state/actions
- Atlas has enough interface to support prospecting workflow
- Metaphor has enough interface to support context/project/tool workflow
- Clario has enough interface to support reference-to-workflow creation
- shared visual DNA is visible across all four
- no major accessibility blockers remain
- core Playwright flows pass
- visual regression baseline exists for critical screens
- production performance is acceptable
- error/loading/empty states are designed
- Antigravity can safely extend the frontend from documented rules rather than inventing architecture

---

# 32. What We Are Deliberately NOT Building Yet

Do not build these before the first proof cycle:

- micro-frontend infrastructure
- giant component catalog
- elaborate 3D environments
- autonomous desktop agents
- voice-first Orion
- giant knowledge graphs
- complex design-token automation
- social features
- universal notifications center
- custom animation engine
- custom rendering engine
- full CRM replacement
- full video editor
- all possible MCP integrations

The standard is:

> **Beautiful enough to feel like Pseudonyms. Powerful enough to test the thesis. Small enough to finish.**

---

# 33. Current Status

### Locked
- Pseudonyms is the identity/authentication ecosystem layer.
- Four products remain independent applications.
- The products share visual DNA but have distinct personalities.
- The Pseudonyms orb/sigil is the current switching direction.
- Orion is mobile-first.
- Orion is conversational and contextual rather than dashboard-first.
- Atmospheric Glass is the current material direction.
- Motion is the default UI motion system.
- Three.js/R3F is optional for deliberate 3D moments.
- Figma + Antigravity is the intended design-to-code workflow.
- Playwright is part of browser/visual QA.
- Design and implementation must be separated by explicit specifications.

### Still subject to refinement through real design work
- exact typeface choices
- final color tokens
- exact material recipes
- exact Orion Home composition
- exact Pseudonyms selector geometry
- exact transition choreography
- exact 3D orb/sigil construction
- final responsive breakpoints
- product-specific surface details

These should be decided in Figma and browser prototypes rather than guessed in code.

---

# 34. Frontend North Star

Pseudonyms should not feel like four AI dashboards sharing a logo.

It should feel like:

> **one coherent world containing four different places, built to make one person extraordinarily capable.**

The frontend's job is not to show how much software exists.

Its job is to make the user's ability feel larger than the interface itself.
