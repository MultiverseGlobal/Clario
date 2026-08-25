/**
 * metaphorSync.ts (Clario)
 * Pushes creative project events into Metaphor OS as context nodes.
 */

const METAPHOR_API = (import.meta as any).env?.VITE_METAPHOR_API_URL || "http://localhost:8000/api/v1";
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
          arguments: { source_model: "clario", ...payload },
        },
      }),
    });
  } catch {
    console.debug("[Clario → Metaphor] Sync skipped:", payload.session_title);
  }
}

export function syncProjectHarvested(projectName: string, mode: string, shotCount: number) {
  pushToMetaphor({
    session_title: `Clario Project: ${projectName}`,
    summary: `Clario harvested "${projectName}" (${mode}) — ${shotCount} shots/slides extracted and processed.`,
    context_payload: { event: "project_harvested", projectName, mode, shotCount },
  });
}

export function syncProjectExported(projectName: string, exportType: string) {
  pushToMetaphor({
    session_title: `Clario Export: ${projectName}`,
    summary: `Clario exported "${projectName}" as ${exportType}.`,
    context_payload: { event: "project_exported", projectName, exportType },
  });
}
