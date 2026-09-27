import React, { useState } from 'react';
import { User, SkillItem, AvailabilitySlot, Review } from '../types';
import { Search, Star, ShieldCheck, Clock, ArrowRight, UserPlus, Filter, Calendar, MessageSquare } from 'lucide-react';
import { ReputationBadges } from './ReputationBadges';
import { audioEngine } from '../utils/audio';

interface MarketplaceTabProps {
  currentUser: User;
  allUsers: User[];
  onBookSession: (
    helperId: string,
    skillName: string,
    skillCategory: string,
    durationMinutes: number,
    scheduledAt: string,
    description: string
  ) => Promise<void>;
}

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({
  currentUser,
  allUsers,
  onBookSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minRating, setMinRating] = useState<number>(0);

  // Booking Modal
  const [targetHelper, setTargetHelper] = useState<User | null>(null);
  const [targetSkill, setTargetSkill] = useState<SkillItem | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('16:00');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetAvailability, setTargetAvailability] = useState<AvailabilitySlot[]>([]);
  const [targetReviews, setTargetReviews] = useState<Review[]>([]);

  // Flatten all offered skills
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id && u.role !== 'admin');

  const allSkillsList: Array<{ user: User; skill: SkillItem }> = [];
  otherUsers.forEach((u) => {
    u.skillsOffered.forEach((s) => {
      allSkillsList.push({ user: u, skill: s });
    });
  });

  const filteredSkills = allSkillsList.filter(({ user, skill }) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.description && skill.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || skill.category === selectedCategory;

    const matchesRating = user.rating >= minRating;

    return matchesSearch && matchesCategory && matchesRating;
  });

  const handleOpenBooking = async (user: User, skill: SkillItem) => {
    setTargetHelper(user);
    setTargetSkill(skill);
    setErrorMsg(null);
    setTargetAvailability([]);
    setTargetReviews([]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    setBookingNotes(`Hi ${user.name}, I would love ${duration} minutes of your time on ${skill.name}.`);

    try {
      const [availRes, revRes] = await Promise.all([
        fetch(`/api/availability/${user.id}`),
        fetch(`/api/reviews/${user.id}`),
      ]);
      if (availRes.ok) {
        setTargetAvailability(await availRes.json());
      }
      if (revRes.ok) {
        setTargetReviews(await revRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHelper || !targetSkill || !bookingDate || !bookingTime) return;

    if (currentUser.credits.availableBalance < duration) {
      setErrorMsg(
        `Insufficient balance. You need ${duration} time credits, but have ${currentUser.credits.availableBalance} available.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const scheduledDateTime = new Date(`${bookingDate}T${bookingTime}:00`).toISOString();
      await onBookSession(
        targetHelper.id,
        targetSkill.name,
        targetSkill.category,
        duration,
        scheduledDateTime,
        bookingNotes
      );
      setTargetHelper(null);
      setTargetSkill(null);
      audioEngine.playSessionChime();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to book session');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['All', 'Tech', 'Design', 'Languages', 'Career', 'Academics'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Explore Student Skill Marketplace
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Browse verified student mentors offering their time. Standard exchange rate: 1 minute = 1 time credit.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search skills (Java, PPT, Python, Figma...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Available Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map(({ user, skill }, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Category & Proficiency badges */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {skill.category}
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {skill.proficiency || 'Advanced'}
                </span>
              </div>

              {/* Skill Title */}
              <h3 className="text-lg font-bold text-white mb-1">{skill.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                {skill.description || 'Comprehensive peer guidance and practical hands-on exercises.'}
              </p>

              {/* Helper Profile snippet */}
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{user.name}</h4>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center space-x-0.5 text-yellow-400 font-semibold">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      <span>{user.rating.toFixed(1)}</span>
                    </span>
                    <span>•</span>
                    <span className="text-blue-400">{user.reliabilityScore}% reliable</span>
                  </div>
                  <div className="mt-1">
                    <ReputationBadges user={user} mode="chips" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom action */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>30 min (30 cr)</span>
              </span>

              <button
                onClick={() => handleOpenBooking(user, skill)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-colors shadow"
              >
                <span>Request Time</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {targetHelper && targetSkill && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Book {targetSkill.name}</h3>
                <p className="text-xs text-slate-400">
                  With <span className="text-emerald-400 font-semibold">{targetHelper.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setTargetHelper(null);
                  setTargetSkill(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
              <span className="font-bold">🔒 Escrow Guarantee:</span> {duration} time credits will be held in escrow. They are credited to {targetHelper.name} only after you both complete and sign off.
            </div>

            {/* Tutor Availability Schedule */}
            {targetAvailability.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{targetHelper.name}'s Recurring Available Hours:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {targetAvailability.map((slot) => {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    return (
                      <span
                        key={slot.id}
                        className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700 text-[11px] font-mono"
                      >
                        {days[slot.dayOfWeek]} {slot.startTime}–{slot.endTime}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tutor Reviews Preview */}
            {targetReviews.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1.5">
                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                  <span>Recent Peer Reviews ({targetReviews.length}):</span>
                </span>
                <div className="space-y-1.5 pt-1 max-h-24 overflow-y-auto pr-1">
                  {targetReviews.slice(0, 2).map((rev) => (
                    <div key={rev.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-yellow-400 font-bold mb-0.5">
                        <span>★ {rev.rating}.0 / 5.0</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-300 italic truncate">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setDuration(dur)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        duration === dur
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {dur} mins ({dur} cr)
                    </button>
                  ))}
                </div>
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">What do you want to cover?</label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetHelper(null);
                    setTargetSkill(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                >
                  {submitting ? 'Locking...' : `Confirm & Lock ${duration} Credits`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
