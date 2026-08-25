import { NextResponse } from 'next/server';
import { getWorldModel } from '@/lib/db';

export async function GET() {
  try {
    const worldModel = await getWorldModel();
    return NextResponse.json(worldModel);
  } catch (error) {
    console.error('World model API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch world model' }, { status: 500 });
  }
}
