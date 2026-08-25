// Layer 0 & Layer 2: Event System - EventTransformer.ts
import { ContextEvent } from './EventTypes';

export interface GeneratedGraphMutation {
  type: 'node_upsert' | 'edge_upsert';
  nodeData?: {
    id: string;
    label: string;
    type: string;
    properties: Record<string, unknown>;
  };
  edgeData?: {
    id: string;
    source: string;
    target: string;
    relation: string;
  };
}

export class EventTransformer {
  /**
   * Transforms a normalized ContextEvent into automatic graph mutations and timeline updates.
   */
  public static transformToGraphMutations(event: ContextEvent): GeneratedGraphMutation[] {
    const mutations: GeneratedGraphMutation[] = [];

    // 1. Ensure Primary Entity node exists
    if (event.primaryEntityId && event.primaryEntityType) {
      mutations.push({
        type: 'node_upsert',
        nodeData: {
          id: event.primaryEntityId,
          label: event.title.split(':')[1]?.trim() || event.title,
          type: event.primaryEntityType,
          properties: {
            lastUpdated: event.timestamp,
            source: event.source,
            category: event.category
          }
        }
      });
    }

    // 2. Link related entities via directed edges
    if (event.primaryEntityId) {
      event.relatedEntityIds.forEach(targetId => {
        mutations.push({
          type: 'edge_upsert',
          edgeData: {
            id: `edge_${event.primaryEntityId}_${targetId}`,
            source: event.primaryEntityId!,
            target: targetId,
            relation: this.inferRelationType(event)
          }
        });
      });
    }

    return mutations;
  }

  private static inferRelationType(event: ContextEvent): string {
    switch (event.category) {
      case 'code':
        return 'modifies';
      case 'meeting':
        return 'produces';
      case 'document':
        return 'mentions';
      case 'finance':
        return 'impacts';
      case 'communication':
        return 'references';
      default:
        return 'related_to';
    }
  }
}
