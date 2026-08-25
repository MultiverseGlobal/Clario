import { NextResponse } from 'next/server';
import { getPortrait, savePortrait } from '@/lib/db';

export async function GET() {
  try {
    const portrait = await getPortrait();
    return NextResponse.json(portrait);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch portrait' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await savePortrait(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save portrait' }, { status: 500 });
  }
}
