import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MatchingEngine } from '../server/matching.js';
import { User, AvailabilitySlot } from '../server/types.js';

describe('Matching Engine & Circular Trades', () => {
  const aryan: User = {
    id: 'u1',
    name: 'Aryan',
    email: 'aryan@test.com',
    avatar: '',
    bio: '',
    credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 60, totalSpent: 0 },
    skillsOffered: [
      { id: 's1', name: 'Java Debugging', category: 'Tech' },
      { id: 's2', name: 'PPT Design', category: 'Design' },
    ],
    skillsNeeded: [{ id: 's3', name: 'English Speaking Practice', category: 'Languages' }],
    reliabilityScore: 98,
    rating: 4.9,
    reviewCount: 10,
    completedSessions: 5,
    disputeCount: 0,
    joinedAt: '',
    role: 'student',
  };

  const priya: User = {
    id: 'u2',
    name: 'Priya',
    email: 'priya@test.com',
    avatar: '',
    bio: '',
    credits: { availableBalance: 45, escrowBalance: 0, totalEarned: 45, totalSpent: 0 },
    skillsOffered: [
      { id: 's4', name: 'English Speaking Practice', category: 'Languages' },
    ],
    skillsNeeded: [{ id: 's5', name: 'Java Debugging', category: 'Tech' }],
    reliabilityScore: 100,
    rating: 5.0,
    reviewCount: 12,
    completedSessions: 6,
    disputeCount: 0,
    joinedAt: '',
    role: 'student',
  };

  const slots: AvailabilitySlot[] = [
    { id: 'av1', userId: 'u1', dayOfWeek: 1, startTime: '14:00', endTime: '18:00', isRecurring: true },
    { id: 'av2', userId: 'u2', dayOfWeek: 1, startTime: '15:00', endTime: '17:00', isRecurring: true },
  ];

  it('calculates high compatibility score for direct bilateral trade', () => {
    const recs = MatchingEngine.findRecommendations(aryan, [aryan, priya], slots);
    assert.strictEqual(recs.length, 1);
    assert.strictEqual(recs[0].user.name, 'Priya');
    assert.strictEqual(recs[0].matchType, 'DIRECT_EXCHANGE');
    assert.ok(recs[0].compatibilityScore >= 90);
    assert.ok(recs[0].reasons.some((r) => r.includes('Direct bilateral trade')));
    assert.ok(recs[0].commonAvailability.length > 0);
  });

  it('detects 3-way circular time-trade cycles', () => {
    const marcus: User = {
      id: 'u3',
      name: 'Marcus',
      email: 'marcus@test.com',
      avatar: '',
      bio: '',
      credits: { availableBalance: 30, escrowBalance: 0, totalEarned: 30, totalSpent: 0 },
      skillsOffered: [{ id: 's6', name: 'Python Scripts', category: 'Tech' }],
      skillsNeeded: [{ id: 's7', name: 'PPT Design', category: 'Design' }],
      reliabilityScore: 95,
      rating: 4.8,
      reviewCount: 4,
      completedSessions: 2,
      disputeCount: 0,
      joinedAt: '',
      role: 'student',
    };

    // Modify priya to need Python instead of Java to form Aryan (PPT) -> Marcus (Python) -> Priya (English) -> Aryan
    const priyaMod: User = {
      ...priya,
      skillsNeeded: [{ id: 's8', name: 'Python Scripts', category: 'Tech' }],
    };

    const cycles = MatchingEngine.findCircularTrades([aryan, marcus, priyaMod]);
    assert.ok(cycles.length >= 1);
    assert.ok(cycles[0].description.includes('Aryan'));
    assert.ok(cycles[0].description.includes('Marcus'));
    assert.ok(cycles[0].description.includes('Priya'));
  });
});
