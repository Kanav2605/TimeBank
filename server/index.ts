import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TimeBankStorage } from './storage.js';
import { MatchingEngine } from './matching.js';
import { CancellationEngine } from './cancellation.js';
import { DisputeEngine } from './disputes.js';
import { BadgesEngine } from './badges.js';
import { CalendarEngine } from './calendar.js';
import { LearningEngine } from './learning.js';
import { SessionBooking, User } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const storage = new TimeBankStorage();

// ==========================================
// 1. Users & Profiles
// ==========================================

app.get('/api/users', (req: Request, res: Response) => {
  const usersList = Array.from(storage.users.values());
  res.json(usersList);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = storage.users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.get('/api/users/:id/badges', (req: Request, res: Response) => {
  const user = storage.users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const badges = BadgesEngine.computeBadges(user);
  res.json(badges);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { name, email, avatar, bio, university, major, skillsOffered, skillsNeeded } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailLower = email.trim().toLowerCase();
  const emailExists = Array.from(storage.users.values()).some(
    (u) => u.email.trim().toLowerCase() === emailLower
  );
  if (emailExists) {
    return res.status(409).json({ error: 'A user with this email address already exists' });
  }

  const id = `usr_${Date.now()}`;
  const newUser: User = {
    id,
    name,
    email,
    avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    bio: bio || 'TimeBank explorer eager to share skills and learn.',
    university: university || 'Campus Community',
    major: major || 'General Studies',
    credits: {
      availableBalance: 0,
      escrowBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
    },
    skillsOffered: skillsOffered || [],
    skillsNeeded: skillsNeeded || [],
    reliabilityScore: 100,
    rating: 5.0,
    reviewCount: 0,
    completedSessions: 0,
    disputeCount: 0,
    joinedAt: new Date().toISOString(),
    role: 'student',
  };

  storage.users.set(id, newUser);
  // Mint 60 min welcome starter credits
  storage.ledger.grantSignupBonus(newUser, 60);
  storage.persist();

  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const user = storage.users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { bio, university, major, skillsOffered, skillsNeeded } = req.body;
  if (bio !== undefined) user.bio = bio;
  if (university !== undefined) user.university = university;
  if (major !== undefined) user.major = major;
  if (skillsOffered) user.skillsOffered = skillsOffered;
  if (skillsNeeded) user.skillsNeeded = skillsNeeded;

  storage.persist();
  res.json(user);
});

// ==========================================
// 2. Transaction Ledger & Cryptographic Chain
// ==========================================

app.get('/api/ledger', (req: Request, res: Response) => {
  const entries = storage.ledger.getEntries();
  const integrity = storage.ledger.verifyChainIntegrity();

  // Calculate total system economy metrics
  let totalMinted = 0;
  let totalInEscrow = 0;
  for (const u of storage.users.values()) {
    totalInEscrow += u.credits.escrowBalance;
  }
  for (const entry of entries) {
    if (entry.type === 'SIGNUP_GRANT' || entry.type === 'ADMIN_ADJUSTMENT') {
      totalMinted += entry.amount;
    }
  }

  const genesisHash = entries[0]?.hash;
  const latestHash = entries[entries.length - 1]?.hash;
  const latestFirst = [...entries].reverse();

  res.json({
    chain: latestFirst, // latest first without mutating the original chain
    integrity,
    metrics: {
      totalMintedMinutes: totalMinted,
      totalActiveEscrowMinutes: totalInEscrow,
      totalTransactionsCount: entries.length,
      genesisHash,
      latestHash,
    },
  });
});

app.get('/api/ledger/user/:id', (req: Request, res: Response) => {
  const entries = storage.ledger.getEntriesForUser(req.params.id);
  res.json([...entries].reverse());
});

app.get('/api/ledger/export/csv', (req: Request, res: Response) => {
  const entries = storage.ledger.getEntries();
  const headers = 'Block,Timestamp,Type,FromUser,ToUser,AmountMinutes,Reason,PreviousHash,Hash';
  const rows = entries.map((e) =>
    [
      e.index,
      `"${e.timestamp}"`,
      `"${e.type}"`,
      `"${e.fromUserId}"`,
      `"${e.toUserId}"`,
      e.amount,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${e.previousHash}"`,
      `"${e.hash}"`,
    ].join(',')
  );
  const csvContent = [headers, ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="TimeBank-Ledger-Audit.csv"');
  res.send(csvContent);
});

// ==========================================
// 3. Matching Engine & Circular Trades
// ==========================================

app.get('/api/matching/recommendations/:userId', (req: Request, res: Response) => {
  const learner = storage.users.get(req.params.userId);
  if (!learner) {
    return res.status(404).json({ error: 'User not found' });
  }

  const allUsers = Array.from(storage.users.values());
  const recommendations = MatchingEngine.findRecommendations(
    learner,
    allUsers,
    storage.availability,
    storage.boosts
  );

  res.json(recommendations);
});

app.get('/api/matching/circular-trades', (req: Request, res: Response) => {
  const allUsers = Array.from(storage.users.values()).filter((u) => u.role !== 'admin');
  const cycles = MatchingEngine.findCircularTrades(allUsers);
  res.json(cycles);
});

// ==========================================
// 4. Availability & Slots
// ==========================================

app.get('/api/availability/:userId', (req: Request, res: Response) => {
  const slots = storage.availability.filter((s) => s.userId === req.params.userId);
  res.json(slots);
});

app.post('/api/availability', (req: Request, res: Response) => {
  const { userId, dayOfWeek, startTime, endTime, isRecurring, date } = req.body;
  if (!userId || dayOfWeek === undefined || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required availability fields' });
  }

  const slot = {
    id: `av_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    dayOfWeek: Number(dayOfWeek),
    startTime,
    endTime,
    isRecurring: isRecurring ?? true,
    date,
  };

  storage.availability.push(slot);
  storage.persist();
  res.status(201).json(slot);
});

app.delete('/api/availability/:id', (req: Request, res: Response) => {
  const removed = storage.removeAvailability(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Availability slot not found' });
  }
  res.json({ success: true, message: 'Availability slot removed' });
});

// ==========================================
// 5. Booking & Session Lifecycle
// ==========================================

app.get('/api/bookings', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  const status = req.query.status as string | undefined;

  let bookings = Array.from(storage.bookings.values());

  if (userId) {
    bookings = bookings.filter(
      (b) => b.requesterId === userId || b.helperId === userId
    );
  }

  if (status) {
    bookings = bookings.filter((b) => b.status === status);
  }

  // Sort newest first
  bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(bookings);
});

app.get('/api/bookings/:id/ical', (req: Request, res: Response) => {
  const booking = storage.bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const helper = storage.users.get(booking.helperId);
  const requester = storage.users.get(booking.requesterId);
  const peerName = helper?.name || requester?.name || 'Campus Student';

  const ics = CalendarEngine.generateSessionIcs(booking, peerName);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="TimeBank-${booking.id}.ics"`);
  res.send(ics);
});

app.get('/api/bookings/user/:userId/ical', (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userBookings = Array.from(storage.bookings.values()).filter(
    (b) => b.requesterId === userId || b.helperId === userId
  );

  const ics = CalendarEngine.generateUserScheduleIcs(userBookings, storage.users, userId);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="TimeBank-Schedule-${userId}.ics"`);
  res.send(ics);
});

app.post('/api/bookings', (req: Request, res: Response) => {
  const { requesterId, helperId, skillName, skillCategory, description, scheduledAt, durationMinutes } = req.body;

  if (!requesterId || !helperId || !skillName || !scheduledAt || !durationMinutes) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const requester = storage.users.get(requesterId);
  const helper = storage.users.get(helperId);

  if (!requester || !helper) {
    return res.status(404).json({ error: 'Requester or Helper user not found' });
  }

  if (requester.id === helper.id) {
    return res.status(400).json({ error: 'You cannot book a session with yourself' });
  }

  const creditAmount = Number(durationMinutes);
  if (!Number.isInteger(creditAmount) || creditAmount <= 0 || creditAmount > 480) {
    return res.status(400).json({
      error: 'durationMinutes must be a positive integer between 1 and 480 minutes',
    });
  }

  const sessionDate = new Date(scheduledAt);
  if (isNaN(sessionDate.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduledAt ISO date format' });
  }

  if (sessionDate.getTime() < Date.now() - 5 * 60 * 1000) {
    return res.status(400).json({ error: 'Cannot schedule a session in the past' });
  }

  if (requester.credits.availableBalance < creditAmount) {
    return res.status(400).json({
      error: `Insufficient time credits. You have ${requester.credits.availableBalance} credits available, but this session requires ${creditAmount} credits. Complete a session to earn more time credits!`,
    });
  }

  // Conflict overlap check with active sessions
  const newStart = sessionDate.getTime();
  const newEnd = newStart + creditAmount * 60 * 1000;

  for (const b of storage.bookings.values()) {
    if (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS') {
      const bStart = new Date(b.scheduledAt).getTime();
      const bEnd = bStart + (b.durationMinutes || 0) * 60 * 1000;
      if (newStart < bEnd && bStart < newEnd) {
        if (b.helperId === helperId || b.requesterId === helperId) {
          return res.status(409).json({
            error: `Schedule conflict: ${helper.name} is already booked for another session during this time window.`,
          });
        }
        if (b.requesterId === requesterId || b.helperId === requesterId) {
          return res.status(409).json({
            error: `Schedule conflict: You already have another session booked during this time window.`,
          });
        }
      }
    }
  }

  const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    // 1. Lock credits into escrow
    const escrowEntry = storage.ledger.lockEscrow(
      requester,
      creditAmount,
      bookingId,
      skillName
    );

    // 2. Create booking record
    const newBooking: SessionBooking = {
      id: bookingId,
      requesterId,
      helperId,
      skillName,
      skillCategory: skillCategory || 'General',
      description: description || `Peer session for ${skillName}`,
      scheduledAt,
      durationMinutes: creditAmount,
      creditAmount,
      status: 'CONFIRMED',
      escrowEntryId: escrowEntry.id,
      topicsChecked: [],
      requesterSignedOff: false,
      helperSignedOff: false,
      createdAt: new Date().toISOString(),
    };

    storage.bookings.set(bookingId, newBooking);
    storage.persist();

    res.status(201).json(newBooking);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Collaborative workspace update (notes and topic checkboxes)
app.put('/api/bookings/:id/workspace', (req: Request, res: Response) => {
  const booking = storage.bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { meetingNotes, topicsChecked } = req.body;
  if (meetingNotes !== undefined) booking.meetingNotes = meetingNotes;
  if (topicsChecked !== undefined) booking.topicsChecked = topicsChecked;

  storage.persist();
  res.json(booking);
});

// Mutual session sign-off & credit payout
app.put('/api/bookings/:id/sign-off', (req: Request, res: Response) => {
  const booking = storage.bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS') {
    if (booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Session is already completed' });
    }
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot sign off on a cancelled session' });
    }
    if (booking.status === 'DISPUTED') {
      return res.status(400).json({
        error: 'Cannot sign off on a session under dispute. Please resolve through mediation.',
      });
    }
    return res.status(400).json({ error: `Cannot sign off on session with status: ${booking.status}` });
  }

  const { userId, signOff } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (userId === booking.requesterId) {
    booking.requesterSignedOff = !!signOff;
  } else if (userId === booking.helperId) {
    booking.helperSignedOff = !!signOff;
  } else {
    return res.status(403).json({ error: 'User is not part of this session' });
  }

  // Check if both signed off OR requester confirmed completion
  if (booking.requesterSignedOff && (booking.helperSignedOff || userId === booking.requesterId)) {
    const requester = storage.users.get(booking.requesterId);
    const helper = storage.users.get(booking.helperId);

    if (requester && helper && booking.status !== 'COMPLETED') {
      // Release escrow to helper
      const releaseEntry = storage.ledger.releaseEscrow(
        requester,
        helper,
        booking.creditAmount,
        booking.id,
        booking.skillName
      );

      booking.status = 'COMPLETED';
      booking.completionEntryId = releaseEntry.id;
      booking.completedAt = new Date().toISOString();

      requester.completedSessions += 1;
      helper.completedSessions += 1;
    }
  }

  storage.persist();
  res.json(booking);
});

// ==========================================
// 6. Cancellation Engine API
// ==========================================

app.post('/api/bookings/:id/cancel', (req: Request, res: Response) => {
  const booking = storage.bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { cancelledByUserId, reason } = req.body;
  if (!cancelledByUserId || !reason) {
    return res.status(400).json({ error: 'cancelledByUserId and reason are required' });
  }

  const requester = storage.users.get(booking.requesterId);
  const helper = storage.users.get(booking.helperId);

  if (!requester || !helper) {
    return res.status(404).json({ error: 'Session participants not found' });
  }

  try {
    const result = CancellationEngine.handleCancellation(
      booking,
      cancelledByUserId,
      reason,
      requester,
      helper,
      storage.ledger
    );

    storage.persist();
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. Dispute System & Mediation API
// ==========================================

app.get('/api/disputes', (req: Request, res: Response) => {
  const disputesList = Array.from(storage.disputes.values());
  res.json(disputesList.reverse());
});

app.post('/api/disputes', (req: Request, res: Response) => {
  const { sessionId, raisedByUserId, reason, description, evidenceNotes, actualMinutesAttended } = req.body;

  if (!sessionId || !raisedByUserId || !reason || !description) {
    return res.status(400).json({ error: 'Missing required dispute fields' });
  }

  const booking = storage.bookings.get(sessionId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  try {
    const dispute = DisputeEngine.fileDispute(
      booking,
      raisedByUserId,
      reason,
      description,
      evidenceNotes || '',
      Number(actualMinutesAttended) || 0
    );

    storage.disputes.set(dispute.id, dispute);
    storage.persist();

    res.status(201).json(dispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/disputes/:id/resolve', (req: Request, res: Response) => {
  const dispute = storage.disputes.get(req.params.id);
  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const booking = storage.bookings.get(dispute.sessionId);
  if (!booking) {
    return res.status(404).json({ error: 'Associated booking not found' });
  }

  const requester = storage.users.get(booking.requesterId);
  const helper = storage.users.get(booking.helperId);

  if (!requester || !helper) {
    return res.status(404).json({ error: 'Session participants not found' });
  }

  const { resolution, resolutionNotes, resolvedBy } = req.body;
  if (!resolution || !resolutionNotes) {
    return res.status(400).json({ error: 'resolution and resolutionNotes are required' });
  }

  try {
    const resolvedDispute = DisputeEngine.resolveDispute(
      dispute,
      booking,
      requester,
      helper,
      resolution,
      resolutionNotes,
      resolvedBy || 'Campus Mediator',
      storage.ledger
    );

    storage.persist();
    res.json(resolvedDispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. Reputation & Reviews
// ==========================================

app.get('/api/reviews', (req: Request, res: Response) => {
  const { sessionId, reviewerId, revieweeId } = req.query;
  let list = [...storage.reviews];
  if (sessionId) list = list.filter((r) => r.sessionId === sessionId);
  if (reviewerId) list = list.filter((r) => r.reviewerId === reviewerId);
  if (revieweeId) list = list.filter((r) => r.revieweeId === revieweeId);
  res.json(list.reverse());
});

app.get('/api/reviews/:userId', (req: Request, res: Response) => {
  const userReviews = storage.reviews.filter((r) => r.revieweeId === req.params.userId);
  res.json([...userReviews].reverse());
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const { sessionId, reviewerId, revieweeId, rating, punctualityRating, helpfulnessRating, comment } = req.body;

  if (!sessionId || !reviewerId || !revieweeId || rating === undefined) {
    return res.status(400).json({ error: 'Missing required review fields' });
  }

  const booking = storage.bookings.get(sessionId);
  if (booking) {
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed sessions' });
    }
    if (reviewerId !== booking.requesterId && reviewerId !== booking.helperId) {
      return res.status(403).json({ error: 'Only participants of this session can submit reviews' });
    }
    const expectedReviewee = reviewerId === booking.requesterId ? booking.helperId : booking.requesterId;
    if (revieweeId !== expectedReviewee) {
      return res.status(400).json({ error: 'Invalid reviewee for this session' });
    }
  }

  const alreadyReviewed = storage.reviews.some(
    (r) => r.sessionId === sessionId && r.reviewerId === reviewerId
  );
  if (alreadyReviewed) {
    return res.status(409).json({ error: 'You have already reviewed this session' });
  }

  const numericRating = Math.min(5, Math.max(1, Math.round(Number(rating))));
  const numPunctuality = Math.min(5, Math.max(1, Math.round(Number(punctualityRating || rating))));
  const numHelpfulness = Math.min(5, Math.max(1, Math.round(Number(helpfulnessRating || rating))));

  const review = {
    id: `rev_${Date.now()}`,
    sessionId,
    reviewerId,
    revieweeId,
    rating: numericRating,
    punctualityRating: numPunctuality,
    helpfulnessRating: numHelpfulness,
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };

  storage.reviews.push(review);

  // Recalculate reviewee average rating
  const reviewee = storage.users.get(revieweeId);
  if (reviewee) {
    const allReviews = storage.reviews.filter((r) => r.revieweeId === revieweeId);
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    reviewee.rating = Number((sum / allReviews.length).toFixed(1));
    reviewee.reviewCount = allReviews.length;
  }

  storage.persist();
  res.status(201).json(review);
});

// ==========================================
// 8.5 Learning Goals, Study Plans, Teamwork Pods & Skill Boosts
// ==========================================

// Goals (/goal)
app.get('/api/goals', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  let list = storage.goals;
  if (userId) {
    list = list.filter((g) => g.userId === userId);
  }
  res.json(list);
});

app.post('/api/goals', (req: Request, res: Response) => {
  const { userId, title, category, targetMinutes, targetDate, linkedSkill } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title are required' });
  }
  const user = storage.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const goal = LearningEngine.createGoal(userId, title, category, targetMinutes, targetDate, linkedSkill);
  storage.goals.push(goal);
  storage.persist();
  res.status(201).json(goal);
});

app.patch('/api/goals/:id/progress', (req: Request, res: Response) => {
  const goal = storage.goals.find((g) => g.id === req.params.id);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found' });
  }
  const minutes = Number(req.body.minutes) || 0;
  LearningEngine.addGoalProgress(goal, minutes);
  storage.persist();
  res.json(goal);
});

// Study Plans (/plan)
app.get('/api/plans', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  let list = storage.studyPlans;
  if (userId) {
    list = list.filter((p) => p.userId === userId);
  }
  res.json(list);
});

app.post('/api/plans/generate', (req: Request, res: Response) => {
  const { userId, skillName } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const user = storage.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const plan = LearningEngine.generateStudyPlan(user, skillName);
  storage.studyPlans.push(plan);
  storage.persist();
  res.status(201).json(plan);
});

// Teamwork Pods (/teamwork-preview)
app.get('/api/pods', (req: Request, res: Response) => {
  res.json(storage.teamworkPods);
});

app.post('/api/pods', (req: Request, res: Response) => {
  const { title, topic, description, category, scheduledAt, durationMinutes, maxParticipants, creatorId } = req.body;
  if (!title || !topic || !creatorId) {
    return res.status(400).json({ error: 'title, topic, and creatorId are required' });
  }
  const creator = storage.users.get(creatorId);
  if (!creator) {
    return res.status(404).json({ error: 'Creator user not found' });
  }

  const pod = LearningEngine.createTeamworkPod(
    title,
    topic,
    description,
    category,
    scheduledAt,
    durationMinutes,
    maxParticipants,
    creator
  );
  storage.teamworkPods.push(pod);
  storage.persist();
  res.status(201).json(pod);
});

app.post('/api/pods/:id/join', (req: Request, res: Response) => {
  const pod = storage.teamworkPods.find((p) => p.id === req.params.id);
  if (!pod) {
    return res.status(404).json({ error: 'Pod not found' });
  }
  const { userId, role } = req.body;
  const user = storage.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    LearningEngine.joinTeamworkPod(pod, user, role);
    storage.persist();
    res.json(pod);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Skill Boosts (/boost)
app.get('/api/boosts', (req: Request, res: Response) => {
  res.json(storage.boosts);
});

app.post('/api/boosts/toggle', (req: Request, res: Response) => {
  const { userId, skillName, type } = req.body;
  if (!userId || !skillName) {
    return res.status(400).json({ error: 'userId and skillName are required' });
  }
  const user = storage.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { boosts, activeBoost } = LearningEngine.toggleBoost(storage.boosts, userId, skillName, type || 'OFFERED');
  storage.boosts = boosts;
  storage.persist();
  res.json({ success: true, activeBoost, allBoosts: storage.boosts });
});

// ==========================================
// 9. Static Frontend Serving (Production build)
// ==========================================

const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`TimeBank core server running at http://localhost:${PORT}`);
  console.log(`Cryptographic transaction ledger initialized with genesis hash.`);
});
