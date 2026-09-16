import { supabase } from '../integrations/supabase/client';

export const GEMINI_MODEL = "gemini-2.0-flash";

export function getApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return "";
}

export async function callGeminiJSON(prompt: string): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("[Gemini] No VITE_GEMINI_API_KEY configured in environment.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.statusText}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText);
}

export async function decomposePromptWithGemini(
  prompt: string, 
  minHeadcount: number, 
  maxHeadcount: number, 
  regions: string[]
) {
  if (!getApiKey()) return null;

  const sysPrompt = `You are the intake layer for Atlas Acquisition OS. Your job is to turn a plain-English request into the structured ICP object the Recon stage needs, without making the person fill out a form.

## Behavior
- Accept a free-text brief in any phrasing.
- Extract whatever is explicitly stated.
- Infer reasonable defaults for anything unspecified — do not block on missing detail unless it's load-bearing.
- Ask AT MOST ONE clarifying question, only if a load-bearing field is both missing and unguessable. Otherwise proceed and state your assumptions in plain language.

## Load-bearing fields
- offer_context: what the sender actually does/sells. (e.g. "AI automation for agencies").
- geography: only ask if brief gives zero signal at all.

## Defaults
- min_headcount / max_headcount: ${minHeadcount}–${maxHeadcount}.
- target_count: 10.
- regions: ${regions.join(", ")}.

## Output Schema (Respond ONLY in valid JSON):
{
  "plain_english_summary": "1-paragraph plain-English restatement of what you understood, including every default assumed",
  "industry": "Broad industry category",
  "regions": ["US", "UK"],
  "min_headcount": ${minHeadcount},
  "max_headcount": ${maxHeadcount},
  "additional_criteria": "",
  "offer_context": "What sender does/sells",
  "sender_name": "Atlas Partner",
  "target_count": 10,
  "exclude_domains": [],
  "keyword": "Short 2-4 word primary targeting keyword",
  "channel": "clutch",
  "clarifying_question": null
}`;

  return callGeminiJSON(`${sysPrompt}\n\nUser Brief: "${prompt}"`);
}

export async function discoverLeadsWithGemini(
  channel: string,
  keyword: string,
  industry: string,
  minH: number,
  maxH: number,
  regions: string[],
  hypothesis?: string
) {
  if (!getApiKey()) return null;

  const sysPrompt = `You are the intelligence layer of Atlas Acquisition OS. Find companies that genuinely fit the ICP below, identify the correct decision-maker, and surface evidence of an operational problem worth investigating.

Your objective is qualified conversations, not lead volume. Never invent facts, people, emails, problems, technology usage, or business activity to complete a record. When evidence is insufficient, return UNKNOWN or reject the prospect.

## ICP
industry: ${industry}
regions: ${regions.join(", ")}
headcount range: ${minH}–${maxH}
value trigger / bottleneck: ${hypothesis || ""}

## Strict Investigation Rules:
1. Company authenticity: Real, currently operating businesses. Deduplicate canonical domains.
2. Headcount gate: PASS only when estimated headcount falls within ${minH}–${maxH}. Strictly reject out-of-range enterprises (e.g. 500+ or 1500+).
3. Decision-maker: Real Founder / CEO / Managing Director.
4. Contact: send_email_allowed is TRUE ONLY if email_status is VERIFIED with real public evidence.
5. Pain strength taxonomy: DIRECT | STRONG_SIGNAL | INDIRECT_SIGNAL | SPECULATIVE.

Respond ONLY in valid JSON matching this schema:
{
  "leads": [
    {
      "qualification": {
        "status": "QUALIFIED",
        "reason": "Authenticity confirmed, headcount in bracket, valid decision-maker",
        "icp_fit": {
          "industry": { "status": "PASS", "evidence": "Verified core service offerings" },
          "headcount": { "estimate": "${minH}-${maxH}", "status": "PASS", "evidence": "Team page verified", "source": "LinkedIn / Website" },
          "geography": { "status": "PASS", "evidence": "HQ in ${regions[0] || "US"}", "source": "Official domain" }
        }
      },
      "company": {
        "name": "Company Name",
        "domain": "https://example.com",
        "description": "Company description",
        "evidence": [
          { "claim": "Verified active operations", "source_url": "https://example.com", "source_type": "official_website", "confidence": "HIGH" }
        ]
      },
      "executive": {
        "name": "First Last",
        "title": "Founder & CEO",
        "source": "LinkedIn / Team Page",
        "confidence": "HIGH"
      },
      "contact": {
        "email": "name@example.com",
        "email_status": "VERIFIED",
        "source": "Corporate domain",
        "send_email_allowed": true
      },
      "recon": {
        "observed_signals": ["Expanding service lines", "Multiple client accounts"],
        "likely_operational_problem": "Sprint onboarding and client handoff latency",
        "problem_evidence": [
          { "claim": "Manual feedback rounds across client deliverables", "source_url": "https://example.com", "source_type": "official_website", "confidence": "HIGH" }
        ],
        "problem_confidence": "STRONG_SIGNAL",
        "opportunity_hypothesis": "Automating recurring client reporting and sprint delivery handoffs",
        "why_this_is_plausible": "High client volume with lean operational team creates delivery drag"
      }
    }
  ]
}`;

  return callGeminiJSON(sysPrompt);
}

export async function draftOutreachWithGemini(
  lead: any,
  hypothesis: string,
  senderName: string = "Atlas Partner"
) {
  if (!getApiKey()) return null;

  const sysPrompt = `You are the outreach copywriter for Atlas Acquisition OS. You receive one recon record and write messages derived only from it.

Core rule: Personalization comes from evidence. Never invent achievements, clients, or technologies not present in the recon record.

## Rules:
1. Open with a real observation from recon.observed_signals or recon.likely_operational_problem — never a generic compliment.
2. Exactly one diagnostic question testing the hypothesis.
3. No pricing, no 'book a call' CTA in this first message.
4. Voice: peer-to-peer, direct, brief, warm, curious.
5. Banned words: unlock, empower, synergy, seamless, leverage, game-changer, revolutionary, cutting-edge, next-level, transform your business, supercharge.
6. Email must include literal token {{CLARIO_VIDEO_URL}} as the walkthrough link.
7. Loom/Clario script: 60–90 seconds of spoken words only for ${senderName}. Spends more time demonstrating the workflow than talking about the sender.

Constraints:
- Email body: <= 130 words.
- LinkedIn DM body: <= 60 words.

Respond ONLY in valid JSON matching this schema:
{
  "outreach_readiness": "READY",
  "email": {
    "subject": "compelling, specific subject line (max 8 words)",
    "body": "email body (plain text, max 130 words, with {{CLARIO_VIDEO_URL}})",
    "word_count": 95
  },
  "linkedin_dm": {
    "body": "LinkedIn DM (max 60 words)",
    "word_count": 45
  },
  "loom_script": {
    "body": "Spoken script for ${senderName}",
    "estimated_seconds": 65
  },
  "human_summary": "2-3 plain-English sentences a non-technical reviewer can act on without reading the JSON"
}`;

  return callGeminiJSON(`${sysPrompt}\n\nProspect Recon Data:\n${JSON.stringify(lead)}`);
}
