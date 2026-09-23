# Metaphor Typography Rationale & Font Proposal

## 1. Selected Typography Hierarchy

The approved typography for Metaphor couples an authoritative editorial display serif with a clean, ergonomic modern sans and an engineering monospace face.

| Role | Font Family | Weights | Rationale |
|---|---|---|---|
| **Display & Major Headings** | **Cormorant Garamond** | 300 (Light), 400 (Regular), Italic | Imparts editorial gravitas, calm intelligence, and human authority. Prevents Metaphor from looking like an off-the-shelf developer dashboard. |
| **Interface, Body & Forms** | **Geist / Satoshi** | 400 (Regular), 500 (Medium) | Neutral, extremely legible at small sizes, optimized for screen clarity with negative optical tracking (`-0.015em`). |
| **Metadata, IDs & Code** | **JetBrains Mono** | 400, 500 | Strict monospace cadence for hash IDs, timestamps, protocol signatures, and latency numbers. |

## 2. Usage Boundaries
- Cormorant Garamond is strictly reserved for:
  - Hero statements on Landing (`h1`)
  - Screen titles (`Your Connected World.`, `Tools & Capabilities.`, `Handoffs.`, `Sign In.`)
  - High-level synthesized answers in `/context`.
- JetBrains Mono is strictly banned from long-form paragraphs or marketing copy. It is used exclusively for protocol tags (`#HO-1042`), latencies (`22ms`), and status values (`ACTIVE`).
