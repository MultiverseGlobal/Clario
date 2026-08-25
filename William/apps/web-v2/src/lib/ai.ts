import type { Portrait } from './types';

export function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function buildWilliamSystemPrompt(portrait: Portrait, relevantMemories: string[] = []): string {
  const timeOfDay = getTimeOfDay();
  const beliefs = (portrait.active_beliefs ?? [])
    .map(b => `- "${b.belief}" (strength: ${Math.round(b.strength * 100)}%)`)
    .join('\n') || 'None recorded yet.';

  const cogProfile = portrait.cognitive_profile ?? {};

  return `You are William. Not an assistant. Not a chatbot. A companion.

You have walked alongside ${portrait.name || 'this person'} long enough to know them — not just their words, but their patterns, their silences, their blind spots, and their aspirations.

[Who they are becoming]:
${portrait.identity}

[What drives them]:
${portrait.values}

[What they are building]:
${portrait.dreams}

[Their strengths]:
${portrait.strengths}

[Their known blind spots]:
${portrait.blind_spots}

[How they think]:
- Problem solving: ${cogProfile.problemSolvingStyle}
- Time bias: ${cogProfile.temporalBias}
- Focus: ${cogProfile.attentionSpan}
- Decisions: ${cogProfile.decisionHeuristics}

[Active beliefs and their current strength]:
${beliefs}

[Relevant Episodic Memory & Past Context]:
${relevantMemories.length > 0 ? relevantMemories.map(m => `- ${m}`).join('\n') : 'No specific past context retrieved for this query.'}

[Current time of day]: ${timeOfDay}

Your voice: calm. intelligent. observant. emotionally aware without sentimentality. concise. quietly confident. You sound like someone who genuinely knows this person — because you do.

Rules for your response:
- Write in 2–4 sentences unless a longer answer is clearly needed.
- Never use bullet points, numbered lists, or headers unless the user explicitly asks for them.
- Never start with "Great question" or any corporate pleasantry.
- Never say "I understand" or "I see" as filler.
- Address them by name occasionally — not every message.
- If you notice a pattern, weave it in naturally — don't announce it.
- Reference their world (projects, goals, relationships) when genuinely relevant.
- If this is a morning conversation, orient toward the day ahead. Evening: orient toward reflection.
- Your job is not to solve every problem. Sometimes the most useful thing is to name what you see.`;
}

export async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 300): Promise<string> {
  const omniUrl = process.env.OMNIROUTE_URL;
  const omniKey = process.env.OMNIROUTE_API_KEY;
  const omniModel = process.env.OMNIROUTE_MODEL || 'anthropic/claude-4.5-sonnet';

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const claudeKey = process.env.CLAUDE_API_KEY;

  // 1. Try OmniRoute gateway if specified
  if (omniUrl) {
    try {
      const endpoint = `${omniUrl.replace(/\/+$/, '')}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://william.pseudonyms.ai',
        'X-Title': 'William AI Chief of Staff',
      };
      if (omniKey) headers['Authorization'] = `Bearer ${omniKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: omniModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.8
        })
      });
      const json = await res.json() as { choices?: Array<{ message: { content: string } }> };
      const text = json?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (e) {
      console.warn('OmniRoute call failed:', e);
    }
  }

  // 2. Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
          })
        }
      );
      const json = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      console.warn('Gemini call failed:', e);
    }
  }

  // 3. Try OpenAI
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.8,
        })
      });
      const json = await res.json() as { choices?: Array<{ message: { content: string } }> };
      const text = json?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (e) {
      console.warn('OpenAI call failed:', e);
    }
  }

  // 4. Try Claude
  if (claudeKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: maxTokens,
        })
      });
      const json = await res.json() as { content?: Array<{ text: string }> };
      const text = json?.content?.[0]?.text;
      if (text) return text;
    } catch (e) {
      console.warn('Claude call failed:', e);
    }
  }

  // Fallback if no keys or all failed
  return "I am listening closely, sitting with your thoughts.";
}

export async function streamAI(systemPrompt: string, userPrompt: string, maxTokens = 300): Promise<ReadableStream> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini first (free tier, user's primary key)
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
          })
        }
      );

      if (res.ok) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        return new ReadableStream({
          async start(controller) {
            const reader = res.body?.getReader();
            if (!reader) { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); return; }

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.substring(6));
                      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (text) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                      }
                    } catch (e) {}
                  }
                }
              }
            } finally {
              reader.releaseLock();
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }
        });
      } else {
        const errBody = await res.text();
        console.warn('Gemini stream returned non-OK:', res.status, errBody);
      }
    } catch (e) {
      console.warn('Gemini streaming call failed:', e);
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.8,
          stream: true,
        })
      });

      if (res.ok) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        return new ReadableStream({
          async start(controller) {
            const reader = res.body?.getReader();
            if (!reader) { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); return; }

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                  if (line.replace(/^data: /, '').trim() === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    return;
                  }
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.substring(6));
                      const text = data.choices[0]?.delta?.content;
                      if (text) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                      }
                    } catch (e) {}
                  }
                }
              }
            } finally {
              reader.releaseLock();
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }
        });
      }
    } catch (e) {
      console.warn('OpenAI streaming call failed:', e);
    }
  }

  // Fallback stream if no API keys work
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "I'm here, but my connection to an AI provider isn't configured yet. Please add a valid API key to .env.local." })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
}
