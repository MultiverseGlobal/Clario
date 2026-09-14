import { supabase } from '../integrations/supabase/client';

export const GEMINI_MODEL = "gemini-2.0-flash";

export function getApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  // Fallback dummy key to prevent GitHub secret scanning errors
  return "";
}

export async function callGeminiJSON(prompt: string): Promise<any> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`,
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
  const sysPrompt = `You are an expert B2B sales strategist and campaign architect.
Decompose the following user intent into structured campaign parameters.
User Intent: "${prompt}"
Context: Defaults to ${minHeadcount}-${maxHeadcount} headcount, regions: ${regions.join(", ")}.

Respond ONLY in valid JSON matching this schema:
{
  "keyword": "Short 2-4 word primary targeting keyword (e.g. B2B SaaS, Creative Agencies)",
  "industry": "Broad industry category (e.g. Technology, Marketing & Advertising, Fintech)",
  "channel": "One of: 'hn', 'yc', 'clutch', 'starter_story'",
  "hypothesis": "A 1-sentence sales hypothesis about their pain points",
  "targetCount": 15,
  "min_headcount": 10,
  "max_headcount": 50,
  "regions": ["US", "UK"],
  "decision_maker_titles": ["Founder", "CEO", "Head of Growth"]
}`;

  return callGeminiJSON(sysPrompt);
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
  const sysPrompt = `You are a B2B lead generation researcher.
Generate 5 highly realistic, specific company profiles that match this target audience. Use real-world companies if they fit perfectly, otherwise create highly plausible realistic synthesized profiles.

Criteria:
- Keyword: ${keyword}
- Industry: ${industry}
- Channel: ${channel}
- Headcount: ${minH} to ${maxH}
- Regions: ${regions.join(", ")}
- Hypothesis: ${hypothesis || ""}

Respond ONLY in valid JSON matching this schema:
{
  "leads": [
    {
      "company": "Company Name",
      "website": "company.com",
      "founder": {
        "name": "First Last",
        "email": "first@company.com",
        "role": "Founder & CEO"
      },
      "founder_thesis": "1-sentence summary of what they do",
      "bottleneck": "1-sentence summary of their likely operational bottleneck",
      "icp_score": 95,
      "confidence_score": 90,
      "evidence": [
        { "type": "fact", "text": "Based in London with 15 employees" },
        { "type": "inference", "text": "Likely struggling with outbound sales" }
      ]
    }
  ]
}`;

  return callGeminiJSON(sysPrompt);
}

export async function draftOutreachWithGemini(
  lead: any,
  hypothesis: string
) {
  const sysPrompt = `You are a master cold email copywriter. Write a hyper-personalized, short, punchy cold email and LinkedIn DM for this prospect.
DO NOT use placeholders like [Your Name]. Be conversational and direct.

Prospect: ${lead.founder?.name} (${lead.founder?.role}) at ${lead.company}
What they do: ${lead.founder_thesis}
Their likely bottleneck: ${lead.bottleneck}
Our Campaign Hypothesis: ${hypothesis}

Respond ONLY in valid JSON matching this schema:
{
  "subject": "Email subject line (short, lowercase)",
  "body": "Email body (plain text, use \\n for newlines. Max 4 sentences. Conversational, addressing their bottleneck).",
  "linkedin_dm": "LinkedIn connection request note (max 300 chars)."
}`;

  return callGeminiJSON(sysPrompt);
}
