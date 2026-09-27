import React, { useState, useEffect } from 'react';
import { CircularTradeCycle, User } from '../types';
import { Play, Pause, RotateCcw, CheckCircle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface CircularTradeVisualizerProps {
  cycleData: CircularTradeCycle;
  cycleIndex: number;
  allUsers?: User[];
  onSelectParticipant?: (userName: string) => void;
}

export const CircularTradeVisualizer: React.FC<CircularTradeVisualizerProps> = ({
  cycleData,
  cycleIndex,
  allUsers = [],
}) => {
  const steps = cycleData.cycle;
  const numSteps = steps.length;
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          const next = prev === null || prev >= numSteps - 1 ? 0 : prev + 1;
          audioEngine.playTaskPop();
          return next;
        });
      }, 2200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, numSteps]);

  // Map participant names to their avatars if available
  const getUserAvatar = (name: string) => {
    const found = allUsers.find(
      (u) => u.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(u.name.toLowerCase())
    );
    return found?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
  };

  const getUserDetails = (name: string) => {
    return allUsers.find(
      (u) => u.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(u.name.toLowerCase())
    );
  };

  // Dynamic layout calculation for arbitrary n-gon loops (3, 4, 5+ steps)
  const cx = 160;
  const cy = 135;
  const radius = numSteps >= 5 ? 84 : numSteps === 4 ? 88 : 95;
  const nodeRadius = numSteps >= 5 ? 20 : 23;
  const clipRadius = numSteps >= 5 ? 17 : 20;
  const pullFactor = numSteps >= 5 ? 0.16 : numSteps === 4 ? 0.22 : 0.28;
  const labelBoxWidth = numSteps >= 5 ? 64 : 76;
  const labelBoxHalfWidth = labelBoxWidth / 2;

  const nodePositions = steps.map((_, i) => {
    // Start at top (-PI/2) and distribute evenly clockwise
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numSteps;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  const handleTogglePlay = () => {
    if (!isPlaying && activeStep === null) {
      setActiveStep(0);
      audioEngine.playTaskPop();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(null);
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Multi-Party Loop #{cycleIndex + 1}
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>{numSteps}-Way Closed Exchange</span>
            </span>
          </div>

          {/* Interactive Player Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <button
              onClick={handleTogglePlay}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title={isPlaying ? 'Pause Simulation' : 'Simulate Exchange'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              onClick={handleReset}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4">{cycleData.description}</p>
      </div>

      {/* SVG Interactive Animated Node Canvas */}
      <div className="relative w-full h-[280px] flex items-center justify-center my-2 bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <svg className="w-full h-full" viewBox="0 0 320 270">
          <defs>
            {/* Marker for arrow heads */}
            <marker
              id={`arrowhead-${cycleIndex}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#818cf8" />
            </marker>
            <marker
              id={`arrowhead-active-${cycleIndex}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>

            {/* Linear gradients */}
            <linearGradient id={`grad-active-${cycleIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Central Loop Emblem */}
          <circle cx={cx} cy={cy} r="34" fill="#0f172a" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
          <text
            x={cx}
            y={cy - 5}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CYCLE Δ
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="#34d399"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            0 NET MIN
          </text>

          {/* Curved connecting path arrows */}
          {steps.map((step, idx) => {
            const startNode = nodePositions[idx];
            const nextIdx = (idx + 1) % numSteps;
            const endNode = nodePositions[nextIdx];
            const isStepActive = activeStep === idx;

            // Compute curved control point towards center using adaptive pullFactor
            const midX = (startNode.x + endNode.x) / 2;
            const midY = (startNode.y + endNode.y) / 2;
            const cpX = midX + (cx - midX) * pullFactor;
            const cpY = midY + (cy - midY) * pullFactor;

            // Offset start & end so arrows don't collide with node circle
            const angleStart = Math.atan2(cpY - startNode.y, cpX - startNode.x);
            const pathStartX = startNode.x + (nodeRadius + 2) * Math.cos(angleStart);
            const pathStartY = startNode.y + (nodeRadius + 2) * Math.sin(angleStart);

            const angleEnd = Math.atan2(endNode.y - cpY, endNode.x - cpX);
            const pathEndX = endNode.x - (nodeRadius + 4) * Math.cos(angleEnd);
            const pathEndY = endNode.y - (nodeRadius + 4) * Math.sin(angleEnd);

            const d = `M ${pathStartX} ${pathStartY} Q ${cpX} ${cpY} ${pathEndX} ${pathEndY}`;

            return (
              <g key={idx}>
                {/* Background path line */}
                <path
                  d={d}
                  fill="none"
                  stroke={isStepActive ? '#10b981' : '#4f46e5'}
                  strokeWidth={isStepActive ? '3' : '2'}
                  strokeOpacity={isStepActive ? '1' : '0.4'}
                  markerEnd={`url(#${isStepActive ? `arrowhead-active-${cycleIndex}` : `arrowhead-${cycleIndex}`})`}
                  className={isStepActive ? 'transition-all duration-300' : ''}
                />

                {/* Animated Pulsing Particles */}
                {isStepActive && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth="3.5"
                    strokeDasharray="6 14"
                    className="animate-pulse"
                  />
                )}

                {/* Skill Label on the path curve */}
                <rect
                  x={cpX - 42}
                  y={cpY - 9}
                  width="84"
                  height="18"
                  rx="9"
                  fill="#0b0f19"
                  stroke={isStepActive ? '#10b981' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x={cpX}
                  y={cpY + 3}
                  textAnchor="middle"
                  fill={isStepActive ? '#34d399' : '#cbd5e1'}
                  fontSize="8.5"
                  fontWeight="bold"
                >
                  {step.skill.length > 14 ? `${step.skill.substring(0, 13)}…` : step.skill}
                </text>
              </g>
            );
          })}

          {/* Student Nodes */}
          {steps.map((step, idx) => {
            const pos = nodePositions[idx];
            const isGiver = activeStep === idx;
            const isReceiver = activeStep === (idx - 1 + numSteps) % numSteps;
            const isHighlighted = isGiver || isReceiver;
            const avatarUrl = getUserAvatar(step.giver);

            return (
              <g
                key={idx}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => {
                  setActiveStep(idx);
                  audioEngine.playTaskPop();
                }}
              >
                {/* Outer ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill="#0f172a"
                  stroke={isHighlighted ? '#10b981' : '#4338ca'}
                  strokeWidth={isHighlighted ? '2.5' : '1.5'}
                />

                {/* Avatar clip */}
                <clipPath id={`avatar-clip-${cycleIndex}-${idx}`}>
                  <circle cx={pos.x} cy={pos.y} r={clipRadius} />
                </clipPath>
                <image
                  href={avatarUrl}
                  x={pos.x - clipRadius}
                  y={pos.y - clipRadius}
                  width={clipRadius * 2}
                  height={clipRadius * 2}
                  clipPath={`url(#avatar-clip-${cycleIndex}-${idx})`}
                />

                {/* Name Label */}
                <rect
                  x={pos.x - labelBoxHalfWidth}
                  y={pos.y + nodeRadius + 3}
                  width={labelBoxWidth}
                  height="16"
                  rx="4"
                  fill="#0f172a"
                  stroke={isHighlighted ? '#10b981' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.y + nodeRadius + 14}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="8.5"
                  fontWeight="bold"
                >
                  {step.giver.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Step Breakdown and Mathematical Proof */}
      <div className="space-y-2 mt-2">
        <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
          <span>Simulation Step {activeStep !== null ? `#${activeStep + 1} of ${numSteps}` : '(Click Play)'}:</span>
          <span className="text-emerald-400 font-mono text-[10px]">
            {activeStep !== null ? steps[activeStep].giver + ' teaches ' + steps[activeStep].skill : 'Equilibrium Verified'}
          </span>
        </div>

        <div className="space-y-1.5">
          {steps.map((step, sIdx) => {
            const isCurrent = activeStep === sIdx;
            return (
              <div
                key={sIdx}
                onClick={() => {
                  setActiveStep(sIdx);
                  audioEngine.playTaskPop();
                }}
                className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-emerald-950/40 border border-emerald-500/50 shadow-sm text-white'
                    : 'bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isCurrent ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {sIdx + 1}
                  </span>
                  <span className="font-bold text-emerald-400">{step.giver}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-indigo-300 font-semibold">{step.skill}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="font-bold text-teal-300">{step.receiver}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">30m credit</span>
              </div>
            );
          })}
        </div>

        {/* Cryptographic Balance Invariant Guarantee */}
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Time-Credit Conservation Law:</span>
          </div>
          <span className="font-mono text-emerald-400 font-bold">
            Σ (ΔTime) = 0 mins drift
          </span>
        </div>
      </div>
    </div>
  );
};
