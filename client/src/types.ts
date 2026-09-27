export type TransactionType =
  | 'SIGNUP_GRANT'
  | 'ESCROW_LOCK'
  | 'ESCROW_RELEASE'
  | 'ESCROW_REFUND'
  | 'LATE_CANCELLATION_FEE'
  | 'DISPUTE_PAYOUT'
  | 'DISPUTE_REFUND'
  | 'ADMIN_ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  index: number;
  timestamp: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  type: TransactionType;
  sessionId?: string;
  reason: string;
  previousHash: string;
  hash: string;
}

export interface SkillItem {
  id: string;
  name: string;
  category: 'Tech' | 'Design' | 'Academics' | 'Languages' | 'Career' | 'LifeSkills';
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description?: string;
  endorsements?: number;
}

export interface UserCredits {
  availableBalance: number;
  escrowBalance: number;
  totalEarned: number;
  totalSpent: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  university?: string;
  major?: string;
  credits: UserCredits;
  skillsOffered: SkillItem[];
  skillsNeeded: SkillItem[];
  reliabilityScore: number;
  rating: number;
  reviewCount: number;
  completedSessions: number;
  disputeCount: number;
  joinedAt: string;
  role: 'student' | 'admin';
}

export interface AvailabilitySlot {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  date?: string;
}

export type SessionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface SessionBooking {
  id: string;
  requesterId: string;
  helperId: string;
  skillName: string;
  skillCategory: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  creditAmount: number;
  status: SessionStatus;
  escrowEntryId?: string;
  completionEntryId?: string;
  meetingNotes?: string;
  topicsChecked?: string[];
  requesterSignedOff?: boolean;
  helperSignedOff?: boolean;
  cancelledBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancellationPenalty?: number;
  disputeId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED_FULL_REFUND'
  | 'RESOLVED_SPLIT'
  | 'RESOLVED_RELEASE_TO_HELPER'
  | 'DISMISSED';

export interface Dispute {
  id: string;
  sessionId: string;
  raisedByUserId: string;
  againstUserId: string;
  reason: 'NO_SHOW' | 'POOR_QUALITY' | 'INCOMPLETE_TIME' | 'OFF_TOPIC' | 'TECHNICAL_ISSUES';
  description: string;
  evidenceNotes: string;
  actualMinutesAttended: number;
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  refundedAmount?: number;
  paidAmount?: number;
  createdAt: string;
}

export interface SkillMatchRecommendation {
  user: User;
  matchType: 'DIRECT_EXCHANGE' | 'SKILL_MATCH' | 'TOP_RATED';
  matchedSkillOffered: SkillItem;
  matchedSkillNeeded?: SkillItem;
  compatibilityScore: number;
  commonAvailability: string[];
  reasons: string[];
}

export interface CircularTradeCycle {
  cycle: Array<{ giver: string; receiver: string; skill: string }>;
  description: string;
}

export interface LearningGoal {
  id: string;
  userId: string;
  title: string;
  category: string;
  targetMinutes: number;
  completedMinutes: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  targetDate: string;
  linkedSkill?: string;
  createdAt: string;
}

export interface PlanMilestone {
  id: string;
  title: string;
  targetMinutes: number;
  completed: boolean;
  recommendedSkill: string;
  recommendedPeerId?: string;
  recommendedPeerName?: string;
  notes?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetCompletionDate: string;
  milestones: PlanMilestone[];
  createdAt: string;
}

export interface TeamworkPodMember {
  userId: string;
  name: string;
  avatar: string;
  role: 'Leader' | 'Contributor' | 'Learner';
  pledgedMinutes: number;
}

export interface TeamworkPod {
  id: string;
  title: string;
  topic: string;
  description: string;
  category: string;
  scheduledAt: string;
  durationMinutes: number;
  maxParticipants: number;
  members: TeamworkPodMember[];
  agenda: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

export interface SkillBoost {
  id: string;
  userId: string;
  skillName: string;
  type: 'OFFERED' | 'NEEDED';
  boostLevel: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
}


export interface Review {
  id: string;
  sessionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  punctualityRating: number;
  helpfulnessRating: number;
  comment: string;
  createdAt: string;
}
