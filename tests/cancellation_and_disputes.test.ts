import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionLedger } from '../server/ledger.js';
import { CancellationEngine } from '../server/cancellation.js';
import { DisputeEngine } from '../server/disputes.js';
import { SessionBooking, User } from '../server/types.js';

describe('Cancellation Policy & Dispute Mediation', () => {
  function createTestSetup() {
    const ledger = new TransactionLedger();
    const learner: User = {
      id: 'learner_1',
      name: 'Aryan',
      email: 'aryan@test.com',
      avatar: '',
      bio: '',
      credits: { availableBalance: 60, escrowBalance: 0, totalEarned: 60, totalSpent: 0 },
      skillsOffered: [],
      skillsNeeded: [],
      reliabilityScore: 100,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: '',
      role: 'student',
    };

    const helper: User = {
      id: 'helper_1',
      name: 'Priya',
      email: 'priya@test.com',
      avatar: '',
      bio: '',
      credits: { availableBalance: 30, escrowBalance: 0, totalEarned: 30, totalSpent: 0 },
      skillsOffered: [],
      skillsNeeded: [],
      reliabilityScore: 100,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: '',
      role: 'student',
    };

    return { ledger, learner, helper };
  }

  it('early cancellation (>2h) gives 100% refund with 0 penalty', () => {
    const { ledger, learner, helper } = createTestSetup();
    const booking: SessionBooking = {
      id: 'b1',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'English Speaking',
      skillCategory: 'Languages',
      description: 'Practice session',
      scheduledAt: new Date(Date.now() + 5 * 3600000).toISOString(), // 5 hours in future
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    ledger.lockEscrow(learner, 30, booking.id, booking.skillName);
    assert.strictEqual(learner.credits.availableBalance, 30);
    assert.strictEqual(learner.credits.escrowBalance, 30);

    const result = CancellationEngine.handleCancellation(
      booking,
      learner.id,
      'Change of plans',
      learner,
      helper,
      ledger
    );

    assert.strictEqual(result.refundAmount, 30);
    assert.strictEqual(result.penaltyAmount, 0);
    assert.strictEqual(learner.credits.availableBalance, 60);
    assert.strictEqual(learner.credits.escrowBalance, 0);
    assert.strictEqual(booking.status, 'CANCELLED');
    assert.strictEqual(learner.reliabilityScore, 100);
  });

  it('late cancellation (<2h) charges 50% courtesy fee to helper', () => {
    const { ledger, learner, helper } = createTestSetup();
    const booking: SessionBooking = {
      id: 'b2',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'English Speaking',
      skillCategory: 'Languages',
      description: 'Practice session',
      scheduledAt: new Date(Date.now() + 30 * 60000).toISOString(), // 30 mins in future (< 2h)
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    ledger.lockEscrow(learner, 30, booking.id, booking.skillName);

    const result = CancellationEngine.handleCancellation(
      booking,
      learner.id,
      'Emergency conflict',
      learner,
      helper,
      ledger
    );

    assert.strictEqual(result.refundAmount, 15);
    assert.strictEqual(result.penaltyAmount, 15);
    assert.strictEqual(learner.credits.availableBalance, 45); // 30 + 15 refund
    assert.strictEqual(helper.credits.availableBalance, 45);  // 30 + 15 compensation
    assert.strictEqual(learner.credits.escrowBalance, 0);
    assert.strictEqual(booking.status, 'CANCELLED');
    assert.strictEqual(learner.reliabilityScore, 97); // 3% penalty
  });

  it('helper cancellation gives learner 100% refund and helper reliability penalty', () => {
    const { ledger, learner, helper } = createTestSetup();
    const booking: SessionBooking = {
      id: 'b3',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'English Speaking',
      skillCategory: 'Languages',
      description: 'Practice session',
      scheduledAt: new Date(Date.now() + 60 * 60000).toISOString(),
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    ledger.lockEscrow(learner, 30, booking.id, booking.skillName);

    const result = CancellationEngine.handleCancellation(
      booking,
      helper.id,
      'Power outage',
      learner,
      helper,
      ledger
    );

    assert.strictEqual(result.refundAmount, 30);
    assert.strictEqual(result.penaltyAmount, 0);
    assert.strictEqual(learner.credits.availableBalance, 60);
    assert.strictEqual(helper.reliabilityScore, 95); // -5% penalty
  });

  it('handles dispute lifecycle and mediation resolution', () => {
    const { ledger, learner, helper } = createTestSetup();
    const booking: SessionBooking = {
      id: 'b4',
      requesterId: learner.id,
      helperId: helper.id,
      skillName: 'English Speaking',
      skillCategory: 'Languages',
      description: 'Practice session',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    ledger.lockEscrow(learner, 30, booking.id, booking.skillName);

    // Learner files dispute
    const dispute = DisputeEngine.fileDispute(
      booking,
      learner.id,
      'TECHNICAL_ISSUES',
      'Helper microphone was completely silent',
      'Joined meeting at 2:00, waited until 2:15, no audio',
      5
    );

    assert.strictEqual(dispute.status, 'OPEN');
    assert.strictEqual(booking.status, 'DISPUTED');

    // Mediator investigates and awards full refund to learner
    const resolved = DisputeEngine.resolveDispute(
      dispute,
      booking,
      learner,
      helper,
      'RESOLVED_FULL_REFUND',
      'Verified tech failure with logs. Full refund granted.',
      'Mediator Admin',
      ledger
    );

    assert.strictEqual(resolved.status, 'RESOLVED_FULL_REFUND');
    assert.strictEqual(learner.credits.availableBalance, 60);
    assert.strictEqual(learner.credits.escrowBalance, 0);
    assert.strictEqual(helper.disputeCount, 1);
    assert.strictEqual(helper.reliabilityScore, 92);
  });
});
