import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TimeBankStorage } from './storage.js';
import { MatchingEngine } from './matching.js';
import { CancellationEngine } from './cancellation.js';
import { DisputeEngine } from './disputes.js';
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

app.post('/api/users', (req: Request, res: Response) => {
  const { name, email, avatar, bio, university, major, skillsOffered, skillsNeeded } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
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

  res.json({
    chain: entries.reverse(), // latest first
    integrity,
    metrics: {
      totalMintedMinutes: totalMinted,
      totalActiveEscrowMinutes: totalInEscrow,
      totalTransactionsCount: entries.length,
      genesisHash: entries[0]?.hash,
      latestHash: entries[entries.length - 1]?.hash,
    },
  });
});

app.get('/api/ledger/user/:id', (req: Request, res: Response) => {
  const entries = storage.ledger.getEntriesForUser(req.params.id);
  res.json(entries.reverse());
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
    storage.availability
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

  if (requester.credits.availableBalance < creditAmount) {
    return res.status(400).json({
      error: `Insufficient time credits. You have ${requester.credits.availableBalance} credits available, but this session requires ${creditAmount} credits. Complete a session to earn more time credits!`,
    });
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

  if (booking.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Session is already completed' });
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

app.get('/api/reviews/:userId', (req: Request, res: Response) => {
  const userReviews = storage.reviews.filter((r) => r.revieweeId === req.params.userId);
  res.json(userReviews.reverse());
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const { sessionId, reviewerId, revieweeId, rating, punctualityRating, helpfulnessRating, comment } = req.body;

  if (!sessionId || !reviewerId || !revieweeId || !rating) {
    return res.status(400).json({ error: 'Missing required review fields' });
  }

  const review = {
    id: `rev_${Date.now()}`,
    sessionId,
    reviewerId,
    revieweeId,
    rating: Number(rating),
    punctualityRating: Number(punctualityRating || rating),
    helpfulnessRating: Number(helpfulnessRating || rating),
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
