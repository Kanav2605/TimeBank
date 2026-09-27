import React, { useState } from 'react';
import { User } from '../types';
import { Clock, ShieldCheck, UserCheck, Sparkles, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface NavbarProps {
  currentUser: User | null;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openDisputesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  activeTab,
  setActiveTab,
  openDisputesCount,
}) => {
  const [audioActive, setAudioActive] = useState(() => audioEngine.isEnabled());

  const handleToggleAudio = () => {
    const next = !audioActive;
    audioEngine.setEnabled(next);
    setAudioActive(next);
    if (next) {
      audioEngine.playCreditPing();
    }
  };
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Clock className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  TimeBank
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero Money
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Trade Time Instead of Money</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-emerald-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('smart-match')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'smart-match'
                  ? 'bg-slate-800 text-emerald-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Smart Match</span>
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-slate-800 text-emerald-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Explore Skills
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-slate-800 text-emerald-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-slate-800 text-emerald-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Time Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative flex items-center space-x-1.5 ${
                activeTab === 'disputes'
                  ? 'bg-slate-800 text-emerald-400 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>Mediation</span>
              {openDisputesCount > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                  {openDisputesCount}
                </span>
              )}
            </button>
          </nav>

          {/* User Profile & Credit Balance */}
          <div className="flex items-center space-x-3">
            {currentUser && (
              <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 shadow-sm">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center justify-end space-x-1">
                    <span>+{currentUser.credits.availableBalance} credits</span>
                  </span>
                  {currentUser.credits.escrowBalance > 0 && (
                    <span className="text-[10px] text-amber-400/90 font-mono">
                      🔒 {currentUser.credits.escrowBalance} in escrow
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500/40">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Audio Feedback Toggle */}
            <button
              onClick={handleToggleAudio}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center transition-all ${
                audioActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={audioActive ? 'Audio Soundscape Enabled (Click to Mute)' : 'Audio Muted (Click to Enable)'}
              aria-label="Toggle Sound Effects"
            >
              {audioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Switch User Dropdown */}
            <div className="relative group">
              <select
                aria-label="Switch Student Profile"
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const selected = allUsers.find((u) => u.id === e.target.value);
                  if (selected) {
                    audioEngine.playTaskPop();
                    onSelectUser(selected);
                  }
                }}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === 'admin' ? 'Admin' : `${user.credits.availableBalance}m`})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
