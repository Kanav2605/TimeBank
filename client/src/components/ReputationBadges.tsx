import React from 'react';
import { User } from '../types';
import { computeUserBadges, ReputationBadge } from '../utils/badges';
import { Award, Zap, Clock, ShieldCheck, Repeat, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface ReputationBadgesProps {
  user: User;
  mode?: 'compact' | 'full' | 'chips';
}

const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'Award':
      return <Award className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Repeat':
      return <Repeat className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

const getTierColor = (tier: string, unlocked: boolean) => {
  if (!unlocked) {
    return 'bg-slate-800/60 border-slate-700/60 text-slate-500';
  }
  switch (tier) {
    case 'Diamond':
      return 'bg-cyan-950/40 border-cyan-400/40 text-cyan-300 shadow-cyan-500/10';
    case 'Gold':
      return 'bg-amber-950/40 border-amber-400/40 text-amber-300 shadow-amber-500/10';
    case 'Silver':
      return 'bg-slate-700/40 border-slate-400/40 text-slate-200 shadow-slate-500/10';
    case 'Bronze':
    default:
      return 'bg-emerald-950/40 border-emerald-400/40 text-emerald-300 shadow-emerald-500/10';
  }
};

export const ReputationBadges: React.FC<ReputationBadgesProps> = ({ user, mode = 'compact' }) => {
  const badges = computeUserBadges(user);
  const unlockedBadges = badges.filter((b) => b.unlocked);

  if (mode === 'chips') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {unlockedBadges.slice(0, 3).map((badge) => (
          <span
            key={badge.id}
            title={`${badge.name}: ${badge.description}`}
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${getTierColor(
              badge.tier,
              true
            )}`}
          >
            {renderIcon(badge.iconName, 'w-3 h-3')}
            <span>{badge.name}</span>
          </span>
        ))}
      </div>
    );
  }

  if (mode === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            title={`${badge.name} (${badge.tier}) - ${badge.description} [Status: ${
              badge.unlocked ? 'Unlocked' : `In Progress: ${badge.progressPercent}%`
            }]`}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${getTierColor(
              badge.tier,
              badge.unlocked
            )} ${badge.unlocked ? 'hover:scale-105 cursor-help shadow-md' : 'opacity-60'}`}
          >
            {renderIcon(badge.iconName, 'w-3.5 h-3.5')}
            <span>{badge.name}</span>
            {badge.unlocked ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
            ) : (
              <Lock className="w-3 h-3 text-slate-500 ml-0.5" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Full Showcase Mode (for Dashboard)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Campus Reputation & Badges</h3>
        </div>
        <span className="text-xs font-medium text-slate-400">
          {unlockedBadges.length} of {badges.length} Badges Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
              badge.unlocked
                ? `${getTierColor(badge.tier, true)} shadow-md hover:border-slate-400/60`
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      badge.unlocked ? 'bg-black/30' : 'bg-slate-800'
                    }`}
                  >
                    {renderIcon(badge.iconName, 'w-4 h-4')}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white leading-tight">{badge.name}</h4>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {badge.tier} Tier • {badge.category}
                    </span>
                  </div>
                </div>

                {badge.unlocked ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    <span>Locked</span>
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-snug">
                {badge.description}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-400">
                <span>Progress: {badge.currentValue}</span>
                <span>Target: {badge.targetValue}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    badge.unlocked
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${badge.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
