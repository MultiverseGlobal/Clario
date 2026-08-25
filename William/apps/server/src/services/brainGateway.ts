export interface BrainRequest {
  systemPrompt: string;
  userPrompt: string;
  providerPriority?: ('omniroute' | 'google' | 'anthropic' | 'openai')[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface BrainResponse {
  text: string;
  providerUsed: string;
  latencyMs: number;
}

export type TokenCallback = (token: string) => void;

export class BrainGateway {
  static async execute(req: BrainRequest): Promise<BrainResponse> {
    const start = Date.now();
    const priority = req.providerPriority || ['omniroute', 'google', 'anthropic', 'openai'];

    for (const provider of priority) {
      if (provider === 'omniroute' && process.env.OMNIROUTE_URL) {
        try {
          const text = await this.callOmniRoute(req);
          return { text, providerUsed: 'omniroute', latencyMs: Date.now() - start };
        } catch (e) {
          console.warn('BrainGateway: OmniRoute provider failed, falling back...', e);
        }
      }

      if (provider === 'google' && process.env.GEMINI_API_KEY) {
        try {
          const text = await this.callGemini(req);
          return { text, providerUsed: 'google', latencyMs: Date.now() - start };
        } catch (e) {
          console.warn('BrainGateway: Google provider failed, falling back...', e);
        }
      }
      
      if (provider === 'anthropic' && process.env.CLAUDE_API_KEY) {
        try {
          const text = await this.callClaude(req);
          return { text, providerUsed: 'anthropic', latencyMs: Date.now() - start };
        } catch (e) {
          console.warn('BrainGateway: Anthropic provider failed, falling back...', e);
        }
      }

      if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        try {
          const text = await this.callOpenAI(req);
          return { text, providerUsed: 'openai', latencyMs: Date.now() - start };
        } catch (e) {
          console.warn('BrainGateway: OpenAI provider failed, falling back...', e);
        }
      }
    }

    return {
      text: "I am listening closely, sitting with your thoughts.",
      providerUsed: 'fallback',
      latencyMs: Date.now() - start
    };
  }

  /**
   * Streaming variant — invokes onToken for each text chunk, returns the full text.
   * Falls back to execute() if the chosen provider doesn't support streaming.
   */
  static async executeStream(req: BrainRequest, onToken: TokenCallback): Promise<BrainResponse> {
    const start = Date.now();

    // Try Gemini streaming first if available
    if (process.env.GEMINI_API_KEY) {
      try {
        const text = await this.streamGemini(req, onToken);
        return { text, providerUsed: 'google', latencyMs: Date.now() - start };
      } catch (e) {
        console.warn('BrainGateway: Gemini streaming failed, falling back to non-streaming...', e);
      }
    }

    // Try OpenAI streaming
    if (process.env.OPENAI_API_KEY) {
      try {
        const text = await this.streamOpenAI(req, onToken);
        return { text, providerUsed: 'openai', latencyMs: Date.now() - start };
      } catch (e) {
        console.warn('BrainGateway: OpenAI streaming failed, falling back to non-streaming...', e);
      }
    }

    // Fall back to non-streaming execute, emit full text as single token
    const result = await this.execute(req);
    onToken(result.text);
    return result;
  }

  private static async callGemini(req: BrainRequest): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const prompt = `${req.systemPrompt}\n\nUser input:\n${req.userPrompt}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens || 600,
          temperature: req.temperature ?? 0.7
        }
      })
    });

    if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
    const json: any = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private static async streamGemini(req: BrainRequest, onToken: TokenCallback): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`;
    const prompt = `${req.systemPrompt}\n\nUser input:\n${req.userPrompt}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens || 600,
          temperature: req.temperature ?? 0.7
        }
      })
    });

    if (!res.ok) throw new Error(`Gemini streaming API returned status ${res.status}`);
    if (!res.body) throw new Error('No response body from Gemini streaming API');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const token = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (token) {
            onToken(token);
            fullText += token;
          }
        } catch (_) {}
      }
    }

    return fullText;
  }

  private static async callClaude(req: BrainRequest): Promise<string> {
    const key = process.env.CLAUDE_API_KEY;
    const url = 'https://api.anthropic.com/v1/messages';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: req.maxTokens || 600,
        temperature: req.temperature ?? 0.7,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }]
      })
    });

    if (!res.ok) throw new Error(`Claude API returned status ${res.status}`);
    const json: any = await res.json();
    return json.content?.[0]?.text || '';
  }

  private static async callOpenAI(req: BrainRequest): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: req.maxTokens || 600,
        temperature: req.temperature ?? 0.7,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt }
        ]
      })
    });

    if (!res.ok) throw new Error(`OpenAI API returned status ${res.status}`);
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content || '';
  }

  private static async streamOpenAI(req: BrainRequest, onToken: TokenCallback): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: req.maxTokens || 600,
        temperature: req.temperature ?? 0.7,
        stream: true,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt }
        ]
      })
    });

    if (!res.ok) throw new Error(`OpenAI streaming API returned status ${res.status}`);
    if (!res.body) throw new Error('No response body from OpenAI streaming API');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content ?? '';
          if (token) {
            onToken(token);
            fullText += token;
          }
        } catch (_) {}
      }
    }

    return fullText;
  }

  private static async callOmniRoute(req: BrainRequest): Promise<string> {
    const url = `${process.env.OMNIROUTE_URL}/chat/completions`;
    const key = process.env.OMNIROUTE_API_KEY;
    const model = req.model || process.env.OMNIROUTE_REASONER_MODEL || 'gpt-4o-mini';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens || 600,
        temperature: req.temperature ?? 0.7,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt }
        ]
      })
    });

    if (!res.ok) throw new Error(`OmniRoute API returned status ${res.status}`);
    const json: any = await res.json();
    return json.choices?.[0]?.message?.content || '';
  }
}

// ─── Time of Day Helper ───────────────────────────────────────────────────────

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

