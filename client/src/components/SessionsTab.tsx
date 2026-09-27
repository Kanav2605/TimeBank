import React, { useState, useEffect } from 'react';
import { User, SessionBooking } from '../types';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  XCircle,
  HelpCircle,
  Calendar,
  CalendarDays,
  Shield,
  ArrowRight,
  Star,
  Download,
  ExternalLink,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ReputationBadges } from './ReputationBadges';
import { audioEngine } from '../utils/audio';
import {
  generateSessionIcs,
  generateBulkIcs,
  downloadIcsFile,
  getGoogleCalendarUrl,
} from '../utils/calendar';

interface SessionsTabProps {
  currentUser: User;
  allUsers: User[];
  bookings: SessionBooking[];
  onRefreshBookings: () => void;
  onRefreshUser: () => void;
}

export const SessionsTab: React.FC<SessionsTabProps> = ({
  currentUser,
  allUsers,
  bookings,
  onRefreshBookings,
  onRefreshUser,
}) => {
  const [selectedBooking, setSelectedBooking] = useState<SessionBooking | null>(null);

  // Live Timer State (30 mins = 1800 secs)
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Collaborative notes and checklist
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Dispute Modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState<'NO_SHOW' | 'POOR_QUALITY' | 'INCOMPLETE_TIME' | 'OFF_TOPIC' | 'TECHNICAL_ISSUES'>('TECHNICAL_ISSUES');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [actualMinutes, setActualMinutes] = useState(10);
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPunctuality, setReviewPunctuality] = useState(5);
  const [reviewHelpfulness, setReviewHelpfulness] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // View mode and calendar controls
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  // Filter bookings involving currentUser
  const myBookings = bookings.filter(
    (b) => b.requesterId === currentUser.id || b.helperId === currentUser.id
  );

  const handleExportSingleIcs = (booking: SessionBooking, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isLearner = booking.requesterId === currentUser.id;
    const peerId = isLearner ? booking.helperId : booking.requesterId;
    const peer = allUsers.find((u) => u.id === peerId);
    const peerName = peer?.name || 'Campus Student';
    const icsContent = generateSessionIcs(booking, peerName);
    downloadIcsFile(icsContent, `TimeBank-${booking.skillName.replace(/\s+/g, '_')}`);
    audioEngine.playTaskPop();
  };

  const handleExportAllIcs = () => {
    const icsContent = generateBulkIcs(myBookings, allUsers, currentUser.id);
    downloadIcsFile(icsContent, `TimeBank-${currentUser.name.replace(/\s+/g, '_')}-Schedule`);
    audioEngine.playCreditPing();
  };

  const playSessionChime = () => {
    audioEngine.playTimerGong();
  };

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      playSessionChime();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleOpenWorkspace = (booking: SessionBooking) => {
    audioEngine.playTaskPop();
    setSelectedBooking(booking);
    setTimerSeconds(booking.durationMinutes * 60);
    setIsTimerRunning(false);
    setNotes(booking.meetingNotes || 'Goals for this session:\n- Break down key concepts\n- Code walkthrough / review\n- Q&A');
    setChecklist(booking.topicsChecked || ['Goal 1: Concept walkthrough', 'Goal 2: Hands-on exercise']);
  };

  const handleToggleChecklist = (item: string) => {
    audioEngine.playTaskPop();
    if (checklist.includes(item)) {
      setChecklist(checklist.filter((i) => i !== item));
    } else {
      setChecklist([...checklist, item]);
    }
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, newChecklistItem.trim()]);
    setNewChecklistItem('');
  };

  const handleSaveWorkspace = async () => {
    if (!selectedBooking) return;
    try {
      await fetch(`/api/bookings/${selectedBooking.id}/workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingNotes: notes, topicsChecked: checklist }),
      });
      onRefreshBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOff = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}/sign-off`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, signOff: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedBooking(updated);
        audioEngine.playCreditPing();
        onRefreshBookings();
        onRefreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const revieweeId =
      selectedBooking.requesterId === currentUser.id
        ? selectedBooking.helperId
        : selectedBooking.requesterId;
    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedBooking.id,
          reviewerId: currentUser.id,
          revieweeId,
          rating: reviewRating,
          punctualityRating: reviewPunctuality,
          helpfulnessRating: reviewHelpfulness,
          comment: reviewComment.trim(),
        }),
      });
      if (res.ok) {
        setShowReviewModal(false);
        setHasReviewed(true);
        onRefreshUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleCancelSession = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelledByUserId: currentUser.id,
          reason: cancelReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCancelModal(false);
      setSelectedBooking(null);
      onRefreshBookings();
      onRefreshUser();
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !disputeDescription.trim()) return;
    setDisputeLoading(true);
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedBooking.id,
          raisedByUserId: currentUser.id,
          reason: disputeReason,
          description: disputeDescription,
          evidenceNotes: disputeEvidence,
          actualMinutesAttended: actualMinutes,
        }),
      });
      if (res.ok) {
        setShowDisputeModal(false);
        setSelectedBooking(null);
        onRefreshBookings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDisputeLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  // Time remaining to scheduled session
  const getTimeRemainingNotice = (booking: SessionBooking) => {
    const scheduledTime = new Date(booking.scheduledAt).getTime();
    const now = Date.now();
    const diffHours = (scheduledTime - now) / (1000 * 60 * 60);

    if (diffHours >= 2) {
      return {
        isLate: false,
        text: `Free cancellation: >2 hours remaining. You will receive 100% of your ${booking.creditAmount} credits back with 0 penalty.`,
      };
    } else {
      return {
        isLate: true,
        text: `Late cancellation window (<2h): A 50% courtesy fee (${Math.round(booking.creditAmount * 0.5)} credits) will be transferred to your peer to respect their reserved time slot.`,
      };
    }
  };

  // Helper for computing 7 days around current week offset
  const getWeekDays = () => {
    const today = new Date();
    const current = new Date(today);
    current.setDate(today.getDate() + currentWeekOffset * 7);

    const day = current.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(current);
    monday.setDate(current.getDate() - diffToMonday);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  const weekDays = getWeekDays();

  const filteredBookings = myBookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const selectedPeerId = selectedBooking
    ? selectedBooking.requesterId === currentUser.id
      ? selectedBooking.helperId
      : selectedBooking.requesterId
    : null;
  const selectedPeer = allUsers.find((u) => u.id === selectedPeerId);

  return (
    <div className="space-y-6">
      {/* Header with View Switcher & iCal Bulk Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Interactive Scheduling & Collaboration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Peer Sessions & Workspace
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Coordinate upcoming peer sessions, sync to iCalendar/Google, and settle time credits in the collaborative room.
          </p>
        </div>

        {/* View Toggle & Bulk Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center space-x-1">
            <button
              onClick={() => {
                setViewMode('list');
                audioEngine.playTaskPop();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => {
                setViewMode('calendar');
                audioEngine.playTaskPop();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Interactive Calendar</span>
            </button>
          </div>

          <button
            onClick={handleExportAllIcs}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Download complete .ics calendar file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Schedule (.ics)</span>
          </button>
        </div>
      </div>

      {/* Main layout: Bookings list/calendar vs Active Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings / Calendar (1 col on list, full or 1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              <span>My Sessions ({filteredBookings.length})</span>
            </h2>

            {/* Filter pills */}
            <div className="flex items-center space-x-1 text-[11px]">
              {['ALL', 'CONFIRMED', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'calendar' ? (
            /* Interactive Weekly Calendar Schedule */
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-3">
              {/* Calendar Navigation */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} –{' '}
                    {weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentWeekOffset((p) => p - 1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentWeekOffset(0)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentWeekOffset((p) => p + 1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    title="Next Week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Day columns */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {weekDays.map((day, dIdx) => {
                  const dayStr = day.toDateString();
                  const isToday = new Date().toDateString() === dayStr;
                  const daySessions = filteredBookings.filter(
                    (b) => new Date(b.scheduledAt).toDateString() === dayStr
                  );

                  return (
                    <div
                      key={dIdx}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isToday
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-slate-800/30 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {day.toLocaleDateString('default', { weekday: 'short' })},{' '}
                          <span className={isToday ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}>
                            {day.getDate()}
                          </span>
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Today
                          </span>
                        )}
                      </div>

                      {daySessions.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic">No sessions scheduled</p>
                      ) : (
                        <div className="space-y-1.5">
                          {daySessions.map((b) => {
                            const isLearner = b.requesterId === currentUser.id;
                            const peerId = isLearner ? b.helperId : b.requesterId;
                            const peer = allUsers.find((u) => u.id === peerId);
                            const isSelected = selectedBooking?.id === b.id;

                            return (
                              <div
                                key={b.id}
                                onClick={() => handleOpenWorkspace(b)}
                                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-emerald-900/40 border-emerald-500 text-white shadow-sm'
                                    : 'bg-slate-900/80 border-slate-700/60 hover:border-slate-500 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold truncate max-w-[120px] text-[11px]">
                                    {b.skillName}
                                  </span>
                                  <span className="text-[10px] font-mono text-emerald-400">
                                    {new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                  <span>{isLearner ? `Tutor: ${peer?.name?.split(' ')[0]}` : `Student: ${peer?.name?.split(' ')[0]}`}</span>
                                  <span>{b.durationMinutes}m</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Card List View */
            myBookings.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/60 text-center text-slate-400 text-xs">
                No sessions booked yet. Book help through Smart Match or Marketplace!
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const isLearner = b.requesterId === currentUser.id;
                  const peerId = isLearner ? b.helperId : b.requesterId;
                  const peer = allUsers.find((u) => u.id === peerId);
                  const isSelected = selectedBooking?.id === b.id;

                  let statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Confirmed
                    </span>
                  );
                  if (b.status === 'COMPLETED') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Completed
                      </span>
                    );
                  } else if (b.status === 'CANCELLED') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Cancelled
                      </span>
                    );
                  } else if (b.status === 'DISPUTED') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Disputed
                      </span>
                    );
                  }

                  return (
                    <div
                      key={b.id}
                      onClick={() => handleOpenWorkspace(b)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500 shadow-md'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">
                          {b.skillName}
                        </span>
                        {statusBadge}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-300">
                        <img
                          src={peer?.avatar}
                          alt={peer?.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span>{isLearner ? `Tutor: ${peer?.name}` : `Student: ${peer?.name}`}</span>
                      </div>

                      {peer && (
                        <div className="mt-1.5">
                          <ReputationBadges user={peer} mode="chips" />
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{b.durationMinutes} mins ({b.creditAmount} cr)</span>
                        <span>{new Date(b.scheduledAt).toLocaleDateString()}</span>
                      </div>

                      {/* Quick Export Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => handleExportSingleIcs(b, e)}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1"
                          title="Download .ics event"
                        >
                          <Download className="w-2.5 h-2.5 text-emerald-400" />
                          <span>.ics</span>
                        </button>
                        <a
                          href={getGoogleCalendarUrl(b, peer?.name || 'Student')}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1"
                          title="Google Calendar"
                        >
                          <ExternalLink className="w-2.5 h-2.5 text-teal-400" />
                          <span>GCal</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Active Workspace Room (2 cols) */}
        <div className="lg:col-span-2">
          {selectedBooking ? (
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/80 shadow-xl space-y-6">
              {/* Workspace Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-700/60 pb-5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Virtual Peer Room
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {selectedBooking.id}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    {selectedBooking.skillName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedBooking.requesterId === currentUser.id
                      ? `Learning session with ${selectedPeer?.name}`
                      : `Mentoring ${selectedPeer?.name}`}
                  </p>
                  {selectedPeer && (
                    <div className="mt-2">
                      <ReputationBadges user={selectedPeer} mode="chips" />
                    </div>
                  )}
                </div>

                {/* Calendar Exports and Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportSingleIcs(selectedBooking)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-colors"
                    title="Export iCalendar (.ics)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export .ics</span>
                  </button>
                  <a
                    href={getGoogleCalendarUrl(selectedBooking, selectedPeer?.name || 'Student')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-colors"
                    title="Add to Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                    <span>Google Cal</span>
                  </a>

                  {selectedBooking.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setShowDisputeModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30 transition-colors"
                      >
                        Report Issue
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Live Session Countdown Timer */}
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Session Timer
                    </span>
                    <div className="text-3xl font-mono font-extrabold text-white">
                      {formatTimer(timerSeconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors ${
                      isTimerRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isTimerRunning ? 'Pause' : 'Start Timer'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds(selectedBooking.durationMinutes * 60);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Topics Checklist */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Session Goals & Checklist</span>
                </h3>
                <div className="space-y-2">
                  {checklist.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-center space-x-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={checklist.includes(item)}
                        onChange={() => handleToggleChecklist(item)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                <form onSubmit={handleAddChecklistItem} className="mt-2 flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add custom topic / task..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Shared Collaborative Meeting Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>Shared Scratchpad / Code & Notes</span>
                  </h3>
                  <button
                    onClick={handleSaveWorkspace}
                    className="text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste code snippets, equations, discussion notes here..."
                  className="w-full p-3 rounded-xl bg-slate-900 font-mono text-xs text-slate-200 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Mutual Sign-off & Escrow Release Box */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs">
                  <span className="font-bold text-white block mb-0.5">
                    Mutual Sign-Off & Credit Settlement
                  </span>
                  <p className="text-slate-400">
                    {selectedBooking.status === 'COMPLETED'
                      ? `✅ Credits of ${selectedBooking.creditAmount} min successfully settled on ledger!`
                      : `Requester sign-off releases ${selectedBooking.creditAmount} credits from escrow to helper.`}
                  </p>
                </div>

                {selectedBooking.status === 'COMPLETED' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-500/30">
                      Session Settled
                    </span>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{hasReviewed ? 'Update Review' : 'Rate & Review Peer'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSignOff}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition-transform active:scale-95"
                  >
                    Confirm & Release Credits &rarr;
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-2xl bg-slate-800/20 border border-dashed border-slate-700 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-500 mb-3" />
              <h3 className="text-base font-semibold text-slate-300">Select a session</h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose a session from the left column to launch the collaborative peer room.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal with Live Policy Preview */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Cancel Session</span>
            </h3>

            {/* Policy Notice */}
            <div
              className={`p-3.5 rounded-xl text-xs leading-relaxed border ${
                getTimeRemainingNotice(selectedBooking).isLate
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span className="font-bold block mb-1">TimeBank Cancellation Policy:</span>
              {getTimeRemainingNotice(selectedBooking).text}
            </div>

            {cancelError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for cancellation
              </label>
              <textarea
                rows={3}
                placeholder="Please state why you are cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Keep Session
              </button>
              <button
                type="button"
                onClick={handleCancelSession}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>Raise Session Dispute</span>
            </h3>

            <p className="text-xs text-slate-400">
              Disputes freeze credit disbursement until community mediation resolves the case.
            </p>

            <form onSubmit={handleFileDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dispute Reason
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="NO_SHOW">Peer Did Not Show Up</option>
                  <option value="TECHNICAL_ISSUES">Technical Failure / Audio Down</option>
                  <option value="INCOMPLETE_TIME">Session Cut Short</option>
                  <option value="POOR_QUALITY">Unprepared / Incompetent</option>
                  <option value="OFF_TOPIC">Refused to Cover Agreed Skill</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Actual Minutes Held
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedBooking.durationMinutes}
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description of Issue
                </label>
                <textarea
                  rows={2}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Explain what occurred..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evidence / Logs
                </label>
                <textarea
                  rows={2}
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  placeholder="Paste links, message timestamps, or error logs..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {disputeLoading ? 'Filing...' : 'Submit to Mediation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Rating Modal */}
      {showReviewModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Star className="w-5 h-5 fill-current" />
              <h3 className="text-lg font-bold text-white">Rate & Review Peer</h3>
            </div>
            <p className="text-xs text-slate-400">
              Your feedback builds trust on campus and updates your peer's public reputation score.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Overall Rating (1–5 Stars)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-yellow-400 ml-2">
                    {reviewRating}.0 / 5.0
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Punctuality Rating
                  </label>
                  <select
                    value={reviewPunctuality}
                    onChange={(e) => setReviewPunctuality(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={5}>5 - On Time</option>
                    <option value={4}>4 - Slightly Late (5m)</option>
                    <option value={3}>3 - Late (10m+)</option>
                    <option value={2}>2 - Very Late</option>
                    <option value={1}>1 - No Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Helpfulness
                  </label>
                  <select
                    value={reviewHelpfulness}
                    onChange={(e) => setReviewHelpfulness(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={5}>5 - Exceptional</option>
                    <option value={4}>4 - Very Helpful</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Below Average</option>
                    <option value={1}>1 - Unhelpful</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Public Feedback / Testimonial
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how this student helped you or how they engaged during the session..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
