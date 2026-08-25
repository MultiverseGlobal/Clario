import { fetchActiveCommands } from './dbService';

export interface AtlasGoal {
  id: string;
  title: string;
  vision: string;
  milestones: string[];
  alignmentScore: number;
}

export async function fetchAtlasStrategy(): Promise<AtlasGoal[]> {
  try {
    const data = await fetchActiveCommands();

    if (data) {
      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        vision: 'High-leverage strategic focus area.',
        milestones: ['Database Persistence', 'Claude 3.5 Sonnet Reasoning'],
        alignmentScore: 90,
      }));
    }
  } catch (err) {
    console.log('Atlas Adapter fetch error:', err);
  }
  return [];
}
