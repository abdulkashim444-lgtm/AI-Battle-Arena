/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Agent, Projectile, PowerUp, SimulationMap, Particle } from '../types';
import { WEAPON_STATS } from '../simulation/agent';
import { Shield, Target, Compass, Sparkles, Award } from 'lucide-react';

interface ArenaCanvasProps {
  agents: Agent[];
  projectiles: Projectile[];
  powerUps: PowerUp[];
  particles: Particle[];
  map: SimulationMap;
  weather: 'CLEAR' | 'FOG' | 'STORM' | 'RAIN';
  cameraMode: 'FREE' | 'FOLLOW_LEADER' | 'CINEMATIC';
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  gameSpeed: number;
}

export default function ArenaCanvas({
  agents,
  projectiles,
  powerUps,
  particles,
  map,
  weather,
  cameraMode,
  selectedAgentId,
  onSelectAgent,
  gameSpeed
}: ArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);

  // Floating text array for damage indicators
  const floatingTextsRef = useRef<{ id: string; x: number; y: number; text: string; color: string; age: number }[]>([]);

  // Update floating text ages and handle damage events
  useEffect(() => {
    // Look at projectile collision damage to create new floats
    // Just simple periodic state update or randomly added visuals
    const interval = setInterval(() => {
      floatingTextsRef.current = floatingTextsRef.current
        .map(t => ({ ...t, y: t.y - 1, age: t.age + 1 }))
        .filter(t => t.age < 40);
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, []);

  // Listen for agent damage to trigger floating numbers
  const previousHealthMap = useRef<Record<string, number>>({});
  useEffect(() => {
    agents.forEach(agent => {
      const prevHp = previousHealthMap.current[agent.id];
      if (prevHp !== undefined && agent.health < prevHp && agent.health > 0) {
        const diff = Math.round(prevHp - agent.health);
        floatingTextsRef.current.push({
          id: `${agent.id}_${Date.now()}_${Math.random()}`,
          x: agent.x + (Math.random() * 20 - 10),
          y: agent.y - 20,
          text: `-${diff}`,
          color: agent.team === 'ALPHA' ? '#ff4d4d' : '#ff944d',
          age: 0
        });
      }
      previousHealthMap.current[agent.id] = agent.health;
    });
  }, [agents]);

  // Main drawing engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle responsive sizing
    const handleResize = () => {
      const container = containerRef.current;
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = 450; // lock height for beautiful alignment
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    let gridOffset = 0;

    const render = () => {
      // Clear with elegant cyber-dark background
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Determine view coordinates based on Camera Mode
      let scale = Math.min(canvas.width / map.width, canvas.height / map.height);
      let offsetX = (canvas.width - map.width * scale) / 2;
      let offsetY = (canvas.height - map.height * scale) / 2;

      // Find leader
      const livingAgents = agents.filter(a => a.state !== 'DEAD');
      const leader = livingAgents.reduce((prev, current) => {
        return (prev?.stats.kills || 0) > (current?.stats.kills || 0) ? prev : current;
      }, livingAgents[0]);

      if (cameraMode === 'FOLLOW_LEADER' && leader) {
        scale = 1.3; // Zoom in
        offsetX = canvas.width / 2 - leader.x * scale;
        offsetY = canvas.height / 2 - leader.y * scale;
      } else if (cameraMode === 'CINEMATIC') {
        const elapsed = Date.now() * 0.0015;
        scale = 1.1 + Math.sin(elapsed) * 0.15; // smooth zoom wave
        const focusX = leader ? leader.x : map.width / 2;
        const focusY = leader ? leader.y : map.height / 2;
        offsetX = canvas.width / 2 - focusX * scale + Math.cos(elapsed * 0.5) * 60;
        offsetY = canvas.height / 2 - focusY * scale + Math.sin(elapsed * 0.5) * 60;
      }

      // 1. Draw glowing grid system
      gridOffset = (gridOffset + 0.3 * gameSpeed) % 40;
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.08)';
      ctx.lineWidth = 1;
      
      const gridStartX = offsetX % (40 * scale);
      const gridStartY = offsetY % (40 * scale);
      
      for (let x = gridStartX; x < canvas.width; x += 40 * scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = gridStartY; y < canvas.height; y += 40 * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Arena Borders
      ctx.strokeStyle = map.accentColor + '80';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = map.accentColor;
      ctx.strokeRect(offsetX, offsetY, map.width * scale, map.height * scale);
      ctx.shadowBlur = 0; // reset glow

      // 2. Draw obstacles
      map.obstacles.forEach(obs => {
        const obsX = offsetX + obs.x * scale;
        const obsY = offsetY + obs.y * scale;
        const obsW = obs.width * scale;
        const obsH = obs.height * scale;

        // Obstacle Base
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(obsX, obsY, obsW, obsH);

        // Cyber Grid Lines on obstacles
        ctx.strokeStyle = (obs.color || map.accentColor) + '40';
        ctx.lineWidth = 1;
        ctx.strokeRect(obsX, obsY, obsW, obsH);

        // Holographic stripes inside obstacles
        ctx.fillStyle = (obs.color || map.accentColor) + '12';
        for (let i = 0; i < obsW; i += 20 * scale) {
          ctx.fillRect(obsX + i, obsY, 4 * scale, obsH);
        }
      });

      // 3. Draw powerups
      powerUps.forEach(p => {
        if (p.respawnTimer > 0) return; // powerup is inactive
        
        const px = offsetX + p.x * scale;
        const py = offsetY + p.y * scale;
        const pulse = Math.sin(Date.now() * 0.01) * 3;
        const pr = (p.radius + pulse) * scale;

        let pColor = '#34c759'; // Health
        let innerLabel = 'H';
        if (p.type === 'SHIELD') {
          pColor = '#00f0ff';
          innerLabel = 'S';
        } else if (p.type === 'DAMAGE_BOOST') {
          pColor = '#ff3b30';
          innerLabel = 'D';
        } else if (p.type === 'WEAPON_CRATE') {
          pColor = '#ff9500';
          innerLabel = 'W';
        }

        // Draw outer glow circle
        ctx.fillStyle = pColor + '20';
        ctx.beginPath();
        ctx.arc(px, py, pr * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Core Circle
        ctx.fillStyle = pColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner label
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(innerLabel, px, py);
      });

      // 4. Draw projectiles
      projectiles.forEach(p => {
        const px = offsetX + p.x * scale;
        const py = offsetY + p.y * scale;
        const pr = p.radius * scale;

        // Bullet trail
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - p.vx * 1.5 * scale, py - p.vy * 1.5 * scale);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Projectile tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw particles (Explosions)
      particles.forEach(p => {
        const px = offsetX + p.x * scale;
        const py = offsetY + p.y * scale;
        const pr = p.radius * scale;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // reset alpha

      // 6. Draw agents
      agents.forEach(a => {
        if (a.state === 'DEAD') return;

        const ax = offsetX + a.x * scale;
        const ay = offsetY + a.y * scale;
        const ar = a.radius * scale;

        // Is hovered or selected
        const isSelected = a.id === selectedAgentId;
        const isHovered = a.id === hoveredAgentId;

        // Highlight ring under selected agent
        if (isSelected) {
          ctx.strokeStyle = '#ff9500';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ax, ay, ar * 1.6, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isHovered) {
          ctx.strokeStyle = '#ffffff80';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ax, ay, ar * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Active Drone Companion orbiting agent
        if (a.isDroneActive) {
          const orbitRadius = ar * 1.7;
          const orbitAngle = (Date.now() * 0.004) + (a.id.charCodeAt(0) * 0.1);
          const dx = ax + Math.cos(orbitAngle) * orbitRadius;
          const dy = ay + Math.sin(orbitAngle) * orbitRadius;

          // Drone draw
          ctx.fillStyle = a.color;
          ctx.beginPath();
          ctx.arc(dx, dy, 4 * scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff80';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(ax, ay);
          ctx.stroke();
        }

        // Energy shields
        if (a.shield > 0) {
          ctx.strokeStyle = '#00f0ff80';
          ctx.lineWidth = 3 * scale;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00f0ff';
          ctx.beginPath();
          ctx.arc(ax, ay, ar * 1.25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }

        // Draw Agent Body (Chassis)
        ctx.fillStyle = a.team === 'ALPHA' ? '#1e3a8a' : '#581c87';
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ax, ay, ar, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Direction Indicator (Pointer)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const pointerLength = ar * 1.3;
        ctx.arc(
          ax + Math.cos(a.angle) * pointerLength,
          ay + Math.sin(a.angle) * pointerLength,
          3 * scale,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Team Core Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ax, ay, ar * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(ax, ay, ar * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Draw dynamic HP Bar above head
        const barW = ar * 1.8;
        const barH = 4 * scale;
        const barX = ax - barW / 2;
        const barY = ay - ar - 12 * scale;

        // Background bar
        ctx.fillStyle = '#1e1e2d';
        ctx.fillRect(barX, barY, barW, barH);
        // Foreground bar
        const hpPercent = Math.max(0, a.health / a.maxHealth);
        ctx.fillStyle = hpPercent > 0.4 ? '#34c759' : '#ff3b30';
        ctx.fillRect(barX, barY, barW * hpPercent, barH);

        // Draw shield segment below hp bar
        if (a.shield > 0) {
          const shieldPercent = a.shield / a.maxShield;
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(barX, barY + 3 * scale, barW * shieldPercent, 2 * scale);
        }

        // Name and state text
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.round(8 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(a.name.split(' ')[0], ax, barY - 4 * scale);
      });

      // 7. Draw floating logs/damage indicators
      floatingTextsRef.current.forEach(t => {
        const tx = offsetX + t.x * scale;
        const ty = offsetY + t.y * scale;
        ctx.fillStyle = t.color;
        ctx.font = `bold ${Math.round(14)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(t.text, tx, ty);
      });

      // 8. Weather Layer Overlays
      if (weather === 'FOG') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (weather === 'STORM' || weather === 'RAIN') {
        // Render stylized rain streaks
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
          const rx = Math.random() * canvas.width;
          const ry = Math.random() * canvas.height;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 10, ry + 25);
          ctx.stroke();
        }
      }

      // 9. Spectator Overlays for AAA Game feel
      if (cameraMode !== 'FREE') {
        ctx.strokeStyle = '#ff950060';
        ctx.lineWidth = 2;
        // Draw vintage camcorder corner brackets
        const gap = 20;
        // Top-left
        ctx.beginPath(); ctx.moveTo(gap, gap + 15); ctx.lineTo(gap, gap); ctx.lineTo(gap + 15, gap); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(canvas.width - gap, gap + 15); ctx.lineTo(canvas.width - gap, gap); ctx.lineTo(canvas.width - gap - 15, gap); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(gap, canvas.height - gap - 15); ctx.lineTo(gap, canvas.height - gap); ctx.lineTo(gap + 15, canvas.height - gap); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(canvas.width - gap, canvas.height - gap - 15); ctx.lineTo(canvas.width - gap, canvas.height - gap); ctx.lineTo(canvas.width - gap - 15, canvas.height - gap); ctx.stroke();

        ctx.fillStyle = '#ff9500';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`CAM MODE: ${cameraMode} - SPECTATING ACTIVE`, gap + 10, gap + 25);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [agents, projectiles, powerUps, particles, map, weather, cameraMode, selectedAgentId, hoveredAgentId, gameSpeed]);

  // Handle canvas clicks to select agent
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen mouse coordinates back to simulation space
    let scale = Math.min(canvas.width / map.width, canvas.height / map.height);
    let offsetX = (canvas.width - map.width * scale) / 2;
    let offsetY = (canvas.height - map.height * scale) / 2;

    const leader = agents.find(a => a.state !== 'DEAD'); // Fallback focus reference
    if (cameraMode === 'FOLLOW_LEADER' && leader) {
      scale = 1.3;
      offsetX = canvas.width / 2 - leader.x * scale;
      offsetY = canvas.height / 2 - leader.y * scale;
    }

    let clickedId: string | null = null;
    for (const a of agents) {
      if (a.state === 'DEAD') continue;
      const ax = offsetX + a.x * scale;
      const ay = offsetY + a.y * scale;
      const dist = Math.hypot(mouseX - ax, mouseY - ay);
      if (dist < a.radius * 2 * scale) {
        clickedId = a.id;
        break;
      }
    }

    onSelectAgent(clickedId);
  };

  // Hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let scale = Math.min(canvas.width / map.width, canvas.height / map.height);
    let offsetX = (canvas.width - map.width * scale) / 2;
    let offsetY = (canvas.height - map.height * scale) / 2;

    const leader = agents.find(a => a.state !== 'DEAD');
    if (cameraMode === 'FOLLOW_LEADER' && leader) {
      scale = 1.3;
      offsetX = canvas.width / 2 - leader.x * scale;
      offsetY = canvas.height / 2 - leader.y * scale;
    }

    let hoveredId: string | null = null;
    for (const a of agents) {
      if (a.state === 'DEAD') continue;
      const ax = offsetX + a.x * scale;
      const ay = offsetY + a.y * scale;
      const dist = Math.hypot(mouseX - ax, mouseY - ay);
      if (dist < a.radius * 2 * scale) {
        hoveredId = a.id;
        break;
      }
    }
    setHoveredAgentId(hoveredId);
  };

  return (
    <div id="arena_container" className="relative bg-[#020205] border border-[#00f2ff]/20 clip-corner flex flex-col glow-cyan/10">
      {/* Header Info Panel */}
      <div className="flex justify-between items-center bg-[#0a0a15] px-5 py-3.5 border-b border-[#00f2ff]/30">
        <div className="flex items-center gap-2">
          <Compass className="text-[#00f2ff] w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-mono text-xs font-bold tracking-widest text-[#00f2ff] uppercase">
            Grid_Spectator // Main_View
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2ff] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f2ff]"></span>
          </span>
          <span className="font-mono text-[10px] text-[#00f2ff]/80 tracking-widest uppercase">
            LIVE_FEED_ONLINE
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="block w-full cursor-pointer touch-none bg-[#020205]"
        />
        
        {/* Cinematic Watermark overlay */}
        <div className="absolute top-4 right-4 bg-black/90 border border-[#00f2ff]/40 text-[10px] font-mono py-1 px-3.5 rounded-sm text-[#00f2ff] flex items-center gap-2 pointer-events-none select-none tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#00f2ff] animate-pulse" />
          <span>NEURAL_ARENA_V4.0.2</span>
        </div>
      </div>
    </div>
  );
}
