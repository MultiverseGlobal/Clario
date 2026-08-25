// Shared types for web-v2
export interface Portrait {
  id: string;
  name: string;
  identity: string;
  values: string;
  principles: string;
  strengths: string;
  blind_spots: string;
  dreams: string;
  relationships: string;
  decision_patterns: string[];
  growth: string[];
  cognitive_profile: {
    problemSolvingStyle: string;
    temporalBias: string;
    attentionSpan: string;
    decisionHeuristics: string;
  };
  active_beliefs: Array<{ belief: string; strength: number; category: string }>;
  emotional_trends?: Array<{ date: string; sentiment: string; note: string }>;
}

export interface Milestone {
  id: string;
  text: string;
  completed: boolean;
}

export interface Journey {
  id: string;
  category: string;
  icon: string;
  title: string;
  currentState: string;
  vision: string;
  milestones: Milestone[];
  memories: string[];
  lessons: string[];
  progress: number;
  timeline: Array<{ date: string; text: string }>;
}

export interface LibraryItem {
  id: string;
  type: string;
  title: string;
  author: string;
  content: string;
  dateAdded: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'william' | 'user';
  text: string;
  time: string;
}

export interface MemoryNode {
  id: string;
  type: string;
  label: string;
  description: string;
  confidence: number;
  last_updated: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryEdge {
  id: string;
  from_id: string;
  to_id: string;
  relation: string;
  strength: number;
  created_at: string;
}

export interface WorldModel {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  completed: boolean;
}

export interface AiInsight {
  pct: string;
  pctSub: string;
  taskCompleted: string;
  taskSub: string;
  tip: string;
}

export interface VacationMetrics {
  daysLeft: number;
  hoursLeft: number;
  totalDays: number;
}

export interface HourlyForecast {
  time: string;
  temp: string;
  condition: 'cloudy' | 'sunny' | 'partly-cloudy' | 'rain';
  isNow?: boolean;
}

export interface WeatherData {
  city: string;
  temp: string;
  condition: string;
  description: string;
  hourly: HourlyForecast[];
}

