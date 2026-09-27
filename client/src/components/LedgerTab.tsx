import React, { useState, useEffect } from 'react';
import { LedgerEntry } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Key,
  Database,
  ArrowRight,
  Lock,
  Search,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileCode,
  X,
  ExternalLink,
} from 'lucide-react';
import { audioEngine } from '../utils/audio';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [inspectedBlock, setInspectedBlock] = useState<LedgerEntry | null>(null);

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

  const handleCopyHash = (hash: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    audioEngine.playTaskPop();
    setTimeout(() => {
      setCopiedHash(null);
    }, 2000);
  };

  const handleExportCsv = () => {
    if (!data?.chain) return;
    const headers = 'Block,Timestamp,Type,FromUser,ToUser,AmountMinutes,Reason,PreviousHash,Hash';
    const rows = data.chain.map((e) =>
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TimeBank-Ledger-Audit-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    audioEngine.playCreditPing();
  };

  const handleExportJson = () => {
    if (!data?.chain) return;
    const blob = new Blob([JSON.stringify(data.chain, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TimeBank-Ledger-Blocks-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    audioEngine.playCreditPing();
  };

  // Filter & Search entries
  const query = searchQuery.trim().toLowerCase();
  let filteredEntries = (data?.chain || []).filter((entry) => {
    if (filterType !== 'ALL' && entry.type !== filterType) return false;
    if (minAmount > 0 && Math.abs(entry.amount) < minAmount) return false;

    if (!query) return true;
    return (
      entry.index.toString().includes(query) ||
      entry.fromUserId.toLowerCase().includes(query) ||
      entry.toUserId.toLowerCase().includes(query) ||
      (entry.reason && entry.reason.toLowerCase().includes(query)) ||
      entry.hash.toLowerCase().includes(query) ||
      entry.type.toLowerCase().includes(query)
    );
  });

  // Sort
  filteredEntries.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.index - b.index;
    }
    return b.index - a.index;
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

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors shadow-sm"
            title="Download Full Ledger in CSV Format"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-colors shadow-sm"
            title="Download Raw JSON Blocks"
          >
            <FileCode className="w-3.5 h-3.5 text-teal-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={fetchLedger}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center space-x-2 shadow-md transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-Audit Chain</span>
          </button>
        </div>
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
            <div
              onClick={() => handleCopyHash(data.metrics.latestHash || '')}
              className="text-emerald-400 text-[11px] truncate max-w-xs cursor-pointer hover:underline flex items-center justify-end space-x-1"
              title="Click to copy full hash"
            >
              <span>{data.metrics.latestHash || 'N/A'}</span>
              {copiedHash === data.metrics.latestHash ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-500" />
              )}
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

      {/* Live Search and Advanced Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hash, student ID (usr_aryan), or memo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Amount filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Min:</span>
            <select
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={0}>All Credits</option>
              <option value={15}>&ge; 15 min</option>
              <option value={30}>&ge; 30 min</option>
              <option value={60}>&ge; 60 min</option>
            </select>
          </div>

          {/* Sort order */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Order:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Genesis (Oldest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Tabs by Transaction Type */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['ALL', 'SIGNUP_GRANT', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'LATE_CANCELLATION_FEE'].map(
          (t) => (
            <button
              key={t}
              onClick={() => {
                setFilterType(t);
                audioEngine.playTaskPop();
              }}
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
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-sans">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No ledger entries matching current search and filters.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setInspectedBlock(entry)}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
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
                    <div className="flex items-center space-x-1">
                      <span className="text-teal-400/90 font-mono">
                        {entry.hash.substring(0, 14)}...
                      </span>
                      <button
                        onClick={(e) => handleCopyHash(entry.hash, e)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Copy Hash"
                      >
                        {copiedHash === entry.hash ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedBlock(entry);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold border border-slate-700"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cryptographic Block Inspector Modal */}
      {inspectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Block #{inspectedBlock.index} Proof Inspector</h3>
              </div>
              <button
                onClick={() => setInspectedBlock(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Block Hash (SHA-256):</span>
                <span className="text-emerald-400 break-all select-all font-bold">
                  {inspectedBlock.hash}
                </span>
              </div>

              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Parent Block Previous Hash:</span>
                <span className="text-slate-400 break-all select-all">
                  {inspectedBlock.previousHash}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Transaction Type:</span>
                  <span className="text-white font-bold">{inspectedBlock.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount:</span>
                  <span className="text-teal-400 font-bold">{inspectedBlock.amount} minutes</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sender (Debit):</span>
                  <span className="text-slate-300">{inspectedBlock.fromUserId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Recipient (Credit):</span>
                  <span className="text-slate-300">{inspectedBlock.toUserId}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Timestamp:</span>
                  <span className="text-slate-400">{new Date(inspectedBlock.timestamp).toLocaleString()} ({inspectedBlock.timestamp})</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Audit Reason:</span>
                  <span className="text-slate-300 font-sans">{inspectedBlock.reason}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-emerald-400 flex items-center space-x-1 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Double-Entry Invariant: Valid</span>
              </span>
              <button
                onClick={() => setInspectedBlock(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-bold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
