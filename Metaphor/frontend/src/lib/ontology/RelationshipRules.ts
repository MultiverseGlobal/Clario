// Layer 3: Ontology - RelationshipRules.ts
import { EntityType, RelationshipType, METAPHOR_ONTOLOGY } from './OntologySchema';

export interface ValidRelationshipPair {
  sourceType: EntityType;
  relation: RelationshipType;
  targetType: EntityType;
  description: string;
}

export const VALID_RELATIONSHIP_RULES: ValidRelationshipPair[] = [
  { sourceType: 'Person', relation: 'owns', targetType: 'Project', description: 'Person is the primary owner of a project' },
  { sourceType: 'Person', relation: 'assigned_to', targetType: 'Task', description: 'Person is assigned to complete a task' },
  { sourceType: 'Meeting', relation: 'produces', targetType: 'Decision', description: 'Discussion during meeting produced an explicit decision' },
  { sourceType: 'Decision', relation: 'blocks', targetType: 'Task', description: 'Pending decision blocks execution of task' },
  { sourceType: 'Commit', relation: 'produces', targetType: 'Task', description: 'Code merge resolves engineering task' },
  { sourceType: 'Document', relation: 'mentions', targetType: 'Project', description: 'Specification doc references project requirements' },
  { sourceType: 'Project', relation: 'depends_on', targetType: 'Project', description: 'System dependency between projects' },
  { sourceType: 'Event', relation: 'impacts', targetType: 'Goal', description: 'Event moves metric toward strategic goal' }
];

export class RelationshipRulesEngine {
  /**
   * Validates whether a proposed relationship between two entities adheres to Metaphor Ontology.
   */
  public static isValidRelationship(sourceType: EntityType, relation: RelationshipType, targetType: EntityType): boolean {
    const sourceDef = METAPHOR_ONTOLOGY[sourceType];
    if (!sourceDef || !sourceDef.allowedSourceRelations.includes(relation)) {
      return false;
    }

    const matchesRule = VALID_RELATIONSHIP_RULES.some(rule => 
      rule.sourceType === sourceType && rule.relation === relation && rule.targetType === targetType
    );

    return matchesRule || relation === 'mentions' || relation === 'connected_through';
  }
}
