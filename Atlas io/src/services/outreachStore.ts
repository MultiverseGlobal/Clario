import { supabase } from "@/integrations/supabase/client";

export interface OutreachRecord {
  id: string;
  campaign_prompt: string;
  company_name: string;
  website?: string;
  recipient_name: string;
  recipient_email: string;
  recipient_role?: string;
  channel: "email" | "linkedin" | "clario_video";
  subject: string;
  body: string;
  status: "draft" | "sent" | "delivered" | "replied" | "opened" | "waiting_for_clario" | "failed" | "bounced";
  delivery_provider: "Gmail SMTP" | "Resend" | "Manual";
  sent_at: string;
  resend_id?: string;
  clario_video_url?: string;
  notes?: string;
  contact_id?: string;
}

export async function saveLeadToCrm(lead: any): Promise<string | null> {
  try {
    const { data: companyData, error: companyError } = await supabase
      .from('crm_companies')
      .insert({
        name: lead.company_info?.name || lead.company,
        domain: lead.company_info?.domain || lead.website,
        description: lead.company_info?.description || lead.founder_thesis,
        icp_score: lead.icp_score
      })
      .select('id')
      .single();

    if (companyError && companyError.code !== '23505') { // Ignore unique violation on domain
       throw companyError;
    }
    
    // If domain exists, fetch the existing company
    let companyId = companyData?.id;
    if (!companyId) {
       const { data: existing } = await supabase
         .from('crm_companies')
         .select('id')
         .eq('domain', lead.company_info?.domain || lead.website)
         .single();
       companyId = existing?.id;
    }

    if (!companyId) return null;

    const { data: contactData, error: contactError } = await supabase
      .from('crm_contacts')
      .insert({
        company_id: companyId,
        name: lead.executive?.name || lead.founder?.name || 'Founder',
        email: lead.contact?.email || lead.founder?.email,
        role: lead.executive?.title || lead.founder?.role || 'Founder',
      })
      .select('id')
      .single();

    if (contactError) throw contactError;
    
    return contactData?.id || null;
  } catch (err) {
    console.error("[OutreachStore] Failed to save lead to CRM:", err);
    return null;
  }
}

export async function fetchOutreachRecords(): Promise<OutreachRecord[]> {
  try {
    const { data, error } = await supabase
      .from("crm_conversations")
      .select(`
        *,
        crm_contacts (
          id,
          name,
          email,
          role,
          crm_companies (
            name,
            domain
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return data.map((d: any) => ({
      id: d.id,
      contact_id: d.contact_id,
      campaign_prompt: d.subject || "",
      company_name: d.crm_contacts?.crm_companies?.name || "Unknown Company",
      website: d.crm_contacts?.crm_companies?.domain || "",
      recipient_name: d.crm_contacts?.name || "Unknown Contact",
      recipient_email: d.crm_contacts?.email || "",
      recipient_role: d.crm_contacts?.role || "",
      channel: d.channel as any,
      subject: d.subject,
      body: d.body,
      status: d.status as any,
      delivery_provider: "Manual",
      sent_at: d.sent_at || d.created_at,
      clario_video_url: d.clario_video_url,
      notes: d.notes,
    }));
  } catch (err) {
    console.error("[OutreachStore] Failed to fetch from Supabase:", err);
    return [];
  }
}

export async function recordOutreachDispatch(
  entry: Omit<OutreachRecord, "id" | "sent_at"> & { id?: string; sent_at?: string }
): Promise<OutreachRecord> {
  const newRecord: OutreachRecord = {
    id: entry.id || `outreach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sent_at: entry.sent_at || new Date().toISOString(),
    campaign_prompt: entry.campaign_prompt,
    company_name: entry.company_name,
    website: entry.website,
    recipient_name: entry.recipient_name,
    recipient_email: entry.recipient_email,
    recipient_role: entry.recipient_role,
    channel: entry.channel || "email",
    subject: entry.subject,
    body: entry.body,
    status: entry.status || "sent",
    delivery_provider: entry.delivery_provider || "Gmail SMTP",
    resend_id: entry.resend_id,
    clario_video_url: entry.clario_video_url,
    notes: entry.notes,
  };

  try {
    // If we have a contact_id, we just insert the conversation directly.
    // If not, in a real system we would create company and contact here.
    if (newRecord.contact_id) {
      const { data, error } = await supabase.from("crm_conversations").insert({
        contact_id: newRecord.contact_id,
        subject: newRecord.subject,
        body: newRecord.body,
        status: newRecord.status,
        channel: newRecord.channel,
        clario_video_url: newRecord.clario_video_url,
        sent_at: newRecord.sent_at,
      }).select().single();
      
      if (error) throw error;
      if (data) {
        newRecord.id = data.id; // update to real UUID from backend
      }
    } else {
      console.warn("[OutreachStore] No contact_id provided, skipping db insert for now.");
    }
    
    // Dispatch event so UI can react
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: newRecord }));
  } catch (err) {
    console.error("[OutreachStore] Supabase insert failed:", err);
  }

  return newRecord;
}

export async function updateOutreachStatus(
  id: string,
  newStatus: OutreachRecord["status"],
  notes?: string
): Promise<OutreachRecord | null> {
  try {
    const updatePayload: any = { status: newStatus };
    if (notes !== undefined) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from("crm_conversations")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: data }));
    return data as unknown as OutreachRecord;
  } catch (err) {
    console.error("[OutreachStore] Failed to update outreach status in Supabase:", err);
    return null;
  }
}

export async function deleteOutreachRecord(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("crm_conversations")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: { id, deleted: true } }));
    return true;
  } catch (err) {
    console.error("[OutreachStore] Failed to delete outreach record from Supabase:", err);
    return false;
  }
}

export async function clearAllOutreachRecords(): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      const { error } = await supabase
        .from("atlas_outreach")
        .delete()
        .eq("user_id", userData.user.id);
        
      if (error) throw error;
      
      window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: { cleared: true } }));
      return true;
    }
    return false;
  } catch (err) {
    console.error("[OutreachStore] Failed to clear outreach records in Supabase:", err);
    return false;
  }
}
