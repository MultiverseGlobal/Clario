import { NextResponse } from 'next/server';
import { getPortrait, getChats, saveChat, savePortrait } from '@/lib/db';
import { buildWilliamSystemPrompt, callAI, streamAI, getTimeOfDay } from '@/lib/ai';
import { extractFact, embedAndStore, retrieveRelevantContext } from '@/lib/memory';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const portrait = (await getPortrait()) || {
      id: 'user_1',
      name: 'William',
      identity: 'Architect, systems builder, and creative technologist.',
      values: 'Autonomy, deep focus, aesthetic excellence, continuous mastery.',
      principles: 'Build systems that scale leverage.',
      strengths: 'System design, rapid execution, synthetic reasoning.',
      blind_spots: 'Occasional over-engineering.',
      dreams: 'Craft a seamless personal AI companion.',
      relationships: 'Collaborators & family',
      decision_patterns: [],
      growth: [],
      cognitive_profile: {
        problemSolvingStyle: 'System-builder',
        temporalBias: 'Strategic compounding focus',
        attentionSpan: 'High intensity blocks',
        decisionHeuristics: 'Empirical validation'
      },
      active_beliefs: []
    };

    const isGreeting = message === '__GREETING__';
    const timeOfDay = getTimeOfDay();

    let userPrompt = message;
    if (isGreeting) {
      userPrompt = `Open the session with a single short, personal greeting for ${portrait.name}. It is ${timeOfDay}. Reference one specific detail from their portrait (a current belief, journey, or dream). Do not start with 'Hello' or 'Good morning'. Keep it under 2 sentences.`;
    }

    let relevantMemories: string[] = [];
    if (!isGreeting) {
      relevantMemories = await retrieveRelevantContext(userPrompt);
      
      // Fire-and-forget memory extraction
      extractFact(userPrompt).then((fact) => {
        if (fact) {
          console.log('[Memory Adapter] Extracted new fact:', fact);
          embedAndStore(fact, { source: 'chat', timestamp: new Date().toISOString() });
        }
      });
    }

    const systemPrompt = buildWilliamSystemPrompt(portrait, relevantMemories);
    const url = new URL(req.url);
    const isStreaming = url.searchParams.get('stream') === 'true';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!isGreeting) {
      await saveChat({
        id: `user_${Date.now()}`,
        sender: 'user',
        text: message,
        time: timeStr
      });
    }

    if (isStreaming) {
      const stream = await streamAI(systemPrompt, userPrompt, isGreeting ? 120 : 300);
      
      const chatId = `william_${Date.now()}`;
      let fullMessage = "";

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const textChunk = new TextDecoder().decode(chunk);
          // Extract plain text from SSE lines for clean Supabase storage
          const lines = textChunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const payload = line.substring(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) fullMessage += parsed.text;
            } catch {}
          }
          controller.enqueue(chunk);
        },
        async flush() {
          try {
            await saveChat({
              id: chatId,
              sender: 'william',
              text: fullMessage,
              time: timeStr
            });
          } catch (e) {
            console.error("Error saving streamed message:", e);
          }
        }
      });

      return new NextResponse(stream.pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const reply = await callAI(systemPrompt, userPrompt, isGreeting ? 120 : 300);

    await saveChat({
      id: `william_${Date.now()}`,
      sender: 'william',
      text: reply,
      time: timeStr
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ reply: 'William is momentarily resting. (Error processing request)' });
  }
}
