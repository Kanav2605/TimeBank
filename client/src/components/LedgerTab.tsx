import React, { useState, useEffect } from 'react';
import { LedgerEntry } from '../types';
import { ShieldCheck, ShieldAlert, RefreshCw, Key, Database, ArrowRight, Lock } from 'lucide-react';

interface LedgerResponse {
  chain: LedgerEntry[];
  integrity: {
    isValid: boolean;
    brokenIndex?: number;
    error?: string;
    totalTransactions: number;
  };
  metrics: {
    totalMintedMinutes: number;
    totalActiveEscrowMinutes: number;
    totalTransactionsCount: number;
    genesisHash?: string;
    latestHash?: string;
  };
}

export const LedgerTab: React.FC = () => {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = (data?.chain || []).filter((entry) => {
    if (filterType === 'ALL') return true;
    return entry.type === filterType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SIGNUP_GRANT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            SIGNUP_GRANT
          </span>
        );
      case 'ESCROW_LOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ESCROW_LOCK
          </span>
        );
      case 'ESCROW_RELEASE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ESCROW_RELEASE
          </span>
        );
      case 'ESCROW_REFUND':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ESCROW_REFUND
          </span>
        );
      case 'LATE_CANCELLATION_FEE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            LATE_FEE
          </span>
        );
      case 'DISPUTE_PAYOUT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            DISPUTE_PAYOUT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Lock className="w-4 h-4" />
            <span>Immutable Double-Entry Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cryptographic Time Audit Trail
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Every minute of time traded is recorded in a tamper-evident SHA-256 hash-chained journal.
          </p>
        </div>

        <button
          onClick={fetchLedger}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-2 border border-slate-700 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Verify & Re-Audit Chain</span>
        </button>
      </div>

      {/* Cryptographic Integrity Card */}
      {data?.integrity && (
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            data.integrity.isValid
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/20 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                data.integrity.isValid ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
            >
              {data.integrity.isValid ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold text-white">
                  {data.integrity.isValid
                    ? 'Cryptographic Chain Integrity: VALID & VERIFIED'
                    : 'CHAIN INTEGRITY COMPROMISED'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  SHA-256
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {data.integrity.isValid
                  ? `All ${data.integrity.totalTransactions} blocks mathematically verified from Genesis. Zero tampering or invalid credit creation detected.`
                  : `Discrepancy at block #${data.integrity.brokenIndex}: ${data.integrity.error}`}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 font-mono">
            <div>Latest Block Hash:</div>
            <div className="text-emerald-400 text-[11px] truncate max-w-xs">
              {data.metrics.latestHash || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Economy Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Total Minted Time</span>
          <div className="text-2xl font-bold text-white mt-1">
            {data?.metrics.totalMintedMinutes || 0}{' '}
            <span className="text-xs font-normal text-slate-400">credits</span>
          </div>
          <span className="text-[10px] text-slate-500">Student welcome starter grants</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Escrow Locked</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {data?.metrics.totalActiveEscrowMinutes || 0}{' '}
            <span className="text-xs font-normal text-slate-400">credits</span>
          </div>
          <span className="text-[10px] text-slate-500">Currently held in active sessions</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Total Journal Entries</span>
          <div className="text-2xl font-bold text-teal-400 mt-1">
            {data?.metrics.totalTransactionsCount || 0}
          </div>
          <span className="text-[10px] text-slate-500">Immutable ledger blocks</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
          <span className="text-xs text-slate-400">Genesis Block</span>
          <div className="text-xs font-mono text-slate-300 mt-2 truncate">
            {data?.metrics.genesisHash?.substring(0, 16)}...
          </div>
          <span className="text-[10px] text-slate-500">Block #0 SHA-256 root</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {['ALL', 'SIGNUP_GRANT', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'LATE_CANCELLATION_FEE'].map(
          (t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === t
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          )
        )}
      </div>

      {/* Ledger Journal Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-900/80 shadow-lg">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-3 px-4">Block #</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Flow (From &rarr; To)</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Reason / Notes</th>
              <th className="py-3 px-4 font-mono">Hash Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-sans">
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                  #{entry.index}
                </td>
                <td className="py-3.5 px-4">{getTypeBadge(entry.type)}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                    <span className="text-slate-400 truncate max-w-[90px]">{entry.fromUserId}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-emerald-400 font-bold truncate max-w-[90px]">{entry.toUserId}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount} min
                </td>
                <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={entry.reason}>
                  {entry.reason}
                </td>
                <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                  <span className="text-teal-400/80 cursor-pointer" title={`Full Hash: ${entry.hash}`}>
                    {entry.hash.substring(0, 14)}...
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
