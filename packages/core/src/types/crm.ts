export interface Company {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  icp_score?: number;
  created_at: number | string;
  updated_at: number | string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  linkedin_url?: string;
  role?: string;
  created_at: number | string;
  updated_at: number | string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  channel: 'email' | 'linkedin' | 'clario_video';
  status: 'draft' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'waiting_for_clario' | 'failed';
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  clario_video_url?: string;
  sent_at?: number | string;
  created_at: number | string;
  updated_at: number | string;
}

export interface Opportunity {
  id: string;
  company_id: string;
  status: 'prospecting' | 'qualified' | 'proposal' | 'won' | 'lost';
  value_amount?: number;
  created_at: number | string;
  updated_at: number | string;
}

export interface NextAction {
  id: string;
  entity_id: string;
  entity_type: 'company' | 'contact' | 'opportunity';
  type: 'research' | 'outreach' | 'follow_up' | 'meeting' | 'review';
  status: 'suggested' | 'accepted' | 'completed' | 'dismissed';
  suggested_by: 'metaphor' | 'user';
  due_date?: number | string;
  title?: string;
  description?: string;
  created_at: number | string;
  updated_at: number | string;
}
