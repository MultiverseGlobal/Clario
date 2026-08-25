import { NextResponse } from 'next/server';
import { getPortrait, getJourneys, getLibrary, getChats, getBriefings, getScheduleItems } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');

    if (table === 'commands') {
      return NextResponse.json([
        { id: 'cmd_1', title: 'Finalize Chief of Staff Platform Architecture', priority: 1, estimated_duration: '45m', completed: false },
        { id: 'cmd_2', title: 'Review Metaphor & Atlas Context Adapters', priority: 2, estimated_duration: '30m', completed: false },
      ]);
    }

    if (table === 'briefings') {
      const data = await getBriefings();
      return NextResponse.json(data);
    }

    if (table === 'calendar_events') {
      const data = await getScheduleItems();
      return NextResponse.json(data);
    }

    if (table === 'chats') {
      const data = await getChats(30);
      return NextResponse.json(data);
    }

    const [portrait, journeys, library, recentChats, briefings, calendarEvents] = await Promise.all([
      getPortrait(),
      getJourneys(),
      getLibrary(),
      getChats(20),
      getBriefings(),
      getScheduleItems(),
    ]);

    return NextResponse.json({ portrait, journeys, library, recentChats, briefings, calendarEvents });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
