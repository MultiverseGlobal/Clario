import { supabase } from './supabase';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Quick LLM pass to extract core facts, preferences, or context from the user's message.
 * Returns null if no permanent fact is found.
 */
export async function extractFact(userMessage: string): Promise<string | null> {
  const extractionPrompt = `You are a memory extraction engine. Analyze the user's message. If they state a clear personal preference, a long-term goal, a significant fact about their life, or a repeating pattern, extract it into a concise, third-person factual sentence (e.g. "User prefers their coffee black." or "User struggles with time management on Fridays.").
If the message is just conversational or temporary (e.g. "What time is it?" or "Hello"), return the exact string "NONE".`;

  // Try OpenAI first
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: extractionPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
        }),
      });

      const json = await res.json();
      const fact = json.choices?.[0]?.message?.content?.trim();
      if (fact && fact !== 'NONE' && !fact.includes('NONE')) return fact;
      return null;
    } catch (err) {
      console.error('OpenAI fact extraction failed:', err);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: extractionPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { maxOutputTokens: 100, temperature: 0.1 }
          })
        }
      );

      const json = await res.json();
      const fact = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (fact && fact !== 'NONE' && !fact.includes('NONE')) return fact;
      return null;
    } catch (err) {
      console.error('Gemini fact extraction failed:', err);
    }
  }

  return null;
}

/**
 * Generate a 768-dimensional vector for a string.
 * Uses OpenAI text-embedding-3-small (1536d) or Gemini text-embedding-004 (768d).
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  // Try OpenAI
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
        }),
      });
      const json = await res.json();
      return json.data?.[0]?.embedding || null;
    } catch (err) {
      console.error('OpenAI embedding generation failed:', err);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] }
          })
        }
      );
      const json = await res.json();
      return json?.embedding?.values || null;
    } catch (err) {
      console.error('Gemini embedding generation failed:', err);
    }
  }

  return null;
}

/**
 * Embed a string and store it in Supabase pgvector
 */
export async function embedAndStore(content: string, metadata: any = {}): Promise<void> {
  const embedding = await generateEmbedding(content);
  if (!embedding) return;

  const { error } = await supabase
    .from('semantic_memories')
    .insert({
      content,
      embedding,
      metadata,
    });

  if (error) {
    console.error('Failed to store semantic memory:', error);
  }
}

/**
 * Retrieve top N relevant memories based on semantic similarity
 */
export async function retrieveRelevantContext(query: string, maxResults = 5): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(query);
    
    // If embedding works, use pgvector semantic search
    if (embedding) {
      const { data, error } = await supabase
        .rpc('match_memories', {
          query_embedding: embedding,
          match_threshold: 0.3, // Lower bound similarity
          match_count: maxResults,
        });

      if (!error && data) {
        return data.map((row: any) => row.content);
      }
    }
  } catch (e) {
    console.error('Semantic search failed, falling back to text search:', e);
  }

  // Fallback: simple text match in memory_nodes
  try {
    const keywords = query.split(' ').filter(w => w.length > 3).slice(0, 3);
    if (keywords.length === 0) return [];
    
    // Build a basic ilike query for the first keyword as a simple fallback
    const { data, error } = await supabase
      .from('memory_nodes')
      .select('label, description')
      .ilike('description', `%${keywords[0]}%`)
      .limit(maxResults);
      
    if (error || !data) return [];
    return data.map((row: any) => `${row.label}: ${row.description}`);
  } catch (e) {
    console.error('Fallback text search failed:', e);
    return [];
  }
}
