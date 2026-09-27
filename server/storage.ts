import fs from 'fs';
import path from 'path';
import {
  User,
  AvailabilitySlot,
  SessionBooking,
  Dispute,
  Review,
  LedgerEntry,
} from './types.js';
import { TransactionLedger } from './ledger.js';

interface StorageData {
  users: User[];
  availability: AvailabilitySlot[];
  bookings: SessionBooking[];
  disputes: Dispute[];
  reviews: Review[];
  ledgerChain: LedgerEntry[];
}

export class TimeBankStorage {
  private dataFilePath: string;
  public users: Map<string, User> = new Map();
  public availability: AvailabilitySlot[] = [];
  public bookings: Map<string, SessionBooking> = new Map();
  public disputes: Map<string, Dispute> = new Map();
  public reviews: Review[] = [];
  public ledger: TransactionLedger;

  constructor(filePath?: string) {
    this.dataFilePath =
      filePath || path.resolve(process.cwd(), 'data', 'timebank_store.json');
    this.ledger = new TransactionLedger();
    this.loadOrCreateData();
  }

  private loadOrCreateData(): void {
    const dir = path.dirname(this.dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const data: StorageData = JSON.parse(raw);
        this.users = new Map(data.users.map((u) => [u.id, u]));
        this.availability = data.availability || [];
        this.bookings = new Map(data.bookings.map((b) => [b.id, b]));
        this.disputes = new Map(data.disputes.map((d) => [d.id, d]));
        this.reviews = data.reviews || [];
        this.ledger = new TransactionLedger(data.ledgerChain);
        return;
      } catch (err) {
        console.error('Failed to load existing storage data, re-seeding:', err);
      }
    }

    // Initialize with fresh seed data
    this.seedDefaultData();
    this.persist();
  }

  private isPersisting = false;
  private pendingPersist = false;

  public removeAvailability(id: string): boolean {
    const idx = this.availability.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.availability.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  public persist(): void {
    if (this.isPersisting) {
      this.pendingPersist = true;
      return;
    }

    this.isPersisting = true;
    try {
      do {
        this.pendingPersist = false;
        const data: StorageData = {
          users: Array.from(this.users.values()),
          availability: this.availability,
          bookings: Array.from(this.bookings.values()),
          disputes: Array.from(this.disputes.values()),
          reviews: this.reviews,
          ledgerChain: this.ledger.getEntries(),
        };

        const uniqueTmp = `${this.dataFilePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
        fs.writeFileSync(uniqueTmp, JSON.stringify(data, null, 2), 'utf-8');
        try {
          fs.renameSync(uniqueTmp, this.dataFilePath);
        } catch {
          // Fallback for Windows file locking
          fs.copyFileSync(uniqueTmp, this.dataFilePath);
          fs.unlinkSync(uniqueTmp);
        }
      } while (this.pendingPersist);
    } finally {
      this.isPersisting = false;
    }
  }

  private seedDefaultData(): void {
    // 1. Create Aryan (+60 credits, Java + PPT expert, wants English Speaking)
    const aryan: User = {
      id: 'usr_aryan',
      name: 'Aryan Sharma',
      email: 'aryan@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      bio: 'CS Sophomore @ Tech Institute. Passionate about Java systems, concurrency, and creating crisp pitch deck slides.',
      university: 'State University of Tech',
      major: 'Computer Science',
      credits: {
        availableBalance: 0,
        escrowBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      },
      skillsOffered: [
        {
          id: 'sk_1',
          name: 'Java Debugging',
          category: 'Tech',
          proficiency: 'Advanced',
          description: 'OOP, Streams, Spring Boot basics, memory leak debugging, bug fixing.',
          endorsements: 14,
        },
        {
          id: 'sk_2',
          name: 'PPT Design',
          category: 'Design',
          proficiency: 'Expert',
          description: 'Modern deck styling, clean typography, executive pitch presentations.',
          endorsements: 19,
        },
      ],
      skillsNeeded: [
        {
          id: 'sk_3',
          name: 'English Speaking Practice',
          category: 'Languages',
          proficiency: 'Intermediate',
          description: 'Conversational fluency and technical interview speaking drills.',
        },
      ],
      reliabilityScore: 98,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      role: 'student',
    };

    // 2. Create Priya (English speaking coach, wants Java & Python)
    const priya: User = {
      id: 'usr_priya',
      name: 'Priya Patel',
      email: 'priya@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      bio: 'Literature & Linguistics Senior. Debating club captain. Happy to help peers with English fluency and resume wording.',
      university: 'National Arts & Science College',
      major: 'Linguistics & English',
      credits: {
        availableBalance: 0,
        escrowBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      },
      skillsOffered: [
        {
          id: 'sk_4',
          name: 'English Speaking Practice',
          category: 'Languages',
          proficiency: 'Expert',
          description: 'Accent neutralization, confident presentation speech, viva prep.',
          endorsements: 22,
        },
        {
          id: 'sk_5',
          name: 'Resume Review',
          category: 'Career',
          proficiency: 'Advanced',
          description: 'ATS optimization, impactful action verbs, cover letter polish.',
          endorsements: 11,
        },
      ],
      skillsNeeded: [
        {
          id: 'sk_6',
          name: 'Java Debugging',
          category: 'Tech',
          proficiency: 'Beginner',
          description: 'Need help understanding object inheritance and Collections framework for CS101.',
        },
        {
          id: 'sk_6b',
          name: 'Python & Machine Learning',
          category: 'Tech',
          proficiency: 'Beginner',
          description: 'Need help learning Python data analysis for computational linguistics.',
        },
      ],
      reliabilityScore: 100,
      rating: 5.0,
      reviewCount: 1,
      completedSessions: 1,
      disputeCount: 0,
      joinedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      role: 'student',
    };

    // 3. Create Marcus (Python & ML, wants PPT Design)
    const marcus: User = {
      id: 'usr_marcus',
      name: 'Marcus Chen',
      email: 'marcus@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Data Science junior. Machine learning algorithms, pandas, pytorch. Terrible at designing slides!',
      university: 'State University of Tech',
      major: 'Data Science',
      credits: {
        availableBalance: 0,
        escrowBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      },
      skillsOffered: [
        {
          id: 'sk_7',
          name: 'Python & Machine Learning',
          category: 'Tech',
          proficiency: 'Advanced',
          description: 'Pandas, NumPy, Scikit-Learn pipelines, exploratory data analysis.',
          endorsements: 17,
        },
      ],
      skillsNeeded: [
        {
          id: 'sk_8',
          name: 'PPT Design',
          category: 'Design',
          proficiency: 'Beginner',
          description: 'Need help making my capstone ML project slides look sleek and visual.',
        },
      ],
      reliabilityScore: 94,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 1,
      disputeCount: 0,
      joinedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      role: 'student',
    };

    // 4. Create Elena (UI/UX & Figma, wants Calculus)
    const elena: User = {
      id: 'usr_elena',
      name: 'Elena Rostova',
      email: 'elena@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Design student & freelance product designer. Figma components, auto-layout, wireframing.',
      university: 'Design Academy',
      major: 'Interaction Design',
      credits: {
        availableBalance: 0,
        escrowBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      },
      skillsOffered: [
        {
          id: 'sk_9',
          name: 'UI/UX & Figma Design',
          category: 'Design',
          proficiency: 'Expert',
          description: 'Figma prototypes, design systems, UI heuristics, usability critique.',
          endorsements: 29,
        },
      ],
      skillsNeeded: [
        {
          id: 'sk_10',
          name: 'Calculus & Math',
          category: 'Academics',
          proficiency: 'Beginner',
          description: 'Multivariable calculus integration and linear algebra review.',
        },
      ],
      reliabilityScore: 97,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      role: 'student',
    };

    // 5. Create Kenji (Japanese & Algorithms, wants Web Development)
    const kenji: User = {
      id: 'usr_kenji',
      name: 'Kenji Takahashi',
      email: 'kenji@campus.edu',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Exchange student. Japanese JLPT N1 native tutor. Data structures & dynamic programming enthusiast.',
      university: 'State University of Tech',
      major: 'Software Engineering',
      credits: {
        availableBalance: 0,
        escrowBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      },
      skillsOffered: [
        {
          id: 'sk_11',
          name: 'Japanese Language',
          category: 'Languages',
          proficiency: 'Expert',
          description: 'Conversational Japanese, Kanji fundamentals, JLPT exam prep.',
          endorsements: 12,
        },
        {
          id: 'sk_12',
          name: 'Algorithms & LeetCode',
          category: 'Tech',
          proficiency: 'Advanced',
          description: 'Graph algorithms, dynamic programming, technical interview mocks.',
          endorsements: 15,
        },
      ],
      skillsNeeded: [
        {
          id: 'sk_13',
          name: 'Web Development & React',
          category: 'Tech',
          proficiency: 'Intermediate',
          description: 'Modern front-end state management and CSS layout tips.',
        },
      ],
      reliabilityScore: 96,
      rating: 5.0,
      reviewCount: 0,
      completedSessions: 0,
      disputeCount: 0,
      joinedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      role: 'student',
    };

    // 6. Admin user
    const admin: User = {
      id: 'usr_admin',
      name: 'Campus TimeBank Mediator',
      email: 'admin@timebank.campus.edu',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'TimeBank community mediator and transaction ledger auditor.',
      credits: {
        availableBalance: 0,
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
      joinedAt: new Date(Date.now() - 100 * 86400000).toISOString(),
      role: 'admin',
    };

    this.users.set(aryan.id, aryan);
    this.users.set(priya.id, priya);
    this.users.set(marcus.id, marcus);
    this.users.set(elena.id, elena);
    this.users.set(kenji.id, kenji);
    this.users.set(admin.id, admin);

    // Initial Ledger entries for minted time credits (60 min each)
    this.ledger.grantSignupBonus(aryan, 60);
    this.ledger.grantSignupBonus(priya, 60);
    this.ledger.grantSignupBonus(marcus, 60);
    this.ledger.grantSignupBonus(elena, 60);
    this.ledger.grantSignupBonus(kenji, 60);

    // 2. Availability Slots
    this.availability = [
      // Aryan: Mon, Wed, Fri afternoons
      { id: 'av_1', userId: 'usr_aryan', dayOfWeek: 1, startTime: '14:00', endTime: '18:00', isRecurring: true },
      { id: 'av_2', userId: 'usr_aryan', dayOfWeek: 3, startTime: '15:00', endTime: '19:00', isRecurring: true },
      { id: 'av_3', userId: 'usr_aryan', dayOfWeek: 5, startTime: '10:00', endTime: '14:00', isRecurring: true },

      // Priya: Tue, Thu, Mon (overlaps with Aryan!)
      { id: 'av_4', userId: 'usr_priya', dayOfWeek: 2, startTime: '11:00', endTime: '16:00', isRecurring: true },
      { id: 'av_5', userId: 'usr_priya', dayOfWeek: 4, startTime: '11:00', endTime: '16:00', isRecurring: true },
      { id: 'av_6', userId: 'usr_priya', dayOfWeek: 1, startTime: '14:00', endTime: '17:00', isRecurring: true },

      // Marcus: Wed, Thu
      { id: 'av_7', userId: 'usr_marcus', dayOfWeek: 3, startTime: '16:00', endTime: '20:00', isRecurring: true },
      { id: 'av_8', userId: 'usr_marcus', dayOfWeek: 4, startTime: '14:00', endTime: '18:00', isRecurring: true },

      // Elena: Mon, Fri
      { id: 'av_9', userId: 'usr_elena', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', isRecurring: true },
      { id: 'av_10', userId: 'usr_elena', dayOfWeek: 5, startTime: '11:00', endTime: '15:00', isRecurring: true },

      // Kenji: Tue, Sat
      { id: 'av_11', userId: 'usr_kenji', dayOfWeek: 2, startTime: '10:00', endTime: '15:00', isRecurring: true },
      { id: 'av_12', userId: 'usr_kenji', dayOfWeek: 6, startTime: '13:00', endTime: '18:00', isRecurring: true },
    ];

    // 3. Sample Completed Session (Priya helped Marcus with English resume review -> 30 min)
    const booking1Id = 'bk_sample_1';
    const booking1: SessionBooking = {
      id: booking1Id,
      requesterId: 'usr_marcus',
      helperId: 'usr_priya',
      skillName: 'Resume Review',
      skillCategory: 'Career',
      description: 'Review my data scientist resume bullet points and fix grammar.',
      scheduledAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      durationMinutes: 30,
      creditAmount: 30,
      status: 'COMPLETED',
      meetingNotes: 'Fixed action verbs for XGBoost project and restructured education section.',
      topicsChecked: ['ATS layout check', 'Action verbs quantification', 'Summary review'],
      requesterSignedOff: true,
      helperSignedOff: true,
      createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 47 * 3600000).toISOString(),
    };
    this.bookings.set(booking1.id, booking1);

    // Ledger for booking1
    this.ledger.lockEscrow(marcus, 30, booking1Id, 'Resume Review');
    this.ledger.releaseEscrow(marcus, priya, 30, booking1Id, 'Resume Review');

    // 4. Sample Upcoming Session (Aryan helping Marcus with PPT Design -> 30 min)
    const booking2Id = 'bk_sample_2';
    const futureDate = new Date(Date.now() + 24 * 3600000).toISOString();
    const booking2: SessionBooking = {
      id: booking2Id,
      requesterId: 'usr_marcus',
      helperId: 'usr_aryan',
      skillName: 'PPT Design',
      skillCategory: 'Design',
      description: 'Help formatting my machine learning capstone pitch presentation.',
      scheduledAt: futureDate,
      durationMinutes: 30,
      creditAmount: 30,
      status: 'CONFIRMED',
      topicsChecked: [],
      createdAt: new Date().toISOString(),
    };
    this.bookings.set(booking2.id, booking2);
    this.ledger.lockEscrow(marcus, 30, booking2Id, 'PPT Design');

    // 5. Sample Dispute (Demonstrates dispute engine & resolution workflow)
    const disputeBookingId = 'bk_sample_disputed';
    const disputeSession: SessionBooking = {
      id: disputeBookingId,
      requesterId: 'usr_elena',
      helperId: 'usr_kenji',
      skillName: 'Japanese Language',
      skillCategory: 'Languages',
      description: 'Beginner Hiragana & Travel Japanese pronunciation.',
      scheduledAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      durationMinutes: 30,
      creditAmount: 30,
      status: 'DISPUTED',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    };
    this.bookings.set(disputeSession.id, disputeSession);
    this.ledger.lockEscrow(elena, 30, disputeBookingId, 'Japanese Language');

    const sampleDispute: Dispute = {
      id: 'disp_sample_1',
      sessionId: disputeBookingId,
      raisedByUserId: 'usr_elena',
      againstUserId: 'usr_kenji',
      reason: 'TECHNICAL_ISSUES',
      description: 'Audio dropped out completely 10 minutes in and helper was unable to reconnect.',
      evidenceNotes: 'Tried reconnecting for 15 minutes, chat logs indicate persistent microphone failure.',
      actualMinutesAttended: 10,
      status: 'OPEN',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    };
    this.disputes.set(sampleDispute.id, sampleDispute);
    disputeSession.disputeId = sampleDispute.id;

    // 6. Sample Reviews
    this.reviews.push({
      id: 'rev_1',
      sessionId: booking1Id,
      reviewerId: 'usr_marcus',
      revieweeId: 'usr_priya',
      rating: 5,
      punctualityRating: 5,
      helpfulnessRating: 5,
      comment: 'Priya transformed my resume in exactly 30 minutes! Highly professional and articulate.',
      createdAt: new Date(Date.now() - 46 * 3600000).toISOString(),
    });
  }
}
