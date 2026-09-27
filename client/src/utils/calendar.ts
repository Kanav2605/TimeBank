import { SessionBooking, User } from '../types';

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

/**
 * Generate RFC 5545 compliant iCalendar (.ics) string for a single session
 */
export function generateSessionIcs(booking: SessionBooking, peerName: string): string {
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

/**
 * Generate iCalendar for multiple sessions
 */
export function generateBulkIcs(bookings: SessionBooking[], allUsers: User[], currentUserId: string): string {
  const now = new Date();
  const events = (bookings || [])
    .filter((b) => b && (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS'))
    .map((booking) => {
      const isHelper = booking.helperId === currentUserId;
      const peerId = isHelper ? booking.requesterId : booking.helperId;
      const peer = allUsers.find((u) => u.id === peerId);
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

/**
 * Trigger client-side file download of an .ics file
 */
export function downloadIcsFile(icsContent: string, fileName: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.ics') ? fileName : `${fileName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate direct Google Calendar link
 */
export function getGoogleCalendarUrl(booking: SessionBooking, peerName: string): string {
  const startTimestamp = booking.scheduledAt ? new Date(booking.scheduledAt).getTime() : Date.now();
  const start = new Date(startTimestamp);
  const duration = Number(booking.durationMinutes) > 0 ? Number(booking.durationMinutes) : 30;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const formatGCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const text = encodeURIComponent(`TimeBank: ${booking.skillName || 'Tutoring'} with ${peerName}`);
  const dates = `${formatGCal(start)}/${formatGCal(end)}`;
  const details = encodeURIComponent(
    `TimeBank Session: ${booking.skillName || 'Tutoring'} (${duration} mins)\nPeer: ${peerName}\nNotes: ${booking.description || 'TimeBank peer tutoring'}`
  );
  const location = encodeURIComponent('TimeBank Collaborative Workspace');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}
