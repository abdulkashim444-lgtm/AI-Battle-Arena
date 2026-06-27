/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { MessageSquare, Users, Swords, Trophy, Compass, ArrowRight, UserPlus, Send, Settings, ShieldAlert } from 'lucide-react';

interface MultiplayerLobbyProps {
  leaderboard: LeaderboardEntry[];
  onReportMatch: (data: any) => void;
  username: string;
  setUsername: (name: string) => void;
}

export default function MultiplayerLobby({
  leaderboard,
  onReportMatch,
  username,
  setUsername
}: MultiplayerLobbyProps) {
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueTimer, setQueueTimer] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ id: string; user: string; text: string; time: string; team: string }[]>([
    { id: '1', user: 'Nemesis V2', text: 'Just completed DQN generation 45. Accuracy rate is through the roof!', time: '12:04', team: 'OMEGA' },
    { id: '2', user: 'Hyperion Prime', text: 'Wait until you see my Rail Sniper precision. 98% prediction hits.', time: '12:05', team: 'ALPHA' },
    { id: '3', user: 'Specter Synth', text: 'Any clans looking for an elite Plasma Sword specialist? Level 12 active.', time: '12:06', team: 'OMEGA' },
    { id: '4', user: 'Aegis MK-IV', text: 'Dueling with Behavior Trees is so much more tactical. No random wandering.', time: '12:07', team: 'ALPHA' }
  ]);
  const [typedMessage, setTypedMessage] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  // Queue timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQueueing) {
      interval = setInterval(() => {
        setQueueTimer(prev => prev + 1);
        
        // Match found simulation after a random interval
        if (queueTimer > 5 && Math.random() < 0.2) {
          setIsQueueing(false);
          setQueueTimer(0);
          
          // Match alert simulation using in-app notification instead of window.alert
          setNotification("MATCH_ACQUIRED // Neural synchronizer engaged. Tactical grid initialization commencing.");
          setTimeout(() => setNotification(null), 5000);
        }
      }, 1000);
    } else {
      setQueueTimer(0);
    }
    return () => clearInterval(interval);
  }, [isQueueing, queueTimer]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        user: username || 'Recruit Pilot',
        text: typedMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        team: 'NEUTRAL'
      }
    ]);
    setTypedMessage('');
  };

  return (
    <div id="multiplayer_lobby" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Left Matchmaking & Chat Column */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {notification && (
          <div className="bg-[#00f2ff]/10 border border-[#00f2ff] p-4 clip-corner text-[#00f2ff] font-mono text-xs uppercase tracking-widest animate-pulse flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#00f2ff]" />
            <span>{notification}</span>
          </div>
        )}

        {/* Matchmaking Queue Dashboard */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl relative overflow-hidden">
          
          <div className="flex justify-between items-center z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">MATCHMAKING_DESK</span>
              <h3 className="font-mono text-xs font-bold text-[#00f2ff] uppercase tracking-widest flex items-center gap-2">
                <Swords className="text-[#00f2ff] w-4 h-4 animate-pulse" />
                Dedicated_PVP_Arena
              </h3>
            </div>
            <span className="font-mono text-[9px] text-[#00f2ff] bg-[#00f2ff]/10 border border-[#00f2ff]/30 px-2.5 py-1 rounded-sm uppercase tracking-widest">
              REGION: ASIA-PACIFIC // AS-1
            </span>
          </div>

          <div className="bg-[#050508] p-4 rounded-sm border border-zinc-900 flex flex-col sm:flex-row items-center gap-4 justify-between z-10">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">YOUR_CALLSIGN</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#08080c] border border-zinc-850 text-zinc-200 font-mono text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#00f2ff] w-full sm:w-60"
                placeholder="Callsign"
              />
            </div>

            <button
              onClick={() => setIsQueueing(!isQueueing)}
              className={`w-full sm:w-48 py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg border ${
                isQueueing
                  ? 'bg-amber-950/40 border-amber-500 text-amber-400 animate-pulse'
                  : 'bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border-[#00f2ff]/40 text-[#00f2ff]'
              }`}
            >
              {isQueueing ? (
                <>
                  <Compass className="w-4 h-4 animate-spin" />
                  <span>IN QUEUE ({queueTimer}s)</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>MATCHMAKE ARENA</span>
                </>
              )}
            </button>
          </div>

          {isQueueing && (
            <div className="text-[10px] font-mono text-amber-500 animate-pulse flex items-center gap-1.5 z-10 uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Searching for compatible neural networks. Match predicted within 15 seconds.</span>
            </div>
          )}
        </div>

        {/* Global Multiplayer Chatroom */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-[#00f2ff] w-4 h-4" />
              <h3 className="font-mono text-xs font-bold text-[#e0e0ff] uppercase tracking-widest">
                Lobby_Comm-Channel [G-88]
              </h3>
            </div>
            <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">ENCRYPTED_SYNAPSE</span>
          </div>

          {/* Chat Messages Log */}
          <div className="bg-[#050508] border border-zinc-900 rounded-sm p-3 h-64 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
            {chatMessages.map(msg => {
              let nameColor = 'text-[#00f2ff]';
              if (msg.team === 'OMEGA') nameColor = 'text-[#7000ff]';
              else if (msg.team === 'NEUTRAL') nameColor = 'text-zinc-400';

              return (
                <div key={msg.id} className="flex flex-col gap-1 py-2 px-3.5 bg-[#08080c] rounded-sm border border-zinc-900/60 hover:border-[#00f2ff]/20 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${nameColor}`}>{msg.user}</span>
                    <span className="font-mono text-[9px] text-zinc-600">{msg.time}</span>
                  </div>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed uppercase">{msg.text}</p>
                </div>
              );
            })}
          </div>

          {/* Type Area */}
          <form onSubmit={handleSendMessage} className="flex gap-2 bg-[#050508] p-2 rounded-sm border border-zinc-900">
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              className="flex-1 bg-transparent text-zinc-200 font-mono text-xs px-2.5 focus:outline-none placeholder-zinc-700 uppercase"
              placeholder="Inject tactical message parameters..."
            />
            <button
              type="submit"
              className="p-2 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/40 rounded-sm text-[#00f2ff] transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

      {/* 2. Right Leaderboard Column */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Global Clan Rank/Leaderboard */}
        <div className="bg-[#08080c] border border-zinc-800 p-5 flex flex-col gap-4 clip-corner shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
            <Trophy className="text-[#00f2ff] w-4 h-4" />
            <h3 className="font-mono text-xs font-bold text-[#00f2ff] uppercase tracking-widest">
              Synapse_Leaderboard
            </h3>
          </div>

          <div className="flex flex-col gap-2 h-[415px] overflow-y-auto pr-1 custom-scrollbar">
            {leaderboard.map((item, index) => {
              let medalStyle = 'bg-[#050508] text-zinc-500 border border-zinc-900';
              if (index === 0) medalStyle = 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40';
              else if (index === 1) medalStyle = 'bg-[#7000ff]/20 text-[#c0a0ff] border border-[#7000ff]/30';
              else if (index === 2) medalStyle = 'bg-zinc-800 text-zinc-300 border border-zinc-700';

              return (
                <div
                  key={item.botName}
                  className="bg-[#050508] border border-zinc-900/60 p-3.5 rounded-sm flex items-center justify-between hover:border-[#00f2ff]/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-sm font-mono text-xs font-bold flex items-center justify-center ${medalStyle}`}>
                      {item.rank}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wide">{item.botName}</span>
                      <span className="font-mono text-[9px] text-zinc-500 uppercase">Brain: {item.algorithm} • Fav: {item.favoriteWeapon}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs font-bold text-emerald-400">{item.rating} pts</span>
                    <span className="font-mono text-[9px] text-zinc-500">WinRate: {(item.winRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
