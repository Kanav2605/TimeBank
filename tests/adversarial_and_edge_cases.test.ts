import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionLedger } from '../server/ledger.js';
import { CancellationEngine } from '../server/cancellation.js';
import { DisputeEngine } from '../server/disputes.js';
import { MatchingEngine } from '../server/matching.js';
import { SessionBooking, User, AvailabilitySlot } from '../server/types.js';

describe('Adversarial & Edge Cases Security Verification', () => {
  function makeUser(id: string, name: string, balance: number = 60): User {
    return {
      id,
      name,
      email: `${id}@campus.edu`,
      avatar: '',
      bio: '',
      credits: {
        availableBalance: balance,
        escrowBalance: 0,
        totalEarned: balance,
        totalSpent: 0,
      },
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
  }

  it('rejects negative, zero, and non-integer credit movements in TransactionLedger', () => {
    const ledger = new TransactionLedger();
    const user = makeUser('u1', 'Attacker', 60);

    // Negative lockEscrow exploit attempt
    assert.throws(() => {
      ledger.lockEscrow(user, -30, 'sess_neg', 'Exploit');
    }, /positive integer/);

    // Zero lockEscrow
    assert.throws(() => {
      ledger.lockEscrow(user, 0, 'sess_zero', 'Zero');
    }, /positive integer/);

    // Decimal/float lockEscrow
    assert.throws(() => {
      ledger.lockEscrow(user, 15.5, 'sess_float', 'Float');
    }, /positive integer/);

    // Negative grant
    assert.throws(() => {
      ledger.grantSignupBonus(user, -100);
    }, /positive integer/);

    // Ledger balance must remain strictly intact
    assert.strictEqual(user.credits.availableBalance, 60);
    assert.strictEqual(user.credits.escrowBalance, 0);
  });

  it('rejects invalid amounts in splitEscrow and releaseEscrow', () => {
    const ledger = new TransactionLedger();
    const learner = makeUser('u1', 'Learner', 60);
    const helper = makeUser('u2', 'Helper', 0);

    ledger.lockEscrow(learner, 30, 'sess_1', 'Lesson');

    // Negative release
    assert.throws(() => {
      ledger.releaseEscrow(learner, helper, -30, 'sess_1', 'Lesson');
    }, /positive integer/);

    // Negative split amounts
    assert.throws(() => {
      ledger.splitEscrow(learner, helper, -10, 40, 'sess_1', 'Hack', 'DISPUTE_PAYOUT');
    }, /non-negative integers/);

    // Floating split amounts
    assert.throws(() => {
      ledger.splitEscrow(learner, helper, 15.5, 14.5, 'sess_1', 'Hack', 'DISPUTE_PAYOUT');
    }, /non-negative integers/);
  });

  it('rejects session cancellation if session has already concluded', () => {
    const ledger = new TransactionLedger();
    const learner = makeUser('u1', 'Learner', 60);
    const helper = makeUser('u2', 'Helper', 0);

    const pastDate = new Date(Date.now() - 3 * 3600000).toISOString(); // 3 hours ago
    const booking: SessionBooking = {
      id: 'bk_past',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'Calculus',
      skillCategory: 'Academics',
      description: 'Past session',
      scheduledAt: pastDate,
      durationMinutes: 60,
      creditAmount: 60,
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    };

    ledger.lockEscrow(learner, 60, booking.id, booking.skillName);

    // Attempting to cancel an already concluded session must fail
    assert.throws(() => {
      CancellationEngine.handleCancellation(
        booking,
        learner.id,
        'Trying to cancel after tutor taught',
        learner,
        helper,
        ledger,
        new Date() // current time
      );
    }, /Cannot cancel a session that has already concluded/);
  });

  it('rejects cancellation on a disputed session', () => {
    const ledger = new TransactionLedger();
    const learner = makeUser('u1', 'Learner', 60);
    const helper = makeUser('u2', 'Helper', 0);

    const booking: SessionBooking = {
      id: 'bk_disp',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'Calculus',
      skillCategory: 'Academics',
      description: 'Disputed session',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 30,
      creditAmount: 30,
      status: 'DISPUTED',
      createdAt: new Date().toISOString(),
    };

    assert.throws(() => {
      CancellationEngine.handleCancellation(
        booking,
        learner.id,
        'Bypass dispute',
        learner,
        helper,
        ledger
      );
    }, /Cannot cancel a session with status: DISPUTED/);
  });

  it('validates dispute reasons and sanitizes attended minutes', () => {
    const learner = makeUser('u1', 'Learner', 60);
    const helper = makeUser('u2', 'Helper', 0);

    const booking: SessionBooking = {
      id: 'bk_val',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'Java',
      skillCategory: 'Tech',
      description: 'Java tutoring',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    // Invalid reason
    assert.throws(() => {
      DisputeEngine.fileDispute(
        booking,
        learner.id,
        'INVALID_REASON' as any,
        'Invalid',
        '',
        0
      );
    }, /Invalid dispute reason/);

    // Attended minutes beyond duration is clamped
    const dispute = DisputeEngine.fileDispute(
      booking,
      learner.id,
      'INCOMPLETE_TIME',
      'Left early',
      '',
      999 // greater than 30 min duration
    );

    assert.strictEqual(dispute.actualMinutesAttended, 30);
  });

  it('prioritizes exact skill match over preceding domain match in helper profile', () => {
    const learner: User = makeUser('l1', 'Learner');
    learner.skillsNeeded = [{ id: 'sn1', name: 'Java Debugging', category: 'Tech' }];

    // Helper offers 'Bash Scripting' first (same category: Tech) then 'Java Debugging'
    const helper: User = makeUser('h1', 'Helper');
    helper.skillsOffered = [
      { id: 'so1', name: 'Bash Scripting', category: 'Tech' },
      { id: 'so2', name: 'Java Debugging', category: 'Tech' },
    ];

    const slots: AvailabilitySlot[] = [];
    const recs = MatchingEngine.findRecommendations(learner, [learner, helper], slots);

    assert.strictEqual(recs.length, 1);
    // Must pick 'Java Debugging' because it is an exact match, NOT 'Bash Scripting'
    assert.strictEqual(recs[0].matchedSkillOffered.name, 'Java Debugging');
    assert.ok(recs[0].reasons.some((r) => r.includes('Exact skill match for "Java Debugging"')));
    assert.ok(recs[0].compatibilityScore >= 75);
  });

  it('correctly aligns bilateral barter and populates matchedSkillNeeded', () => {
    const learner: User = makeUser('l1', 'Aryan');
    learner.skillsOffered = [{ id: 'so_aryan', name: 'PPT Design', category: 'Design' }];
    learner.skillsNeeded = [{ id: 'sn_aryan', name: 'English Speaking Practice', category: 'Languages' }];

    const helper: User = makeUser('h1', 'Priya');
    helper.skillsOffered = [{ id: 'so_priya', name: 'English Speaking Practice', category: 'Languages' }];
    helper.skillsNeeded = [{ id: 'sn_priya', name: 'PPT Design & Layout', category: 'Design' }]; // partial name match

    const slots: AvailabilitySlot[] = [];
    const recs = MatchingEngine.findRecommendations(learner, [learner, helper], slots);

    assert.strictEqual(recs.length, 1);
    assert.strictEqual(recs[0].matchType, 'DIRECT_EXCHANGE');
    assert.ok(recs[0].matchedSkillNeeded, 'matchedSkillNeeded must be defined for bilateral barter');
    assert.strictEqual(recs[0].matchedSkillNeeded?.name, 'PPT Design & Layout');
  });

  it('robustly compares availability times without single-digit string collation bugs', () => {
    const learner: User = makeUser('l1', 'Learner');
    const helper: User = makeUser('h1', 'Helper');
    const needed = { id: 's1', name: 'Math', category: 'Academics' as const };
    const offered = { id: 's2', name: 'Math', category: 'Academics' as const };

    // Learner is available 09:00 - 11:00, Helper available 10:00 - 12:00
    // String comparison "9:00" > "10:00" would fail if unpadded, but parsed minutes handle this seamlessly
    const learnerSlots: AvailabilitySlot[] = [
      { id: 'as1', userId: 'l1', dayOfWeek: 1, startTime: '9:00', endTime: '11:00', isRecurring: true },
    ];
    const helperSlots: AvailabilitySlot[] = [
      { id: 'as2', userId: 'h1', dayOfWeek: 1, startTime: '10:00', endTime: '12:00', isRecurring: true },
    ];

    const match = MatchingEngine.calculateMatchScore(learner, helper, needed, offered, learnerSlots, helperSlots);
    assert.ok(match.sharedSlots.length > 0, 'Should detect overlap between 9:00-11:00 and 10:00-12:00');
  });
});
