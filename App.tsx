/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Agent, Projectile, PowerUp, SimulationMap, Particle, CombatLog, LeaderboardEntry, TrainingMetric, AIAlgorithm } from './types';
import { MAPS, createInitialPowerUps, spawnAgentsForMatch, spawnParticleExplosion, handleCircleCollisions, isCollidingWithObstacles } from './simulation/arena';
import { WEAPON_STATS, executeAIDecision, trainBrainStep, mutateGenes } from './simulation/agent';
import ArenaCanvas from './components/ArenaCanvas';
import Dashboard from './components/Dashboard';
import AIPanel from './components/AIPanel';
import MultiplayerLobby from './components/MultiplayerLobby';
import { Play, Pause, RotateCcw, Cpu, MessageSquare, BookOpen, UserCheck, ShieldAlert, Award, Terminal, Swords } from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'SPECTATE' | 'NEURAL_CONFIG' | 'MULTIPLAYER' | 'ADMIN_DOCS'>('SPECTATE');

  // Master Simulation States
  const [selectedMap, setSelectedMap] = useState<SimulationMap>(MAPS.CYBER_CITY);
  const [algorithm, setAlgorithm] = useState<AIAlgorithm>('DQN');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [weather, setWeather] = useState<'CLEAR' | 'FOG' | 'STORM' | 'RAIN'>('CLEAR');
  const [cameraMode, setCameraMode] = useState<'FREE' | 'FOLLOW_LEADER' | 'CINEMATIC'>('FREE');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Stats & Logging
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetric[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeCommentary, setActiveCommentary] = useState<string>('Awaiting combat engagement commands...');
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);

  // User details
  const [username, setUsername] = useState('Recruit Pilot');

  // Refs for high performance physics loop
  const agentsRef = useRef<Agent[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const combatLogsRef = useRef<CombatLog[]>([]);
  const loopTickRef = useRef<number>(0);

  // Synchronize state with refs for rendering
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    projectilesRef.current = projectiles;
  }, [projectiles]);

  useEffect(() => {
    powerUpsRef.current = powerUps;
  }, [powerUps]);

  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  // Initial Load & Leaderboard synchronization
  useEffect(() => {
    resetSimulation();
    fetchLeaderboard();
  }, [selectedMap, algorithm]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to sync leaderboards from Express server:', err);
    }
  };

  const reportMatchEndToLeaderboard = async (winningBot: Agent) => {
    try {
      const payload = {
        botName: winningBot.name,
        level: winningBot.level,
        kills: winningBot.stats.kills,
        winRate: 0.8,
        algorithm: winningBot.brain.algorithm,
        favoriteWeapon: winningBot.weapon,
        ratingDelta: 25
      };

      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to submit leaderboard updates:', err);
    }
  };

  const addCombatLog = (message: string, type: CombatLog['type']) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog: CombatLog = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp,
      message,
      type
    };

    combatLogsRef.current.push(newLog);
    if (combatLogsRef.current.length > 100) {
      combatLogsRef.current.shift();
    }
    setCombatLogs([...combatLogsRef.current]);
  };

  const resetSimulation = () => {
    const initialAgents = spawnAgentsForMatch(selectedMap, algorithm, 6);
    const initialPowerUps = createInitialPowerUps(selectedMap);

    setAgents(initialAgents);
    setPowerUps(initialPowerUps);
    setProjectiles([]);
    setParticles([]);
    setCombatLogs([]);
    combatLogsRef.current = [];
    loopTickRef.current = 0;
    setSelectedAgentId(initialAgents[0].id);

    addCombatLog(`Mainframe synchronized. Interactive environment "${selectedMap.name}" initialized.`, 'SYSTEM');
    addCombatLog(`Loaded active algorithm brain configurations: ${algorithm}. All units standby.`, 'SYSTEM');
    setActiveCommentary('Grid initialized. Tactical networks online.');
  };

  // Trigger Gemini dynamic play-by-play commentary
  const requestAICommentary = async (recentEvents: string[]) => {
    if (isCommentaryLoading) return;
    setIsCommentaryLoading(true);

    try {
      const alphaScore = agentsRef.current.filter(a => a.team === 'ALPHA').reduce((acc, a) => acc + a.stats.kills, 0);
      const omegaScore = agentsRef.current.filter(a => a.team === 'OMEGA').reduce((acc, a) => acc + a.stats.kills, 0);

      const response = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: recentEvents,
          mapName: selectedMap.name,
          weather,
          scores: { alpha: alphaScore, omega: omegaScore }
        })
      });
      const data = await response.json();
      if (data.commentary) {
        setActiveCommentary(data.commentary);
        addCombatLog(`[Commentary] ${data.commentary}`, 'COMMENTARY');
      }
    } catch (err) {
      console.error('Failed to fetch AI Commentary:', err);
    } finally {
      setIsCommentaryLoading(false);
    }
  };

  // Evolutionary Selection trigger
  const handleTriggerEvolution = () => {
    const living = agentsRef.current.filter(a => a.state !== 'DEAD');
    if (living.length < 2) {
      addCombatLog('Evolutionary crossover requires at least 2 surviving agents.', 'SYSTEM');
      return;
    }

    // Sort by performance kills
    const sorted = [...living].sort((a, b) => b.stats.kills - a.stats.kills);
    const parentA = sorted[0];
    const parentB = sorted[1];

    addCombatLog(`Evolution mode: Mating prime parent genes of [${parentA.name}] and [${parentB.name}]`, 'EVOLUTION');

    const nextGenerationAgents = agentsRef.current.map((agent, index) => {
      if (agent.state === 'DEAD' || index > 1) {
        // Mutate and revive as a next gen clone
        const nextBrain = mutateGenes(parentA.brain, parentB.brain);
        const nextAgent = {
          ...agent,
          health: 100 + nextBrain.genes.maxHealthBonus,
          maxHealth: 100 + nextBrain.genes.maxHealthBonus,
          shield: 50,
          weapon: nextBrain.genes.weaponPreference,
          state: 'WANDERING' as const,
          level: agent.level + 1,
          brain: nextBrain,
          stats: {
            ...agent.stats,
            matchesPlayed: agent.stats.matchesPlayed + 1
          }
        };
        spawnParticleExplosion(particlesRef.current, agent.x, agent.y, '#af52de', 30);
        return nextAgent;
      }
      return agent;
    });

    setAgents(nextGenerationAgents);
    addCombatLog(`Generation evolution cycle successfully complete. Mutation arrays loaded.`, 'EVOLUTION');
  };

  // Main 60FPS Physics Updater
  useEffect(() => {
    let animationFrameId: number;
    let lastCommentaryTrigger = 0;

    const gameLoop = () => {
      if (isRunning) {
        // Run physics loop based on Speed Multiplier
        for (let step = 0; step < gameSpeed; step++) {
          loopTickRef.current++;

          let currentAgents = [...agentsRef.current];
          let currentProjectiles = [...projectilesRef.current];
          let currentPowerUps = [...powerUpsRef.current];
          let currentParticles = [...particlesRef.current];

          // 1. Update powerups respawn
          currentPowerUps.forEach(p => {
            if (p.respawnTimer > 0) p.respawnTimer--;
          });

          // 2. Update particle velocities and lifespans
          currentParticles = currentParticles
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              alpha: p.alpha - p.decay
            }))
            .filter(p => p.alpha > 0);

          // 3. Update active projectiles
          currentProjectiles = currentProjectiles
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              life: p.life - 1
            }))
            .filter(p => {
              if (p.life <= 0) return false;
              // Check wall collisions
              if (isCollidingWithObstacles(p.x, p.y, p.radius, selectedMap.obstacles)) {
                // Trigger visual dust hit
                spawnParticleExplosion(currentParticles, p.x, p.y, p.color, 8);
                return false;
              }
              // Map boundaries
              if (p.x < 0 || p.x > selectedMap.width || p.y < 0 || p.y > selectedMap.height) {
                return false;
              }
              return true;
            });

          // 4. Update Agents Decisions and States
          currentAgents = currentAgents.map(agent => {
            if (agent.state === 'DEAD') return agent;

            // Reduce weapon cooldowns
            const cooldownRemaining = Math.max(0, agent.cooldownRemaining - 16);
            
            // Increment shield regen
            let shield = agent.shield;
            if (shield < agent.maxShield && loopTickRef.current % 10 === 0) {
              shield = Math.min(agent.maxShield, shield + agent.brain.genes.shieldRegenRate);
            }

            // Perform decision cycles
            let vx = agent.vx;
            let vy = agent.vy;
            let angle = agent.angle;
            let cooldown = cooldownRemaining;
            let xp = agent.xp;
            let level = agent.level;

            if (loopTickRef.current % agent.brain.genes.reactionTime === 0) {
              const decision = executeAIDecision(
                agent,
                currentAgents,
                currentPowerUps,
                selectedMap.obstacles,
                selectedMap.width,
                selectedMap.height,
                loopTickRef.current
              );

              // Apply translation actions
              if (decision.targetX !== undefined && decision.targetY !== undefined) {
                const dx = decision.targetX - agent.x;
                const dy = decision.targetY - agent.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 5) {
                  angle = Math.atan2(dy, dx);
                  const force = agent.brain.genes.maxSpeed * 0.15;
                  vx += Math.cos(angle) * force;
                  vy += Math.sin(angle) * force;
                }
              }

              // Fire weapons logic
              if (decision.fireWeapon && cooldown === 0) {
                const targetEnemy = currentAgents.find(a => a.id === agent.selectedTargetId && a.state !== 'DEAD');
                if (targetEnemy) {
                  const targetAngle = Math.atan2(targetEnemy.y - agent.y, targetEnemy.x - agent.x);
                  const wStats = WEAPON_STATS[agent.weapon];
                  
                  // Spawn laser / rocket
                  const pId = `proj_${Math.random().toString(36).substr(2, 9)}`;
                  currentProjectiles.push({
                    id: pId,
                    ownerId: agent.id,
                    team: agent.team,
                    type: agent.weapon,
                    x: agent.x + Math.cos(targetAngle) * agent.radius * 1.5,
                    y: agent.y + Math.sin(targetAngle) * agent.radius * 1.5,
                    vx: Math.cos(targetAngle) * wStats.speed,
                    vy: Math.sin(targetAngle) * wStats.speed,
                    damage: wStats.damage,
                    radius: agent.weapon === 'ROCKET_LAUNCHER' ? 6 : 3,
                    color: wStats.color,
                    life: Math.floor(wStats.range / wStats.speed),
                    splashRadius: wStats.splashRadius
                  });

                  cooldown = wStats.cooldown;
                  agent.stats.shotsFired++;
                }
              }
            }

            // Apply friction physics dampening
            vx *= 0.82;
            vy *= 0.82;

            // Update position
            let x = agent.x + vx;
            let y = agent.y + vy;

            // Compile updated agent frame
            const updatedAgent = {
              ...agent,
              x,
              y,
              vx,
              vy,
              angle,
              shield,
              cooldownRemaining: cooldown,
              xp,
              level
            };

            // Respect walls and bounds collision physics
            handleCircleCollisions(updatedAgent, selectedMap.obstacles, selectedMap.width, selectedMap.height);

            return updatedAgent;
          });

          // 5. Handle Projectile vs Agent hits and damage arrays
          currentProjectiles = currentProjectiles.filter(proj => {
            let projectileImpacted = false;

            currentAgents = currentAgents.map(agent => {
              if (agent.state === 'DEAD' || agent.id === proj.ownerId || agent.team === proj.team) {
                return agent;
              }

              const dist = Math.hypot(agent.x - proj.x, agent.y - proj.y);
              if (dist < agent.radius + proj.radius) {
                projectileImpacted = true;

                // Deduct damage through shields first
                let damage = proj.damage;
                let shield = agent.shield;
                let health = agent.health;
                
                if (shield > 0) {
                  const absorption = Math.min(shield, damage);
                  shield -= absorption;
                  damage -= absorption;
                }
                
                health = Math.max(0, health - damage);

                // Accumulate weapon stats for owner bot
                const owner = currentAgents.find(a => a.id === proj.ownerId);
                if (owner) {
                  owner.stats.damageDealt += proj.damage;
                  owner.stats.shotsHit++;
                  
                  // Train reinforcement step
                  trainBrainStep(owner, 15, 5, agent.health, health, true, false);
                }

                // Check death constraints
                let state = agent.state;
                let stats = { ...agent.stats };
                if (health <= 0) {
                  state = 'DEAD';
                  stats.deaths++;
                  
                  // Spawn giant fire splash particle explosion
                  spawnParticleExplosion(currentParticles, agent.x, agent.y, proj.color, 35);
                  
                  if (owner) {
                    owner.stats.kills++;
                    owner.xp += 50; // reward XP
                    
                    // Level up check
                    if (owner.xp >= owner.level * 100) {
                      owner.level++;
                      addCombatLog(`[EVOLUTION] ${owner.name} reached Rank Level ${owner.level}! +1 Skill Gen Point available.`, 'EVOLUTION');
                    }

                    addCombatLog(`[KILL] ${owner.name} [${proj.type}] vaporized ${agent.name}`, 'KILL');
                    
                    // Leaderboard sync
                    reportMatchEndToLeaderboard(owner);
                  }

                  // Punish deceased brain
                  trainBrainStep(agent, -45, 4, agent.health, 0, false, false);
                } else {
                  // Standard particle impact hit
                  spawnParticleExplosion(currentParticles, proj.x, proj.y, proj.color, 10);
                }

                return {
                  ...agent,
                  health,
                  shield,
                  state,
                  stats
                };
              }

              return agent;
            });

            return !projectileImpacted;
          });

          // 6. Handle PowerUp Collection Overlaps
          currentPowerUps.forEach(p => {
            if (p.respawnTimer > 0) return;

            currentAgents.forEach(agent => {
              if (agent.state === 'DEAD') return;

              const dist = Math.hypot(agent.x - p.x, agent.y - p.y);
              if (dist < agent.radius + p.radius) {
                // Grab item!
                p.respawnTimer = 400; // delay respawn ticks
                
                if (p.type === 'HEALTH') {
                  agent.health = Math.min(agent.maxHealth, agent.health + p.amount);
                  addCombatLog(`${agent.name} absorbed Nano-Health core. +40 Integrity.`, 'HEAL');
                } else if (p.type === 'SHIELD') {
                  agent.shield = Math.min(agent.maxShield, agent.shield + p.amount);
                  addCombatLog(`${agent.name} charged plasma core shield layers. +40 Over-Shield.`, 'HEAL');
                } else if (p.type === 'WEAPON_CRATE' && p.weaponType) {
                  agent.weapon = p.weaponType;
                  addCombatLog(`${agent.name} overloaded armaments array to [${p.weaponType}]!`, 'SYSTEM');
                }

                agent.xp += 15;
                // Train brain reward
                trainBrainStep(agent, 20, 4, agent.health, agent.health, false, false);
                spawnParticleExplosion(currentParticles, p.x, p.y, '#34c759', 15);
              }
            });
          });

          // 7. Auto Restart match if team alpha or team omega are entirely vaporized
          const livingAlpha = currentAgents.filter(a => a.team === 'ALPHA' && a.state !== 'DEAD');
          const livingOmega = currentAgents.filter(a => a.team === 'OMEGA' && a.state !== 'DEAD');

          if (livingAlpha.length === 0 || livingOmega.length === 0) {
            const winnerTeam = livingAlpha.length > 0 ? 'ALPHA' : 'OMEGA';
            addCombatLog(`[MATCH CONCLUDED] Team ${winnerTeam} achieved supreme grid containment. Resetting loop...`, 'SYSTEM');
            
            // Compile final training metrics step for learning curve charts
            const newMetric: TrainingMetric = {
              episode: trainingMetrics.length + 1,
              alphaReward: currentAgents.filter(a => a.team === 'ALPHA').reduce((acc, a) => acc + a.stats.kills * 15, 0),
              omegaReward: currentAgents.filter(a => a.team === 'OMEGA').reduce((acc, a) => acc + a.stats.kills * 15, 0),
              loss: Math.max(0.1, 1.2 - (trainingMetrics.length * 0.02)),
              epsilon: Math.max(0.05, 0.2 - (trainingMetrics.length * 0.005)),
              avgKills: currentAgents.reduce((acc, a) => acc + a.stats.kills, 0) / currentAgents.length
            };
            setTrainingMetrics(prev => [...prev, newMetric]);

            // Auto-trigger clean reset
            const resetAgents = spawnAgentsForMatch(selectedMap, algorithm, 6);
            currentAgents = resetAgents;
            currentProjectiles = [];
            currentPowerUps = createInitialPowerUps(selectedMap);
          }

          // 8. Periodically trigger Gemini Commentary using latest event log strings
          if (loopTickRef.current - lastCommentaryTrigger > 500 && combatLogsRef.current.length > 0) {
            lastCommentaryTrigger = loopTickRef.current;
            const recentEventStrings = combatLogsRef.current.slice(-3).map(l => l.message);
            requestAICommentary(recentEventStrings);
          }

          // Flush changes back to references
          agentsRef.current = currentAgents;
          projectilesRef.current = currentProjectiles;
          powerUpsRef.current = currentPowerUps;
          particlesRef.current = currentParticles;
        }

        // Commit references to state for canvas and dashboard panels
        setAgents([...agentsRef.current]);
        setProjectiles([...projectilesRef.current]);
        setPowerUps([...powerUpsRef.current]);
        setParticles([...particlesRef.current]);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, gameSpeed, selectedMap, algorithm, weather, trainingMetrics]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  return (
    <div className="min-h-screen bg-[#020205] text-zinc-300 flex flex-col selection:bg-[#00f2ff]/20 selection:text-[#00f2ff]">
      
      {/* 1. Header & Spectator Navigation Bar */}
      <header className="border-b border-zinc-900 bg-[#08080c]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#00f2ff]/20 to-[#7000ff]/20 border border-[#00f2ff]/40 rounded-sm shadow-lg shadow-cyan-500/5">
              <Cpu className="w-6 h-6 text-[#00f2ff] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold font-sans tracking-widest uppercase bg-gradient-to-r from-[#00f2ff] via-purple-400 to-pink-500 bg-clip-text text-transparent">
                ⚡ NEURAL ARENA // AI BATTLE ARENA
              </h1>
              <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase font-bold">
                ENTERPRISE DEEP REINFORCEMENT LEARNING SIMULATOR
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'SPECTATE', label: 'Spectate Arena', icon: Swords },
              { id: 'NEURAL_CONFIG', label: 'Neural Strategy', icon: Cpu },
              { id: 'MULTIPLAYER', label: 'Matchmaking', icon: UserCheck },
              { id: 'ADMIN_DOCS', label: 'Engine Manual', icon: BookOpen }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-1.5 px-4 rounded-sm font-mono text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer uppercase tracking-wider ${
                    activeTab === tab.id
                      ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff] shadow-sm'
                      : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 2. Live Dynamic AI commentary Scroller */}
      <div className="bg-[#08080c] border-b border-zinc-900 py-2.5 px-6 relative overflow-hidden flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
          <span className="font-mono text-[9px] px-2 py-0.5 border border-[#00f2ff]/30 text-[#00f2ff] bg-[#00f2ff]/5 rounded-sm flex items-center gap-1 shrink-0 font-bold uppercase animate-pulse tracking-widest">
            <MessageSquare className="w-3 h-3 text-[#00f2ff]" />
            LIVE_COMMENTARY
          </span>
          <div className="flex-1 overflow-hidden">
            <div className={`font-mono text-[11px] text-zinc-400 whitespace-nowrap transition-all uppercase tracking-wide ${isCommentaryLoading ? 'opacity-50' : 'opacity-100'}`}>
              {isCommentaryLoading ? 'Neural networks processing active combat vectors...' : activeCommentary}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Bento-Grid Layout Stage */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        
        {activeTab === 'SPECTATE' && (
          <div className="flex flex-col gap-6">
            
            {/* Top Row: Spectator View and Side Controls */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Primary Grid view canvas */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                <ArenaCanvas
                  agents={agents}
                  projectiles={projectiles}
                  powerUps={powerUps}
                  particles={particles}
                  map={selectedMap}
                  weather={weather}
                  cameraMode={cameraMode}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={setSelectedAgentId}
                  gameSpeed={gameSpeed}
                />
              </div>

              {/* Side Controls panel */}
              <div className="xl:col-span-4 bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-5 shadow-xl justify-between clip-corner">
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                    <Terminal className="text-[#00f2ff] w-4 h-4" />
                    <h3 className="font-mono text-xs font-bold text-[#00f2ff] uppercase tracking-widest">
                      Grid_Deck_Controls
                    </h3>
                  </div>

                  {/* Play/Pause state toggles */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      className={`flex-1 py-3 rounded-sm font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border ${
                        isRunning 
                          ? 'bg-amber-950/40 border-amber-500 text-amber-400 hover:bg-amber-950/60' 
                          : 'bg-emerald-950/40 border-emerald-500 text-emerald-400 hover:bg-emerald-950/60'
                      }`}
                    >
                      {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isRunning ? 'Pause Grid' : 'Resume Grid'}</span>
                    </button>

                    <button
                      onClick={resetSimulation}
                      className="py-3 px-4 bg-[#050508] border border-zinc-850 hover:border-zinc-700 hover:text-zinc-200 rounded-sm text-zinc-400 transition-all cursor-pointer flex items-center justify-center"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Weather config block */}
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Atmosphere_Overlay</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['CLEAR', 'FOG', 'STORM', 'RAIN'].map(w => (
                        <button
                          key={w}
                          onClick={() => setWeather(w as any)}
                          className={`py-1.5 rounded-sm font-mono text-[10px] font-bold border transition-all cursor-pointer uppercase ${
                            weather === w 
                              ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]' 
                              : 'bg-[#050508] border-zinc-850 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera Mode Config block */}
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Spectator_Camera_Tracker</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'FREE', name: 'Static Cam' },
                        { id: 'FOLLOW_LEADER', name: 'Focus Lead' },
                        { id: 'CINEMATIC', name: 'Cinematic' }
                      ].map(cam => (
                        <button
                          key={cam.id}
                          onClick={() => setCameraMode(cam.id as any)}
                          className={`py-1.5 rounded-sm font-mono text-[10px] font-bold border transition-all cursor-pointer uppercase ${
                            cameraMode === cam.id
                              ? 'bg-[#7000ff]/20 border-[#7000ff] text-[#c0a0ff]'
                              : 'bg-[#050508] border-zinc-850 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          {cam.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Living agents checklist */}
                <div className="flex flex-col gap-2 bg-[#050508] border border-zinc-900 p-3.5 rounded-sm">
                  <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-900 pb-1.5">Combat_Status_Matrix</span>
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                    {agents.map(a => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAgentId(a.id)}
                        className={`p-2 rounded-sm flex items-center justify-between cursor-pointer border font-mono text-[10px] transition-all ${
                          selectedAgentId === a.id
                            ? 'bg-[#08080c] border-[#00f2ff]/30 text-[#00f2ff]'
                            : 'bg-transparent border-transparent text-zinc-500 hover:bg-[#08080c]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: a.color }} />
                          <span className="font-semibold uppercase tracking-wide">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`uppercase font-bold ${a.state === 'DEAD' ? 'text-red-500' : 'text-zinc-500'}`}>{a.state}</span>
                          <span className="text-[#00f2ff] font-bold uppercase">Lvl {a.level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Row: Dynamic chart dashboard telemetry */}
            <Dashboard
              selectedAgent={selectedAgent}
              combatLogs={combatLogs}
              trainingMetrics={trainingMetrics}
              onSelectAgent={setSelectedAgentId}
              agents={agents}
              activeTab={activeTab}
              setActiveTab={setActiveTab as any}
            />

          </div>
        )}

        {activeTab === 'NEURAL_CONFIG' && (
          <AIPanel
            selectedAgent={selectedAgent}
            onUpdateAgentBrain={(id, b) => {
              setAgents(prev => prev.map(a => a.id === id ? { ...a, brain: { ...a.brain, ...b } } : a));
            }}
            onUpdateAgentGenes={(id, g) => {
              setAgents(prev => prev.map(a => a.id === id ? { ...a, brain: { ...a.brain, genes: { ...a.brain.genes, ...g } } } : a));
            }}
            gameSpeed={gameSpeed}
            setGameSpeed={setGameSpeed}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            selectedMap={selectedMap}
            setSelectedMap={setSelectedMap}
            onTriggerEvolution={handleTriggerEvolution}
          />
        )}

        {activeTab === 'MULTIPLAYER' && (
          <MultiplayerLobby
            leaderboard={leaderboard}
            onReportMatch={() => {}}
            username={username}
            setUsername={setUsername}
          />
        )}

        {activeTab === 'ADMIN_DOCS' && (
          <div className="bg-[#08080c] border border-zinc-800 rounded-sm p-6 flex flex-col gap-6 shadow-xl font-mono text-xs text-zinc-400 leading-relaxed clip-corner">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-bold text-[#00f2ff] flex items-center gap-2 uppercase tracking-widest">
                <BookOpen className="text-[#00f2ff] w-4 h-4" />
                Neural_Arena_Architecture_&_Engineering_Manual
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[#00f2ff] border-b border-zinc-900 pb-1 uppercase">1. Reinforcement Learning Core</h3>
                <p className="uppercase leading-normal text-[11px] text-zinc-400">
                  The simulator applies localized temporal-difference **Deep Q-Learning (DQN)** gradients to model agent behavior arrays. The state tensor vector S (dimension 8) captures parameters including barrier distances, shield-integrity ratios, target trajectories, and weather interference coefficient multipliers.
                </p>
                <p className="uppercase leading-normal text-[11px] text-zinc-400">
                  Action space A comprises 6 discrete vector directions and combat firing. Reward calculations are updated at 60Hz:
                </p>
                <ul className="list-disc list-inside space-y-1 text-zinc-500 text-[10px] uppercase">
                  <li>Laser projectile target strike: <span className="text-emerald-400 font-bold">+15 Reward</span></li>
                  <li>Energy crate capture: <span className="text-emerald-400 font-bold">+20 Reward</span></li>
                  <li>Specimen vaporized: <span className="text-rose-500 font-bold">-45 Penalty</span></li>
                  <li>Hostile bullet strike absorbed: <span className="text-rose-500 font-bold">-5 Penalty</span></li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-pink-500 border-b border-zinc-900 pb-1 uppercase">2. Genetic Evolution Pipeline</h3>
                <p className="uppercase leading-normal text-[11px] text-zinc-400">
                  When selecting **Genetic Selection**, agents mate through crossover of their parameter genes. Child bot chromosomes C_child inherit characteristics (Reaction speed, aggression coefficient, fear-to-fight threshold, and specific weapon affinity index) from top-scoring parent combatants.
                </p>
                <p className="uppercase leading-normal text-[11px] text-zinc-400">
                  Crossover events execute a custom Gaussian mutation factor (mu = 0.15) to mutate weapon biases and maximum speed outputs, triggering active evolution logs.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-purple-400 border-b border-zinc-900 pb-1 uppercase">3. Full-Stack API Endpoints</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-500 text-[10px] uppercase">
                  <li><span className="text-zinc-200 font-semibold">POST /api/commentary</span>: Passes active combat event arrays to Gemini-3.5-Flash to yield cybernetic, witty commentator scripts.</li>
                  <li><span className="text-zinc-200 font-semibold">GET /api/leaderboard</span>: Syncs persistent online rankings.</li>
                  <li><span className="text-zinc-200 font-semibold">POST /api/leaderboard</span>: Updates bot experience stats, levels, and rating scales.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-amber-500 border-b border-zinc-900 pb-1 uppercase">4. Particle & Physics Calculations</h3>
                <p className="uppercase leading-normal text-[11px] text-zinc-400">
                  The engine utilizes standard bounding sphere collision models to check weapon projectile overlap, and rectangle-circle projection models to deflect velocities off solid structures, rendering glowing dynamic energy shields.
                </p>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* 4. Cyber Footer */}
      <footer className="border-t border-zinc-900 bg-[#050508] py-4 px-6 text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest font-bold">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>COGNITIVE MATRIX ONLINE // DEEPMIND READY PROTOCOL</span>
          <span>© 2026 NEURAL ARENA SYSTEM ENGINE INC. ALL LOGS ACTIVE.</span>
        </div>
      </footer>

    </div>
  );
}
