import React, { useState, useEffect } from 'react';
import { User, SkillMatchRecommendation, CircularTradeCycle } from '../types';
import {
  Sparkles,
  Repeat,
  Calendar,
  CheckCircle,
  Star,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { CircularTradeVisualizer } from './CircularTradeVisualizer';
import { ReputationBadges } from './ReputationBadges';
import { audioEngine } from '../utils/audio';

interface SmartMatchTabProps {
  currentUser: User;
  allUsers?: User[];
  onBookSession: (
    helperId: string,
    skillName: string,
    skillCategory: string,
    durationMinutes: number,
    scheduledAt: string,
    description: string
  ) => Promise<void>;
}

export const SmartMatchTab: React.FC<SmartMatchTabProps> = ({
  currentUser,
  allUsers = [],
  onBookSession,
}) => {
  const [recommendations, setRecommendations] = useState<SkillMatchRecommendation[]>([]);
  const [circularTrades, setCircularTrades] = useState<CircularTradeCycle[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modal state
  const [selectedRec, setSelectedRec] = useState<SkillMatchRecommendation | null>(null);
  const [bookingDuration, setBookingDuration] = useState<number>(30);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('15:00');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [currentUser.id]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const [recsRes, cyclesRes] = await Promise.all([
        fetch(`/api/matching/recommendations/${currentUser.id}`),
        fetch('/api/matching/circular-trades'),
      ]);

      if (recsRes.ok) {
        const recs = await recsRes.json();
        setRecommendations(recs);
      }
      if (cyclesRes.ok) {
        const cycles = await cyclesRes.json();
        setCircularTrades(cycles);
      }
    } catch (err) {
      console.error('Failed to load matching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (rec: SkillMatchRecommendation) => {
    setSelectedRec(rec);
    setBookingError(null);
    // Set tomorrow's date by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    setBookingNotes(`Hi ${rec.user.name}, I'd love your help with ${rec.matchedSkillOffered.name}!`);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec || !bookingDate || !bookingTime) return;

    if (currentUser.credits.availableBalance < bookingDuration) {
      setBookingError(
        `Insufficient balance. You need ${bookingDuration} time credits, but have ${currentUser.credits.availableBalance} available.`
      );
      return;
    }

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const scheduledDateTime = new Date(`${bookingDate}T${bookingTime}:00`).toISOString();
      await onBookSession(
        selectedRec.user.id,
        selectedRec.matchedSkillOffered.name,
        selectedRec.matchedSkillOffered.category,
        bookingDuration,
        scheduledDateTime,
        bookingNotes
      );
      audioEngine.playSessionChime();
      setSelectedRec(null);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book session');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Algorithmic Matching Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Smart Peer Matches & Circular Trades
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
          TimeBank continuously evaluates your skill needs, availability schedules, and peer reputation scores to find the highest-compatibility exchanges.
        </p>
      </div>

      {/* Circular Economy Trade Network Banner */}
      {circularTrades.length > 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Repeat className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
            <h2 className="text-lg font-bold text-white">Multi-Way Circular Time Trades Detected</h2>
          </div>
          <p className="text-xs text-slate-300 mb-6 max-w-3xl leading-relaxed">
            Unlike traditional barter where two students must want each other&apos;s exact skill, TimeBank allows 3-way or multi-way time loops. Nobody pays money, everyone learns! Below, simulate the multi-party exchange and verify the zero net credit drift.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {circularTrades.slice(0, 2).map((item, idx) => (
              <CircularTradeVisualizer
                key={idx}
                cycleData={item}
                cycleIndex={idx}
                allUsers={allUsers}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <span>Top Matches for You</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {recommendations.length} available
          </span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Calculating compatibility scores across time slots & skills...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-800/30 border border-slate-700/60 text-center">
            <p className="text-slate-300 font-medium">No direct matches found for your current skill list.</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adding more skills you want to learn in your Dashboard, or browse the general marketplace!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Match Score */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={rec.user.avatar}
                        alt={rec.user.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                      />
                      <div>
                        <h3 className="font-bold text-white text-base">{rec.user.name}</h3>
                        <p className="text-xs text-slate-400">
                          {rec.user.major} • {rec.user.university}
                        </p>
                        <div className="mt-1.5">
                          <ReputationBadges user={rec.user} mode="chips" />
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{rec.compatibilityScore}% Match</span>
                      </div>
                      {rec.matchType === 'DIRECT_EXCHANGE' && (
                        <span className="block text-[10px] text-teal-400 font-bold tracking-wider mt-1 uppercase">
                          ⚡ Direct 1:1 Barter
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills Offered & Direct Bilateral Trade highlight */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Will teach you:</span>
                      <span className="font-bold text-emerald-300">{rec.matchedSkillOffered.name}</span>
                    </div>
                    {rec.matchedSkillNeeded && (
                      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800">
                        <span className="text-slate-400">Wants to learn from you:</span>
                        <span className="font-bold text-teal-300">{rec.matchedSkillNeeded.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Reasons list */}
                  <div className="mt-4 space-y-1.5">
                    {rec.reasons.map((reason, rIdx) => (
                      <div key={rIdx} className="flex items-center space-x-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Common Availability */}
                  {rec.commonAvailability.length > 0 && (
                    <div className="mt-4 text-xs text-slate-400 flex items-start space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>Matching windows: {rec.commonAvailability.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{rec.user.rating.toFixed(1)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>{rec.user.reliabilityScore}% reliability</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(rec)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md"
                  >
                    <span>Request Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedRec && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Book Time with {selectedRec.user.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Topic: <span className="text-emerald-400 font-semibold">{selectedRec.matchedSkillOffered.name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRec(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Escrow Explanation Notice */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
              <span className="font-bold">🔒 Escrow Protection:</span> When you book this session, {bookingDuration} time credits will be held safely in escrow. They are only released to {selectedRec.user.name} once the session concludes and you both sign off.
            </div>

            {bookingError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Duration Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setBookingDuration(dur)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        bookingDuration === dur
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {dur} mins ({dur} cr)
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Goal / Notes</label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Balance Summary */}
              <div className="p-3 rounded-lg bg-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                <span>Your available balance:</span>
                <span className="font-bold text-white">{currentUser.credits.availableBalance} credits</span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRec(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                >
                  {bookingSubmitting ? 'Locking Escrow...' : `Confirm & Lock ${bookingDuration} Credits`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
