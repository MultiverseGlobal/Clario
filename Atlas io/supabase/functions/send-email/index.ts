import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import nodemailer from 'npm:nodemailer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { lead_id, to_email: directToEmail, subject: directSubject, body: directBody, sender_name } = body

    if (!lead_id && !directToEmail) {
      throw new Error("Missing lead_id or to_email")
    }

    // 1. Fetch the lead if lead_id is provided
    let lead: any = null
    if (lead_id) {
      const { data, error: leadError } = await supabaseClient
        .from('atlas_opportunities')
        .select('*')
        .eq('id', lead_id)
        .maybeSingle()

      if (leadError && !directToEmail) {
        throw new Error(`Lead lookup error: ${leadError.message}`)
      }
      lead = data
    }

    // 2. Parse subject & body
    let emailSubject = directSubject || (lead?.organization_name ? `Quick question regarding ${lead.organization_name}` : "Quick inquiry")
    let emailBody = directBody || (lead ? (lead.outreach_draft || lead.draft_message || "Hello") : "")

    // If it's a JSON string from AI (containing subject/body), try to parse it
    try {
      if (typeof emailBody === 'string' && emailBody.trim().startsWith('{')) {
        const parsed = JSON.parse(emailBody)
        if (parsed.subject) emailSubject = parsed.subject
        if (parsed.body) emailBody = parsed.body
      }
    } catch (_) {
      // It's just a raw text body
    }

    // 3. Setup Nodemailer with Gmail SMTP
    const smtpEmail = Deno.env.get('SMTP_EMAIL') || 'multiverseglobals@gmail.com'
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')

    if (!smtpEmail || !smtpPassword) {
      throw new Error("SMTP credentials missing from environment variables (SMTP_EMAIL, SMTP_PASSWORD)")
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    })

    // 4. Determine recipient
    let recipientEmail = directToEmail || lead?.contact_email || lead?.email
    if (!recipientEmail && lead) {
      let domain = "example.com"
      if (lead.primary_domain) {
        try {
          const url = new URL(lead.primary_domain.startsWith('http') ? lead.primary_domain : `https://${lead.primary_domain}`)
          domain = url.hostname.replace(/^www\./, '')
        } catch (_) {
          domain = lead.primary_domain.replace(/^www\./, '')
        }
      } else if (lead.organization_name) {
        domain = `${lead.organization_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
      }
      recipientEmail = `founder@${domain}`
    }

    if (!recipientEmail) {
      throw new Error("No recipient email could be resolved.")
    }

    console.log(`Sending email to ${recipientEmail} with subject: ${emailSubject}`)

    // 5. Send the email with BCC to user's email for proof of delivery
    const info = await transporter.sendMail({
      from: `"${sender_name || 'Atlas AI'}" <${smtpEmail}>`,
      to: recipientEmail,
      bcc: smtpEmail, // BCC multiverseglobals@gmail.com so user has instant proof in Gmail
      subject: emailSubject,
      text: emailBody,
    })

    console.log("Email sent successfully: ", info.messageId)

    // 6. Update the lead in DB as contacted if lead_id was provided
    if (lead_id) {
      await supabaseClient
        .from('atlas_opportunities')
        .update({ is_contacted: true, pipeline_stage: 'contacted' })
        .eq('id', lead_id)
    }

    return new Response(
      JSON.stringify({ message: "Email sent successfully", messageId: info.messageId, to: recipientEmail, bcc: smtpEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Error sending email:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
