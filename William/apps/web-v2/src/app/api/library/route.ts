import { NextResponse } from 'next/server';
import { getLibrary } from '@/lib/db';

export async function GET() {
  try {
    const library = await getLibrary();
    return NextResponse.json(library);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
  }
}
