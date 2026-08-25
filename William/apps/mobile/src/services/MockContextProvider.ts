import { IContextProvider, ContextItem } from './IContextProvider';
import { fetchBriefings } from './dbService';

export class MockContextProvider implements IContextProvider {
  async getContext(query: string): Promise<ContextItem[]> {
    const q = query.toLowerCase();
    try {
      const data = await fetchBriefings();
      if (data) {
        const mapped = data.map((b: any) => ({
          id: b.id,
          title: b.title,
          category: 'document' as const,
          summary: b.body || b.subtitle,
          timestamp: b.time || 'Recently',
        }));
        if (!query.trim()) return mapped;
        return mapped.filter((item: any) =>
          item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q)
        );
      }
    } catch (err) {
      console.log('Context Provider fetch error:', err);
    }
    return [];
  }

  async getImportantPeople(): Promise<Array<{ id: string; name: string; role: string; lastContact: string }>> {
    return [];
  }

  async getRecentInsights(): Promise<string[]> {
    return [];
  }
}

export const contextProvider: IContextProvider = new MockContextProvider();
