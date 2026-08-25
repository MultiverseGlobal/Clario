// Layer 0: Event System Infrastructure - EventTypes.ts

export type SourceSystem = 
  | 'github'
  | 'notion'
  | 'calendar'
  | 'gmail'
  | 'stripe'
  | 'slack'
  | 'drive'
  | 'system';

export type EventSeverity = 'info' | 'success' | 'warning' | 'critical';

export type EventCategory = 
  | 'code'
  | 'communication'
  | 'finance'
  | 'meeting'
  | 'document'
  | 'system';

export interface RawSourceEvent {
  id: string;
  source: SourceSystem;
  rawType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  author?: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

export interface ContextEvent {
  id: string;
  rawEventId: string;
  source: SourceSystem;
  category: EventCategory;
  title: string;
  summary: string;
  timestamp: string;
  severity: EventSeverity;
  authorName?: string;
  authorEmail?: string;
  primaryEntityId?: string;
  primaryEntityType?: string;
  relatedEntityIds: string[];
  metadata: Record<string, unknown>;
  aiContextObservation?: string;
}

export interface EventStreamFilter {
  sources?: SourceSystem[];
  categories?: EventCategory[];
  severities?: EventSeverity[];
  searchQuery?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
}
