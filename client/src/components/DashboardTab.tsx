import React, { useState, useEffect } from 'react';
import { User, SessionBooking, SkillItem, AvailabilitySlot } from '../types';
import {
  Clock,
  Award,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Plus,
  BookOpen,
  Briefcase,
  HelpCircle,
  TrendingUp,
  Trash2,
} from 'lucide-react';

interface DashboardTabProps {
  currentUser: User;
  onNavigateTab: (tab: string) => void;
  bookings: SessionBooking[];
  allUsers: User[];
  onAddSkill: (userId: string, type: 'offered' | 'needed', skill: SkillItem) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentUser,
  onNavigateTab,
  bookings,
  allUsers,
  onAddSkill,
}) => {
  const [showAddModal, setShowAddModal] = useState<'offered' | 'needed' | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<'Tech' | 'Design' | 'Academics' | 'Languages' | 'Career'>('Tech');
  const [newSkillProficiency, setNewSkillProficiency] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Intermediate');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  const [myAvailability, setMyAvailability] = useState<AvailabilitySlot[]>([]);
  const [showAddAvail, setShowAddAvail] = useState(false);
  const [availDay, setAvailDay] = useState<number>(1);
  const [availStart, setAvailStart] = useState('14:00');
  const [availEnd, setAvailEnd] = useState('17:00');

  useEffect(() => {
    fetchMyAvailability();
  }, [currentUser.id]);

  const fetchMyAvailability = async () => {
    try {
      const res = await fetch(`/api/availability/${currentUser.id}`);
      if (res.ok) {
        const slots = await res.json();
        setMyAvailability(slots);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          dayOfWeek: Number(availDay),
          startTime: availStart,
          endTime: availEnd,
          isRecurring: true,
        }),
      });
      if (res.ok) {
        setShowAddAvail(false);
        fetchMyAvailability();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/availability/${slotId}`, { method: 'DELETE' });
      if (res.ok) {
        setMyAvailability((prev) => prev.filter((s) => s.id !== slotId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const myUpcomingBookings = bookings.filter(
    (b) =>
      (b.requesterId === currentUser.id || b.helperId === currentUser.id) &&
      (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')
  );

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const skill: SkillItem = {
      id: `sk_${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
      description: newSkillDesc.trim(),
      endorsements: 0,
    };

    onAddSkill(currentUser.id, showAddModal!, skill);
    setShowAddModal(null);
    setNewSkillName('');
    setNewSkillDesc('');
  };

  return (
    <div className="space-y-8">
      {/* Hero Time-Credit Economy Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/40 p-6 md:p-8 border border-slate-700/60 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Time Economy — 1 Hour Given = 1 Hour Earned</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, {currentUser.name}!
          </h1>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Trade your knowledge directly with fellow students. No money, no fees — only pure peer-to-peer collaboration backed by an immutable time-credit ledger.
          </p>

          {/* Aryan Economy Example Visualizer */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-inner">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center space-x-1.5">
              <span>How your time circulates:</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
                <span className="text-xs font-medium text-emerald-400 block mb-1">1. Help a Peer</span>
                <span className="text-sm font-semibold text-white">Provide 30 min assistance</span>
                <span className="text-xs text-slate-400 block mt-1">(e.g. Java, PPT Design)</span>
              </div>
              <div className="p-3 rounded-lg bg-teal-950/40 border border-teal-500/20">
                <span className="text-xs font-medium text-teal-300 block mb-1">2. Earn Time Credits</span>
                <span className="text-sm font-semibold text-white">+30 credits to ledger</span>
                <span className="text-xs text-slate-400 block mt-1">(Locked in escrow until sign-off)</span>
              </div>
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/20">
                <span className="text-xs font-medium text-cyan-300 block mb-1">3. Get Help Back</span>
                <span className="text-sm font-semibold text-white">Spend 30 credits</span>
                <span className="text-xs text-slate-400 block mt-1">(e.g. English, Math, Resume)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('smart-match')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Find Smart Match</span>
            </button>
            <button
              onClick={() => onNavigateTab('marketplace')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center space-x-2 border border-slate-700 transition-all"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Credit & Reputation Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Available Credits</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              +{currentUser.credits.availableBalance}
              <span className="text-xs font-normal text-slate-400 ml-1">mins</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
              <span>Ready to spend on learning</span>
            </p>
          </div>
        </div>

        {/* In Escrow */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Locked in Escrow</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-400">
              {currentUser.credits.escrowBalance}
              <span className="text-xs font-normal text-slate-400 ml-1">mins</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending active session sign-off</p>
          </div>
        </div>

        {/* Time Given (Earned) */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Given</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-teal-400">
              {currentUser.credits.totalEarned}
              <span className="text-xs font-normal text-slate-400 ml-1">mins</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Taught to fellow students</p>
          </div>
        </div>

        {/* Reliability Score */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Reliability Score</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-blue-400">
              {currentUser.reliabilityScore}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Completion & on-time arrival</p>
          </div>
        </div>

        {/* Peer Rating */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Peer Rating</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-yellow-400">
              ★ {currentUser.rating.toFixed(1)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{currentUser.reviewCount} peer reviews</p>
          </div>
        </div>
      </div>

      {/* Active Upcoming Sessions Banner */}
      {myUpcomingBookings.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-lg font-bold text-white">Upcoming Confirmed Sessions</h2>
            </div>
            <button
              onClick={() => onNavigateTab('sessions')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Open Session Workspace &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myUpcomingBookings.map((b) => {
              const otherUser = allUsers.find(
                (u) => u.id === (b.requesterId === currentUser.id ? b.helperId : b.requesterId)
              );
              const isIHelper = b.helperId === currentUser.id;

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={otherUser?.avatar}
                      alt={otherUser?.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{b.skillName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {b.durationMinutes} min
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isIHelper ? `Helping ${otherUser?.name}` : `Learning from ${otherUser?.name}`}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(b.scheduledAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('sessions')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                  >
                    Enter Room
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dual Perspective: Skills Offered vs Skills Needed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills I Offer */}
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Skills I Offer (Earn Credits)</h2>
              </div>
              <button
                onClick={() => setShowAddModal('offered')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Skill</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentUser.skillsOffered.map((sk) => (
                <div
                  key={sk.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{sk.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {sk.proficiency || 'Intermediate'}
                    </span>
                  </div>
                  {sk.description && (
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{sk.description}</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Category: {sk.category}</span>
                    <span>⭐ {sk.endorsements || 0} peer endorsements</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/40 text-xs text-slate-400 flex items-center justify-between">
            <span>Standard Rate: 1 credit per minute</span>
            <span className="text-emerald-400 font-semibold">30 min = +30 credits</span>
          </div>
        </div>

        {/* Skills I Want to Learn */}
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-bold text-white">Skills I Want to Learn</h2>
              </div>
              <button
                onClick={() => setShowAddModal('needed')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Need</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentUser.skillsNeeded.map((sk) => (
                <div
                  key={sk.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-teal-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{sk.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                      Target: {sk.proficiency || 'Beginner'}
                    </span>
                  </div>
                  {sk.description && (
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{sk.description}</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Category: {sk.category}</span>
                    <button
                      onClick={() => onNavigateTab('smart-match')}
                      className="text-teal-400 hover:underline font-semibold"
                    >
                      Find matches &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/40 text-xs text-slate-400 flex items-center justify-between">
            <span>Cost: 1 credit per minute</span>
            <span className="text-teal-400 font-semibold">Your balance: {currentUser.credits.availableBalance} min</span>
          </div>
        </div>
      </div>

      {/* Weekly Availability Schedule */}
      <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">My Weekly Availability Schedule</h2>
              <p className="text-xs text-slate-400">
                When you're free for peer tutoring sessions. Matches automatically check this for time overlap!
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddAvail(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 self-start sm:self-auto transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Availability Slot</span>
          </button>
        </div>

        {myAvailability.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
            No availability slots added yet. Add regular study hours so peers can book tutoring sessions with you!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAvailability.map((slot) => {
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                      {dayNames[slot.dayOfWeek]}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-[10px] text-slate-500">Weekly recurring</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for adding availability slot */}
      {showAddAvail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Available Time Slot</h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Day of the Week</label>
                <select
                  value={availDay}
                  onChange={(e) => setAvailDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAvail(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for adding skill */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {showAddModal === 'offered' ? 'Offer a New Skill to Earn Time' : 'Add a Skill You Want to Learn'}
            </h3>
            <form onSubmit={handleCreateSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Skill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Java Concurrency, PPT Pitch Decks, Spanish"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Tech">Tech</option>
                    <option value="Design">Design</option>
                    <option value="Academics">Academics</option>
                    <option value="Languages">Languages</option>
                    <option value="Career">Career</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Proficiency</label>
                  <select
                    value={newSkillProficiency}
                    onChange={(e) => setNewSkillProficiency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What specifically can you teach or what are you looking for?"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
