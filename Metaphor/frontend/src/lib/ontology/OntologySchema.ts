// Layer 3: Ontology - OntologySchema.ts

export type EntityType = 
  | 'Person'
  | 'Project'
  | 'Meeting'
  | 'Task'
  | 'Decision'
  | 'Commit'
  | 'Document'
  | 'Repository'
  | 'Goal'
  | 'Product'
  | 'Event';

export type RelationshipType = 
  | 'owns'
  | 'produces'
  | 'blocks'
  | 'depends_on'
  | 'mentions'
  | 'assigned_to'
  | 'created'
  | 'scheduled_after'
  | 'connected_through'
  | 'impacts';

export interface EntityPropertyDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  required?: boolean;
}

export interface EntityTypeDef {
  type: EntityType;
  label: string;
  description: string;
  iconName: string;
  color: string;
  properties: EntityPropertyDef[];
  allowedSourceRelations: RelationshipType[];
}

export const METAPHOR_ONTOLOGY: Record<EntityType, EntityTypeDef> = {
  Person: {
    type: 'Person',
    label: 'Person',
    description: 'Human actor, collaborator, engineer, or partner',
    iconName: 'User',
    color: '#06b6d4', // Soft cyan
    properties: [
      { key: 'name', label: 'Full Name', type: 'string', required: true },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'role', label: 'Role / Title', type: 'string' }
    ],
    allowedSourceRelations: ['owns', 'created', 'assigned_to', 'mentions']
  },
  Project: {
    type: 'Project',
    label: 'Project',
    description: 'Strategic initiative, core codebase, or active deliverable',
    iconName: 'FolderGit2',
    color: '#0066ff', // Electric Blue
    properties: [
      { key: 'name', label: 'Project Name', type: 'string', required: true },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'impact', label: 'Business Impact', type: 'string' }
    ],
    allowedSourceRelations: ['depends_on', 'produces', 'blocks', 'impacts']
  },
  Meeting: {
    type: 'Meeting',
    label: 'Meeting',
    description: 'Synchronous sync, alignment session, or customer call',
    iconName: 'Video',
    color: '#8b5cf6', // Muted purple
    properties: [
      { key: 'title', label: 'Meeting Title', type: 'string', required: true },
      { key: 'date', label: 'Date Time', type: 'date' },
      { key: 'attendees', label: 'Attendees', type: 'array' }
    ],
    allowedSourceRelations: ['produces', 'mentions', 'scheduled_after']
  },
  Task: {
    type: 'Task',
    label: 'Task',
    description: 'Engineering work item, action item, or ticket',
    iconName: 'CheckSquare',
    color: '#3b82f6',
    properties: [
      { key: 'title', label: 'Task Title', type: 'string', required: true },
      { key: 'status', label: 'State', type: 'string' }
    ],
    allowedSourceRelations: ['depends_on', 'blocks', 'assigned_to']
  },
  Decision: {
    type: 'Decision',
    label: 'Decision',
    description: 'Architectural or strategic choice made during discussion',
    iconName: 'Compass',
    color: '#f59e0b', // Amber
    properties: [
      { key: 'summary', label: 'Decision Summary', type: 'string', required: true },
      { key: 'rationale', label: 'Rationale', type: 'string' }
    ],
    allowedSourceRelations: ['blocks', 'impacts', 'depends_on']
  },
  Commit: {
    type: 'Commit',
    label: 'Commit / PR',
    description: 'Code change, merge, or deployment event',
    iconName: 'GitCommit',
    color: '#10b981', // Emerald
    properties: [
      { key: 'hash', label: 'SHA Hash', type: 'string' },
      { key: 'message', label: 'Commit Message', type: 'string', required: true }
    ],
    allowedSourceRelations: ['produces', 'impacts', 'created']
  },
  Document: {
    type: 'Document',
    label: 'Document',
    description: 'Spec, RFC, Notion page, or Google doc',
    iconName: 'FileText',
    color: '#a855f7',
    properties: [
      { key: 'title', label: 'Document Title', type: 'string', required: true },
      { key: 'url', label: 'Link', type: 'string' }
    ],
    allowedSourceRelations: ['mentions', 'produces', 'depends_on']
  },
  Repository: {
    type: 'Repository',
    label: 'Repository',
    description: 'Git source code repo',
    iconName: 'GitBranch',
    color: '#6366f1',
    properties: [
      { key: 'name', label: 'Repo Name', type: 'string', required: true },
      { key: 'url', label: 'Repository URL', type: 'string' }
    ],
    allowedSourceRelations: ['owns', 'produces']
  },
  Goal: {
    type: 'Goal',
    label: 'Goal',
    description: 'Quarterly target or high-level milestone',
    iconName: 'Target',
    color: '#ec4899',
    properties: [
      { key: 'title', label: 'Goal Title', type: 'string', required: true }
    ],
    allowedSourceRelations: ['depends_on', 'impacts']
  },
  Product: {
    type: 'Product',
    label: 'Product',
    description: 'Commercial offering or enterprise module',
    iconName: 'Box',
    color: '#14b8a6',
    properties: [
      { key: 'name', label: 'Product Name', type: 'string', required: true }
    ],
    allowedSourceRelations: ['owns', 'impacts']
  },
  Event: {
    type: 'Event',
    label: 'Context Event',
    description: 'Raw or normalized system event',
    iconName: 'Zap',
    color: '#f97316',
    properties: [
      { key: 'title', label: 'Event Title', type: 'string', required: true }
    ],
    allowedSourceRelations: ['connected_through', 'mentions']
  }
};
