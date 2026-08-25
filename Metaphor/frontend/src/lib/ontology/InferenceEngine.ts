// Layer 3: Ontology - InferenceEngine.ts
import { ContextEvent } from '../events/EventTypes';
import { EntityType } from './OntologySchema';

export interface InferredInsight {
  id: string;
  type: 'pattern' | 'blocker' | 'correlation' | 'relevance';
  title: string;
  body: string;
  confidence: number; // 0 to 1
  entityIds: string[];
}

export class InferenceEngine {
  /**
   * Evaluates incoming events and graph state to derive quiet, non-intrusive AI observations.
   */
  public static inferContextObservations(events: ContextEvent[]): InferredInsight[] {
    const insights: InferredInsight[] = [];

    const repoEvents = events.filter(e => e.source === 'github');
    const meetingEvents = events.filter(e => e.source === 'calendar');
    const paymentEvents = events.filter(e => e.source === 'stripe');

    if (repoEvents.length > 2) {
      insights.push({
        id: 'inf_code_velocity',
        type: 'pattern',
        title: 'Core Codebase Activity',
        body: 'High engineering velocity detected across authentication and core graph modules.',
        confidence: 0.92,
        entityIds: ['ent_prj_core', 'ent_repo_main']
      });
    }

    if (meetingEvents.length > 0 && repoEvents.length > 0) {
      insights.push({
        id: 'inf_meeting_code_align',
        type: 'correlation',
        title: 'Meeting & Release Alignment',
        body: 'Recent technical sync produced 2 architectural decisions currently being merged in Git.',
        confidence: 0.88,
        entityIds: ['ent_meet_01', 'ent_dec_auth']
      });
    }

    if (paymentEvents.length > 0) {
      insights.push({
        id: 'inf_revenue_impact',
        type: 'correlation',
        title: 'Revenue Shift',
        body: 'Subscription activity spike directly correlates with the latest onboarding v2 deployment.',
        confidence: 0.95,
        entityIds: ['ent_cust_01', 'ent_prj_core']
      });
    }

    return insights;
  }
}
