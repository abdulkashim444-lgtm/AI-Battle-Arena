/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TeamType = 'ALPHA' | 'OMEGA' | 'PLAYER' | 'NEUTRAL';

export type WeaponType = 
  | 'LASER_RIFLE' 
  | 'ROCKET_LAUNCHER' 
  | 'ENERGY_SWORD' 
  | 'PLASMA_CANNON' 
  | 'GRAVITY_GUN'
  | 'SNIPER';

export type GameMode = 
  | 'AI_VS_AI' 
  | 'PLAYER_VS_AI' 
  | 'SANDBOX' 
  | 'EVOLUTION' 
  | 'RESEARCH' 
  | 'TOURNAMENT'
  | 'BATTLE_ROYALE';

export type AIAlgorithm = 'DQN' | 'DOUBLE_DQN' | 'GENETIC' | 'BEHAVIOR_TREE' | 'UTILITY_AI';

export interface WeaponStats {
  type: WeaponType;
  name: string;
  damage: number;
  speed: number; // projectile speed
  range: number;
  cooldown: number; // ms
  color: string;
  splashRadius?: number;
}

export interface AgentBrain {
  algorithm: AIAlgorithm;
  learningRate: number;
  epsilon: number; // exploration vs exploitation
  discount: number;
  qTable: Record<string, number[]>; // state -> action-values
  weights: number[]; // simple neural net weights
  genes: {
    maxSpeed: number;
    reactionTime: number; // tick delay
    aggression: number; // 0-1
    fearThreshold: number; // 0-1
    weaponPreference: WeaponType;
    shieldRegenRate: number;
    maxHealthBonus: number;
  };
  learningHistory: { epoch: number; reward: number; loss: number }[];
}

export interface Agent {
  id: string;
  name: string;
  team: TeamType;
  level: number;
  xp: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  radius: number;
  state: 'IDLE' | 'CHASING' | 'FLEEING' | 'WANDERING' | 'ATTACKING' | 'DEAD';
  weapon: WeaponType;
  cooldownRemaining: number;
  color: string;
  brain: AgentBrain;
  stats: {
    kills: number;
    deaths: number;
    damageDealt: number;
    shotsFired: number;
    shotsHit: number;
    matchesPlayed: number;
  };
  personality: {
    confidence: number; // 0-1
    fear: number; // 0-1
    aggression: number; // 0-1
    combatStyle: string;
  };
  skills: string[]; // unlocked skill tree node ids
  isDroneActive: boolean;
  isShielding: boolean;
  selectedTargetId: string | null;
  lastDecisionTick: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  team: TeamType;
  type: WeaponType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  life: number; // ticks left
  splashRadius?: number;
}

export interface PowerUp {
  id: string;
  type: 'HEALTH' | 'SHIELD' | 'DAMAGE_BOOST' | 'XP_CORE' | 'WEAPON_CRATE';
  x: number;
  y: number;
  radius: number;
  amount: number;
  respawnTimer: number; // ticks
  weaponType?: WeaponType;
}

export interface SimulationMap {
  id: string;
  name: string;
  theme: 'CYBER_CITY' | 'SPACE_STATION' | 'MARS' | 'ANCIENT_TEMPLE' | 'LAVA_PLANET' | 'DIGITAL_GRID';
  width: number;
  height: number;
  obstacles: { x: number; y: number; width: number; height: number; color?: string }[];
  accentColor: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
}

export interface CombatLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'KILL' | 'DAMAGE' | 'HEAL' | 'EVOLUTION' | 'SYSTEM' | 'COMMENTARY';
}

export interface LeaderboardEntry {
  rank: number;
  botName: string;
  level: number;
  kills: number;
  winRate: number;
  rating: number;
  algorithm: AIAlgorithm;
  favoriteWeapon: WeaponType;
}

export interface TrainingMetric {
  episode: number;
  alphaReward: number;
  omegaReward: number;
  loss: number;
  epsilon: number;
  avgKills: number;
}
