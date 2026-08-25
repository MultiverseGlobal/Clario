import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Portrait,
  Journey,
  LibraryItem,
  MemoryNode,
  MemoryEdge,
  ProactiveSignal,
  ActionLog,
  ActionType,
  ProactiveSignalType
} from '@william/types';

// Ensure Supabase is always used
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('WARNING: Missing SUPABASE_URL or SUPABASE key in environment variables.');
}

const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);

console.log('Memory: Initialized Supabase cloud memory adapter.');

// 1. Portrait Operations
export async function getPortrait(): Promise<Portrait | null> {
  const { data, error } = await supabase.from('portrait').select('*').eq('id', 'user_1').single();
  if (error || !data) return null;
  return {
    name: data.name,
    identity: data.identity,
    values: data.values,
    principles: data.principles,
    strengths: data.strengths,
    blind_spots: data.blind_spots,
    dreams: data.dreams,
    relationships: data.relationships,
    decision_patterns: data.decision_patterns || [],
    growth: data.growth || [],
    cognitiveProfile: data.cognitive_profile || {
      problemSolvingStyle: 'System-builder (prefers architectural foundations over spontaneous routines)',
      temporalBias: 'Underestimates 3-month compound growth; overestimates 1-week execution limits',
      attentionSpan: 'High-intensity deep work blocks, susceptible to rapid burnout if rest is neglected',
      decisionHeuristics: 'Prefers writing structured code to resolve ambiguity rather than discussing specs'
    },
    activeBeliefs: data.active_beliefs || []
  };
}

export async function savePortrait(p: Portrait): Promise<void> {
  const { error } = await supabase.from('portrait').upsert({
    id: 'user_1',
    name: p.name,
    identity: p.identity,
    values: p.values,
    principles: p.principles,
    strengths: p.strengths,
    blind_spots: p.blind_spots,
    dreams: p.dreams,
    relationships: p.relationships,
    decision_patterns: p.decision_patterns,
    growth: p.growth,
    cognitive_profile: p.cognitiveProfile,
    active_beliefs: p.activeBeliefs
  });
  if (error) throw error;
}

// 2. Journeys Operations
export async function getJourneys(): Promise<Journey[]> {
  const { data, error } = await supabase.from('journeys').select('*');
  if (error || !data) return [];
  return data.map((j: any) => ({
    id: j.id,
    category: j.category,
    icon: j.icon,
    title: j.title,
    currentState: j.current_state,
    vision: j.vision,
    milestones: j.milestones || [],
    memories: j.memories || [],
    lessons: j.lessons || [],
    progress: j.progress || 0,
    timeline: j.timeline || []
  }));
}

export async function saveJourney(j: Journey): Promise<void> {
  const { error } = await supabase.from('journeys').upsert({
    id: j.id,
    category: j.category,
    icon: j.icon,
    title: j.title,
    current_state: j.currentState,
    vision: j.vision,
    milestones: j.milestones,
    memories: j.memories,
    lessons: j.lessons,
    progress: j.progress,
    timeline: j.timeline
  });
  if (error) throw error;
}

// 3. Library Operations
export async function getLibrary(): Promise<LibraryItem[]> {
  const { data, error } = await supabase.from('library').select('*');
  if (error || !data) return [];
  return data.map((item: any) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    author: item.author || undefined,
    content: item.content,
    dateAdded: item.date_added,
    tags: item.tags || []
  }));
}

export async function saveLibraryItem(item: LibraryItem): Promise<void> {
  const { error } = await supabase.from('library').upsert({
    id: item.id,
    type: item.type,
    title: item.title,
    author: item.author || null,
    content: item.content,
    date_added: item.dateAdded,
    tags: item.tags
  });
  if (error) throw error;
}

// 4. Chronicle / Timeline Operations
export async function getChronicle(): Promise<any[]> {
  const { data, error } = await supabase.from('chronicle').select('*').order('id', { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function saveChronicle(entry: { id: string; time: string; category: string; text: string }): Promise<void> {
  const { error } = await supabase.from('chronicle').insert(entry);
  if (error) throw error;
}

// 5. Chats Operations
export async function getChats(session: string): Promise<any[]> {
  const { data, error } = await supabase.from('chats').select('*').eq('session', session).order('id', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function saveChat(chat: { id: string; sender: string; text: string; time: string; session: string }): Promise<void> {
  const { error } = await supabase.from('chats').insert(chat);
  if (error) throw error;
}

// 6. Memory Graph Operations
export async function getMemoryNodes(): Promise<MemoryNode[]> {
  const { data, error } = await supabase.from('memory_nodes').select('*');
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    type: r.type,
    label: r.label,
    description: r.description,
    confidence: r.confidence,
    lastUpdated: r.last_updated,
    metadata: r.metadata || {}
  }));
}

export async function saveMemoryNode(node: MemoryNode): Promise<void> {
  const { error } = await supabase.from('memory_nodes').upsert({
    id: node.id,
    type: node.type,
    label: node.label,
    description: node.description,
    confidence: node.confidence,
    last_updated: node.lastUpdated,
    metadata: node.metadata
  });
  if (error) throw error;
}

export async function getMemoryEdges(): Promise<MemoryEdge[]> {
  const { data, error } = await supabase.from('memory_edges').select('*');
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    fromId: r.from_id,
    toId: r.to_id,
    relation: r.relation,
    strength: r.strength,
    createdAt: r.created_at
  }));
}

export async function saveMemoryEdge(edge: MemoryEdge): Promise<void> {
  const { error } = await supabase.from('memory_edges').upsert({
    id: edge.id,
    from_id: edge.fromId,
    to_id: edge.toId,
    relation: edge.relation,
    strength: edge.strength,
    created_at: edge.createdAt
  });
  if (error) throw error;
}

// 7. Proactive Signals Operations
export async function getProactiveSignals(unacknowledgedOnly = false): Promise<ProactiveSignal[]> {
  let q = supabase.from('proactive_signals').select('*').order('trigger_time', { ascending: true });
  if (unacknowledgedOnly) q = q.eq('acknowledged', false);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    type: r.type as ProactiveSignalType,
    triggerTime: r.trigger_time,
    message: r.message,
    acknowledged: r.acknowledged === true || r.acknowledged === 1,
    createdAt: r.created_at
  }));
}

export async function saveProactiveSignal(signal: ProactiveSignal): Promise<void> {
  const { error } = await supabase.from('proactive_signals').upsert({
    id: signal.id,
    type: signal.type,
    trigger_time: signal.triggerTime,
    message: signal.message,
    acknowledged: signal.acknowledged,
    created_at: signal.createdAt
  });
  if (error) throw error;
}

export async function acknowledgeSignal(signalId: string): Promise<void> {
  await supabase.from('proactive_signals').update({ acknowledged: true }).eq('id', signalId);
}

// 8. Action Log Operations
export async function getActionLog(status?: 'pending' | 'executed' | 'failed'): Promise<ActionLog[]> {
  let q = supabase.from('action_log').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    actionType: r.action_type as ActionType,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
    status: r.status,
    createdAt: r.created_at,
    executedAt: r.executed_at,
    error: r.error
  }));
}

export async function saveActionLog(action: ActionLog): Promise<void> {
  const { error } = await supabase.from('action_log').upsert({
    id: action.id,
    action_type: action.actionType,
    payload: action.payload,
    status: action.status,
    created_at: action.createdAt,
    executed_at: action.executedAt || null,
    error: action.error || null
  });
  if (error) throw error;
}

export async function updateActionStatus(
  id: string,
  status: 'executed' | 'failed',
  error?: string
): Promise<void> {
  const executedAt = new Date().toISOString();
  await supabase.from('action_log').update({ status, executed_at: executedAt, error: error || null }).eq('id', id);
}

export async function getCalendarEvents(): Promise<any[]> {
  const { data } = await supabase.from('calendar_events').select('*');
  return data || [];
}
