import { NextAction } from "../types/crm";

export class TaskEngine {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Scans for old sent conversations and generates follow-up tasks
   */
  async generateFollowUps(): Promise<void> {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: conversations, error } = await this.supabase
        .from('crm_conversations')
        .select(`
          id, 
          contact_id, 
          status, 
          sent_at,
          crm_contacts (
            company_id
          )
        `)
        .in('status', ['sent', 'delivered'])
        .lte('sent_at', threeDaysAgo.toISOString());

      if (error) throw error;
      if (!conversations || conversations.length === 0) return;

      for (const conv of conversations) {
        // Check if there is already a follow-up action for this contact
        const { data: existingActions, error: checkError } = await this.supabase
          .from('crm_next_actions')
          .select('id')
          .eq('entity_id', conv.contact_id)
          .eq('type', 'follow_up')
          .neq('status', 'completed')
          .neq('status', 'dismissed');

        if (checkError) {
          console.error('[TaskEngine] Error checking existing actions:', checkError);
          continue;
        }

        if (!existingActions || existingActions.length === 0) {
          // Generate new follow-up action
          await this.supabase.from('crm_next_actions').insert({
            entity_id: conv.contact_id,
            entity_type: 'contact',
            type: 'follow_up',
            status: 'suggested',
            suggested_by: 'metaphor',
            title: 'Outreach Follow-up Required',
            description: `No reply received from contact in 3 days. Send a follow-up message.`,
          });
        }
      }
    } catch (err) {
      console.error('[TaskEngine] Error generating follow ups:', err);
    }
  }

  async acceptTask(taskId: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, 'accepted');
  }

  async completeTask(taskId: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, 'completed');
  }

  async dismissTask(taskId: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, 'dismissed');
  }

  private async updateTaskStatus(taskId: string, status: NextAction['status']): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('crm_next_actions')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`[TaskEngine] Error updating task ${taskId} to ${status}:`, err);
      return false;
    }
  }
}
