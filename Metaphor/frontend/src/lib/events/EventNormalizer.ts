// Layer 0 & Layer 2: Event System - EventNormalizer.ts
import { RawSourceEvent, ContextEvent } from './EventTypes';

export class EventNormalizer {
  /**
   * Normalizes any raw incoming source event payload into a standardized ContextEvent.
   */
  public static normalize(raw: RawSourceEvent): ContextEvent {
    switch (raw.source) {
      case 'github':
        return this.normalizeGitHub(raw);
      case 'stripe':
        return this.normalizeStripe(raw);
      case 'notion':
        return this.normalizeNotion(raw);
      case 'calendar':
        return this.normalizeCalendar(raw);
      case 'gmail':
        return this.normalizeGmail(raw);
      case 'slack':
        return this.normalizeSlack(raw);
      default:
        return this.normalizeGeneric(raw);
    }
  }

  private static normalizeGitHub(raw: RawSourceEvent): ContextEvent {
    const rawType = raw.rawType.toLowerCase();
    const isPR = rawType.includes('pull_request') || rawType.includes('pr');
    const isMerge = isPR && (raw.payload.merged as boolean || rawType.includes('merged'));
    
    return {
      id: `evt_gh_${raw.id}`,
      rawEventId: raw.id,
      source: 'github',
      category: 'code',
      title: isMerge ? `Pull Request Merged: ${raw.payload.title || 'Feature Branch'}` : `Commit to ${raw.payload.repo || 'Main Repository'}`,
      summary: (raw.payload.message as string) || `Repository update by ${raw.author?.name || 'Developer'}`,
      timestamp: raw.timestamp,
      severity: isMerge ? 'success' : 'info',
      authorName: raw.author?.name || 'Developer',
      authorEmail: raw.author?.email,
      primaryEntityId: (raw.payload.repoId as string) || 'ent_repo_main',
      primaryEntityType: 'Repository',
      relatedEntityIds: (raw.payload.relatedIds as string[]) || ['ent_prj_core'],
      metadata: raw.payload,
      aiContextObservation: isMerge 
        ? 'This PR merge resolves authentication dependencies across 2 active projects.' 
        : 'Continuous commit stream detected on main codebase.'
    };
  }

  private static normalizeStripe(raw: RawSourceEvent): ContextEvent {
    const amount = (raw.payload.amount as number) || 0;
    const formattedAmount = (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    return {
      id: `evt_strp_${raw.id}`,
      rawEventId: raw.id,
      source: 'stripe',
      category: 'finance',
      title: `Payment Received: ${formattedAmount}`,
      summary: `Subscription renewal for ${raw.payload.customerName || 'Enterprise Client'}`,
      timestamp: raw.timestamp,
      severity: 'success',
      authorName: (raw.payload.customerName as string) || 'Customer',
      authorEmail: raw.payload.customerEmail as string,
      primaryEntityId: (raw.payload.customerId as string) || 'ent_cust_01',
      primaryEntityType: 'Person',
      relatedEntityIds: ['ent_prod_core', 'ent_prj_core'],
      metadata: raw.payload,
      aiContextObservation: 'Revenue growth correlates with recent v2 onboarding release.'
    };
  }

  private static normalizeNotion(raw: RawSourceEvent): ContextEvent {
    return {
      id: `evt_not_${raw.id}`,
      rawEventId: raw.id,
      source: 'notion',
      category: 'document',
      title: `Document Updated: ${raw.payload.docTitle || 'Architecture Spec'}`,
      summary: `Modified by ${raw.author?.name || 'Team Member'} in Workspace`,
      timestamp: raw.timestamp,
      severity: 'info',
      authorName: raw.author?.name || 'Team Member',
      primaryEntityId: (raw.payload.docId as string) || 'ent_doc_arch',
      primaryEntityType: 'Document',
      relatedEntityIds: ['ent_prj_core', 'ent_dec_auth'],
      metadata: raw.payload,
      aiContextObservation: 'This document is referenced by 3 engineering tasks.'
    };
  }

  private static normalizeCalendar(raw: RawSourceEvent): ContextEvent {
    return {
      id: `evt_cal_${raw.id}`,
      rawEventId: raw.id,
      source: 'calendar',
      category: 'meeting',
      title: `Meeting Scheduled: ${raw.payload.eventTitle || 'Architecture Alignment'}`,
      summary: `Attendees: ${(raw.payload.attendees as string[])?.join(', ') || 'Core Engineering Team'}`,
      timestamp: raw.timestamp,
      severity: 'info',
      authorName: raw.author?.name || 'Organizer',
      primaryEntityId: (raw.payload.meetingId as string) || 'ent_meet_01',
      primaryEntityType: 'Meeting',
      relatedEntityIds: ['ent_person_david', 'ent_prj_core'],
      metadata: raw.payload,
      aiContextObservation: 'Meeting topic aligns with open decision blocking sprint delivery.'
    };
  }

  private static normalizeGmail(raw: RawSourceEvent): ContextEvent {
    return {
      id: `evt_gml_${raw.id}`,
      rawEventId: raw.id,
      source: 'gmail',
      category: 'communication',
      title: `Email Received: ${raw.payload.subject || 'Client Feedback'}`,
      summary: `From: ${raw.payload.from || 'David (Partner)'}`,
      timestamp: raw.timestamp,
      severity: 'info',
      authorName: (raw.payload.fromName as string) || 'External Partner',
      primaryEntityId: 'ent_person_david',
      primaryEntityType: 'Person',
      relatedEntityIds: ['ent_prj_core'],
      metadata: raw.payload,
      aiContextObservation: 'Sender is tagged as primary owner of Project Metaphor.'
    };
  }

  private static normalizeSlack(raw: RawSourceEvent): ContextEvent {
    return {
      id: `evt_slk_${raw.id}`,
      rawEventId: raw.id,
      source: 'slack',
      category: 'communication',
      title: `Slack Message in #${raw.payload.channel || 'eng-core'}`,
      summary: (raw.payload.text as string) || 'Discussion regarding API contracts',
      timestamp: raw.timestamp,
      severity: 'info',
      authorName: raw.author?.name || 'Engineer',
      primaryEntityId: 'ent_prj_core',
      primaryEntityType: 'Project',
      relatedEntityIds: ['ent_task_auth'],
      metadata: raw.payload,
      aiContextObservation: 'Discussion mentions authentication refactoring.'
    };
  }

  private static normalizeGeneric(raw: RawSourceEvent): ContextEvent {
    return {
      id: `evt_gen_${raw.id}`,
      rawEventId: raw.id,
      source: raw.source,
      category: 'system',
      title: `System Event: ${raw.rawType}`,
      summary: 'Raw system event processed',
      timestamp: raw.timestamp,
      severity: 'info',
      primaryEntityId: 'ent_sys_01',
      primaryEntityType: 'System',
      relatedEntityIds: [],
      metadata: raw.payload
    };
  }
}
