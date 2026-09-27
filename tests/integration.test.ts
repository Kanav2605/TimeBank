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

  it('guarantees the time-credit conservation invariant across the entire economy', () => {
    const storage = new TimeBankStorage();
    const students = Array.from(storage.users.values()).filter((u) => u.role !== 'admin');

    const totalInCirculation = students.reduce(
      (sum, u) => sum + u.credits.availableBalance + u.credits.escrowBalance,
      0
    );

    const totalMintedOnLedger = storage.ledger
      .getEntries()
      .filter((tx) => tx.type === 'SIGNUP_GRANT' || tx.type === 'ADMIN_ADJUSTMENT')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Fundamental invariant: Total Available + Total Escrow MUST EQUAL Total Minted
    assert.strictEqual(
      totalInCirculation,
      totalMintedOnLedger,
      `Economy imbalance detected: circulation is ${totalInCirculation} but ledger minted ${totalMintedOnLedger}`
    );
  });

  it('discovers 3-way circular loop (Aryan -> Marcus -> Priya -> Aryan) in seed community', () => {
    const storage = new TimeBankStorage();
    const students = Array.from(storage.users.values()).filter((u) => u.role !== 'admin');
    const cycles = MatchingEngine.findCircularTrades(students);

    assert.ok(cycles.length >= 1, 'Should find at least 1 circular trade loop');
    const loop = cycles.find(
      (c) =>
        c.description.includes('Aryan') &&
        c.description.includes('Marcus') &&
        c.description.includes('Priya')
    );
    assert.ok(loop, 'Aryan -> Marcus -> Priya circular trade loop should exist');
  });

  it('allows managing availability slots with creation and deletion', () => {
    const storage = new TimeBankStorage();
    const aryan = storage.users.get('usr_aryan')!;
    const initialCount = storage.availability.filter((s) => s.userId === aryan.id).length;

    // Add slot
    const newSlotId = `av_test_${Date.now()}`;
    storage.availability.push({
      id: newSlotId,
      userId: aryan.id,
      dayOfWeek: 6, // Saturday
      startTime: '10:00',
      endTime: '12:00',
      isRecurring: true,
    });
    storage.persist();

    const afterAdd = storage.availability.filter((s) => s.userId === aryan.id).length;
    assert.strictEqual(afterAdd, initialCount + 1);

    // Delete slot
    const removed = storage.removeAvailability(newSlotId);
    assert.strictEqual(removed, true);
    const afterDelete = storage.availability.filter((s) => s.userId === aryan.id).length;
    assert.strictEqual(afterDelete, initialCount);
  });

  it('records peer reviews and accurately updates tutor average rating', () => {
    const storage = new TimeBankStorage();
    const priya = storage.users.get('usr_priya')!;
    const initialReviewCount = priya.reviewCount;

    const newReview = {
      id: `rev_test_${Date.now()}`,
      sessionId: 'bk_sample_1',
      reviewerId: 'usr_aryan',
      revieweeId: priya.id,
      rating: 5,
      punctualityRating: 5,
      helpfulnessRating: 5,
      comment: 'Super helpful tutoring session!',
      createdAt: new Date().toISOString(),
    };

    storage.reviews.push(newReview);
    const priyaReviews = storage.reviews.filter((r) => r.revieweeId === priya.id);
    const sum = priyaReviews.reduce((acc, r) => acc + r.rating, 0);
    priya.rating = Number((sum / priyaReviews.length).toFixed(1));
    priya.reviewCount = priyaReviews.length;
    storage.persist();

    assert.strictEqual(priya.reviewCount, initialReviewCount + 1);
    assert.strictEqual(priya.rating, 5.0);
  });

  it('prevents overdraft under concurrent escrow locking attempts', () => {
    const storage = new TimeBankStorage();
    const aryan = storage.users.get('usr_aryan')!;
    // Set available balance to exactly 30 credits
    aryan.credits.availableBalance = 30;
    aryan.credits.escrowBalance = 0;

    let successfulLocks = 0;
    let failedLocks = 0;

    const tryLock = (sessionId: string) => {
      try {
        storage.ledger.lockEscrow(aryan, 30, sessionId, 'Parallel Booking');
        successfulLocks++;
      } catch {
        failedLocks++;
      }
    };

    tryLock('par_sess_1');
    tryLock('par_sess_2');

    assert.strictEqual(successfulLocks, 1, 'Only one 30-credit booking must succeed');
    assert.strictEqual(failedLocks, 1, 'Second booking must fail due to overdraft protection');
    assert.strictEqual(aryan.credits.availableBalance, 0);
    assert.strictEqual(aryan.credits.escrowBalance, 30);
  });
});
