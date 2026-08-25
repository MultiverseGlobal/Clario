// API client — calls internal Next.js API routes co-located with the app
const SERVER_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function sendChat(message: string): Promise<string> {
  const res = await apiFetch<{ reply: string }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return res?.reply ?? 'William is offline.';
}
