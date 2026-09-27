import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { TimeBankStorage } from '../server/storage.js';
import { MatchingEngine } from '../server/matching.js';
import { CancellationEngine } from '../server/cancellation.js';
import { DisputeEngine } from '../server/disputes.js';

describe('Integration & System API Validation', () => {
  it('loads persistent seed storage with all users and valid ledger', () => {
    const storage = new TimeBankStorage();
    const aryan = storage.users.get('usr_aryan');
    const priya = storage.users.get('usr_priya');
    const marcus = storage.users.get('usr_marcus');

    assert.ok(aryan, 'Aryan exists');
    assert.strictEqual(aryan.name, 'Aryan Sharma');
    assert.ok(aryan.skillsOffered.some((s) => s.name === 'Java Debugging'));
    assert.ok(aryan.skillsOffered.some((s) => s.name === 'PPT Design'));
    assert.ok(aryan.skillsNeeded.some((s) => s.name === 'English Speaking Practice'));

    assert.ok(priya, 'Priya exists');
    assert.ok(marcus, 'Marcus exists');

    const integrity = storage.ledger.verifyChainIntegrity();
    assert.strictEqual(integrity.isValid, true);
    assert.ok(integrity.totalTransactions >= 5);
  });

  it('runs matching recommendations for Aryan finding Priya as top direct barter', () => {
    const storage = new TimeBankStorage();
    const aryan = storage.users.get('usr_aryan')!;
    const allUsers = Array.from(storage.users.values());
    const recs = MatchingEngine.findRecommendations(aryan, allUsers, storage.availability);

    assert.ok(recs.length > 0);
    const priyaMatch = recs.find((r) => r.user.id === 'usr_priya');
    assert.ok(priyaMatch, 'Found Priya as match for English Speaking Practice');
    assert.strictEqual(priyaMatch.matchType, 'DIRECT_EXCHANGE');
    assert.ok(priyaMatch.compatibilityScore >= 90);
  });

  it('executes atomic booking, escrow lock, and completion payout cycle', () => {
    const storage = new TimeBankStorage();
    const aryan = storage.users.get('usr_aryan')!;
    const priya = storage.users.get('usr_priya')!;

    const initialAryanBalance = aryan.credits.availableBalance;
    const initialAryanEscrow = aryan.credits.escrowBalance;
    const initialPriyaBalance = priya.credits.availableBalance;

    // 1. Lock Escrow for 30 min session
    const bookingId = `bk_test_${Date.now()}`;
    storage.ledger.lockEscrow(aryan, 30, bookingId, 'English Speaking');
    assert.strictEqual(aryan.credits.availableBalance, initialAryanBalance - 30);
    assert.strictEqual(aryan.credits.escrowBalance, initialAryanEscrow + 30);

    // 2. Mutual Sign-off / Release
    storage.ledger.releaseEscrow(aryan, priya, 30, bookingId, 'English Speaking');
    assert.strictEqual(aryan.credits.escrowBalance, initialAryanEscrow);
    assert.strictEqual(priya.credits.availableBalance, initialPriyaBalance + 30);

    // 3. Cryptographic integrity check
    const chainCheck = storage.ledger.verifyChainIntegrity();
    assert.strictEqual(chainCheck.isValid, true);
  });
});
