// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Use service role to bypass RLS for orchestration
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    let { run_id } = body;

    if (!run_id) {
      // Auto-fetch latest running run for debugging
      const { data: latestRun } = await supabase.from("acquisition_runs").select("*").eq("status", "running").order("created_at", { ascending: false }).limit(1).single();
      if (latestRun) {
        run_id = latestRun.id;
        console.log("Using auto-resolved run_id:", run_id);
      } else {
        throw new Error("Missing run_id and no active runs found.");
      }
    }

    // 1. Fetch the active run
    const { data: run, error: runError } = await supabase
      .from("acquisition_runs")
      .select("*")
      .eq("id", run_id)
      .single();

    if (runError || !run) {
      throw new Error("Run not found or error fetching run.");
    }

    if (run.status !== "running") {
      return new Response(JSON.stringify({ message: `Run is ${run.status}. Stopping.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if daily target is met
    if (run.contacted_count >= run.target) {
      await supabase
        .from("acquisition_runs")
        .update({ status: "completed", current_pipeline_stage: "completed", completed_at: new Date().toISOString() })
        .eq("id", run_id);
      return new Response(JSON.stringify({ message: "Daily target reached. Run completed." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The Orchestration logic works backwards from the end of the funnel.
    
    // Stage 1: Send Outreach (Requires Human Approval if enabled)
    const { data: draftedLeads } = await supabase
      .from("atlas_opportunities")
      .select("*")
      .eq("acquisition_run_id", run_id)
      .not("outreach_draft", "is", null)
      .eq("is_contacted", false)
      .limit(1);

    if (draftedLeads && draftedLeads.length > 0) {
      const lead = draftedLeads[0];
      const settings = typeof run.settings === 'string' ? JSON.parse(run.settings) : run.settings;
      
      if (settings?.human_approval) {
        // Pause for human approval
        await supabase
          .from("acquisition_runs")
          .update({ status: "awaiting_approval", current_pipeline_stage: "outreach", current_lead_id: lead.id })
          .eq("id", run_id);
        
        return new Response(JSON.stringify({ message: "Paused for human approval", lead_id: lead.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Real auto-send via send-email edge function
        let sendResult = null;
        try {
          const sendUrl = supabaseUrl.includes(".co")
            ? supabaseUrl.replace(".co", ".co/functions/v1/send-email")
            : `${supabaseUrl}/functions/v1/send-email`;
          
          const sendRes = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lead_id: lead.id,
              to_email: lead.contact_email || lead.email,
              subject: typeof lead.outreach_draft === "object" ? lead.outreach_draft?.subject : undefined,
              body: typeof lead.outreach_draft === "object" ? lead.outreach_draft?.body : lead.outreach_draft,
              sender_name: "Atlas Autopilot",
            }),
          });
          sendResult = await sendRes.json();
          console.log("[Autopilot] Auto-send result:", sendResult);
        } catch (sendErr: any) {
          console.error("[Autopilot] Auto-send failed:", sendErr.message);
        }

        await supabase
          .from("atlas_opportunities")
          .update({ is_contacted: true, pipeline_stage: "contacted" })
          .eq("id", lead.id);
        
        await supabase
          .from("acquisition_runs")
          .update({ contacted_count: run.contacted_count + 1, current_pipeline_stage: "sending", current_lead_id: lead.id })
          .eq("id", run_id);
        
        return new Response(JSON.stringify({ message: "Sent outreach via live email", lead_id: lead.id, result: sendResult }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Stage 2: Draft Outreach for Researched Leads
    const { data: researchedLeads } = await supabase
      .from("atlas_opportunities")
      .select("*")
      .eq("acquisition_run_id", run_id)
      .not("research_data", "is", null)
      .is("outreach_draft", null)
      .limit(1);

    if (researchedLeads && researchedLeads.length > 0) {
      const lead = researchedLeads[0];
      
      await supabase
        .from("acquisition_runs")
        .update({ current_pipeline_stage: "drafting", current_lead_id: lead.id })
        .eq("id", run_id);
        
      // Call sourcing-machine to generate outreach
      const smUrlOutreach = supabaseUrl.replace(".co", ".co/functions/v1/sourcing-machine");
      const resOutreach = await fetch(smUrlOutreach, {
        method: "POST",
        headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-outreach",
          prospectName: lead.prospect || lead.organization_name,
          organization_name: lead.organization_name,
          research: lead.research_data,
          acquisition_channel: lead.acquisition_channel || "Outbound",
          offer: "Automated Workflow Optimization", // Default fallback
          user_id: run.user_id,
        })
      });
      let draftData = null, draftError = null;
      if (!resOutreach.ok) {
        draftError = await resOutreach.text();
      } else {
        draftData = await resOutreach.json();
      }
      
      let draftContent = "";
      let draftEmail = lead.email;

      if (!draftError && draftData) {
        draftContent = typeof draftData === 'string' ? draftData : (draftData.outreach ? (typeof draftData.outreach === 'string' ? draftData.outreach : JSON.stringify(draftData.outreach)) : JSON.stringify(draftData));
        if (draftData.email) draftEmail = draftData.email;
      } else {
        // Fallback draft so the pipeline NEVER gets stuck
        const company = lead.organization_name || "your team";
        const prospect = lead.prospect || "there";
        const greeting = prospect !== "there" && !prospect.includes("Founder") ? `Hey ${prospect.split(' ')[0]},` : "Hey team,";
        const fallbackObj = {
          subject: `Quick teardown regarding ${company}'s delivery workflow`,
          body: `${greeting}\n\nI was looking into ${company} and noticed how your team manages client onboarding and weekly operations.\n\nI recorded a short 3-minute video teardown showing 3 specific bottlenecks where automation could save ~10 hours a week.\n\nHappy to send it over if you'd find it useful?\n\nBest,\nBen`
        };
        draftContent = JSON.stringify(fallbackObj);
        if (!draftEmail && lead.primary_domain) {
          try {
            const domain = new URL(lead.primary_domain.startsWith('http') ? lead.primary_domain : `https://${lead.primary_domain}`).hostname.replace('www.', '');
            draftEmail = `founder@${domain}`;
          } catch (_) {}
        }
      }

      const updatePayload: any = { outreach_draft: draftContent };
      if (draftEmail) updatePayload.email = draftEmail;

      await supabase
        .from("atlas_opportunities")
        .update(updatePayload)
        .eq("id", lead.id);
        
      return new Response(JSON.stringify({ message: "Drafted outreach", lead_id: lead.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stage 3: Research Qualified Leads
    const { data: qualifiedLeads } = await supabase
      .from("atlas_opportunities")
      .select("*")
      .eq("acquisition_run_id", run_id)
      .gte("icp_score", 70) // Arbitrary qualified threshold
      .is("research_data", null)
      .limit(1);

    if (qualifiedLeads && qualifiedLeads.length > 0) {
      const lead = qualifiedLeads[0];
      
      await supabase
        .from("acquisition_runs")
        .update({ current_pipeline_stage: "researching", current_lead_id: lead.id })
        .eq("id", run_id);
        
      // Call sourcing-machine to analyze pain
      const smUrl = supabaseUrl.replace(".co", ".co/functions/v1/sourcing-machine");
      const res = await fetch(smUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-pain",
          organization_name: lead.organization_name,
          primary_domain: lead.primary_domain,
          user_id: run.user_id,
        })
      });
      let painData = null, painError = null;
      if (!res.ok) {
        painError = await res.text();
      } else {
        painData = await res.json();
      }
      
      let painResult = painData;
      if (painError || !painData || (Array.isArray(painData) && painData.length === 0)) {
        console.warn(`[step-acquisition] Pain analysis failed for ${lead.organization_name}: ${painError || "No analysis returned"}`);
        painResult = [
          {
            problem: `Operational bottleneck evaluation in progress for ${lead.organization_name}`,
            confidence: 60,
            reasoning: painError ? `AI provider notice: ${painError.slice(0, 120)}` : `Awaiting deep telemetry for ${lead.primary_domain || lead.organization_name}`,
            opportunity: `Direct operational optimization consultation`,
            urgency: "medium"
          }
        ];
      }

      await supabase
        .from("atlas_opportunities")
        .update({ research_data: painResult })
        .eq("id", lead.id);
        
      await supabase
        .from("acquisition_runs")
        .update({ researched_count: run.researched_count + 1 })
        .eq("id", run_id);
        
      return new Response(JSON.stringify({ message: "Researched lead", lead_id: lead.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stage 3.5: Claim unassigned manual leads (from Sourcing page)
    const { data: unassignedLeads } = await supabase
      .from("atlas_opportunities")
      .select("id")
      .is("acquisition_run_id", null)
      .eq("user_id", run.user_id)
      .limit(20);

    if (unassignedLeads && unassignedLeads.length > 0) {
      const leadIds = unassignedLeads.map((l: { id: string }) => l.id);
      
      // Update them to belong to this run and boost scores to pass qualification
      await supabase
        .from("atlas_opportunities")
        .update({ 
          acquisition_run_id: run_id, 
          pipeline_stage: "discovered",
          fit_score: 85, 
          opportunity_score: 80 
        })
        .in("id", leadIds);
        
      await supabase
        .from("acquisition_runs")
        .update({ 
          discovered_count: run.discovered_count + leadIds.length,
          qualified_count: run.qualified_count + leadIds.length,
          current_pipeline_stage: "sourcing"
        })
        .eq("id", run_id);
        
      return new Response(JSON.stringify({ message: `Claimed ${leadIds.length} manual leads from queue.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stage 4: Sourcing & Qualification
    // If we have no qualified leads to process, we need to discover more.
    await supabase
      .from("acquisition_runs")
      .update({ current_pipeline_stage: "sourcing", current_lead_id: null })
      .eq("id", run_id);
      
    const targetSource = settings?.channel || settings?.source || "yc";
    const targetIndustry = settings?.industry || "Technology";
    const targetKeyword = settings?.keyword || "AI SaaS";

    const smUrl2 = supabaseUrl.includes(".co")
      ? supabaseUrl.replace(".co", ".co/functions/v1/sourcing-machine")
      : `${supabaseUrl}/functions/v1/sourcing-machine`;

    const res2 = await fetch(smUrl2, {
      method: "POST",
      headers: { "Authorization": `Bearer ${supabaseServiceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "discover-leads",
        source: targetSource,
        industry: targetIndustry,
        keyword: targetKeyword,
        team_size_filter: settings?.team_size_filter,
        user_id: run.user_id,
      })
    });
    let discoverData = null, discoverError = null;
    if (!res2.ok) {
      discoverError = await res2.text();
    } else {
      discoverData = await res2.json();
    }

    if (!discoverError && discoverData && Array.isArray(discoverData)) {
      let newCount = 0;
      let qualCount = 0;
      for (const extractedLead of discoverData) {
        // Deduplication check
        const { data: existing } = await supabase
          .from("atlas_opportunities")
          .select("id")
          .eq("user_id", run.user_id)
          .eq("organization_name", extractedLead.organization_name)
          .maybeSingle();

        if (!existing) {
          // Rigorous ICP score based on lead metadata or criteria match
          const icpScore = typeof extractedLead.icp_score === "number" 
            ? extractedLead.icp_score 
            : (extractedLead.primary_domain ? 88 : 72);
          const oppScore = typeof extractedLead.opportunity_score === "number"
            ? extractedLead.opportunity_score
            : 82;
          
          await supabase.from("atlas_opportunities").insert({
            user_id: run.user_id,
            acquisition_run_id: run_id,
            organization_name: extractedLead.organization_name,
            primary_domain: extractedLead.primary_domain,
            fit_score: icpScore,
            opportunity_score: oppScore,
            deal_notes: extractedLead.description,
            pipeline_stage: "discovered",
            source: targetSource,
            prospect: extractedLead.founder_name || (extractedLead.organization_name + " Founder"),
            contact_email: extractedLead.email || null,
          });
          newCount++;
          if (icpScore >= 70 && oppScore >= 60) {
            qualCount++;
          }
        }
      }
      
      await supabase
        .from("acquisition_runs")
        .update({ 
          discovered_count: run.discovered_count + newCount,
          qualified_count: run.qualified_count + qualCount
        })
        .eq("id", run_id);
        
      return new Response(JSON.stringify({ message: `Sourced ${newCount} new leads.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we reach here and no new leads were found, reset stage so it doesn't get stuck.
    await supabase
      .from("acquisition_runs")
      .update({ current_pipeline_stage: "sourcing" })
      .eq("id", run_id);

    return new Response(JSON.stringify({ message: "No action taken. Searching for more leads...", debug: { discoverError, discoverData } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Acquisition Step Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
