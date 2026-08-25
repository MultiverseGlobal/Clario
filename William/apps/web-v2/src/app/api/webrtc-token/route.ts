import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
    // We proxy this to our backend which handles retrieving the ephemeral key
    // Alternatively, if the backend doesn't have it yet, we can generate it here
    const res = await fetch(`${apiUrl}/api/webrtc-token`, {
      method: 'POST',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    
    // If the backend doesn't have the route, we can just return a dummy token or error
    // so it fails gracefully. Realistically, we should also implement it on the backend, 
    // or just fetch from OpenAI here if the web-v2 has the API key.
    
    // For now, let's just attempt to fetch from OpenAI directly if we have the key,
    // otherwise return 500
    if (process.env.OPENAI_API_KEY) {
      const openaiRes = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
        }),
      });

      if (openaiRes.ok) {
        const data = await openaiRes.json();
        return NextResponse.json(data);
      }
    }

    return NextResponse.json({ error: 'WebRTC token unavailable' }, { status: 500 });
  } catch (error) {
    console.error('Error generating WebRTC token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
