/**
 * connections.ts
 * Syncs the user's MCP/OAuth connection list to Supabase user_metadata
 * so it persists across devices and browser sessions.
 *
 * Storage key in user_metadata: metaphor_connections_v2
 * Falls back gracefully to localStorage-only when Supabase is unavailable.
 */

import { supabase } from './supabase';

export interface ConnectionItem {
  id: string;
  name: string;
  type: 'mcp' | 'oauth' | 'api_key';
  endpoint?: string;
  account?: string;
  status: 'connected' | 'disconnected';
}

const STORAGE_KEY = 'metaphor_connections_v2';

// ── Local storage helpers ──────────────────────────────────────────────────

export function getLocalConnections(): ConnectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLocalConnections(connections: ConnectionItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
  } catch {}
}

// ── Cloud sync ─────────────────────────────────────────────────────────────

/**
 * Push the current connections list to Supabase user_metadata.
 * Called whenever the user adds or removes a connection.
 */
export async function pushConnectionsToCloud(connections: ConnectionItem[]): Promise<void> {
  // Always write to localStorage first (instant, no network)
  setLocalConnections(connections);

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user?.id) return;

    const { error } = await supabase.auth.updateUser({
      data: { [STORAGE_KEY]: connections },
    });

    if (error) {
      console.warn('[Metaphor] Failed to sync connections to cloud:', error.message);
    }
  } catch (err) {
    // Supabase unavailable — localStorage version is the source of truth
    console.warn('[Metaphor] Cloud sync skipped (Supabase unavailable):', err);
  }
}

/**
 * Pull connections from Supabase user_metadata.
 * Merges with localStorage: cloud wins on conflict.
 * Call once on app mount / after sign-in.
 */
export async function pullConnectionsFromCloud(): Promise<ConnectionItem[]> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user) {
      // Not signed in — return localStorage version
      return getLocalConnections();
    }

    const cloudConnections = userAuth.user.user_metadata?.[STORAGE_KEY];
    if (Array.isArray(cloudConnections) && cloudConnections.length > 0) {
      // Cloud wins — write back to localStorage so offline access is fresh
      setLocalConnections(cloudConnections);
      return cloudConnections;
    }

    // Cloud has nothing — upload the localStorage version (migration path)
    const local = getLocalConnections();
    if (local.length > 0) {
      await pushConnectionsToCloud(local);
    }
    return local;
  } catch (err) {
    console.warn('[Metaphor] Could not pull connections from cloud:', err);
    return getLocalConnections();
  }
}
