import { Dispute, DisputeStatus, SessionBooking, User } from './types.js';
import { TransactionLedger } from './ledger.js';

export class DisputeEngine {
  /**
   * Files a dispute for an active or recently ended session
   */
  public static fileDispute(
    booking: SessionBooking,
    raisedByUserId: string,
    reason: Dispute['reason'],
    description: string,
    evidenceNotes: string,
    actualMinutesAttended: number
  ): Dispute {
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      // In TimeBank, completed sessions can be disputed within 24h review window
    }

    const againstUserId =
      raisedByUserId === booking.requesterId ? booking.helperId : booking.requesterId;

    const dispute: Dispute = {
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: booking.id,
      raisedByUserId,
      againstUserId,
      reason,
      description,
      evidenceNotes,
      actualMinutesAttended,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    booking.status = 'DISPUTED';
    booking.disputeId = dispute.id;

    return dispute;
  }

  /**
   * Admin or Mediation resolution of a dispute
   */
  public static resolveDispute(
    dispute: Dispute,
    booking: SessionBooking,
    requester: User,
    helper: User,
    resolution: DisputeStatus,
    resolutionNotes: string,
    resolvedBy: string,
    ledger: TransactionLedger
  ): Dispute {
    dispute.status = resolution;
    dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedBy = resolvedBy;
    dispute.resolvedAt = new Date().toISOString();

    const creditAmount = booking.creditAmount;

    switch (resolution) {
      case 'RESOLVED_FULL_REFUND': {
        // 100% refund to requester
        dispute.refundedAmount = creditAmount;
        dispute.paidAmount = 0;
        ledger.refundEscrow(
          requester,
          creditAmount,
          booking.id,
          `Dispute Resolution (Full Refund): ${resolutionNotes}`
        );
        helper.disputeCount += 1;
        helper.reliabilityScore = Math.max(0, helper.reliabilityScore - 8);
        booking.status = 'CANCELLED';
        break;
      }

      case 'RESOLVED_SPLIT': {
        // 50% refund, 50% payout
        const refundAmt = Math.round(creditAmount / 2);
        const payoutAmt = creditAmount - refundAmt;
        dispute.refundedAmount = refundAmt;
        dispute.paidAmount = payoutAmt;
        ledger.splitEscrow(
          requester,
          helper,
          refundAmt,
          payoutAmt,
          booking.id,
          `Dispute Resolution (Split 50/50): ${resolutionNotes}`,
          'DISPUTE_PAYOUT'
        );
        helper.reliabilityScore = Math.max(0, helper.reliabilityScore - 3);
        booking.status = 'COMPLETED';
        break;
      }

      case 'RESOLVED_RELEASE_TO_HELPER': {
        // 100% payout to helper (claim rejected/disproved)
        dispute.refundedAmount = 0;
        dispute.paidAmount = creditAmount;
        ledger.releaseEscrow(
          requester,
          helper,
          creditAmount,
          booking.id,
          booking.skillName
        );
        booking.status = 'COMPLETED';
        break;
      }

      case 'DISMISSED': {
        // Dismissed with no changes or returned to normal
        booking.status = 'CANCELLED';
        break;
      }

      default:
        throw new Error(`Unsupported dispute resolution status: ${resolution}`);
    }

    return dispute;
  }
}
