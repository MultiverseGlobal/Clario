# Rule: Pseudonyms Unified Ecosystem Design Standard

Always adhere to the design system outlined in `DESIGN.md` when building or modifying apps across the Pseudonyms workspace:

1. **Clean & High-Craft Aesthetics**:
   - Palette: Deep Obsidian (`#090a0f`), surface glass panels (`rgba(18, 20, 29, 0.85)`), and hairline borders (`rgba(255, 255, 255, 0.08)`).
   - Never use raw/generic saturated colors. Use curated HSL and accent tokens (Metaphor Violet `#8b5cf6`, Orion Cyan `#00f0ff`, Atlas Emerald `#10b981`, Clario Rose `#ec4899`, Weave Amber `#f59e0b`).
   - Clean spacing, uncluttered hierarchy, and crisp typography with Inter and JetBrains Mono.

2. **Unified Navigation & Identity**:
   - Provide the **Ecosystem App Switcher (The 9-dot Google-style Waffle menu)** and **Master Account Profile** across top-level interfaces.
   - Centralize auth state through Pseudonyms ID (`id.pseudonyms.app` / `localhost:3005`).

3. **Cross-App Context State**:
   - Treat cross-app context as a first-class feature: when a major event or data artifact is created, support reading/writing through the Universal Context Vault API.
