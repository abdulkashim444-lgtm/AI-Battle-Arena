/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Agent, AIAlgorithm, WeaponType, SimulationMap } from '../types';
import { MAPS } from '../simulation/arena';
import { Sliders, Shield, Zap, Award, Target, Crosshair, HelpCircle, Star } from 'lucide-react';

interface AIPanelProps {
  selectedAgent: Agent | null;
  onUpdateAgentBrain: (agentId: string, updates: Partial<Agent['brain']>) => void;
  onUpdateAgentGenes: (agentId: string, updates: Partial<Agent['brain']['genes']>) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  algorithm: AIAlgorithm;
  setAlgorithm: (alg: AIAlgorithm) => void;
  selectedMap: SimulationMap;
  setSelectedMap: (map: SimulationMap) => void;
  onTriggerEvolution: () => void;
}

interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  effect: (agent: Agent) => void;
}

export default function AIPanel({
  selectedAgent,
  onUpdateAgentBrain,
  onUpdateAgentGenes,
  gameSpeed,
  setGameSpeed,
  algorithm,
  setAlgorithm,
  selectedMap,
  setSelectedMap,
  onTriggerEvolution
}: AIPanelProps) {

  const skillNodes = [
    { id: 'shield_boost', name: 'Shield Regenerator', desc: 'Boosts Shield Regen Rate by +0.15/sec', cost: 100, icon: Shield },
    { id: 'speed_boost', name: 'Thruster Accelerate', desc: 'Increases Agent Max Speed by +0.8 units', cost: 150, icon: Zap },
    { id: 'heavy_payload', name: 'Overcharge Payload', desc: 'Gains 15% bonus weapon base damage', cost: 200, icon: Crosshair },
    { id: 'vampire', name: 'Nanite Syphon', desc: 'Regenerates +5 Integrity points on every strike', cost: 250, icon: Star }
  ];

  const handleUnlockSkill = (skillId: string, cost: number) => {
    if (!selectedAgent) return;
    if (selectedAgent.xp < cost) return;

    // Apply the skill modification
    const skillsList = [...selectedAgent.skills];
    if (skillsList.includes(skillId)) return; // already unlocked

    skillsList.push(skillId);

    // Modify genes based on skill
    const updatedGenes = { ...selectedAgent.brain.genes };
    if (skillId === 'shield_boost') {
      updatedGenes.shieldRegenRate += 0.15;
    } else if (skillId === 'speed_boost') {
      updatedGenes.maxSpeed += 0.8;
    } else if (skillId === 'heavy_payload') {
      updatedGenes.maxHealthBonus += 25;
    }

    // Deduct XP and append skill list
    selectedAgent.xp -= cost;
    selectedAgent.skills = skillsList;
    selectedAgent.brain.genes = updatedGenes;

    // Trigger state refresh
    onUpdateAgentGenes(selectedAgent.id, updatedGenes);
  };

  return (
    <div id="ai_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Simulation Config Column */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* Core Algorithm Options */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <Sliders className="text-[#00f2ff] w-4 h-4" />
            <h3 className="font-mono text-xs font-bold text-[#00f2ff] uppercase tracking-widest">
              Neural_Strategy_Selector
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'DQN', name: 'Deep Q-Learning', desc: 'Neural weights adapt through experience gradient steps.' },
              { id: 'DOUBLE_DQN', name: 'Double DQN', desc: 'Stabilized Q-target value estimation network.' },
              { id: 'BEHAVIOR_TREE', name: 'Behavior Trees', desc: 'Hierarchical nodes prioritizing fleeing and seeking.' },
              { id: 'UTILITY_AI', name: 'Utility Decision', desc: 'Computes actions using real-time utility curves.' },
              { id: 'GENETIC', name: 'Genetic Selection', desc: 'Evolution through survival crossover of parents.' }
            ].map(alg => (
              <button
                key={alg.id}
                onClick={() => setAlgorithm(alg.id as AIAlgorithm)}
                className={`p-3.5 rounded-sm border text-left font-mono transition-all duration-200 cursor-pointer ${
                  algorithm === alg.id 
                    ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff] shadow-lg shadow-cyan-500/5' 
                    : 'bg-[#050508] border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">{alg.name}</div>
                <div className="text-[9px] text-zinc-500 leading-tight mt-1">{alg.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speed Controls Panel */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl">
          <span className="font-mono text-xs text-[#00f2ff] uppercase tracking-widest font-bold">
            Simulation_Speed_Accelerators
          </span>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: 1, label: '1x NORMAL', desc: 'Fluid 60FPS physics' },
              { val: 3, label: '3x ENHANCED', desc: 'Fast-forward research' },
              { val: 10, label: '10x TURBO', desc: 'Intense network learning' }
            ].map(spd => (
              <button
                key={spd.val}
                onClick={() => setGameSpeed(spd.val)}
                className={`p-3.5 rounded-sm border font-mono text-center transition-all duration-150 cursor-pointer ${
                  gameSpeed === spd.val
                    ? 'bg-[#7000ff]/20 border-[#7000ff] text-[#c0a0ff] shadow-lg shadow-purple-500/5'
                    : 'bg-[#050508] border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">{spd.label}</div>
                <div className="text-[8px] text-zinc-500 leading-tight mt-1">{spd.desc}</div>
              </button>
            ))}
          </div>

          {algorithm === 'GENETIC' && (
            <button
              onClick={onTriggerEvolution}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#7000ff] to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-sm text-xs font-mono font-bold text-white tracking-widest transition-all duration-150 shadow-md uppercase cursor-pointer mt-2"
            >
              Trigger Generation Evolution Crossover
            </button>
          )}
        </div>

        {/* Map Selectors */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl">
          <span className="font-mono text-xs text-[#00f2ff] uppercase tracking-widest font-bold">
            Grid_Layout_Environment
          </span>

          <div className="grid grid-cols-2 gap-3">
            {Object.values(MAPS).map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMap(m)}
                className={`p-3 rounded-sm border text-left font-mono transition-all duration-200 cursor-pointer ${
                  selectedMap.id === m.id
                    ? 'bg-[#7000ff]/20 border-[#7000ff] text-[#c0a0ff] shadow-lg'
                    : 'bg-[#050508] border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">{m.name}</div>
                <div className="text-[9px] text-zinc-500 leading-tight mt-1">Theme: {m.theme}</div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 2. Interactive Agent Skill Tree Column */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl h-full">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div className="flex items-center gap-2">
              <Award className="text-[#00f2ff] w-4 h-4" />
              <h3 className="font-mono text-xs font-bold text-[#00f2ff] uppercase tracking-widest">
                Agent_Cybernetic_Skill_Tree
              </h3>
            </div>
            {selectedAgent && (
              <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-widest">
                Available: {selectedAgent.xp} XP
              </span>
            )}
          </div>

          {selectedAgent ? (
            <div className="flex flex-col gap-4 flex-1 justify-center">
              <div className="text-[11px] font-mono text-zinc-400 mb-2 leading-relaxed uppercase">
                Select dynamic genome enhancements. Unlocking skills will deduct available experience points (XP) accumulated by this specific bot during combat victories!
              </div>

              <div className="flex flex-col gap-3">
                {skillNodes.map(skill => {
                  const isUnlocked = selectedAgent.skills.includes(skill.id);
                  const canAfford = selectedAgent.xp >= skill.cost;
                  const Icon = skill.icon;

                  return (
                    <div
                      key={skill.id}
                      className={`p-3.5 rounded-sm border flex items-center justify-between transition-all duration-150 ${
                        isUnlocked 
                          ? 'bg-[#050508] border-emerald-500/40 text-zinc-200' 
                          : 'bg-[#050508] border-zinc-800 text-zinc-400 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-sm ${
                          isUnlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900/40 text-zinc-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wide">{skill.name}</span>
                          <span className="font-mono text-[9px] text-zinc-500 leading-tight mt-0.5">{skill.desc}</span>
                        </div>
                      </div>

                      <button
                        disabled={isUnlocked || !canAfford}
                        onClick={() => handleUnlockSkill(skill.id, skill.cost)}
                        className={`py-1.5 px-3.5 rounded-sm text-[10px] font-mono font-bold uppercase transition-all duration-150 border cursor-pointer ${
                          isUnlocked 
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 cursor-default' 
                            : canAfford 
                              ? 'border-[#00f2ff]/40 hover:bg-[#00f2ff]/15 text-[#00f2ff] bg-[#00f2ff]/5' 
                              : 'border-zinc-800 text-zinc-600 bg-transparent cursor-not-allowed'
                        }`}
                      >
                        {isUnlocked ? 'UNLOCKED' : `${skill.cost} XP`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#050508] border border-zinc-900 p-3.5 mt-auto font-mono text-[9px] text-zinc-500 flex gap-2.5 items-start">
                <HelpCircle className="w-4 h-4 text-[#00f2ff]/80 shrink-0 mt-0.5" />
                <span className="leading-relaxed uppercase">
                  XP is rewarded as follows: +50 XP for enemy eliminations, +20 XP for dealing 100 combat damage, and +15 XP for capturing energy field crates.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-sm text-zinc-500 font-mono text-xs gap-3 flex-1">
              <Star className="w-8 h-8 text-zinc-700 animate-pulse" />
              <span>SELECT AN ACTIVE AGENT SPECIMEN ON THE GRID SPECTATOR CANVAS ABOVE TO INSPECT AND UPGRADE SKILLS</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
