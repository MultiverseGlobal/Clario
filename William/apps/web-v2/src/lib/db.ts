import { supabase } from './supabase';
import { apiFetch } from './api';
import type {
  Portrait,
  Journey,
  LibraryItem,
  ChatMessage,
  MemoryNode,
  MemoryEdge,
  ScheduleItem,
  AiInsight,
  VacationMetrics,
  WeatherData,
} from './types';

// Helper to safely parse JSON strings or return original value
function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// ─── Portrait ──────────────────────────────────────────────────────────────────
export async function getPortrait(): Promise<Portrait | null> {
  try {
    const { data, error } = await supabase.from('portrait').select('*').eq('id', 'user_1').single();
    if (error || !data) return getFallbackPortrait();
    return {
      id: data.id,
      name: data.name ?? 'Executive',
      identity: data.identity ?? 'Founder & Visionary',
      values: data.values ?? 'Autonomy, Mastery, Impact',
      principles: data.principles ?? 'First principles thinking',
      strengths: data.strengths ?? 'Strategic foresight, Deep focus',
      blind_spots: data.blind_spots ?? 'Context switching overload',
      dreams: data.dreams ?? 'Building next-generation autonomous systems',
      relationships: data.relationships ?? 'Key advisors & co-founders',
      decision_patterns: safeParseJson<string[]>(data.decision_patterns, ['Analytical', 'Long-term oriented']),
      growth: safeParseJson<string[]>(data.growth, ['System design scalability', 'Delegation']),
      cognitive_profile: safeParseJson(data.cognitive_profile, {
        problemSolvingStyle: 'First-principles breakdown',
        temporalBias: 'Future-focused',
        attentionSpan: 'High deep work capacity',
        decisionHeuristics: 'Expected value maximization',
      }),
      active_beliefs: safeParseJson(data.active_beliefs, [
        { belief: 'Execution velocity compounds exponentially', strength: 0.92, category: 'Strategy' },
        { belief: 'Clarity comes from building, not overthinking', strength: 0.88, category: 'Mindset' },
      ]),
      emotional_trends: safeParseJson(data.emotional_trends, []),
    };
  } catch (e) {
    console.warn('Supabase portrait error, returning fallback:', e);
    return getFallbackPortrait();
  }
}

function getFallbackPortrait(): Portrait {
  return {
    id: 'user_1',
    name: 'William',
    identity: 'AI Platform Architect & Strategic Founder',
    values: 'Autonomy, Mastery, Exponential Velocity',
    principles: 'First-principles reasoning & relentless iteration',
    strengths: 'Systemic architecture, deep work focus',
    blind_spots: 'Context-switching friction',
    dreams: 'Autonomous AI companion ecosystem',
    relationships: 'Engineering leaders & advisors',
    decision_patterns: ['First-principles reduction', 'High-leverage prioritization'],
    growth: ['Delegation protocols', 'Cognitive load management'],
    cognitive_profile: {
      problemSolvingStyle: 'First-principles breakdown',
      temporalBias: 'Future-focused',
      attentionSpan: 'High deep work capacity',
      decisionHeuristics: 'Expected value maximization',
    },
    active_beliefs: [
      { belief: 'Execution velocity compounds exponentially', strength: 0.92, category: 'Strategy' },
      { belief: 'Clarity comes from building', strength: 0.88, category: 'Mindset' },
    ],
    emotional_trends: [],
  };
}

export async function savePortrait(p: Partial<Portrait>): Promise<void> {
  await supabase.from('portrait').upsert({
    id: p.id ?? 'user_1',
    name: p.name,
    identity: p.identity,
    values: p.values,
    principles: p.principles,
    strengths: p.strengths,
    blind_spots: p.blind_spots,
    dreams: p.dreams,
    relationships: p.relationships,
    decision_patterns: p.decision_patterns ?? [],
    growth: p.growth ?? [],
    cognitive_profile: p.cognitive_profile ?? {},
    active_beliefs: p.active_beliefs ?? [],
    emotional_trends: p.emotional_trends ?? [],
  });
}

// ─── Journeys ──────────────────────────────────────────────────────────────────
export async function getJourneys(): Promise<Journey[]> {
  try {
    const { data } = await supabase.from('journeys').select('*').order('created_at');
    if (!data || data.length === 0) return getFallbackJourneys();
    return data.map(r => ({
      id: r.id,
      category: r.category,
      icon: r.icon,
      title: r.title,
      currentState: r.current_state,
      vision: r.vision,
      milestones: (safeParseJson<string[]>(r.milestones, [])).map((text: string, i: number) => ({
        id: `m_${i}`, text, completed: i === 0,
      })),
      memories: safeParseJson<string[]>(r.memories, []),
      lessons: safeParseJson<string[]>(r.lessons, []),
      progress: r.progress ?? 0,
      timeline: safeParseJson(r.timeline, []),
    }));
  } catch (e) {
    return getFallbackJourneys();
  }
}

function getFallbackJourneys(): Journey[] {
  return [
    {
      id: 'j_1',
      category: 'System Architecture',
      icon: 'Rocket',
      title: 'William Companion OS v2',
      currentState: 'Refining executive UI and vector memory graph',
      vision: 'A friction-free cognitive companion that manages executive workflow seamlessly',
      progress: 78,
      milestones: [
        { id: 'm_0', text: 'Define execution DB and Supabase schemas', completed: true },
        { id: 'm_1', text: 'Integrate dynamic widget loaders & skeleton UX', completed: true },
        { id: 'm_2', text: 'Deploy multi-agent streaming memory sync', completed: false },
      ],
      memories: ['Completed Timbal visual alignment', 'Optimized pgvector retrieval'],
      lessons: ['Decoupled frontend state allows instant perception of speed.'],
      timeline: [
        { date: 'Today', text: 'Modernized design system & dynamic widget loaders' },
        { date: 'Yesterday', text: 'Configured execution database & Supabase tables' },
      ],
    },
  ];
}

export async function saveJourney(j: Partial<Journey>): Promise<void> {
  const milestoneTexts = (j.milestones ?? []).map(m => m.text);
  await supabase.from('journeys').upsert({
    id: j.id,
    current_state: j.currentState,
    vision: j.vision,
    milestones: milestoneTexts,
    memories: j.memories ?? [],
    lessons: j.lessons ?? [],
    progress: j.progress,
    timeline: j.timeline ?? [],
    updated_at: new Date().toISOString(),
  });
}

// ─── Library ───────────────────────────────────────────────────────────────────
export async function getLibrary(): Promise<LibraryItem[]> {
  try {
    const { data } = await supabase.from('library').select('*').order('date_added', { ascending: false });
    if (!data || data.length === 0) return getFallbackLibrary();
    return data.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      author: r.author,
      content: r.content,
      dateAdded: r.date_added,
      tags: safeParseJson<string[]>(r.tags, []),
    }));
  } catch {
    return getFallbackLibrary();
  }
}

function getFallbackLibrary(): LibraryItem[] {
  return [
    {
      id: 'lib_1',
      type: 'idea',
      title: 'Cognitive Offloading via AI Agents',
      author: 'William System',
      content: 'True personal AI companionship is proactive context synthesis, not reactive Q&A.',
      dateAdded: new Date().toLocaleDateString(),
      tags: ['AI', 'Productivity', 'Systems'],
    },
    {
      id: 'lib_2',
      type: 'lesson',
      title: 'First-Principles Velocity',
      author: 'Executive',
      content: 'Small, unblocked daily releases compound into massive architectural advantages.',
      dateAdded: new Date().toLocaleDateString(),
      tags: ['Execution', 'Leadership'],
    },
  ];
}

// ─── Chats ─────────────────────────────────────────────────────────────────────
export async function getChats(limit = 50): Promise<ChatMessage[]> {
  try {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!data) return [];
    return data.reverse().map(r => ({
      id: r.id,
      sender: r.sender as 'william' | 'user',
      text: r.text,
      time: r.time,
    }));
  } catch {
    return [];
  }
}

export async function saveChat(msg: ChatMessage): Promise<void> {
  await supabase.from('chats').upsert({
    id: msg.id,
    sender: msg.sender,
    text: msg.text,
    time: msg.time,
    session: 'default',
    created_at: new Date().toISOString(),
  });
}

// ─── World Model ───────────────────────────────────────────────────────────────
export async function getWorldModel(): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
  try {
    const [{ data: nodes }, { data: edges }] = await Promise.all([
      supabase.from('memory_nodes').select('*').order('last_updated', { ascending: false }).limit(60),
      supabase.from('memory_edges').select('*').limit(100),
    ]);

    return {
      nodes: (nodes ?? []).map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        description: n.description,
        confidence: n.confidence,
        last_updated: n.last_updated,
        metadata: safeParseJson<Record<string, unknown>>(n.metadata, {}),
      })),
      edges: (edges ?? []).map(e => ({
        id: e.id,
        from_id: e.from_id,
        to_id: e.to_id,
        relation: e.relation,
        strength: e.strength,
        created_at: e.created_at,
      })),
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

export async function saveMemoryNode(node: Partial<MemoryNode>): Promise<void> {
  await supabase.from('memory_nodes').upsert({
    id: node.id,
    type: node.type,
    label: node.label,
    description: node.description,
    confidence: node.confidence ?? 1.0,
    last_updated: new Date().toISOString(),
    metadata: node.metadata ?? {},
  });
}

// ─── Briefings & Calendar Events (Schedule) ──────────────────────────────────
export async function getScheduleItems(): Promise<ScheduleItem[]> {
  try {
    const { data, error } = await supabase.from('calendar_events').select('*').order('time');
    if (error || !data || data.length === 0) return getFallbackSchedule();
    return data.map(item => ({
      id: item.id,
      time: item.time,
      title: item.title,
      location: item.location || 'Virtual',
      completed: item.completed ?? false,
    }));
  } catch {
    return getFallbackSchedule();
  }
}

function getFallbackSchedule(): ScheduleItem[] {
  return [
    {
      id: '1',
      time: '10:00 AM',
      title: 'Architectural Review w/ William Core',
      location: 'Executive Suite',
      completed: true,
    },
    {
      id: '2',
      time: '01:30 PM',
      title: 'Metaphor Context Integration Sync',
      location: 'Virtual Briefing Room',
      completed: false,
    },
    {
      id: '3',
      time: '04:00 PM',
      title: 'System Execution & Deep Focus',
      location: 'Focus Mode',
      completed: false,
    },
  ];
}

export async function saveScheduleItem(item: Partial<ScheduleItem>): Promise<ScheduleItem> {
  const newItem = {
    id: item.id ?? Date.now().toString(),
    time: item.time ?? '02:00 PM',
    title: item.title ?? 'New Task',
    location: item.location ?? 'Virtual',
    completed: item.completed ?? false,
  };
  try {
    await supabase.from('calendar_events').upsert(newItem);
  } catch (e) {
    console.warn('Failed saving schedule item to Supabase:', e);
  }
  return newItem;
}

export async function toggleScheduleItem(id: string, currentStatus: boolean): Promise<void> {
  try {
    await supabase.from('calendar_events').update({ completed: !currentStatus }).eq('id', id);
  } catch (e) {
    console.warn('Failed toggling schedule item:', e);
  }
}

// ─── AI Insights Widget Data ─────────────────────────────────────────────────
export async function getAiInsights(): Promise<AiInsight[]> {
  try {
    const { data } = await supabase.from('ai_insights').select('*');
    if (data && data.length > 0) {
      return data.map(d => ({
        pct: d.pct,
        pctSub: d.pct_sub,
        taskCompleted: d.task_completed,
        taskSub: d.task_sub,
        tip: d.tip,
      }));
    }
  } catch {}

  // If empty, generate them via backend
  try {
    const res = await apiFetch<{ insights: any[] }>('/api/insights/generate', { method: 'POST' });
    if (res && res.insights && res.insights.length > 0) {
      return res.insights.map(d => ({
        pct: d.pct,
        pctSub: d.pctSub,
        taskCompleted: d.taskCompleted,
        taskSub: d.taskSub,
        tip: d.tip,
      }));
    }
  } catch {}
  
  return [
    {
      pct: '94%',
      pctSub: 'High cognitive flow state maintained.',
      taskCompleted: '18/22',
      taskSub: 'Strategic objectives completed today.',
      tip: 'Optimal focus window detected between 2PM - 5PM.',
    },
    {
      pct: '88%',
      pctSub: '0 schedule conflicts or overlaps detected.',
      taskCompleted: '5/5',
      taskSub: 'Executive briefings reviewed.',
      tip: 'Take a 10-min outdoor walk to reset focus.',
    },
  ];
}

// ─── Vacation & Energy Metrics ───────────────────────────────────────────────
export async function getVacationMetrics(): Promise<VacationMetrics> {
  try {
    const { data } = await supabase.from('vacation_metrics').select('*').single();
    if (data) {
      return {
        daysLeft: data.days_left ?? 14,
        hoursLeft: data.hours_left ?? 112,
        totalDays: data.total_days ?? 25,
      };
    }
  } catch {}

  return {
    daysLeft: 14,
    hoursLeft: 112,
    totalDays: 25,
  };
}

// ─── Weather Data ────────────────────────────────────────────────────────────
export async function getWeatherData(city = 'Lisbon'): Promise<WeatherData> {
  const mapCodeToCondition = (code: number): 'cloudy' | 'sunny' | 'partly-cloudy' | 'rain' => {
    if (code === 0) return 'sunny';
    if (code >= 1 && code <= 3) return 'partly-cloudy';
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 80 && code <= 99) return 'rain';
    return 'cloudy';
  };

  const mapCodeToDesc = (code: number): string => {
    if (code === 0) return 'Clear sky';
    if (code === 1 || code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 51 && code <= 67) return 'Rain';
    if (code >= 80 && code <= 99) return 'Showers/Thunderstorm';
    return 'Cloudy';
  };

  try {
    // Lisbon coords default
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.7167&longitude=-9.1333&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=auto&forecast_hours=6');
    if (res.ok) {
      const data = await res.json();
      const currentCode = data.current.weather_code;
      const currentTemp = Math.round(data.current.temperature_2m);
      
      const hourly: import('./types').HourlyForecast[] = [];
      const currentHourStr = new Date().toISOString().substring(11, 13);
      for (let i = 0; i < 5; i++) {
        const timeStr = data.hourly.time[i].substring(11, 16);
        hourly.push({
          time: i === 0 ? 'Now' : timeStr,
          temp: `${Math.round(data.hourly.temperature_2m[i])}°`,
          condition: mapCodeToCondition(data.hourly.weather_code[i]),
          isNow: i === 0
        });
      }

      return {
        city,
        temp: `${currentTemp}°C`,
        condition: mapCodeToDesc(currentCode),
        description: `Current conditions in ${city}: ${mapCodeToDesc(currentCode)}.`,
        hourly
      };
    }
  } catch (e) {
    console.warn("Failed to fetch weather", e);
  }

  // Fallback
  return {
    city,
    temp: '22°C',
    condition: 'Partly Sunny',
    description: `Optimal conditions for focused work in ${city}.`,
    hourly: [
      { time: 'Now', temp: '22°', condition: 'cloudy', isNow: true },
      { time: '10:00', temp: '22°', condition: 'partly-cloudy' },
      { time: '11:00', temp: '23°', condition: 'partly-cloudy' },
      { time: '12:00', temp: '24°', condition: 'sunny' },
      { time: '13:00', temp: '26°', condition: 'sunny' },
    ],
  };
}

export async function getBriefings() {
  const { data } = await supabase.from('briefings').select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function saveBriefing(b: any) {
  await supabase.from('briefings').upsert(b);
}


