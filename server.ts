/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry and fallback protection
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini AI system successfully initialized for Battle Commentary.');
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
} else {
  console.log('No valid GEMINI_API_KEY detected. Dynamic Commentary fallback active.');
}

// Global leaderboard and profile storage (persisted in-memory for session)
let leaderboardData = [
  { rank: 1, botName: 'Hyperion Prime', level: 14, kills: 182, winRate: 0.74, rating: 2150, algorithm: 'DQN', favoriteWeapon: 'SNIPER' },
  { rank: 2, botName: 'Nemesis V2', level: 12, kills: 145, winRate: 0.68, rating: 1980, algorithm: 'DOUBLE_DQN', favoriteWeapon: 'ROCKET_LAUNCHER' },
  { rank: 3, botName: 'Aegis MK-IV', level: 11, kills: 121, winRate: 0.62, rating: 1850, algorithm: 'BEHAVIOR_TREE', favoriteWeapon: 'LASER_RIFLE' },
  { rank: 4, botName: 'Vortex Protocol', level: 10, kills: 98, winRate: 0.58, rating: 1720, algorithm: 'UTILITY_AI', favoriteWeapon: 'PLASMA_CANNON' },
  { rank: 5, botName: 'Specter Synth', level: 9, kills: 84, winRate: 0.55, rating: 1610, algorithm: 'GENETIC', favoriteWeapon: 'ENERGY_SWORD' },
  { rank: 6, botName: 'Zephyr Delta', level: 8, kills: 72, winRate: 0.51, rating: 1540, algorithm: 'DQN', favoriteWeapon: 'GRAVITY_GUN' },
  { rank: 7, botName: 'Nova Glitch', level: 7, kills: 59, winRate: 0.48, rating: 1450, algorithm: 'BEHAVIOR_TREE', favoriteWeapon: 'PLASMA_CANNON' },
  { rank: 8, botName: 'Apex Prime', level: 6, kills: 48, winRate: 0.45, rating: 1390, algorithm: 'GENETIC', favoriteWeapon: 'LASER_RIFLE' }
];

// 1. Leaderboard Endpoints
app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: leaderboardData });
});

app.post('/api/leaderboard', (req, res) => {
  const { botName, level, kills, winRate, algorithm, favoriteWeapon, ratingDelta } = req.body;
  if (!botName) {
    return res.status(400).json({ error: 'Missing botName' });
  }

  // Find or insert bot
  let bot = leaderboardData.find(b => b.botName === botName);
  if (bot) {
    bot.level = Math.max(bot.level, level);
    bot.kills += kills;
    bot.rating = Math.max(400, bot.rating + (ratingDelta || 10));
    bot.winRate = Number(((bot.winRate * 4 + winRate) / 5).toFixed(2));
  } else {
    leaderboardData.push({
      rank: leaderboardData.length + 1,
      botName,
      level: level || 1,
      kills: kills || 0,
      winRate: winRate || 0.5,
      rating: 1000 + (ratingDelta || 10),
      algorithm: algorithm || 'DQN',
      favoriteWeapon: favoriteWeapon || 'LASER_RIFLE'
    });
  }

  // Recalculate ranks
  leaderboardData.sort((a, b) => b.rating - a.rating);
  leaderboardData.forEach((b, idx) => {
    b.rank = idx + 1;
  });

  res.json({ success: true, leaderboard: leaderboardData });
});

// 2. Mock Online Matchmaking
let lobbyQueuers: { id: string; name: string; rating: number; latency: number }[] = [];

app.get('/api/matchmaking/queue', (req, res) => {
  res.json({ queueCount: lobbyQueuers.length, players: lobbyQueuers });
});

app.post('/api/matchmaking/join', (req, res) => {
  const { name, rating } = req.body;
  const player = {
    id: `p_${Math.random().toString(36).substr(2, 9)}`,
    name: name || 'User Recruit',
    rating: rating || 1200,
    latency: Math.floor(15 + Math.random() * 35)
  };
  lobbyQueuers.push(player);
  res.json({ success: true, player });
});

app.post('/api/matchmaking/clear', (req, res) => {
  lobbyQueuers = [];
  res.json({ success: true });
});

// 3. AI commentary Generation using Gemini-3.5-Flash
app.post('/api/commentary', async (req, res) => {
  const { events, mapName, weather, scores } = req.body;

  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Provide combat events' });
  }

  const weatherStr = weather ? `, Weather condition: ${weather}` : '';
  const scoreStr = scores ? `, Current Score - Alpha: ${scores.alpha} | Omega: ${scores.omega}` : '';
  
  const prompt = `You are the ultimate cyberpunk arena play-by-play announcer for "Neural Arena" AI tournament. 
Analyze these dynamic combat logs from the simulator and output a short, incredibly thrilling, high-energy cybernetic commentary (maximum 3 sentences). 
Be witty, talk like a professional futuristic commentator, use fighting terms, and describe the absolute carnage with stylish hacker slang.

Logs:
${events.map((e: any) => `- ${e}`).join('\n')}

Context: Map is ${mapName}${weatherStr}${scoreStr}.
Announcer Voice: Cybernetic, highly competitive, hyped, using futuristic terminologies like 'singularity', 'glitch-dodge', 'neon splatter', or 'mainframe overload'.`;

  // Dynamic Heuristic Announcer as solid fallback
  const fallbackCommentaryList = [
    `CRITICAL HIT! The combat grid is radiating pure energy! Alpha and Omega are trading relativistic sniper fire with zero regard for containment protocols!`,
    `ANNIHILATION COMPLETE! A brilliant flash of plasma lights up the cyber skies! The evolutionary neural patterns are rewriting history in real-time!`,
    `A SPECTACULAR TACTICAL ROTATION! One agent triggers an energy shield overload to defuse a rocket projectile point-blank! Absolute galaxy brain play!`,
    `RECURSIVE DESTRUCTION! The drones are buzzing like hornets under this toxic cybernetic lightning! The battle is shifting into maximum overdrive!`
  ];

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.85,
        }
      });
      const generatedText = response.text;
      if (generatedText) {
        return res.json({ commentary: generatedText.trim() });
      }
    } catch (err: any) {
      console.error('Error calling Gemini API for commentary:', err.message);
    }
  }

  // Return heuristic selection if API key is not present or failed
  const randomFallback = fallbackCommentaryList[Math.floor(Math.random() * fallbackCommentaryList.length)];
  return res.json({ commentary: randomFallback });
});

// Serve frontend assets in production and Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Dev server running with integrated Vite middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production server serving from /dist directory.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Neural Arena backend engine operating at: http://localhost:${PORT}`);
  });
}

startServer();
