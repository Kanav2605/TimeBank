import React, { useState, useEffect } from 'react';
import { Dispute, SessionBooking, User, DisputeStatus } from '../types';
import { ShieldAlert, CheckCircle, Scale, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface AdminDisputesTabProps {
  currentUser: User;
  allUsers: User[];
  onRefreshAll: () => void;
}

export const AdminDisputesTab: React.FC<AdminDisputesTabProps> = ({
  currentUser,
  allUsers,
  onRefreshAll,
}) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionType, setResolutionType] = useState<DisputeStatus>('RESOLVED_FULL_REFUND');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/disputes');
      if (res.ok) {
        const list = await res.json();
        setDisputes(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resolutionNotes.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${selectedDispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolutionType,
          resolutionNotes: resolutionNotes.trim(),
          resolvedBy: `${currentUser.name} (Mediator)`,
        }),
      });

      if (res.ok) {
        setSelectedDispute(null);
        setResolutionNotes('');
        await fetchDisputes();
        onRefreshAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openDisputes = disputes.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_INVESTIGATION');
  const resolvedDisputes = disputes.filter((d) => d.status.startsWith('RESOLVED') || d.status === 'DISMISSED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Scale className="w-4 h-4" />
          <span>Campus Mediation & Dispute Resolution</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Session Dispute Adjudication
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          When sessions encounter dropouts, no-shows, or quality issues, students can seek fair community mediation. Mediators review evidence and unlock or split escrowed time credits.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Open Disputes</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{openDisputes.length}</div>
          <span className="text-[10px] text-slate-500">Awaiting mediation review</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Resolved Cases</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{resolvedDisputes.length}</div>
          <span className="text-[10px] text-slate-500">Settled with ledger entries</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Dispute Settlement Time</span>
          <div className="text-2xl font-bold text-white mt-1">&lt; 4 hours</div>
          <span className="text-[10px] text-slate-500">Campus mediation SLA</span>
        </div>
      </div>

      {/* Open Disputes Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>Active Disputes Requiring Ruling</span>
        </h2>

        {openDisputes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-800/20 border border-slate-700/60 text-center text-slate-400 text-xs">
            🎉 No open disputes! The student time economy is operating smoothly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {openDisputes.map((d) => {
              const complainant = allUsers.find((u) => u.id === d.raisedByUserId);
              const respondent = allUsers.find((u) => u.id === d.againstUserId);

              return (
                <div
                  key={d.id}
                  className="p-6 rounded-2xl bg-slate-800/50 border border-amber-500/30 flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {d.reason}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Parties */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs mb-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Complainant</span>
                        <span className="font-bold text-white">{complainant?.name}</span>
                      </div>
                      <span className="text-slate-600 font-mono">vs</span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Respondent</span>
                        <span className="font-bold text-white">{respondent?.name}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block">Issue:</span>
                        <p className="text-slate-200 mt-0.5">{d.description}</p>
                      </div>
                      {d.evidenceNotes && (
                        <div>
                          <span className="text-slate-400 font-semibold block">Evidence / Logs:</span>
                          <p className="text-slate-400 font-mono text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800 mt-0.5">
                            {d.evidenceNotes}
                          </p>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        Actual time attended: <span className="text-white font-bold">{d.actualMinutesAttended} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs text-amber-300 font-medium">Escrow frozen</span>
                    <button
                      onClick={() => {
                        setSelectedDispute(d);
                        setResolutionNotes(`After reviewing chat logs and duration (${d.actualMinutesAttended} min), fair compensation determined.`);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Review & Adjudicate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved Disputes Archive */}
      {resolvedDisputes.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>Resolved Disputes Archive</span>
          </h2>

          <div className="divide-y divide-slate-800 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            {resolvedDisputes.map((d) => (
              <div key={d.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-bold text-white">{d.reason}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-slate-400">{d.resolutionNotes}</p>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-mono shrink-0">
                  <div>Settled by: {d.resolvedBy}</div>
                  <div>Refunded: {d.refundedAmount || 0}m | Paid: {d.paidAmount || 0}m</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <span>Issue Mediator Ruling</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-800/80 text-xs text-slate-300">
              <p className="font-bold text-white mb-1">Case #{selectedDispute.id}</p>
              <p>{selectedDispute.description}</p>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Choose Ruling & Credit Disbursement
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="ruling"
                      value="RESOLVED_FULL_REFUND"
                      checked={resolutionType === 'RESOLVED_FULL_REFUND'}
                      onChange={() => setResolutionType('RESOLVED_FULL_REFUND')}
                      className="text-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-white block">100% Full Refund to Learner</span>
                      <span className="text-[11px] text-slate-400">
                        All escrowed time credits returned to learner. Helper receives reliability penalty.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="ruling"
                      value="RESOLVED_SPLIT"
                      checked={resolutionType === 'RESOLVED_SPLIT'}
                      onChange={() => setResolutionType('RESOLVED_SPLIT')}
                      className="text-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-white block">Fair Split (50% Refund / 50% Payout)</span>
                      <span className="text-[11px] text-slate-400">
                        Compromise settlement when session was partially held before connection dropped.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="ruling"
                      value="RESOLVED_RELEASE_TO_HELPER"
                      checked={resolutionType === 'RESOLVED_RELEASE_TO_HELPER'}
                      onChange={() => setResolutionType('RESOLVED_RELEASE_TO_HELPER')}
                      className="text-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-white block">Release 100% to Helper</span>
                      <span className="text-[11px] text-slate-400">
                        Dispute ruled baseless; helper fulfilled agreement in good faith.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official Mediation Rationale
                </label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                >
                  {submitting ? 'Applying Ruling...' : 'Enforce Ruling on Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
