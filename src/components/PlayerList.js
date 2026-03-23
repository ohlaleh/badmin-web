"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

// Base API URL — prefer environment override in production, default to local Laravel dev server
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) || 'http://127.0.0.1:8000';

export default function PlayerList({ players, nextQueue = [], courts = [], onAdd, onToggleStop, loadPlayers, generateNextQueue }) {
    // Track stopped players (by id)
    const [stoppedPlayers, setStoppedPlayers] = useState([]);

    async function handleToggleStop(playerId) {
      // Find the player in the current list
      const player = (players || []).find(p => p.id === playerId) || (addedPlayers || []).find(p => p.id === playerId);
      const isStopped = player && player.play_status === 'stopped';
      // Optimistically update local state for UI feedback
      setStoppedPlayers(prev =>
        isStopped ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
      // Post to backend API to update play_status
      try {
        const play_status = isStopped ? 'active' : 'stopped';
        await fetch(`${API_BASE}/api/players/${playerId}/play_status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ play_status }),
        });
        // Dispatch the same event as after adding a player
        try { window.dispatchEvent(new CustomEvent('players:updated')); } catch (e) { /* ignore in non-browser env */ }
        // Also call loadPlayers directly for immediate update
        if (typeof loadPlayers === 'function') {
          await loadPlayers();
          if (typeof generateNextQueue === 'function') generateNextQueue();
        }
      } catch (e) {
        // Optionally show error toast
        try { (await import('@/lib/toast')).default('อัปเดต play_status ไม่สำเร็จ', 'error'); } catch (e2) {}
      }
      if (typeof onToggleStop === 'function') onToggleStop(playerId);
    }
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newLevel, setNewLevel] = useState("N");
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [addError, setAddError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const modalRef = useRef(null);
  const nameInputRef = useRef(null);
  const lastActiveRef = useRef(null);
  // Remove remotePlayers state; always use players prop
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // PlayerList now always loads players from the API directly

  // trap focus & disable body scroll when modal open
  useEffect(() => {
    if (!showAddModal) return;
    lastActiveRef.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // prefer focusing the name input when modal opens
    if (nameInputRef.current?.focus) {
      nameInputRef.current.focus();
    } else if (modalRef.current?.focus) {
      modalRef.current.focus();
    } else {
      // fallback if element not yet mounted
      const id = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => {
        clearTimeout(id);
        document.body.style.overflow = prev;
        lastActiveRef.current?.focus?.();
      };
    }
    return () => {
      document.body.style.overflow = prev;
      lastActiveRef.current?.focus?.();
    };
  }, [showAddModal]);


  // No need to fetch or sync players here; always use the prop

  useEffect(() => {
    function onKey(e) {
      if (!showAddModal) return;
      if (e.key === 'Escape') setShowAddModal(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddModal]);

  // Use play_status from backend only for filtering
  const combinedPlayers = useMemo(() => {
    const base = Array.isArray(players) ? players.filter(Boolean) : [];
    // Filter out any addedPlayers that have the same id as a backend player
    const backendIds = new Set(base.map(p => p.id));
    const localOnly = addedPlayers.filter(p => !backendIds.has(p.id));
    // Merge and sort: active first by matches, then stopped by matches
    const merged = [...base, ...localOnly];
    return merged.sort((a, b) => {
      // Active first
      if ((a.play_status === 'stopped') !== (b.play_status === 'stopped')) {
        return a.play_status === 'stopped' ? 1 : -1;
      }
      // Then by matches asc
      return (a.matches ?? 0) - (b.matches ?? 0);
    });
  }, [players, addedPlayers]);

  const filteredActive = useMemo(() => {
    const t = q.trim().toLowerCase();
    return combinedPlayers.filter(p =>
      p.play_status !== 'stopped' && (!t || (p.name && p.name.toLowerCase().includes(t)))
    );
  }, [combinedPlayers, q]);

  const filteredStopped = useMemo(() => {
    const t = q.trim().toLowerCase();
    return combinedPlayers.filter(p =>
      p.play_status === 'stopped' && (!t || (p.name && p.name.toLowerCase().includes(t)))
    );
  }, [combinedPlayers, q]);

  // Clear stoppedPlayers after backend reload (when players prop changes)
  useEffect(() => {
    setStoppedPlayers([]);
  }, [players]);

  const queueMap = {};
  ;(nextQueue || []).forEach((group, gi) => {
    (group || []).forEach(pl => {
      if (pl && pl.id != null) queueMap[pl.id] = gi + 1
    })
  })

  const onCourtMap = {};
  ;(courts || []).forEach(c => {
    (c.players || []).forEach(pl => {
      if (pl && pl.id != null) onCourtMap[pl.id] = c.id || c.court || null
    })
  })

  // deterministic helper to map a string (id) to an index
  function deterministicIndex(value, max) {
    const s = String(value ?? "");
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) % max;
  }

  // Only count players that match the search query
  const filteredPlayers = combinedPlayers.filter(p => {
    const t = q.trim().toLowerCase();
    return !t || (p.name && p.name.toLowerCase().includes(t));
  });
  const visibleCount = filteredPlayers.length;
  const stoppedCount = filteredPlayers.filter(p => p.play_status === 'stopped').length;
  const activeCount = filteredPlayers.filter(p => p.play_status !== 'stopped').length;

  function handleAdd() {
    const name = (newName || "").trim();
    if (!name) return;
    // check duplicate name (case-insensitive) across existing and added players
    const existing = [...(players || []), ...addedPlayers];
    const exists = existing.some(p => (p?.name || "").trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      setAddError("ชื่อนี้ถูกใช้งานแล้ว");
      return;
    }
    // use string level directly (N-, N, S, P)
    const createdLocal = {
      id: `local-${Date.now()}`,
      name,
      matches: 0,
      gender: newGender,
      level: newLevel,
      teammates: {},
    };

    // If parent provided onAdd handler, use it. Otherwise try to POST to server.
    if (typeof onAdd === "function") {
      try {
        onAdd(createdLocal);
      } catch (err) {
        setAddedPlayers(s => [createdLocal, ...s]);
      }
    } else {
      // optimistic local add while posting
      setAddedPlayers(s => [createdLocal, ...s]);
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, level: newLevel, gender: newGender }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.message || 'Failed to create player');
          }
          const data = await res.json();
          const newPlayer = data.player || data;
          // replace local placeholder with server-created player
          setAddedPlayers(prev => prev.map(p => (p.id === createdLocal.id ? newPlayer : p)));
          // reload authoritative list from server and clear optimistic additions
          await loadPlayers();
          setAddedPlayers([]);
          try { (await import('@/lib/toast')).default('สร้างผู้เล่นเรียบร้อย', 'success'); } catch (e) { /* ignore */ }
        } catch (err) {
          setAddError(String(err));
          try { (await import('@/lib/toast')).default(String(err || 'Failed to create player'), 'error'); } catch (e) { /* ignore */ }
        }
      })();
    }
    setNewName("");
    setAddError("");
  }

  return (
    <div className="bg-white border rounded p-2 md:p-3 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* hamburger toggle visible on small screens */}
          <button
            onClick={() => setCollapsed(s => !s)}
            aria-label={collapsed ? 'เปิดแถบผู้เล่น' : 'ปิดแถบผู้เล่น'}
            aria-expanded={!collapsed}
            className="inline-flex items-center justify-center w-9 h-9 rounded bg-gray-100 text-gray-700 md:hidden"
          >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <h2 className="text-xl font-bold flex items-center gap-3">
            ผู้เล่น
            <span className="text-sm text-gray-500">(เล่นอยู่ {activeCount}{stoppedCount > 0 ? `, หยุดเล่น ${stoppedCount}` : ''})</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            aria-label="เพิ่มผู้เล่น"
            title="เพิ่มผู้เล่น"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`${collapsed ? 'hidden md:block' : 'block'} mb-3 space-y-2`}>
        <div className="flex gap-2 min-w-0">
          <input
            aria-label="ค้นหาผู้เล่น"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ค้นหาผู้เล่น"
            className="w-full min-w-0 border rounded px-3 py-2 text-sm md:text-base"
          />
        </div>
      </div>

      <div className={`${collapsed ? 'hidden md:block' : 'block'} space-y-2 text-sm md:text-base`}>
        {/* Only show filtered players */}
        {filteredPlayers.map((p, index) => {
          // ...existing code for rendering player row...
          const idKey = p?.id ?? index;
          const levelLabel = p.level;
          let nameBgClass = 'bg-slate-100 text-slate-800';
          let color = 'bg-slate-400';
          let levelClass = 'bg-slate-200 text-slate-800';
          if (levelLabel === 'N-') {
            nameBgClass = 'bg-amber-100 text-amber-800';
            color = 'bg-amber-500';
            levelClass = 'bg-slate-200 text-slate-800';
          } else if (levelLabel === 'N') {
            nameBgClass = 'bg-blue-100 text-blue-800';
            color = 'bg-blue-500';
            levelClass = 'bg-blue-100 text-blue-800';
          } else if (levelLabel === 'S') {
            nameBgClass = 'bg-purple-100 text-purple-800';
            color = 'bg-purple-500';
            levelClass = 'bg-purple-100 text-purple-800';
          } else if (levelLabel === 'P') {
            nameBgClass = 'bg-yellow-100 text-yellow-800';
            color = 'bg-yellow-500';
            levelClass = 'bg-yellow-100 text-yellow-800';
          }

          if(p.play_status === 'stopped') {
            nameBgClass = 'bg-amber-50 text-amber-700 border border-amber-100';
            color = 'bg-amber-400';
            levelClass = 'bg-amber-100 text-amber-800';
          }

          let status = { code: 'R', bg: 'bg-gray-100', text: 'text-gray-700', title: 'Not on queue' }
          if (onCourtMap[p.id] != null) {
            const cid = onCourtMap[p.id]
            status = { code: `P${cid}`, bg: 'bg-emerald-500', text: 'text-white', title: `อยู่ในคอร์ท ${cid}` }
          } else if (queueMap[p.id] != null) {
            const gi = queueMap[p.id]
            status = { code: `Q${gi}`, bg: 'bg-amber-500', text: 'text-white', title: `อยู่ในคิวกลุ่ม ${gi}` }
          }

          // Only show if not stopped, or if stopped show with activate button
          if (p.play_status === 'stopped') {
            return (
              <div
                key={p?.id ?? index}
                className={`flex justify-between items-center p-2 rounded border border-gray-200 min-w-0 bg-gray-50 opacity-70`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 shrink-0 ${color} text-white`}
                      role="img"
                      aria-label={`${p?.name || 'Player'} avatar`}
                    >
                      <Image
                        src={p?.gender === 'Male' ? '/avatars/male.svg' : '/avatars/female.svg'}
                        alt={`${p?.name || 'Player'} avatar`}
                        width={20}
                        height={20}
                        className="w-4 h-4 object-contain"
                      />
                    </span>

                    <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full font-medium ${nameBgClass} max-w-48 overflow-hidden`}>
                      <span className="text-sm truncate block">{p?.name ?? 'ไม่ระบุชื่อ'} (หยุดเล่น)</span>
                      <span title={status.title} className={`inline-flex items-center justify-center text-[10px] px-1 py-0.5 rounded bg-white text-current font-semibold ml-2 shrink-0`}>{status.code}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      (p?.matches ?? 0) === 0
                        ? 'bg-yellow-500 text-white'
                        : (p?.matches ?? 0) === 1
                        ? 'bg-red-500 text-white'
                        : (p?.matches ?? 0) === 2
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-white'
                    }`}
                    title={`${p?.matches ?? 0} แมตช์`}
                    aria-label={`${p?.matches ?? 0} แมตช์`}
                  >
                    {p?.matches ?? 0}
                  </div>
                </div>
              </div>
            );
          }

          // Active player row
          return (
            <div
              key={p?.id ?? index}
              className={`flex justify-between items-center p-2 rounded border border-gray-200 hover:bg-gray-50 min-w-0 bg-white`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 shrink-0 ${color} text-white`}
                    role="img"
                    aria-label={`${p?.name || 'Player'} avatar`}
                  >
                    <Image
                      src={p?.gender === 'Male' ? '/avatars/male.svg' : '/avatars/female.svg'}
                      alt={`${p?.name || 'Player'} avatar`}
                      width={20}
                      height={20}
                      className="w-4 h-4 object-contain"
                    />
                  </span>

                  <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full font-medium ${nameBgClass} max-w-48 overflow-hidden`}>
                    <span className="text-sm truncate block">{p?.name ?? 'ไม่ระบุชื่อ'}</span>
                    <span title={status.title} className={`inline-flex items-center justify-center text-[10px] px-1 py-0.5 rounded bg-white text-current font-semibold ml-2 shrink-0`}>{status.code}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    (p?.matches ?? 0) === 0
                      ? 'bg-yellow-500 text-white'
                      : (p?.matches ?? 0) === 1
                      ? 'bg-red-500 text-white'
                      : (p?.matches ?? 0) === 2
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}
                  title={`${p?.matches ?? 0} แมตช์`}
                  aria-label={`${p?.matches ?? 0} แมตช์`}
                >
                  {p?.matches ?? 0}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && createPortal(
        <div
          role="dialog"
            aria-modal="true"
            aria-labelledby="add-player-title"
            className="fixed inset-0 z-9999 flex items-start justify-center px-4 pt-12"
        >
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={e => e.stopPropagation()} style={{ transformOrigin: 'top' }}>
            <h3 id="add-player-title" className="text-lg font-semibold">เพิ่มผู้เล่นใหม่</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm text-gray-700">ชื่อ</label>
                <input
                  ref={nameInputRef}
                  value={newName}
                  onChange={e => {
                    const v = e.target.value;
                    setNewName(v);
                    const name = (v || "").trim();
                    if (!name) {
                      setAddError("");
                      return;
                    }
                    const existing = [...(players || []), ...addedPlayers];
                    const exists = existing.some(p => (p?.name || "").trim().toLowerCase() === name.toLowerCase());
                    setAddError(exists ? "ชื่อนี้ถูกใช้งานแล้ว" : "");
                  }}
                  className="w-full border rounded px-3 py-2 mt-1"
                />
                {addError && <div className="text-sm text-red-600 mt-1">{addError}</div>}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-gray-700">เพศ</label>
                  <select value={newGender} onChange={e => setNewGender(e.target.value)} className="w-full border rounded px-2 py-2 mt-1">
                    <option value="Male">ชาย</option>
                    <option value="Female">หญิง</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-sm text-gray-700">ระดับ</label>
                  <select value={newLevel} onChange={e => setNewLevel(e.target.value)} className="w-full border rounded px-2 py-2 mt-1">
                    <option value="N-">N-</option>
                    <option value="N">N</option>
                    <option value="S">S</option>
                    <option value="P">P</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={() => setShowAddModal(false)}>ยกเลิก</button>
              <button
                onClick={() => { handleAdd(); if (!addError) setShowAddModal(false); }}
                className={`px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 ${(!newName.trim() || addError) ? 'opacity-50 cursor-not-allowed hover:bg-blue-600' : ''}`}
                disabled={!newName.trim() || !!addError}
              >บันทึก</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}