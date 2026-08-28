# Sovereign Ecosystem Onboarding

Welcome to the **Pseudonyms Ecosystem**—a federated, multi-agent environment where data, identity, and cognition flow seamlessly across multiple independent surfaces. 

This document serves as an architectural overview and onboarding guide to understand what we've achieved and how the ecosystem interlocks.

---

## 1. Sovereign Session Architecture (Identity)

In a typical multi-app environment, users are forced to log in separately to each tool, resulting in fragmented state and disjointed workflows. 

**What we achieved:**
We built a true **Sovereign Session** protocol powered by **Pseudonyms ID** acting as a central identity provider. 
- **Centralized Auth:** You log in once to `Pseudonyms ID`.
- **Token Injection:** When you open **Atlas IO** or **Metaphor**, they redirect you to `Pseudonyms ID`. If an active session exists, Pseudonyms securely pushes the `access_token` and `refresh_token` back to the app via a URL hash fragment.
- **Universal State:** Supabase clients across all apps intercept this token, instantly authorizing the user. 
- **Global Identity:** By updating your `username` in Pseudonyms ID (stored in Supabase `user_metadata`), your identity instantly propagates across every application without needing complex database synchronization.

---

## 2. The Applications

### **Pseudonyms ID** (The Keymaster)
- The gatekeeper of the ecosystem. Handles Supabase email/password authentication and routes OAuth callbacks. 
- Acts as the Single Sign-On (SSO) hub for the entire suite.

### **Atlas IO** (The Architect)
- A high-performance spatial interface (React + Vite) designed for visualizing systems, knowledge graphs, and complex workflows.
- Connects directly to the Sovereign Session to pull personalized data securely.

### **Metaphor** (The Cognitive Engine)
- A Next.js-powered application handling language processing, agentic pipelines, and deep reasoning.
- Metaphor's backend bridges the gap between raw thought and structured output.

### **Clario** (The Studio)
- A cloud-migrated media manipulation engine (Python/FastAPI) that handles heavy video and audio harvesting (FFmpeg, yt-dlp) without freezing your local machine.

### **Orion** (The Companion)
- A React Native (Expo) mobile application designed for your phone.
- It acts as the physical bridge to the ecosystem, recording voice thoughts, viewing briefings, and acting as the receiver for handoffs from Atlas and Metaphor.

---

## 3. The Porcelain Design System (PDS-v3)

Aesthetics are non-negotiable. To ensure the ecosystem feels premium and unified, we migrated all apps (Atlas, Metaphor, Clario) to the **Pseudonyms Design System v3**.
- **Colors:** We moved away from generic grays to a highly curated Obsidian and Porcelain palette (`hsl(0 0% 98%)` for text, `hsl(240 10% 4%)` for backgrounds).
- **Typography:** We enforce `Inter` (sans) and `Cormorant` (serif) across the board for a sophisticated, editorial feel.
- **Micro-interactions:** Glassmorphism, subtle borders, and smooth layout transitions are enforced via synchronized Tailwind configurations.

---

## 4. State Handoff (The Next Frontier)

The ultimate goal of the ecosystem is zero-friction context switching. 
We are actively building **Orion Handoff**:
- **Realtime Channels:** Using Supabase Realtime, Atlas and Metaphor broadcast your current active state (e.g., "Editing Document A") to a secure, private channel (`handoff-${user.id}`).
- **Physical Continuity:** When you open Orion on your phone, it automatically subscribes to this channel. Upon detecting an active session on your PC, Orion instantly offers to pull that context into your hand, allowing you to walk away from your desk without losing your train of thought.

*The future is not a single app, but a sovereign environment that molds to your physical presence.*
