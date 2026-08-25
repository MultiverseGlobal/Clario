import { NextResponse } from 'next/server';
import { getJourneys, saveJourney } from '@/lib/db';

export async function GET() {
  try {
    const journeys = await getJourneys();
    return NextResponse.json(journeys);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch journeys' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await saveJourney(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save journey' }, { status: 500 });
  }
}
