/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agent, CombatLog, TrainingMetric } from '../types';
import { WEAPON_STATS } from '../simulation/agent';
import { Activity, BarChart2, ShieldAlert, Cpu, Heart, AlertCircle, Zap } from 'lucide-react';

interface DashboardProps {
  selectedAgent: Agent | null;
  combatLogs: CombatLog[];
  trainingMetrics: TrainingMetric[];
  onSelectAgent: (id: string | null) => void;
  agents: Agent[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({
  selectedAgent,
  combatLogs,
  trainingMetrics,
  onSelectAgent,
  agents,
  activeTab,
  setActiveTab
}: DashboardProps) {
  const [metricHoverInfo, setMetricHoverInfo] = useState<string | null>(null);

  // Render a beautifully designed Custom SVG Line Chart for cyberpunk style
  const renderSVGChart = (
    title: string,
    data: any[],
    dataKeys: string[],
    colors: string[],
    yMax: number = 100
  ) => {
    if (data.length === 0) {
      return (
        <div className="h-48 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-500 font-mono text-xs">
          TELEMETRY OFFLINE - RUN SIMULATION TO COMMENCE TELEMETRY
        </div>
      );
    }

    const width = 450;
    const height = 150;
    const padding = 20;

    // Map coordinates
    const pointsMap = dataKeys.map(key => {
      return data.map((d, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
        // Normalize Y to fit height
        const normalizedY = ((d[key] || 0) / yMax) * (height - padding * 2);
        const y = height - padding - normalizedY;
        return { x, y, val: d[key] };
      });
    });

    return (
      <div className="bg-[#08080c] border border-zinc-800 p-4 clip-corner flex flex-col gap-2 relative overflow-hidden">
        <span className="font-mono text-[10px] text-[#00f2ff]/80 tracking-widest font-bold uppercase">{title}</span>
        
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Neon Glow Filters */}
          <defs>
            {colors.map((c, idx) => (
              <filter id={`glow-${idx}`} key={idx}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#18181b" strokeDasharray="3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#18181b" strokeDasharray="3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#27272a" />

          {/* Lines */}
          {pointsMap.map((points, idx) => {
            const pathD = points.reduce((acc, p, index) => {
              return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
            }, '');

            return (
              <g key={idx}>
                {/* Glow path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={colors[idx]}
                  strokeWidth="2"
                  filter={`url(#glow-${idx})`}
                  className="transition-all duration-300"
                />
                
                {/* Main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  className="opacity-70"
                />

                {/* Dot at the end */}
                {points.length > 0 && (
                  <circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r="4"
                    fill={colors[idx]}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 font-mono text-[9px] text-zinc-400 mt-1">
          {dataKeys.map((key, idx) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx] }} />
              <span>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}: {data[data.length - 1][key]?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="dashboard_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Left Telemetry Column (Analytics Graphs) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#08080c] border border-zinc-800 p-4 clip-corner flex flex-col gap-1 shadow-lg hover:border-[#00f2ff]/40 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">ACTIVE COMBATANTS</span>
            <span className="text-2xl font-black text-[#00f2ff] font-mono">{agents.filter(a => a.state !== 'DEAD').length} / {agents.length}</span>
          </div>
          <div className="bg-[#08080c] border border-zinc-800 p-4 clip-corner flex flex-col gap-1 shadow-lg hover:border-[#7000ff]/40 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">TOTAL ELIMINATIONS</span>
            <span className="text-2xl font-black text-[#7000ff] font-mono">
              {agents.reduce((acc, a) => acc + a.stats.kills, 0)}
            </span>
          </div>
          <div className="bg-[#08080c] border border-zinc-800 p-4 clip-corner flex flex-col gap-1 shadow-lg hover:border-[#00f2ff]/30 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">MEAN REWARD (EP)</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {trainingMetrics.length > 0 
                ? ((trainingMetrics[trainingMetrics.length - 1].alphaReward + trainingMetrics[trainingMetrics.length - 1].omegaReward) / 2).toFixed(1)
                : 'N/A'
              }
            </span>
          </div>
          <div className="bg-[#08080c] border border-zinc-800 p-4 clip-corner flex flex-col gap-1 shadow-lg hover:border-zinc-700 transition-colors">
            <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">EPISODES RUN</span>
            <span className="text-2xl font-black text-amber-500 font-mono">
              {trainingMetrics.length > 0 ? trainingMetrics[trainingMetrics.length - 1].episode : 0}
            </span>
          </div>
        </div>

        {/* Real-time ML Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSVGChart(
            'Episode Reward History',
            trainingMetrics.slice(-25),
            ['alphaReward', 'omegaReward'],
            ['#00f2ff', '#7000ff'],
            150
          )}
          {renderSVGChart(
            'Neural Loss Value & Epsilon',
            trainingMetrics.slice(-25),
            ['loss', 'epsilon'],
            ['#eab308', '#ec4899'],
            1.5
          )}
        </div>

        {/* Combat Telemetry Feed Log */}
        <div className="bg-[#08080c] border border-zinc-800 clip-corner flex flex-col p-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="text-[#00f2ff] w-4 h-4 animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00f2ff]">
                Cybernetic_Battle_Feed // Telemetry
              </span>
            </div>
            <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">REALTIME_LOGGING</span>
          </div>

          <div className="bg-[#050508] border border-zinc-900 rounded-sm p-3 h-48 overflow-y-auto font-mono text-xs flex flex-col gap-2 pr-2 custom-scrollbar">
            {combatLogs.slice().reverse().map(log => {
              let badgeColor = 'border-zinc-800 text-zinc-400 bg-zinc-900/30';
              if (log.type === 'KILL') badgeColor = 'border-[#7000ff]/30 text-[#7000ff] bg-[#7000ff]/5';
              else if (log.type === 'EVOLUTION') badgeColor = 'border-purple-500/30 text-purple-400 bg-purple-500/5';
              else if (log.type === 'COMMENTARY') badgeColor = 'border-[#00f2ff]/30 text-[#00f2ff] bg-[#00f2ff]/5';
              else if (log.type === 'HEAL') badgeColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';

              return (
                <div key={log.id} className="flex gap-2.5 items-start py-1 border-b border-zinc-900/40 hover:bg-[#00f2ff]/5 px-2 rounded-sm transition-all duration-150">
                  <span className="text-[9px] text-zinc-600 mt-0.5">{log.timestamp}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm uppercase font-semibold ${badgeColor}`}>
                    {log.type}
                  </span>
                  <span className="text-zinc-300 flex-1 leading-relaxed">{log.message}</span>
                </div>
              );
            })}
            {combatLogs.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-600 italic">
                Awaiting combat engagement commands to populate feed...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2. Right Inspect Column (Agent Profiler / Gene Editor) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Selected Agent Card Profile */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-5 clip-corner shadow-2xl relative">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">UNIT_CODE_INSPECTOR</span>
              <h3 className="font-mono text-base font-black text-[#e0e0ff] flex items-center gap-2">
                {selectedAgent ? selectedAgent.name : 'NO_SPECIMEN_SELECTED'}
              </h3>
              {selectedAgent && (
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                  Chassis: {selectedAgent.personality.combatStyle}
                </span>
              )}
            </div>
            {selectedAgent && (
              <span className={`text-[10px] px-2.5 py-1 rounded-sm font-mono font-bold uppercase tracking-widest ${
                selectedAgent.team === 'ALPHA' 
                  ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40' 
                  : 'bg-[#7000ff]/20 text-[#c0a0ff] border border-[#7000ff]/40'
              }`}>
                TEAM_{selectedAgent.team}
              </span>
            )}
          </div>

          {selectedAgent ? (
            <div className="flex flex-col gap-5">
              
              {/* Dynamic Health / Shields bars */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1 uppercase tracking-widest"><Heart className="w-3.5 h-3.5 text-red-500" /> INTEGRITY (HP)</span>
                    <span className="font-bold text-red-400">{Math.round(selectedAgent.health)} / {selectedAgent.maxHealth}</span>
                  </div>
                  <div className="h-2 bg-[#050508] border border-zinc-900 rounded-sm overflow-hidden">
                    <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(selectedAgent.health / selectedAgent.maxHealth) * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1 uppercase tracking-widest"><ShieldAlert className="w-3.5 h-3.5 text-[#00f2ff]" /> KINETIC SHIELD</span>
                    <span className="font-bold text-[#00f2ff]">{Math.round(selectedAgent.shield)} / {selectedAgent.maxShield}</span>
                  </div>
                  <div className="h-2 bg-[#050508] border border-zinc-900 rounded-sm overflow-hidden">
                    <div className="h-full bg-[#00f2ff] transition-all duration-300" style={{ width: `${(selectedAgent.shield / selectedAgent.maxShield) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Bot Core parameters */}
              <div className="grid grid-cols-2 gap-3 bg-[#050508] p-3 rounded-sm border border-zinc-900">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">AI_ALGORITHM</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{selectedAgent.brain.algorithm}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">WEAPON_CONFIG</span>
                  <span className="font-mono text-xs text-[#00f2ff] font-bold uppercase">{WEAPON_STATS[selectedAgent.weapon]?.name || selectedAgent.weapon}</span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">UNIT_RANK</span>
                  <span className="font-mono text-xs text-zinc-300 font-bold">LVL {selectedAgent.level} <span className="text-zinc-500 text-[10px]">({selectedAgent.xp} XP)</span></span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">ELIMINATIONS</span>
                  <span className="font-mono text-xs text-[#7000ff] font-bold">{selectedAgent.stats.kills} K / {selectedAgent.stats.deaths} D</span>
                </div>
              </div>

              {/* Personality Dynamics */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono text-[#00f2ff] uppercase tracking-widest font-bold border-b border-zinc-900 pb-1.5">Personality_Emotors</span>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-mono text-[9px] text-zinc-400">
                    <span>AGGR (AGGRESSION)</span>
                    <span className="text-[#00f2ff] font-bold">{(selectedAgent.personality.aggression * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-[#050508] rounded-sm overflow-hidden">
                    <div className="h-full bg-[#00f2ff]" style={{ width: `${selectedAgent.personality.aggression * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-mono text-[9px] text-zinc-400">
                    <span>FEAR (SELF-PRESERVE)</span>
                    <span className="text-[#7000ff] font-bold">{(selectedAgent.personality.fear * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-[#050508] rounded-sm overflow-hidden">
                    <div className="h-full bg-[#7000ff]" style={{ width: `${selectedAgent.personality.fear * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-mono text-[9px] text-zinc-400">
                    <span>TACT (CONFIDENCE)</span>
                    <span className="text-emerald-400 font-bold">{(selectedAgent.personality.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-[#050508] rounded-sm overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${selectedAgent.personality.confidence * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Gene Sequences */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-[#7000ff] uppercase tracking-widest font-bold border-b border-zinc-900 pb-1.5">Mutable_Genomes</span>
                <div className="flex flex-col gap-1 font-mono text-[10px] text-zinc-300">
                  <div className="flex justify-between border-b border-[#050508] py-1">
                    <span className="text-zinc-500">MAX SPEED GENE:</span>
                    <span className="text-[#00f2ff] font-bold">{selectedAgent.brain.genes.maxSpeed.toFixed(2)} units</span>
                  </div>
                  <div className="flex justify-between border-b border-[#050508] py-1">
                    <span className="text-zinc-500">MUTATE THRESHOLD:</span>
                    <span className="text-[#7000ff] font-bold">{(selectedAgent.brain.genes.fearThreshold * 100).toFixed(0)}% hp</span>
                  </div>
                  <div className="flex justify-between border-b border-[#050508] py-1">
                    <span className="text-zinc-500">SHIELD REGEN RATE:</span>
                    <span className="text-emerald-400 font-bold">+{selectedAgent.brain.genes.shieldRegenRate.toFixed(2)} / s</span>
                  </div>
                  <div className="flex justify-between border-b border-[#050508] py-1">
                    <span className="text-zinc-500">MAX HEALTH BONUS:</span>
                    <span className="text-pink-500 font-bold">+{selectedAgent.brain.genes.maxHealthBonus} HP</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-sm text-zinc-500 font-mono text-xs gap-3">
              <Cpu className="w-8 h-8 text-zinc-700 animate-pulse" />
              <span>SELECT AN ACTIVE AGENT SPECIMEN ON THE GRID CANVAS ABOVE TO LOAD REALTIME NEURAL METRICS</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
