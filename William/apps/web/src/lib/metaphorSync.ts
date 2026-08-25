/**
 * metaphorSync.ts (Orion / William)
 * Pushes cognitive session events into Metaphor OS as reflection graph nodes.
 */

const METAPHOR_API = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_METAPHOR_API_URL) || "http://localhost:8000/api/v1";
const METAPHOR_TOKEN_KEY = "metaphor_access_token";

function getToken(): string | null {
  try { return localStorage.getItem(METAPHOR_TOKEN_KEY); } catch { return null; }
}

async function pushToMetaphor(payload: {
  session_title: string;
  summary: string;
  context_payload?: Record<string, unknown>;
}): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${METAPHOR_API}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "sync_chat_drop",
          arguments: { source_model: "orion", ...payload },
        },
      }),
    });
  } catch {
    console.debug("[Orion → Metaphor] Sync skipped:", payload.session_title);
  }
}

export function syncSessionSummary(username: string, summary: string, journeyTitle?: string) {
  pushToMetaphor({
    session_title: `Orion Session: ${username}`,
    summary: `Orion cognitive session with ${username}.${journeyTitle ? ` Active journey: ${journeyTitle}.` : ""} Summary: ${summary.substring(0, 300)}`,
    context_payload: { event: "session_summary", username, journeyTitle },
  });
}

export function syncMilestoneCompleted(username: string, journeyTitle: string, milestone: string) {
  pushToMetaphor({
    session_title: `Milestone: ${milestone}`,
    summary: `${username} completed milestone "${milestone}" in journey "${journeyTitle}" via Orion.`,
    context_payload: { event: "milestone_completed", username, journeyTitle, milestone },
  });
}

export function syncConstitutionUpdated(username: string, rule: string) {
  pushToMetaphor({
    session_title: `Constitution Updated: ${username}`,
    summary: `${username} updated their constitution in Orion. New rule: "${rule.substring(0, 200)}"`,
    context_payload: { event: "constitution_updated", username, rule },
  });
}
