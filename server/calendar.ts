import { SessionBooking, User } from './types.js';

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export class CalendarEngine {
  static generateSessionIcs(booking: SessionBooking, peerName: string): string {
    const startDate = new Date(booking.scheduledAt);
    const endDate = new Date(startDate.getTime() + (booking.durationMinutes || 30) * 60 * 1000);
    const now = new Date();

    const title = `TimeBank: ${booking.skillName} with ${peerName}`;
    const description = [
      `TimeBank Peer Tutoring Session`,
      `Topic: ${booking.skillName} (${booking.skillCategory || 'General'})`,
      `Peer: ${peerName}`,
      `Duration: ${booking.durationMinutes} minutes`,
      `Credit Value: ${booking.creditAmount || booking.durationMinutes} time credits (1 min = 1 credit)`,
      `Notes: ${booking.description || 'Hands-on peer tutoring session.'}`,
      `Platform: TimeBank Campus Exchange`,
    ].join('\\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TimeBank//Student Time-Credit Economy//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:timebank-${booking.id}@timebank.campus`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `STATUS:${booking.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  static generateUserScheduleIcs(bookings: SessionBooking[], users: Map<string, User>, currentUserId: string): string {
    const now = new Date();
    const events = bookings
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')
      .map((booking) => {
        const isHelper = booking.helperId === currentUserId;
        const peerId = isHelper ? booking.requesterId : booking.helperId;
        const peer = users.get(peerId);
        const peerName = peer?.name || 'Campus Student';

        const startDate = new Date(booking.scheduledAt);
        const endDate = new Date(startDate.getTime() + (booking.durationMinutes || 30) * 60 * 1000);
        const roleLabel = isHelper ? `Helping ${peerName}` : `Learning from ${peerName}`;

        const title = `TimeBank: ${booking.skillName} (${roleLabel})`;
        const description = [
          `TimeBank Peer Tutoring Session`,
          `Role: ${roleLabel}`,
          `Topic: ${booking.skillName}`,
          `Duration: ${booking.durationMinutes} minutes`,
          `Platform: TimeBank Campus Exchange`,
        ].join('\\n');

        return [
          'BEGIN:VEVENT',
          `UID:timebank-${booking.id}@timebank.campus`,
          `DTSTAMP:${formatIcsDate(now)}`,
          `DTSTART:${formatIcsDate(startDate)}`,
          `DTEND:${formatIcsDate(endDate)}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${description}`,
          'STATUS:CONFIRMED',
          'END:VEVENT',
        ].join('\r\n');
      });

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TimeBank//Student Time-Credit Economy//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');
  }
}
