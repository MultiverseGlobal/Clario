import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token, title, body, data } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Push token required' }, { status: 400 });
    }

    // Call the Expo Push Service directly
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: title || 'William',
        body: body,
        data: data || {},
      }),
    });

    const result = await expoRes.json();

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Notify API Error:', err);
    return NextResponse.json({ error: 'Failed to dispatch push notification' }, { status: 500 });
  }
}
