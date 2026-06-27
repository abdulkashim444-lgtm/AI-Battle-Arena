/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, Projectile, PowerUp, SimulationMap, Particle, CombatLog, TeamType, WeaponType } from '../types';
import { createNewAgent, WEAPON_STATS, generateBotName } from './agent';

export const MAPS: Record<string, SimulationMap> = {
  CYBER_CITY: {
    id: 'cyber_city',
    name: 'Cyber City Neo',
    theme: 'CYBER_CITY',
    width: 1000,
    height: 600,
    obstacles: [
      { x: 150, y: 150, width: 80, height: 300, color: '#00f0ff' },
      { x: 770, y: 150, width: 80, height: 300, color: '#00f0ff' },
      { x: 380, y: 240, width: 240, height: 120, color: '#ff007f' }
    ],
    accentColor: '#00f0ff'
  },
  SPACE_STATION: {
    id: 'space_station',
    name: 'Orbital Gateway Sector 7',
    theme: 'SPACE_STATION',
    width: 1000,
    height: 600,
    obstacles: [
      { x: 450, y: 50, width: 100, height: 120, color: '#a1a1aa' },
      { x: 450, y: 430, width: 100, height: 120, color: '#a1a1aa' },
      { x: 150, y: 220, width: 150, height: 160, color: '#38bdf8' },
      { x: 700, y: 220, width: 150, height: 160, color: '#38bdf8' }
    ],
    accentColor: '#38bdf8'
  },
  LAVA_PLANET: {
    id: 'lava_planet',
    name: 'Mustafar Core Breach',
    theme: 'LAVA_PLANET',
    width: 1000,
    height: 600,
    obstacles: [
      { x: 200, y: 100, width: 600, height: 60, color: '#f97316' },
      { x: 200, y: 440, width: 600, height: 60, color: '#f97316' },
      { x: 470, y: 220, width: 60, height: 160, color: '#ef4444' }
    ],
    accentColor: '#f97316'
  },
  DIGITAL_GRID: {
    id: 'digital_grid',
    name: 'Tron Simulation Deck v9',
    theme: 'DIGITAL_GRID',
    width: 1000,
    height: 600,
    obstacles: [
      { x: 200, y: 200, width: 120, height: 120, color: '#a855f7' },
      { x: 680, y: 200, width: 120, height: 120, color: '#a855f7' },
      { x: 440, y: 120, width: 120, height: 60, color: '#ec4899' },
      { x: 440, y: 420, width: 120, height: 60, color: '#ec4899' }
    ],
    accentColor: '#a855f7'
  }
};

export function createInitialPowerUps(map: SimulationMap): PowerUp[] {
  const powerUps: PowerUp[] = [
    { id: 'p1', type: 'HEALTH', x: map.width * 0.25, y: map.height * 0.2, radius: 10, amount: 40, respawnTimer: 0 },
    { id: 'p2', type: 'SHIELD', x: map.width * 0.75, y: map.height * 0.2, radius: 10, amount: 40, respawnTimer: 0 },
    { id: 'p3', type: 'HEALTH', x: map.width * 0.25, y: map.height * 0.8, radius: 10, amount: 40, respawnTimer: 0 },
    { id: 'p4', type: 'SHIELD', x: map.width * 0.75, y: map.height * 0.8, radius: 10, amount: 40, respawnTimer: 0 },
    { id: 'p5', type: 'DAMAGE_BOOST', x: map.width * 0.5, y: map.height * 0.5, radius: 12, amount: 2, respawnTimer: 0 },
    { id: 'p6', type: 'WEAPON_CRATE', x: map.width * 0.5, y: map.height * 0.15, radius: 12, amount: 1, respawnTimer: 0, weaponType: 'ROCKET_LAUNCHER' },
    { id: 'p7', type: 'WEAPON_CRATE', x: map.width * 0.5, y: map.height * 0.85, radius: 12, amount: 1, respawnTimer: 0, weaponType: 'SNIPER' }
  ];
  return powerUps;
}

export function spawnAgentsForMatch(
  map: SimulationMap,
  algorithm: 'DQN' | 'DOUBLE_DQN' | 'GENETIC' | 'BEHAVIOR_TREE' | 'UTILITY_AI',
  count: number = 6
): Agent[] {
  const agents: Agent[] = [];
  const spacingX = map.width / (count / 2 + 1);
  
  for (let i = 0; i < count; i++) {
    const isAlpha = i % 2 === 0;
    const team: TeamType = isAlpha ? 'ALPHA' : 'OMEGA';
    
    // Distribute left and right spawn points
    const spawnX = isAlpha 
      ? 80 + Math.random() * 120 
      : map.width - 200 + Math.random() * 120;
    
    const spawnY = 100 + ((i / 2) * (map.height - 200) / (count / 2 - 0.5)) + (Math.random() * 40 - 20);
    
    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const name = generateBotName();
    
    agents.push(createNewAgent(botId, name, team, algorithm, spawnX, spawnY));
  }
  
  return agents;
}

export function spawnParticleExplosion(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number = 15
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: 2 + Math.random() * 4,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.03
    });
  }
}

/**
 * Handle obstacles and map boundary physics collisions for agents
 */
export function handleCircleCollisions(
  agent: Agent,
  obstacles: { x: number; y: number; width: number; height: number }[],
  mapWidth: number,
  mapHeight: number
) {
  // 1. Boundary check
  if (agent.x - agent.radius < 0) {
    agent.x = agent.radius;
    agent.vx *= -0.2;
  } else if (agent.x + agent.radius > mapWidth) {
    agent.x = mapWidth - agent.radius;
    agent.vx *= -0.2;
  }

  if (agent.y - agent.radius < 0) {
    agent.y = agent.radius;
    agent.vy *= -0.2;
  } else if (agent.y + agent.radius > mapHeight) {
    agent.y = mapHeight - agent.radius;
    agent.vy *= -0.2;
  }

  // 2. Obstacles check
  for (const obs of obstacles) {
    // Closest point on rectangle to circle center
    const closestX = Math.max(obs.x, Math.min(agent.x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(agent.y, obs.y + obs.height));
    
    const dist = Math.hypot(agent.x - closestX, agent.y - closestY);
    if (dist < agent.radius) {
      // Collision detected! Push circle away
      const overlap = agent.radius - dist;
      const angle = dist > 0.01 
        ? Math.atan2(agent.y - closestY, agent.x - closestX)
        : Math.random() * Math.PI * 2;
        
      agent.x += Math.cos(angle) * overlap;
      agent.y += Math.sin(angle) * overlap;
      
      // Bounce velocity mildly
      agent.vx *= -0.3;
      agent.vy *= -0.3;
    }
  }
}

/**
 * Checks if a direct projectile intersects an obstacle
 */
export function isCollidingWithObstacles(
  x: number,
  y: number,
  radius: number,
  obstacles: { x: number; y: number; width: number; height: number }[]
): boolean {
  for (const obs of obstacles) {
    const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
    const dist = Math.hypot(x - closestX, y - closestY);
    if (dist < radius) return true;
  }
  return false;
}
