# Metaphor Phase 2 Implementation & Verification Plan

## 1. Vertical Slice Verification Checklist

The verified end-to-end user path is established and unblocked:

1. **Public Landing (`/`)**:
   - User reviews the strategic context-gap narrative.
   - Pointer creates subtle fluid wake without lagging.
   - Clicks "Start Connecting" &rarr; routes to `/onboard/step-1`.

2. **Onboarding Step 1 (`/onboard/step-1`)**:
   - User inputs initial project scope ("e.g. Orion Notification Engine").
   - Stored in `sessionStorage.metaphor_onboard_step1`.
   - Clicks "Continue to tools" &rarr; routes to `/onboard/step-2`.

3. **Tool Selection (`/onboard/step-2`)**:
   - Displays authentic brand logos (ChatGPT, Claude, GitHub, Notion, Antigravity, Cursor).
   - Clicking a tool toggles connecting / connected status.
   - Selected tools saved to `sessionStorage.metaphor_onboard_tools`.
   - Clicks "Continue" &rarr; routes to `/signup`.

4. **Signup & Workspace Summary (`/signup`)**:
   - Left panel shows Project Scope + Selected Connected Tools.
   - User enters Name, Email, Password.
   - Submitting sets `metaphor_onboarded=true` cookie and updates cloud settings.
   - Seamlessly directs to `/world`.

5. **Your Connected World (`/world`)**:
   - Opens as the primary authenticated home.
   - Scope banner displays the onboarded project name.
   - Matrix reflects the active participants.
   - Interactive pending approval for Handoff #1042 allows one-click approval.
   - Live stream displays recent events with clear demonstration tags.

6. **Inspection Routes**:
   - `/tools`: Shows participants registry with telemetry notice.
   - `/handoffs`: Displays timeline ledger with expandable payload drawers.
   - `/context`: Query bar answers context questions with source provenance.
   - `/connections`: Manages MCP server endpoints and OAuth credentials.
