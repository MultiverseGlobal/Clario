/**
 * dbService.ts
 * 
 * ALL data access for the mobile app routes through the Express BrainGateway server.
 * The mobile app no longer holds a Supabase key or talks directly to the database.
 * 
 * Data flow: Mobile → Express Server → Supabase
 */

import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Briefing {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  urgent: boolean;
  type: 'urgent' | 'digest';
  time: string;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: string;
  location: string;
  status: 'upcoming' | 'active' | 'completed' | 'conflict';
  conflict_notice?: string;
}

export interface Command {
  id: string;
  title: string;
  estimated_duration: string;
  priority: number;
  completed: boolean;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  description?: string;
  confidence?: number;
  updated_at?: string;
}

export interface UserPortrait {
  name: string;
  identity: string;
  values: string;
  cognitive_profile?: {
    problemSolvingStyle?: string;
    temporalBias?: string;
  };
}

export interface ChronicleEntry {
  id: string;
  time: string;
  category: 'thought' | 'system' | 'reflection' | 'memory';
  text: string;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Android emulator uses 10.0.2.2 to reach host localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005';
  }
  return 'http://localhost:3005';
};

const SERVER_URL = getBaseUrl();

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`);
    if (!res.ok) {
      console.warn(`[dbService] GET ${path} failed: ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[dbService] GET ${path} error:`, err);
    return null;
  }
}

async function post<T>(path: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[dbService] POST ${path} failed: ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[dbService] POST ${path} error:`, err);
    return null;
  }
}

async function put<T>(path: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[dbService] PUT ${path} failed: ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[dbService] PUT ${path} error:`, err);
    return null;
  }
}

// ─── Portrait ─────────────────────────────────────────────────────────────────

export async function fetchUserPortrait(): Promise<UserPortrait> {
  const data = await get<UserPortrait>('/api/portrait');
  return data ?? {
    name: 'Orion',
    identity: 'Systems Architect & Chief Executive',
    values: 'Autonomy, aesthetic excellence, compounding focus',
  };
}

// ─── Briefings ────────────────────────────────────────────────────────────────

export async function fetchBriefings(): Promise<Briefing[]> {
  return (await get<Briefing[]>('/api/briefings')) ?? [];
}

export async function createNewBriefing(
  title: string,
  body: string,
  urgent = false,
): Promise<Briefing> {
  const data = await post<Briefing>('/api/briefings', { title, body, urgent });
  if (!data) throw new Error('Failed to create briefing');
  return data;
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  return (await get<CalendarEvent[]>('/api/calendar')) ?? [];
}

export async function createNewCalendarEvent(
  title: string,
  time: string,
  location = 'Remote',
): Promise<CalendarEvent> {
  const data = await post<CalendarEvent>('/api/calendar', { title, time, location });
  if (!data) throw new Error('Failed to create calendar event');
  return data;
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<CalendarEvent>,
): Promise<void> {
  await put('/api/calendar/' + id, updates);
}

// ─── Commands (Focus Tasks) ───────────────────────────────────────────────────

export async function fetchActiveCommands(): Promise<Command[]> {
  return (await get<Command[]>('/api/commands')) ?? [];
}

export async function createNewCommand(
  title: string,
  duration = '30m',
): Promise<Command> {
  const data = await post<Command>('/api/commands', { title, duration });
  if (!data) throw new Error('Failed to create command');
  return data;
}

export async function fetchKnowledgeNodes(): Promise<KnowledgeNode[]> {
  return (await get<KnowledgeNode[]>('/api/knowledge-nodes')) ?? [];
}

// ─── Chronicle ────────────────────────────────────────────────────────────────

export async function fetchChronicles(): Promise<ChronicleEntry[]> {
  return (await get<ChronicleEntry[]>('/api/chronicle')) ?? [];
}

// ─── Realtime Subscriptions ───────────────────────────────────────────────────
// NOTE: Realtime subscriptions previously came from Supabase channels.
// Since the mobile client no longer holds a Supabase connection,
// these now use a lightweight polling pattern until a WebSocket
// channel is added to the Express server.

export function subscribeToCalendarEvents(callback: () => void): () => void {
  const interval = setInterval(callback, 30_000); // Poll every 30s
  return () => clearInterval(interval);
}

export function subscribeToKnowledgeNodes(callback: () => void): () => void {
  const interval = setInterval(callback, 60_000); // Poll every 60s
  return () => clearInterval(interval);
}
