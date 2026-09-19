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
  status: "sent" | "delivered" | "replied" | "opened" | "waiting_for_clario" | "failed";
  delivery_provider: "Gmail SMTP" | "Resend" | "Manual";
  sent_at: string;
  resend_id?: string;
  clario_video_url?: string;
  notes?: string;
}

export async function fetchOutreachRecords(): Promise<OutreachRecord[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return [];

    const { data, error } = await supabase
      .from("atlas_outreach")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return data.map((d: any) => ({
      id: d.id,
      campaign_prompt: d.campaign_prompt || "",
      company_name: d.company_name || "",
      website: d.website,
      recipient_name: d.to_name,
      recipient_email: d.to_email,
      recipient_role: d.recipient_role,
      channel: d.channel as any,
      subject: d.subject,
      body: d.body,
      status: d.status as any,
      delivery_provider: d.delivery_provider || "Manual",
      sent_at: d.sent_at || d.created_at,
      resend_id: d.resend_id,
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
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      // Use standard insert for the new outreach record
      const { data, error } = await supabase.from("atlas_outreach").insert({
        user_id: userData.user.id,
        to_name: newRecord.recipient_name,
        to_email: newRecord.recipient_email,
        subject: newRecord.subject,
        draft_subject: newRecord.subject,
        body: newRecord.body,
        draft_body: newRecord.body,
        status: newRecord.status,
        channel: newRecord.channel,
        type: "cold_email",
        clario_video_url: newRecord.clario_video_url,
        sent_at: newRecord.sent_at,
      }).select().single();
      
      if (error) throw error;
      if (data) {
        newRecord.id = data.id; // update to real UUID from backend
      }
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
      .from("atlas_outreach")
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
      .from("atlas_outreach")
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
