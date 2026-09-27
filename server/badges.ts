import { User } from './types.js';

export interface ReputationBadge {
  id: string;
  name: string;
  category: 'Honor' | 'Reliability' | 'Activity' | 'Integrity' | 'Network';
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  description: string;
  iconName: string;
  unlocked: boolean;
  progressPercent: number;
  currentValue: number | string;
  targetValue: number | string;
}

export class BadgesEngine {
  static computeBadges(user: User): ReputationBadge[] {
    const mentorReviews = user.reviewCount || 0;
    const isMasterMentor = (user.rating >= 4.8 && mentorReviews >= 3) || (user.rating === 5.0 && mentorReviews >= 2);
    const mentorProgress = Math.min(100, Math.round((mentorReviews / 3) * 100));

    const isLightning = (user.reliabilityScore || 0) >= 95;
    const lightningProgress = Math.min(100, Math.round(((user.reliabilityScore || 0) / 95) * 100));

    const earnedMinutes = user.credits?.totalEarned || 0;
    const isCenturion = earnedMinutes >= 30 || (user.completedSessions || 0) >= 1;
    const centurionProgress = Math.min(100, Math.round((earnedMinutes / 30) * 100));

    const isPristine = (user.disputeCount || 0) === 0 && ((user.completedSessions || 0) >= 1 || (user.reliabilityScore || 0) >= 98);
    const pristineProgress = (user.disputeCount || 0) === 0 ? 100 : 0;

    const offeredCount = user.skillsOffered?.length || 0;
    const neededCount = user.skillsNeeded?.length || 0;
    const isLoopCatalyst = offeredCount >= 2 && neededCount >= 1;
    const catalystProgress = Math.min(100, Math.round(((Math.min(offeredCount, 2) + Math.min(neededCount, 1)) / 3) * 100));

    const isPioneer = true;
    const pioneerProgress = 100;

    return [
      {
        id: 'master_mentor',
        name: 'Master Mentor',
        category: 'Honor',
        tier: 'Gold',
        description: 'Awarded to peer tutors maintaining a 4.8+ rating with proven student reviews.',
        iconName: 'Award',
        unlocked: isMasterMentor,
        progressPercent: mentorProgress,
        currentValue: `${(user.rating || 5).toFixed(1)} ★ (${mentorReviews} rev)`,
        targetValue: '4.8 ★ (3 rev)',
      },
      {
        id: 'lightning_reliable',
        name: 'Lightning Reliable',
        category: 'Reliability',
        tier: 'Diamond',
        description: 'Flawless punctuality and zero unexcused session no-shows.',
        iconName: 'Zap',
        unlocked: isLightning,
        progressPercent: lightningProgress,
        currentValue: `${user.reliabilityScore}%`,
        targetValue: '95%',
      },
      {
        id: 'time_centurion',
        name: 'Time Centurion',
        category: 'Activity',
        tier: 'Silver',
        description: 'Generously contributed 30+ minutes of tutoring to campus peers.',
        iconName: 'Clock',
        unlocked: isCenturion,
        progressPercent: centurionProgress,
        currentValue: `${earnedMinutes}m`,
        targetValue: '30m',
      },
      {
        id: 'guardian_shield',
        name: 'Trust Guardian',
        category: 'Integrity',
        tier: 'Diamond',
        description: '100% dispute-free record backed by verified cryptographic ledger settlements.',
        iconName: 'ShieldCheck',
        unlocked: isPristine,
        progressPercent: pristineProgress,
        currentValue: `${user.disputeCount || 0} disputes`,
        targetValue: '0 disputes',
      },
      {
        id: 'loop_catalyst',
        name: 'Loop Catalyst',
        category: 'Network',
        tier: 'Gold',
        description: 'Broad multilateral skill catalog ready for 3-way circular time loop trades.',
        iconName: 'Repeat',
        unlocked: isLoopCatalyst,
        progressPercent: catalystProgress,
        currentValue: `${offeredCount} offered / ${neededCount} needed`,
        targetValue: '2 offered / 1 needed',
      },
      {
        id: 'campus_pioneer',
        name: 'Founding Pioneer',
        category: 'Honor',
        tier: 'Bronze',
        description: 'Founding member of the decentralized zero-currency campus time exchange.',
        iconName: 'Sparkles',
        unlocked: isPioneer,
        progressPercent: pioneerProgress,
        currentValue: 'Active',
        targetValue: 'Active',
      },
    ];
  }
}
