import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadgesEngine } from '../server/badges.js';
import { CalendarEngine } from '../server/calendar.js';
import { LearningEngine } from '../server/learning.js';
import { MatchingEngine } from '../server/matching.js';
import { User, SessionBooking, SkillBoost } from '../server/types.js';
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

describe('Showcase Features: Learning Goals & Progress (/goal)', () => {
  it('creates a learning goal with valid attributes and clamps minimum duration', () => {
    const goal = LearningEngine.createGoal(
      'usr_aryan',
      'Master Java Streams & Concurrency',
      'Tech',
      10, // below 15 min minimum
      '2026-11-01',
      'Java Debugging'
    );

    assert.equal(goal.userId, 'usr_aryan');
    assert.equal(goal.targetMinutes, 15); // clamped to min 15
    assert.equal(goal.completedMinutes, 0);
    assert.equal(goal.status, 'IN_PROGRESS');
  });

  it('progresses goal and marks as COMPLETED when target minutes are achieved', () => {
    const goal = LearningEngine.createGoal(
      'usr_aryan',
      'English Fluency for Interviews',
      'Languages',
      60,
      '2026-11-01'
    );

    LearningEngine.addGoalProgress(goal, 30);
    assert.equal(goal.completedMinutes, 30);
    assert.equal(goal.status, 'IN_PROGRESS');

    LearningEngine.addGoalProgress(goal, 35);
    assert.equal(goal.completedMinutes, 65);
    assert.equal(goal.status, 'COMPLETED');
  });
});

describe('Showcase Features: Study & Exchange Roadmaps (/plan)', () => {
  it('generates structured 3-phase study roadmap for learner skill', () => {
    const user: User = {
      id: 'usr_aryan',
      name: 'Aryan Sharma',
      email: 'aryan@campus.edu',
      avatar: '',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
      skillsOffered: [],
      skillsNeeded: [{ id: 's1', name: 'English Speaking Practice', category: 'Languages' }],
      reliabilityScore: 100,
      rating: 5,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    const plan = LearningEngine.generateStudyPlan(user, 'English Speaking Practice');
    assert.ok(plan.id.startsWith('plan_'));
    assert.equal(plan.userId, 'usr_aryan');
    assert.equal(plan.milestones.length, 3);
    assert.ok(plan.title.includes('English Speaking Practice'));
    assert.equal(plan.milestones[0].completed, false);
  });
});

describe('Showcase Features: Teamwork Study Pods (/teamwork-preview)', () => {
  it('creates an open study pod with the creator as Leader', () => {
    const creator: User = {
      id: 'usr_aryan',
      name: 'Aryan Sharma',
      email: 'aryan@campus.edu',
      avatar: 'aryan.png',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
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

    const pod = LearningEngine.createTeamworkPod(
      'System Architecture Pod',
      'Java & Distributed Systems',
      'Collaborative capstone review',
      'Tech',
      '2026-10-15T18:00:00Z',
      60,
      3,
      creator
    );

    assert.equal(pod.members.length, 1);
    assert.equal(pod.members[0].userId, 'usr_aryan');
    assert.equal(pod.members[0].role, 'Leader');
    assert.equal(pod.status, 'OPEN');
  });

  it('allows students to join pod and transitions status to IN_PROGRESS when full', () => {
    const creator: User = {
      id: 'usr_aryan',
      name: 'Aryan Sharma',
      email: 'aryan@campus.edu',
      avatar: 'aryan.png',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
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

    const peer: User = {
      id: 'usr_marcus',
      name: 'Marcus Chen',
      email: 'marcus@campus.edu',
      avatar: 'marcus.png',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
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

    const pod = LearningEngine.createTeamworkPod(
      'Mini Pair Pod',
      'Python',
      'Quick sync',
      'Tech',
      '2026-10-15T18:00:00Z',
      30,
      2, // Max 2
      creator
    );

    LearningEngine.joinTeamworkPod(pod, peer, 'Contributor');
    assert.equal(pod.members.length, 2);
    assert.equal(pod.status, 'IN_PROGRESS'); // Now full!

    // Rejecting already joined member
    assert.throws(() => LearningEngine.joinTeamworkPod(pod, peer), /already joined/);
  });
});

describe('Showcase Features: Skill Boosts & Match Acceleration (/boost)', () => {
  it('toggles skill boost and accelerates match score in MatchingEngine', () => {
    const boosts: SkillBoost[] = [];
    const result = LearningEngine.toggleBoost(boosts, 'usr_aryan', 'Java Debugging', 'OFFERED');
    assert.equal(result.boosts.length, 1);
    assert.equal(result.activeBoost.active, true);

    const helper: User = {
      id: 'usr_aryan',
      name: 'Aryan Sharma',
      email: 'aryan@campus.edu',
      avatar: '',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
      skillsOffered: [{ id: 's1', name: 'Java Debugging', category: 'Tech' }],
      skillsNeeded: [],
      reliabilityScore: 100,
      rating: 5,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    const learner: User = {
      id: 'usr_student',
      name: 'Curious Learner',
      email: 'student@campus.edu',
      avatar: '',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 0, totalSpent: 0 },
      skillsOffered: [],
      skillsNeeded: [{ id: 's2', name: 'Java Debugging', category: 'Tech' }],
      reliabilityScore: 100,
      rating: 5,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'student',
    };

    const recommendationsWithoutBoost = MatchingEngine.findRecommendations(
      learner,
      [helper],
      [],
      [] // No active boosts
    );

    const recommendationsWithBoost = MatchingEngine.findRecommendations(
      learner,
      [helper],
      [],
      boosts // Active boost present
    );

    assert.ok(recommendationsWithBoost.length > 0);
    assert.ok(recommendationsWithBoost[0].compatibilityScore >= recommendationsWithoutBoost[0].compatibilityScore);
    assert.ok(
      recommendationsWithBoost[0].reasons.some((r) => r.includes('Active Campus Boost'))
    );
  });
});
