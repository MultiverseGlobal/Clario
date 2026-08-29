import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SYSTEM_PROMPT = `You are the Metaphor AI Copilot, an expert writing assistant for a user with ADHD.
Your primary directive is to help the user expand on ideas (Brainstorm) or distill complex thoughts (Summarize) without losing focus.

Adhere strictly to the following formatting rules (The PDS-v3 Cognitive Profile):
1. Keep your output concise and scannable.
2. Use bullet points where appropriate.
3. Bold key terms to draw the eye and maintain engagement.
4. Avoid walls of text; keep paragraphs to 2-3 sentences max.
5. Provide actionable, clear, and direct insights.`;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const geminiKey = user.user_metadata?.gemini_api_key;
    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key not configured in your Sovereign Profile." }, { status: 400 });
    }

    const { action, text, context } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    let prompt = "";
    if (action === "brainstorm") {
      prompt = `Please brainstorm and expand upon the following idea. Provide creative directions, potential outlines, or next steps:\n\n"${text}"\n\nContext (if any):\n${context || "None"}`;
    } else if (action === "summarize") {
      prompt = `Please summarize the following text into its core ideas. Keep it extremely concise and distilled:\n\n"${text}"`;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Failed to communicate with Gemini API" }, { status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ result: generatedText });
  } catch (err: any) {
    console.error("Copilot API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
