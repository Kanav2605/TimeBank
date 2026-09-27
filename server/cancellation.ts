import { SessionBooking, User } from './types.js';
import { TransactionLedger } from './ledger.js';

export interface CancellationResult {
  booking: SessionBooking;
  refundAmount: number;
  penaltyAmount: number;
  policyApplied: string;
  reliabilityDeduction: number;
}

export class CancellationEngine {
  /**
   * Evaluates cancellation rules and executes credit movements
   */
  public static handleCancellation(
    booking: SessionBooking,
    cancelledByUserId: string,
    reason: string,
    requester: User,
    helper: User,
    ledger: TransactionLedger,
    currentTime: Date = new Date()
  ): CancellationResult {
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      throw new Error(`Cannot cancel a session with status: ${booking.status}`);
    }

    const scheduledTime = new Date(booking.scheduledAt);
    const msUntilSession = scheduledTime.getTime() - currentTime.getTime();
    const hoursUntilSession = msUntilSession / (1000 * 60 * 60);

    let refundAmount = 0;
    let penaltyAmount = 0;
    let policyApplied = '';
    let reliabilityDeduction = 0;

    const isCancelledByRequester = cancelledByUserId === requester.id;
    const isCancelledByHelper = cancelledByUserId === helper.id;

    if (!isCancelledByRequester && !isCancelledByHelper) {
      throw new Error('Only the session requester or helper can cancel this booking.');
    }

    if (isCancelledByHelper) {
      // Helper cancelled: Requester gets 100% refund.
      // Helper receives reliability score penalty.
      refundAmount = booking.creditAmount;
      penaltyAmount = 0;
      reliabilityDeduction = 5;
      policyApplied = 'Helper cancellation: 100% credits refunded to learner. Helper receives a 5% reliability penalty.';

      ledger.refundEscrow(
        requester,
        refundAmount,
        booking.id,
        `Helper ${helper.name} cancelled session: ${reason}`
      );

      helper.reliabilityScore = Math.max(0, helper.reliabilityScore - reliabilityDeduction);
    } else {
      // Requester cancelled
      if (hoursUntilSession >= 2) {
        // Free cancellation window (> 2 hours)
        refundAmount = booking.creditAmount;
        penaltyAmount = 0;
        reliabilityDeduction = 0;
        policyApplied = 'Early cancellation (> 2 hours prior): Full 100% credit refund. Zero penalty.';

        ledger.refundEscrow(
          requester,
          refundAmount,
          booking.id,
          `Learner cancelled with >2h advance notice: ${reason}`
        );
      } else {
        // Late cancellation window (< 2 hours)
        // 50% compensation to helper for reserving their time slot
        penaltyAmount = Math.round(booking.creditAmount * 0.5);
        refundAmount = booking.creditAmount - penaltyAmount;
        reliabilityDeduction = 3;
        policyApplied = `Late cancellation (< 2 hours): 50% courtesy fee (${penaltyAmount} min) compensated to helper for reserved time. Remaining 50% refunded to learner.`;

        ledger.splitEscrow(
          requester,
          helper,
          refundAmount,
          penaltyAmount,
          booking.id,
          `Late cancellation (<2h notice) by ${requester.name}`,
          'LATE_CANCELLATION_FEE'
        );

        requester.reliabilityScore = Math.max(0, requester.reliabilityScore - reliabilityDeduction);
      }
    }

    // Update booking record
    booking.status = 'CANCELLED';
    booking.cancelledBy = cancelledByUserId;
    booking.cancellationReason = reason;
    booking.cancelledAt = currentTime.toISOString();
    booking.cancellationPenalty = penaltyAmount;

    return {
      booking,
      refundAmount,
      penaltyAmount,
      policyApplied,
      reliabilityDeduction,
    };
  }
}
