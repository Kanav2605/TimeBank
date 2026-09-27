import crypto from 'crypto';
import { LedgerEntry, TransactionType, User } from './types.js';

export class TransactionLedger {
  private chain: LedgerEntry[] = [];

  constructor(initialChain?: LedgerEntry[]) {
    if (initialChain && initialChain.length > 0) {
      this.chain = [...initialChain];
    } else {
      this.initGenesisBlock();
    }
  }

  private initGenesisBlock(): void {
    const genesisEntry: LedgerEntry = {
      id: 'tx_genesis',
      index: 0,
      timestamp: new Date().toISOString(),
      fromUserId: 'SYSTEM',
      toUserId: 'GENESIS',
      amount: 0,
      type: 'SIGNUP_GRANT',
      reason: 'TimeBank Genesis Block: Time is the universal currency of learning',
      previousHash: '0'.repeat(64),
      hash: '',
    };
    genesisEntry.hash = this.calculateHash(genesisEntry);
    this.chain.push(genesisEntry);
  }

  public calculateHash(entry: Omit<LedgerEntry, 'hash'>): string {
    const payload = `${entry.index}|${entry.timestamp}|${entry.fromUserId}|${entry.toUserId}|${entry.amount}|${entry.type}|${entry.sessionId || ''}|${entry.reason}|${entry.previousHash}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public getEntries(): LedgerEntry[] {
    return [...this.chain];
  }

  public getEntriesForUser(userId: string): LedgerEntry[] {
    return this.chain.filter(
      (tx) => tx.fromUserId === userId || tx.toUserId === userId
    );
  }

  public getEntriesForSession(sessionId: string): LedgerEntry[] {
    return this.chain.filter((tx) => tx.sessionId === sessionId);
  }

  public getLatestEntry(): LedgerEntry {
    return this.chain[this.chain.length - 1];
  }

  private appendEntry(
    fromUserId: string,
    toUserId: string,
    amount: number,
    type: TransactionType,
    reason: string,
    sessionId?: string
  ): LedgerEntry {
    const prev = this.getLatestEntry();
    const newEntry: LedgerEntry = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      index: this.chain.length,
      timestamp: new Date().toISOString(),
      fromUserId,
      toUserId,
      amount,
      type,
      sessionId,
      reason,
      previousHash: prev.hash,
      hash: '',
    };
    newEntry.hash = this.calculateHash(newEntry);
    this.chain.push(newEntry);
    return newEntry;
  }

  /**
   * Grant initial welcome credits on sign up
   */
  public grantSignupBonus(user: User, amount: number = 60): LedgerEntry {
    const entry = this.appendEntry(
      'SYSTEM',
      user.id,
      amount,
      'SIGNUP_GRANT',
      `Welcome to TimeBank: ${amount} min starter time credits granted to ${user.name}`
    );
    user.credits.availableBalance += amount;
    return entry;
  }

  /**
   * Lock credits in escrow when a session is booked
   */
  public lockEscrow(
    requester: User,
    amount: number,
    sessionId: string,
    skillName: string
  ): LedgerEntry {
    if (requester.credits.availableBalance < amount) {
      throw new Error(
        `Insufficient time credits. Available: ${requester.credits.availableBalance} min, Required: ${amount} min.`
      );
    }

    requester.credits.availableBalance -= amount;
    requester.credits.escrowBalance += amount;

    return this.appendEntry(
      requester.id,
      'ESCROW',
      amount,
      'ESCROW_LOCK',
      `Escrow hold for ${amount} min session: "${skillName}"`,
      sessionId
    );
  }

  /**
   * Release escrowed credits to the helper upon session completion
   */
  public releaseEscrow(
    requester: User,
    helper: User,
    amount: number,
    sessionId: string,
    skillName: string
  ): LedgerEntry {
    if (requester.credits.escrowBalance < amount) {
      throw new Error(`Escrow balance underflow. Escrow has ${requester.credits.escrowBalance}, releasing ${amount}`);
    }

    requester.credits.escrowBalance -= amount;
    requester.credits.totalSpent += amount;

    helper.credits.availableBalance += amount;
    helper.credits.totalEarned += amount;

    return this.appendEntry(
      'ESCROW',
      helper.id,
      amount,
      'ESCROW_RELEASE',
      `Credits earned for completing ${amount} min session: "${skillName}"`,
      sessionId
    );
  }

  /**
   * Refund escrow back to requester (e.g. Early cancellation or tutor cancel)
   */
  public refundEscrow(
    requester: User,
    amount: number,
    sessionId: string,
    reason: string
  ): LedgerEntry {
    if (requester.credits.escrowBalance < amount) {
      throw new Error(`Escrow balance underflow on refund.`);
    }

    requester.credits.escrowBalance -= amount;
    requester.credits.availableBalance += amount;

    return this.appendEntry(
      'ESCROW',
      requester.id,
      amount,
      'ESCROW_REFUND',
      `Refunded ${amount} min credits: ${reason}`,
      sessionId
    );
  }

  /**
   * Split escrow (for late cancellation penalty or mediated dispute resolution)
   */
  public splitEscrow(
    requester: User,
    helper: User,
    refundAmount: number,
    payoutAmount: number,
    sessionId: string,
    reason: string,
    type: 'LATE_CANCELLATION_FEE' | 'DISPUTE_PAYOUT'
  ): { refundEntry?: LedgerEntry; payoutEntry?: LedgerEntry } {
    const total = refundAmount + payoutAmount;
    if (requester.credits.escrowBalance < total) {
      throw new Error(`Escrow balance underflow during split. Required: ${total}, Available: ${requester.credits.escrowBalance}`);
    }

    requester.credits.escrowBalance -= total;

    let refundEntry: LedgerEntry | undefined;
    let payoutEntry: LedgerEntry | undefined;

    if (refundAmount > 0) {
      requester.credits.availableBalance += refundAmount;
      refundEntry = this.appendEntry(
        'ESCROW',
        requester.id,
        refundAmount,
        type === 'LATE_CANCELLATION_FEE' ? 'ESCROW_REFUND' : 'DISPUTE_REFUND',
        `Dispute/Cancellation refund of ${refundAmount} min: ${reason}`,
        sessionId
      );
    }

    if (payoutAmount > 0) {
      helper.credits.availableBalance += payoutAmount;
      helper.credits.totalEarned += payoutAmount;
      requester.credits.totalSpent += payoutAmount;
      payoutEntry = this.appendEntry(
        'ESCROW',
        helper.id,
        payoutAmount,
        type,
        `Dispute/Cancellation payout of ${payoutAmount} min: ${reason}`,
        sessionId
      );
    }

    return { refundEntry, payoutEntry };
  }

  /**
   * Cryptographic verification of the entire ledger chain
   */
  public verifyChainIntegrity(): {
    isValid: boolean;
    brokenIndex?: number;
    error?: string;
    totalTransactions: number;
  } {
    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];

      // Verify genesis
      if (i === 0) {
        if (current.previousHash !== '0'.repeat(64)) {
          return {
            isValid: false,
            brokenIndex: 0,
            error: 'Genesis block previousHash is corrupt',
            totalTransactions: this.chain.length,
          };
        }
      } else {
        const prev = this.chain[i - 1];
        if (current.previousHash !== prev.hash) {
          return {
            isValid: false,
            brokenIndex: i,
            error: `Hash pointer mismatch at index ${i}: expected ${prev.hash}, found ${current.previousHash}`,
            totalTransactions: this.chain.length,
          };
        }
      }

      // Verify hash recomputation
      const computedHash = this.calculateHash(current);
      if (current.hash !== computedHash) {
        return {
          isValid: false,
          brokenIndex: i,
          error: `Tampering detected at index ${i}: stored hash ${current.hash} does not match computed hash ${computedHash}`,
          totalTransactions: this.chain.length,
        };
      }
    }

    return {
      isValid: true,
      totalTransactions: this.chain.length,
    };
  }
}
