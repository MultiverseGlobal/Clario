// IContextProvider.ts — Decoupled interface for Orion context providers
export interface ContextItem {
  id: string;
  title: string;
  category: 'meeting' | 'document' | 'insight' | 'person';
  summary: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface IContextProvider {
  getContext(query: string): Promise<ContextItem[]>;
  getImportantPeople(): Promise<Array<{ id: string; name: string; role: string; lastContact: string }>>;
  getRecentInsights(): Promise<string[]>;
}
