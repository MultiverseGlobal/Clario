import { supabase } from './supabase';

export interface Command {
  id: string;
  execution_plan_id?: string;
  title: string;
  priority: number;
  estimated_duration: string;
  completed: boolean;
  started_at?: string;
  completed_at?: string;
}

export interface FocusSession {
  id: string;
  command_id: string;
  started_at: string;
  ended_at?: string;
  interruptions: number;
  score: number;
}

// ─── Commands (Execution State) ────────────────────────────────────────────────
export async function getActiveCommands(): Promise<Command[]> {
  try {
    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .eq('completed', false)
      .order('priority', { ascending: true });
    if (error || !data) throw error;
    return data;
  } catch (err) {
    console.log('Execution DB: Using fallback commands:', err);
    return [
      { id: 'cmd_1', title: 'Finalize Chief of Staff Platform Architecture', priority: 1, estimated_duration: '45m', completed: false },
      { id: 'cmd_2', title: 'Review Metaphor & Atlas Context Adapters', priority: 2, estimated_duration: '30m', completed: false },
    ];
  }
}

export async function completeCommand(commandId: string): Promise<void> {
  await supabase
    .from('commands')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', commandId);
}

// ─── Focus Sessions ────────────────────────────────────────────────────────────
export async function startFocusSession(commandId: string): Promise<FocusSession> {
  const newSession: Partial<FocusSession> = {
    command_id: commandId,
    started_at: new Date().toISOString(),
    interruptions: 0,
    score: 100,
  };
  const { data } = await supabase.from('focus_sessions').insert(newSession).select('*').single();
  return data || { id: `fs_${Date.now()}`, command_id: commandId, started_at: new Date().toISOString(), interruptions: 0, score: 100 };
}
