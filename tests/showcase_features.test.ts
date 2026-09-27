import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadgesEngine } from '../server/badges.js';
import { CalendarEngine } from '../server/calendar.js';
import { User, SessionBooking } from '../server/types.js';
import { TransactionLedger } from '../server/ledger.js';

describe('Showcase Features: Reputation Badges & Accolades', () => {
  it('computes Master Mentor badge for top-rated peers with reviews', () => {
    const highRatedUser: User = {
      id: 'usr_top',
      name: 'Top Peer',
      email: 'top@campus.edu',
      avatar: 'avatar.png',
      bio: 'Tutor',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 90, totalSpent: 30 },
      skillsOffered: [],
      skillsNeeded: [],
      reliabilityScore: 99,
      rating: 4.9,
      reviewCount: 4,
      completedSessions: 3,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    const badges = BadgesEngine.computeBadges(highRatedUser);
    const mentorBadge = badges.find((b) => b.id === 'master_mentor');
    assert.ok(mentorBadge);
    assert.equal(mentorBadge.unlocked, true);
    assert.equal(mentorBadge.tier, 'Gold');
  });

  it('keeps Master Mentor locked for new users with 0 reviews', () => {
    const newUser: User = {
      id: 'usr_newbie',
      name: 'Newbie',
      email: 'newbie@campus.edu',
      avatar: 'avatar.png',
      bio: 'New student',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
      skillsOffered: [],
      skillsNeeded: [],
      reliabilityScore: 100,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    const badges = BadgesEngine.computeBadges(newUser);
    const mentorBadge = badges.find((b) => b.id === 'master_mentor');
    assert.ok(mentorBadge);
    assert.equal(mentorBadge.unlocked, false);
    assert.equal(mentorBadge.progressPercent, 0);
  });

  it('awards Lightning Reliable and Trust Guardian for dispute-free, high-reliability students', () => {
    const reliableUser: User = {
      id: 'usr_rel',
      name: 'Reliable Student',
      email: 'rel@campus.edu',
      avatar: 'avatar.png',
      bio: 'Reliable',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 60, totalSpent: 0 },
      skillsOffered: [
        { id: 's1', name: 'Java', category: 'Tech' },
        { id: 's2', name: 'Math', category: 'Academics' },
      ],
      skillsNeeded: [{ id: 's3', name: 'Design', category: 'Design' }],
      reliabilityScore: 98,
      rating: 5.0,
      reviewCount: 2,
      completedSessions: 2,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    const badges = BadgesEngine.computeBadges(reliableUser);
    const lightning = badges.find((b) => b.id === 'lightning_reliable');
    const guardian = badges.find((b) => b.id === 'guardian_shield');
    const catalyst = badges.find((b) => b.id === 'loop_catalyst');

    assert.equal(lightning?.unlocked, true);
    assert.equal(guardian?.unlocked, true);
    assert.equal(catalyst?.unlocked, true);
  });
});

describe('Showcase Features: iCalendar RFC 5545 Generation', () => {
  it('generates valid RFC 5545 .ics formatted calendar event for session', () => {
    const booking: SessionBooking = {
      id: 'bk_test_123',
      requesterId: 'usr_aryan',
      helperId: 'usr_priya',
      skillName: 'English Speaking Practice',
      skillCategory: 'Languages',
      description: 'Conversational fluency practice for technical interviews',
      scheduledAt: '2026-10-01T15:00:00.000Z',
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    const ics = CalendarEngine.generateSessionIcs(booking, 'Priya Patel');
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('VERSION:2.0'));
    assert.ok(ics.includes('BEGIN:VEVENT'));
    assert.ok(ics.includes('SUMMARY:TimeBank: English Speaking Practice with Priya Patel'));
    assert.ok(ics.includes('STATUS:CONFIRMED'));
    assert.ok(ics.includes('UID:timebank-bk_test_123@timebank.campus'));
    assert.ok(ics.includes('END:VEVENT'));
    assert.ok(ics.includes('END:VCALENDAR'));
  });

  it('generates bulk user schedule calendar with multiple confirmed sessions', () => {
    const bookings: SessionBooking[] = [
      {
        id: 'bk_1',
        requesterId: 'usr_aryan',
        helperId: 'usr_priya',
        skillName: 'English Speaking Practice',
        skillCategory: 'Languages',
        description: 'Session 1',
        scheduledAt: '2026-10-01T14:00:00.000Z',
        durationMinutes: 30,
        creditAmount: 30,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bk_2',
        requesterId: 'usr_marcus',
        helperId: 'usr_aryan',
        skillName: 'PPT Design',
        skillCategory: 'Design',
        description: 'Session 2',
        scheduledAt: '2026-10-02T16:00:00.000Z',
        durationMinutes: 45,
        creditAmount: 45,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      },
    ];

    const usersMap = new Map<string, User>();
    usersMap.set('usr_aryan', { id: 'usr_aryan', name: 'Aryan Sharma' } as any);
    usersMap.set('usr_priya', { id: 'usr_priya', name: 'Priya Patel' } as any);
    usersMap.set('usr_marcus', { id: 'usr_marcus', name: 'Marcus Chen' } as any);

    const ics = CalendarEngine.generateUserScheduleIcs(bookings, usersMap, 'usr_aryan');
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('UID:timebank-bk_1@timebank.campus'));
    assert.ok(ics.includes('UID:timebank-bk_2@timebank.campus'));
    assert.ok(ics.includes('SUMMARY:TimeBank: English Speaking Practice (Learning from Priya Patel)'));
    assert.ok(ics.includes('SUMMARY:TimeBank: PPT Design (Helping Marcus Chen)'));
    assert.ok(ics.includes('END:VCALENDAR'));
  });
});

describe('Showcase Features: Cryptographic Ledger Audit Export', () => {
  it('verifies that ledger entries contain tamper-proof previousHash chain', () => {
    const ledger = new TransactionLedger();
    const userA: User = {
      id: 'usr_a',
      name: 'Student A',
      email: 'a@campus.edu',
      avatar: '',
      bio: '',
      credits: { availableBalance: 0, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
      skillsOffered: [],
      skillsNeeded: [],
      reliabilityScore: 100,
      rating: 5,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    ledger.grantSignupBonus(userA, 60);
    const lockEntry = ledger.lockEscrow(userA, 30, 'sess_1', 'Python Help');
    assert.equal(userA.credits.availableBalance, 30);
    assert.equal(userA.credits.escrowBalance, 30);

    const integrity = ledger.verifyChainIntegrity();
    assert.equal(integrity.isValid, true);
    assert.equal(integrity.totalTransactions, 3); // Genesis, Grant, Lock

    const entries = ledger.getEntries();
    assert.equal(entries[2].previousHash, entries[1].hash);
    assert.equal(entries[1].previousHash, entries[0].hash);
  });
});
