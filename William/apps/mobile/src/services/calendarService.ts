export interface CalendarEvent {
  id: string;
  time: string;
  duration: string;
  title: string;
  location: string;
  status: 'active' | 'conflict' | 'upcoming' | 'resolved';
  conflictNotice?: string;
}

export function resolveCalendarConflict(events: CalendarEvent[], conflictId: string): CalendarEvent[] {
  return events.map((evt) => {
    if (evt.id === conflictId) {
      return {
        ...evt,
        time: '15:30 PM',
        status: 'upcoming',
        conflictNotice: undefined,
      };
    }
    return evt;
  });
}
