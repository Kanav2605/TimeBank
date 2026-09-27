import { SessionBooking, User } from './types.js';

export function formatIcsDate(dateInput: Date | string | number | undefined): string {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (dateInput instanceof Date) {
    date = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  } else {
    date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  }

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function escapeIcsText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export class CalendarEngine {
  static generateSessionIcs(booking: SessionBooking, peerName: string): string {
    const startTimestamp = booking.scheduledAt ? new Date(booking.scheduledAt).getTime() : NaN;
    const startDate = isNaN(startTimestamp) ? new Date() : new Date(startTimestamp);
    const duration = Number(booking.durationMinutes) > 0 ? Number(booking.durationMinutes) : 30;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    const now = new Date();

    const title = escapeIcsText(`TimeBank: ${booking.skillName || 'Tutoring'} with ${peerName}`);
    const description = [
      `TimeBank Peer Tutoring Session`,
      `Topic: ${booking.skillName || 'General Skill'} (${booking.skillCategory || 'General'})`,
      `Peer: ${peerName}`,
      `Duration: ${duration} minutes`,
      `Credit Value: ${booking.creditAmount || duration} time credits (1 min = 1 credit)`,
      `Notes: ${booking.description || 'Hands-on peer tutoring session.'}`,
      `Platform: TimeBank Campus Exchange`,
    ].map(escapeIcsText).join('\\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TimeBank//Student Time-Credit Economy//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:timebank-${booking.id || Date.now()}@timebank.campus`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `STATUS:${booking.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n';
  }

  static generateUserScheduleIcs(bookings: SessionBooking[], users: Map<string, User>, currentUserId: string): string {
    const now = new Date();
    const events = (bookings || [])
      .filter((b) => b && (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS'))
      .map((booking) => {
        const isHelper = booking.helperId === currentUserId;
        const peerId = isHelper ? booking.requesterId : booking.helperId;
        const peer = users.get(peerId);
        const peerName = peer?.name || 'Campus Student';

        const startTimestamp = booking.scheduledAt ? new Date(booking.scheduledAt).getTime() : NaN;
        const startDate = isNaN(startTimestamp) ? new Date() : new Date(startTimestamp);
        const duration = Number(booking.durationMinutes) > 0 ? Number(booking.durationMinutes) : 30;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
        const roleLabel = isHelper ? `Helping ${peerName}` : `Learning from ${peerName}`;

        const title = escapeIcsText(`TimeBank: ${booking.skillName || 'Session'} (${roleLabel})`);
        const description = [
          `TimeBank Peer Tutoring Session`,
          `Role: ${roleLabel}`,
          `Topic: ${booking.skillName || 'General'}`,
          `Duration: ${duration} minutes`,
          `Platform: TimeBank Campus Exchange`,
        ].map(escapeIcsText).join('\\n');

        return [
          'BEGIN:VEVENT',
          `UID:timebank-${booking.id || Date.now()}@timebank.campus`,
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
    ].join('\r\n') + '\r\n';
  }
}
