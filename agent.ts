/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, AgentBrain, TeamType, WeaponType, AIAlgorithm, PowerUp } from '../types';

export const WEAPON_STATS: Record<WeaponType, {
  name: string;
  damage: number;
  speed: number;
  range: number;
  cooldown: number;
  color: string;
  splashRadius?: number;
}> = {
  LASER_RIFLE: { name: 'Volt Laser', damage: 12, speed: 12, range: 450, cooldown: 300, color: '#00f0ff' },
  ROCKET_LAUNCHER: { name: 'Hyper Rocket', damage: 35, speed: 6, range: 500, cooldown: 1200, color: '#ff3b30', splashRadius: 60 },
  ENERGY_SWORD: { name: 'Plasma Katana', damage: 45, speed: 15, range: 50, cooldown: 400, color: '#af52de' },
  PLASMA_CANNON: { name: 'Singularity Core', damage: 25, speed: 8, range: 400, cooldown: 800, color: '#ff9500' },
  GRAVITY_GUN: { name: 'Grav-Beam Force', damage: 8, speed: 14, range: 350, cooldown: 200, color: '#34c759' },
  SNIPER: { name: 'Rail Overload', damage: 50, speed: 22, range: 700, cooldown: 1800, color: '#ffcc00' }
};

const BOT_FIRST_NAMES = [
  'Hyperion', 'Nemesis', 'Aegis', 'Vortex', 'Cypher', 'Specter', 'Zephyr', 'Nova', 
  'Apex', 'Goliath', 'Sentinel', 'Hydra', 'Chronos', 'Titan', 'Ghost', 'Reaper',
  'Nexus', 'Oracle', 'Solstice', 'Zenith', 'Phantom', 'Odin', 'Ragnarok', 'Valiant'
];

const BOT_LAST_NAMES = [
  'Alpha', 'X-9', 'Core', 'V2', 'Prime', 'Synth', 'MK-IV', 'Delta', 'Beta', 'Omega',
  'Override', 'Protocol', 'Vector', 'Quantum', 'Glitch', 'Phantom', 'Void', 'Zero'
];

export function generateBotName(): string {
  const first = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
  const last = BOT_LAST_NAMES[Math.floor(Math.random() * BOT_LAST_NAMES.length)];
  return `${first} ${last}`;
}

export function createBrain(algorithm: AIAlgorithm, favoriteWeapon?: WeaponType): AgentBrain {
  const weapons: WeaponType[] = ['LASER_RIFLE', 'ROCKET_LAUNCHER', 'ENERGY_SWORD', 'PLASMA_CANNON', 'GRAVITY_GUN', 'SNIPER'];
  const chosenWeapon = favoriteWeapon || weapons[Math.floor(Math.random() * weapons.length)];

  // Neural network weights (approximating 12 inputs and 4 actions)
  const numInputs = 8;
  const numActions = 6; // Move N, S, E, W, Seek Powerup, Attack Closest
  const weights = Array.from({ length: numInputs * numActions }, () => (Math.random() * 2 - 1));

  return {
    algorithm,
    learningRate: 0.1,
    epsilon: 0.2,
    discount: 0.9,
    qTable: {},
    weights,
    genes: {
      maxSpeed: 2.5 + Math.random() * 1.5,
      reactionTime: Math.floor(2 + Math.random() * 6), // frame delay
      aggression: 0.2 + Math.random() * 0.8,
      fearThreshold: 0.1 + Math.random() * 0.5,
      weaponPreference: chosenWeapon,
      shieldRegenRate: 0.05 + Math.random() * 0.1,
      maxHealthBonus: Math.floor(Math.random() * 40)
    },
    learningHistory: []
  };
}

export function createNewAgent(
  id: string,
  name: string,
  team: TeamType,
  algorithm: AIAlgorithm,
  x: number,
  y: number,
  customWeapon?: WeaponType
): Agent {
  const brain = createBrain(algorithm, customWeapon);
  const maxHealth = 100 + brain.genes.maxHealthBonus;

  const combatStyles = ['Aggressive Duelist', 'Tactical Long-Range', 'Stealth Striker', 'Powerup Gatherer', 'Adaptive Tank'];

  return {
    id,
    name,
    team,
    level: 1,
    xp: 0,
    health: maxHealth,
    maxHealth,
    shield: 50,
    maxShield: 50,
    energy: 100,
    maxEnergy: 100,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: Math.random() * Math.PI * 2,
    targetAngle: Math.random() * Math.PI * 2,
    radius: 16,
    state: 'WANDERING',
    weapon: brain.genes.weaponPreference,
    cooldownRemaining: 0,
    color: team === 'ALPHA' ? '#00f0ff' : team === 'OMEGA' ? '#ff007f' : '#ff9500',
    brain,
    stats: {
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      shotsFired: 0,
      shotsHit: 0,
      matchesPlayed: 0
    },
    personality: {
      confidence: 0.5 + Math.random() * 0.5,
      fear: 0.2 + Math.random() * 0.3,
      aggression: brain.genes.aggression,
      combatStyle: combatStyles[Math.floor(Math.random() * combatStyles.length)]
    },
    skills: [],
    isDroneActive: Math.random() > 0.5,
    isShielding: false,
    selectedTargetId: null,
    lastDecisionTick: 0
  };
}

/**
 * Returns Q-table key based on discretized agent environment state
 */
function getDiscretizedStateKey(
  agent: Agent,
  nearestEnemy: Agent | null,
  nearestPowerUp: PowerUp | null
): string {
  const hpPercent = Math.floor((agent.health / agent.maxHealth) * 3); // 0, 1, 2
  const hasShield = agent.shield > 10 ? 1 : 0;
  
  let enemyDirection = 0; // 0: None, 1: N, 2: E, 3: S, 4: W
  if (nearestEnemy) {
    const dx = nearestEnemy.x - agent.x;
    const dy = nearestEnemy.y - agent.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      enemyDirection = dx > 0 ? 2 : 4;
    } else {
      enemyDirection = dy > 0 ? 3 : 1;
    }
  }

  let powerUpDirection = 0;
  if (nearestPowerUp) {
    const dx = nearestPowerUp.x - agent.x;
    const dy = nearestPowerUp.y - agent.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      powerUpDirection = dx > 0 ? 2 : 4;
    } else {
      powerUpDirection = dy > 0 ? 3 : 1;
    }
  }

  return `${hpPercent}_${hasShield}_${enemyDirection}_${powerUpDirection}`;
}

/**
 * Decides agent's actions based on chosen AI algorithm
 */
export function executeAIDecision(
  agent: Agent,
  otherAgents: Agent[],
  powerUps: PowerUp[],
  obstacles: { x: number; y: number; width: number; height: number }[],
  mapWidth: number,
  mapHeight: number,
  tick: number
): { action: number; targetX?: number; targetY?: number; fireWeapon?: boolean } {
  // Filter living enemies
  const enemies = otherAgents.filter(a => a.id !== agent.id && a.team !== agent.team && a.state !== 'DEAD');
  
  let nearestEnemy: Agent | null = null;
  let minEnemyDist = Infinity;
  for (const enemy of enemies) {
    const dist = Math.hypot(enemy.x - agent.x, enemy.y - agent.y);
    if (dist < minEnemyDist) {
      minEnemyDist = dist;
      nearestEnemy = enemy;
    }
  }

  // Filter available powerups
  const activePowerUps = powerUps.filter(p => p.respawnTimer <= 0);
  let nearestPowerUp: PowerUp | null = null;
  let minPowerUpDist = Infinity;
  for (const p of activePowerUps) {
    const dist = Math.hypot(p.x - agent.x, p.y - agent.y);
    if (dist < minPowerUpDist) {
      minPowerUpDist = dist;
      nearestPowerUp = p;
    }
  }

  // Update personality states dynamically based on health/circumstance
  const hpRatio = agent.health / agent.maxHealth;
  agent.personality.fear = Math.max(0, 1 - hpRatio - (agent.shield > 0 ? 0.3 : 0));
  agent.personality.confidence = hpRatio * (1 + agent.stats.kills * 0.1);

  // 1. BEHAVIOR TREE ALGORITHM
  if (agent.brain.algorithm === 'BEHAVIOR_TREE') {
    // Condition 1: Low health, needs to escape or secure powerup
    if (hpRatio < agent.brain.genes.fearThreshold && nearestPowerUp) {
      agent.state = 'FLEEING';
      return { action: 4, targetX: nearestPowerUp.x, targetY: nearestPowerUp.y };
    }

    // Condition 2: Has active target in range, attack!
    if (nearestEnemy && minEnemyDist < WEAPON_STATS[agent.weapon].range) {
      agent.state = 'ATTACKING';
      agent.selectedTargetId = nearestEnemy.id;
      return { action: 5, targetX: nearestEnemy.x, targetY: nearestEnemy.y, fireWeapon: true };
    }

    // Condition 3: No weapon range, seek enemy or powerup
    if (nearestPowerUp && minPowerUpDist < 300) {
      agent.state = 'WANDERING';
      return { action: 4, targetX: nearestPowerUp.x, targetY: nearestPowerUp.y };
    }

    if (nearestEnemy) {
      agent.state = 'CHASING';
      return { action: 5, targetX: nearestEnemy.x, targetY: nearestEnemy.y };
    }

    agent.state = 'WANDERING';
    return { action: Math.floor(Math.random() * 4) }; // Wander directions
  }

  // 2. UTILITY AI / DECISION ENGINE
  if (agent.brain.algorithm === 'UTILITY_AI') {
    // Calculate utilities (0 to 1)
    const fleeUtility = (1 - hpRatio) * 1.2;
    const attackUtility = nearestEnemy ? (agent.personality.aggression * (1.5 - minEnemyDist / 1000)) : 0;
    const gatherUtility = nearestPowerUp ? (1.0 - minPowerUpDist / 1000) : 0;

    const maxUtility = Math.max(fleeUtility, attackUtility, gatherUtility, 0.1);

    if (maxUtility === fleeUtility && nearestEnemy) {
      agent.state = 'FLEEING';
      // Move opposite direction of enemy
      const oppositeX = agent.x - (nearestEnemy.x - agent.x);
      const oppositeY = agent.y - (nearestEnemy.y - agent.y);
      return { action: 4, targetX: oppositeX, targetY: oppositeY };
    } else if (maxUtility === attackUtility && nearestEnemy) {
      agent.state = 'ATTACKING';
      return { action: 5, targetX: nearestEnemy.x, targetY: nearestEnemy.y, fireWeapon: true };
    } else if (maxUtility === gatherUtility && nearestPowerUp) {
      agent.state = 'WANDERING';
      return { action: 4, targetX: nearestPowerUp.x, targetY: nearestPowerUp.y };
    }
  }

  // 3. REINFORCEMENT LEARNING: DQN / DOUBLE DQN (Simulated Action selection & Policy Weight Evaluation)
  // Define State Inputs:
  // 0: hp ratio, 1: shield ratio, 2: enemy dx, 3: enemy dy, 4: powerup dx, 5: powerup dy, 6: angle, 7: collision threat
  const stateInputs = [
    hpRatio,
    agent.shield / agent.maxShield,
    nearestEnemy ? (nearestEnemy.x - agent.x) / mapWidth : 0,
    nearestEnemy ? (nearestEnemy.y - agent.y) / mapHeight : 0,
    nearestPowerUp ? (nearestPowerUp.x - agent.x) / mapWidth : 0,
    nearestPowerUp ? (nearestPowerUp.y - agent.y) / mapHeight : 0,
    agent.angle / (Math.PI * 2),
    agent.x < 50 || agent.x > mapWidth - 50 || agent.y < 50 || agent.y > mapHeight - 50 ? 1 : 0
  ];

  // Action definition: 0: Move North, 1: Move South, 2: Move East, 3: Move West, 4: Seek Powerup, 5: Combat
  let chosenAction = 0;
  const isExploring = Math.random() < agent.brain.epsilon;

  if (isExploring) {
    chosenAction = Math.floor(Math.random() * 6);
  } else {
    // Neural network feedforward simulation
    // Q(s, a) = Sum(Inputs * weights[a])
    const qValues = [0, 0, 0, 0, 0, 0];
    const n = stateInputs.length;
    for (let a = 0; a < 6; a++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += stateInputs[i] * agent.brain.weights[a * n + i];
      }
      qValues[a] = sum;
    }
    chosenAction = qValues.indexOf(Math.max(...qValues));
  }

  // Translate Actions to target coordinates or direct actions
  if (chosenAction === 4 && nearestPowerUp) {
    agent.state = 'WANDERING';
    return { action: chosenAction, targetX: nearestPowerUp.x, targetY: nearestPowerUp.y };
  } else if (chosenAction === 5 && nearestEnemy) {
    agent.state = 'ATTACKING';
    const inRange = minEnemyDist < WEAPON_STATS[agent.weapon].range;
    return { action: chosenAction, targetX: nearestEnemy.x, targetY: nearestEnemy.y, fireWeapon: inRange };
  } else {
    agent.state = 'CHASING';
    // Direct movement offset
    const step = 80;
    let tx = agent.x;
    let ty = agent.y;
    if (chosenAction === 0) ty -= step;
    else if (chosenAction === 1) ty += step;
    else if (chosenAction === 2) tx += step;
    else if (chosenAction === 3) tx -= step;
    
    return { action: chosenAction, targetX: tx, targetY: ty };
  }
}

/**
 * Perform actual Q-learning policy update (weights update representing backpropagation)
 */
export function trainBrainStep(
  agent: Agent,
  reward: number,
  action: number,
  beforeHealth: number,
  afterHealth: number,
  hasHit: boolean,
  hasKilled: boolean
) {
  // DQN style reinforcement weight adaptation
  const learningRate = agent.brain.learningRate;
  const numInputs = 8;
  const weights = agent.brain.weights;

  // Adapt model weights for chosen action block to boost reward-relevant traits
  const offset = action * numInputs;
  for (let i = 0; i < numInputs; i++) {
    const featureSign = i === 0 ? (afterHealth > beforeHealth ? 1 : -1) : Math.random() * 2 - 1;
    // Gradient update proxy:
    weights[offset + i] += learningRate * reward * featureSign * 0.05;
    // Constrain weights
    weights[offset + i] = Math.max(-2, Math.min(2, weights[offset + i]));
  }

  // Update experience logs
  if (agent.brain.learningHistory.length > 50) {
    agent.brain.learningHistory.shift();
  }
  agent.brain.learningHistory.push({
    epoch: agent.brain.learningHistory.length + 1,
    reward: reward,
    loss: Math.max(0.01, 1 - Math.abs(reward) * 0.02)
  });
}

/**
 * Handle genetic crossover and mutation to yield a next generation agent
 */
export function mutateGenes(parentA: AgentBrain, parentB: AgentBrain): AgentBrain {
  const mutationChance = 0.15;
  const weapons: WeaponType[] = ['LASER_RIFLE', 'ROCKET_LAUNCHER', 'ENERGY_SWORD', 'PLASMA_CANNON', 'GRAVITY_GUN', 'SNIPER'];

  // Crossover max speed
  let speed = Math.random() > 0.5 ? parentA.genes.maxSpeed : parentB.genes.maxSpeed;
  if (Math.random() < mutationChance) {
    speed += (Math.random() * 2 - 1) * 0.5; // mutate speed
  }
  speed = Math.max(1.5, Math.min(5.0, speed));

  // Crossover aggression
  let aggression = Math.random() > 0.5 ? parentA.genes.aggression : parentB.genes.aggression;
  if (Math.random() < mutationChance) {
    aggression += (Math.random() * 2 - 1) * 0.15;
  }
  aggression = Math.max(0.1, Math.min(1.0, aggression));

  // Crossover weapon preference
  const weapon = Math.random() > 0.5 ? parentA.genes.weaponPreference : parentB.genes.weaponPreference;
  const finalWeapon = Math.random() < mutationChance ? weapons[Math.floor(Math.random() * weapons.length)] : weapon;

  return {
    algorithm: 'GENETIC',
    learningRate: parentA.learningRate,
    epsilon: Math.max(0.05, parentA.epsilon * 0.95), // slowly decay exploration over generations
    discount: parentA.discount,
    qTable: {},
    weights: parentA.weights.map((w, idx) => {
      // Neural crossover
      const parentVal = Math.random() > 0.5 ? w : parentB.weights[idx];
      return Math.random() < mutationChance ? parentVal + (Math.random() * 2 - 1) * 0.1 : parentVal;
    }),
    genes: {
      maxSpeed: speed,
      reactionTime: Math.max(1, Math.min(10, Math.random() > 0.5 ? parentA.genes.reactionTime : parentB.genes.reactionTime)),
      aggression: aggression,
      fearThreshold: Math.max(0.05, Math.min(0.6, Math.random() > 0.5 ? parentA.genes.fearThreshold : parentB.genes.fearThreshold)),
      weaponPreference: finalWeapon,
      shieldRegenRate: Math.max(0.01, Math.min(0.3, Math.random() > 0.5 ? parentA.genes.shieldRegenRate : parentB.genes.shieldRegenRate)),
      maxHealthBonus: Math.max(0, Math.min(100, Math.random() > 0.5 ? parentA.genes.maxHealthBonus : parentB.genes.maxHealthBonus))
    },
    learningHistory: []
  };
}
