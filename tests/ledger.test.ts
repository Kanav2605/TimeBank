import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionLedger } from '../server/ledger.js';
import { User } from '../server/types.js';

describe('Transaction Ledger & Cryptographic Integrity', () => {
  function makeMockUser(id: string, name: string, balance: number = 0): User {
    return {
      id,
      name,
      email: `${id}@campus.edu`,
      avatar: '',
      bio: '',
      credits: {
        availableBalance: balance,
        escrowBalance: 0,
        totalEarned: 0,
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

  it('initializes genesis block with valid hash chain', () => {
    const ledger = new TransactionLedger();
    const entries = ledger.getEntries();
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].index, 0);
    assert.strictEqual(entries[0].type, 'SIGNUP_GRANT');
    assert.strictEqual(entries[0].previousHash, '0'.repeat(64));

    const check = ledger.verifyChainIntegrity();
    assert.strictEqual(check.isValid, true);
  });

  it('mints signup bonus and records transaction', () => {
    const ledger = new TransactionLedger();
    const user = makeMockUser('u1', 'Aryan');
    ledger.grantSignupBonus(user, 60);

    assert.strictEqual(user.credits.availableBalance, 60);
    const entries = ledger.getEntries();
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[1].toUserId, 'u1');
    assert.strictEqual(entries[1].amount, 60);
    assert.strictEqual(ledger.verifyChainIntegrity().isValid, true);
  });

  it('locks escrow and rejects overdrafts', () => {
    const ledger = new TransactionLedger();
    const user = makeMockUser('u1', 'Aryan', 60);

    // Lock 30 credits
    ledger.lockEscrow(user, 30, 'session_1', 'Java Debugging');
    assert.strictEqual(user.credits.availableBalance, 30);
    assert.strictEqual(user.credits.escrowBalance, 30);

    // Overdraft attempt (trying to lock 40 when only 30 available)
    assert.throws(() => {
      ledger.lockEscrow(user, 40, 'session_2', 'PPT Design');
    }, /Insufficient time credits/);

    // But locking remaining 30 should succeed
    ledger.lockEscrow(user, 30, 'session_3', 'PPT Design');
    assert.strictEqual(user.credits.availableBalance, 0);
    assert.strictEqual(user.credits.escrowBalance, 60);

    assert.strictEqual(ledger.verifyChainIntegrity().isValid, true);
  });

  it('releases escrow upon session completion to helper', () => {
    const ledger = new TransactionLedger();
    const learner = makeMockUser('u1', 'Aryan', 60);
    const helper = makeMockUser('u2', 'Priya', 0);

    ledger.lockEscrow(learner, 30, 'session_1', 'English Practice');
    ledger.releaseEscrow(learner, helper, 30, 'session_1', 'English Practice');

    assert.strictEqual(learner.credits.availableBalance, 30);
    assert.strictEqual(learner.credits.escrowBalance, 0);
    assert.strictEqual(learner.credits.totalSpent, 30);

    assert.strictEqual(helper.credits.availableBalance, 30);
    assert.strictEqual(helper.credits.totalEarned, 30);

    assert.strictEqual(ledger.verifyChainIntegrity().isValid, true);
  });

  it('detects tampering in cryptographic hash chain', () => {
    const ledger = new TransactionLedger();
    const u1 = makeMockUser('u1', 'Aryan', 100);
    const u2 = makeMockUser('u2', 'Priya', 0);

    ledger.lockEscrow(u1, 30, 'sess_1', 'Test');
    ledger.releaseEscrow(u1, u2, 30, 'sess_1', 'Test');

    assert.strictEqual(ledger.verifyChainIntegrity().isValid, true);

    // Simulate malicious tampering with an entry's amount
    const entries = ledger.getEntries();
    // Tamper with internal chain
    (ledger as any).chain[1].amount = 999;

    const corruptedCheck = ledger.verifyChainIntegrity();
    assert.strictEqual(corruptedCheck.isValid, false);
    assert.strictEqual(corruptedCheck.brokenIndex, 1);
  });
});
