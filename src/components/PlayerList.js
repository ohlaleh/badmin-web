"use client";

import { useState, useMemo, useRef } from "react";
import PlayerCard from "./PlayerCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PlayerList({ players, nextQueue = [], courts = [], loadPlayers, generateNextQueue }) {
  const [q, setQ] = useState("");

  // --- Logic: การจัดการสถานะหยุดเล่น (Toggle Play Status) ---
  async function handleToggleStop(playerId, currentStatus) {
    const nextStatus = currentStatus === 'stopped' ? 'active' : 'stopped';
    try {
      const res = await fetch(`${API_BASE}/api/players/${playerId}/play_status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ play_status: nextStatus }),
      });
      
      if (!res.ok) throw new Error("Update failed");

      // แจ้งเตือนส่วนอื่นให้อัปเดต
      window.dispatchEvent(new CustomEvent('players:updated'));
      
      if (typeof loadPlayers === 'function') {
        await loadPlayers();
        // ถ้ากลับมาเล่นใหม่ ให้ลองคำนวณคิวใหม่ทันที
        if (nextStatus === 'active' && typeof generateNextQueue === 'function') {
          generateNextQueue();
        }
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  }

  // --- Logic: Mapping สถานะสนามและคิว ---
  const queueMap = useMemo(() => {
    const map = {};
    (nextQueue || []).forEach((group, gi) => {
      (group || []).forEach(pl => { if (pl?.id) map[pl.id] = gi + 1; });
    });
    return map;
  }, [nextQueue]);

  const onCourtMap = useMemo(() => {
    const map = {};
    (courts || []).forEach(c => {
      (c.players || []).forEach(pl => { if (pl?.id) map[pl.id] = c.id; });
    });
    return map;
  }, [courts]);

  // --- Logic: การกรองและเรียงลำดับ (Smart Sorting) ---
  const filteredPlayers = useMemo(() => {
    const base = Array.isArray(players) ? players.filter(Boolean) : [];
    const t = q.trim().toLowerCase();
    
    return base
      .filter(p => !t || p.name?.toLowerCase().includes(t))
      .sort((a, b) => {
        // 1. คนที่หยุดเล่น (Stopped) ไปอยู่ท้ายสุด
        if ((a.play_status === 'stopped') !== (b.play_status === 'stopped')) {
          return a.play_status === 'stopped' ? 1 : -1;
        }
        // 2. ถ้าว่างเหมือนกัน ให้คนเล่นน้อย (Matches น้อย) อยู่บนสุด
        if ((a.matches ?? 0) !== (b.matches ?? 0)) {
          return (a.matches ?? 0) - (b.matches ?? 0);
        }
        // 3. ถ้าแมตช์เท่ากัน ให้คนพักนานกว่า (Round น้อยกว่า) อยู่บน
        return (a.last_played_round ?? 0) - (b.last_played_round ?? 0);
      });
  }, [players, q]);

  const activeCount = filteredPlayers.filter(p => p.play_status !== 'stopped').length;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            ผู้เล่น
            <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          </h2>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ค้นหาผู้เล่น..."
          className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      {/* Players Scroll Area */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {filteredPlayers.map((p) => {
          const isStopped = p.play_status === 'stopped';
          const courtId = onCourtMap[p.id];
          const queueIdx = queueMap[p.id];
          const matchCount = p.matches || 0;
          
          return (
            <div
              key={p.id}
              className={`group flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isStopped 
                  ? 'bg-gray-50/50 border-transparent opacity-50' 
                  : 'bg-white border-gray-100 shadow-sm hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                {/* Avatar with Status indicator */}
                <div className="relative">
                  <PlayerCard player={p} size="sm" />
                </div>
                
                <div className="flex flex-col min-w-0">
                  {/* Match Count & Badge Section */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Court/Queue Label */}
                    {!isStopped && (
                      <div className="flex gap-1 shrink-0">
                        {courtId && (
                          <span className="text-[10px] text-emerald-600 font-bold">@คอร์ท {courtId}</span>
                        )}
                        {queueIdx && !courtId && (
                          <span className="text-[10px] text-amber-600 font-bold italic">คิวที่ #{queueIdx}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Match count (moved to the right, just before buttons) */}
              <div className="flex items-center mr-2">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-extrabold tracking-tight ${
                  matchCount === 0 ? 'bg-green-100 text-green-700 animate-pulse' :
                  matchCount >= 4 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {matchCount}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleStop(p.id, p.play_status)}
                  className={`p-2 rounded-xl transition-all ${
                    isStopped 
                      ? 'text-emerald-500 hover:bg-emerald-50' 
                      : 'text-gray-300 hover:text-rose-500 hover:bg-rose-50'
                  }`}
                  title={isStopped ? "เริ่มเล่นต่อ" : "หยุดเล่น"}
                >
                  {isStopped ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}