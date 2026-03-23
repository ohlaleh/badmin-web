"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image'
import PlayerCard from "./PlayerCard";

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

// (export moved to file end)

function getBadgeClasses(id) {
  const palette = [
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-sky-100', text: 'text-sky-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-lime-100', text: 'text-lime-700' }
  ];
  let n = 0;
  if (typeof id === 'number' && Number.isFinite(id)) n = Math.abs(id);
  else if (typeof id === 'string') n = Array.from(id).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const idx = n % palette.length;

  return `${palette[idx].bg} ${palette[idx].text}`;
}

function getLevelClasses(player) {
  const level = (player && typeof player.level === 'string') ? player.level : 'N-';
  let nameBgClass = 'bg-slate-100 text-slate-800';
  let dotClass = 'bg-slate-400';
  if (level === 'N-') {
    nameBgClass = 'bg-amber-100 text-amber-800';
    dotClass = 'bg-amber-500';
  } else if (level === 'N') {
    nameBgClass = 'bg-blue-100 text-blue-800';
    dotClass = 'bg-blue-500';
  } else if (level === 'S') {
    nameBgClass = 'bg-purple-100 text-purple-800';
    dotClass = 'bg-purple-500';
  } else if (level === 'P') {
    nameBgClass = 'bg-yellow-100 text-yellow-800';
    dotClass = 'bg-yellow-500';
  }
  return { nameBgClass, dotClass };
}

function groupHasPlayerOnCourt(group, courts) {
  const busyPlayerIds = courts.flatMap(c => (c.players || []).map(p => p.id));
  return group.some(player => busyPlayerIds.includes(player.id));
}

function NextQueue(props) {
  // Destructure all props needed
  const {
    queue = [],
    courts = [],
    round = 0,
    onGenerate = () => {},
    onRefill = () => {},
    onForceFill = () => {},
    rulesStrict = true,
    onToggleRules = () => {},
    onAssign = () => {},
    players = [],
    availableCount = 0,
    nextShow = 0,
    availableCourts = [],
    setShowManualModal = () => {},
    showManualModal = false,
    manualSelected = [],
    setManualSelected = () => {},
    onManualQueue = () => {},
  } = props;

  // Local state fallbacks when parent doesn't control modal/selection
  const [localShowManualModal, setLocalShowManualModal] = useState(false);
  const showManualModalEffective = Object.prototype.hasOwnProperty.call(props, 'showManualModal') ? showManualModal : localShowManualModal;
  const setShowManualModalEffective = Object.prototype.hasOwnProperty.call(props, 'setShowManualModal') ? setShowManualModal : setLocalShowManualModal;

  const [localManualSelected, setLocalManualSelected] = useState([]);
  const manualSelectedEffective = Object.prototype.hasOwnProperty.call(props, 'manualSelected') ? manualSelected : localManualSelected;
  const setManualSelectedEffective = Object.prototype.hasOwnProperty.call(props, 'setManualSelected') ? setManualSelected : setLocalManualSelected;

  // debug: render/mount counters to detect duplicate mounts or renders
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  useEffect(() => {
    console.log('NextQueue mounted — render count', renderCountRef.current);
    return () => console.log('NextQueue unmounted');
  }, []);

  // Groups from queue, but only include groups composed of active players
  const manualGroups = (queue || []).filter(g => g.manualGroup).filter(g => !(Array.isArray(g) ? g : (g && g.players ? g.players : [])).some(p => p.play_status === 'stopped'));
  const autoGroups = (queue || []).filter(g => !g.manualGroup).filter(g => !(Array.isArray(g) ? g : (g && g.players ? g.players : [])).some(p => p.play_status === 'stopped'));

  // quick lookups for manual modal: which players are on court or already queued
  // map playerId -> courtId for players currently on a court
  const busyMap = {};
  (courts || []).forEach(c => {
    (c.players || []).forEach(p => {
      if (p && p.id !== undefined) busyMap[p.id] = c.id;
    });
  });

  // map playerId -> queue position (1-based index of the group in the queue)
  const queuedMap = {};
  (queue || []).forEach((g, groupIdx) => {
    const playersInGroup = Array.isArray(g) ? g : (g && g.players ? g.players : []);
    (playersInGroup || []).forEach(p => {
      if (p && p.id !== undefined) queuedMap[p.id] = groupIdx + 1;
    });
  });

  // Determine available courts: prefer explicit prop, otherwise derive from `courts`
  const availableCourtsEffective = (availableCourts && availableCourts.length > 0)
    ? availableCourts
    : (courts || []).filter(c => {
        const hasPlayers = Array.isArray(c.players) && c.players.length > 0;
        const statusOccupied = (typeof c.status === 'string' && c.status === 'occupied');
        // Court is available only if it has no players and is not marked occupied
        return !hasPlayers && !statusOccupied;
      });

  function handleAssign(courtId, groupIdx, group) {
    if (groupHasPlayerOnCourt(group, courts)) {
      if (typeof window !== 'undefined') {
        window.alert('มีผู้เล่นในกลุ่มนี้ที่อยู่ในคอร์ทแล้ว ไม่สามารถกำหนดซ้ำได้');
      }
      return;
    }
    onAssign(courtId, groupIdx);
  }

  // ...existing render code...

  return (
    <div>
      {/* Queue Controls at the top */}
      <div className="mb-2">
        <div className="text-xl font-bold">รอบ: {round}</div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
          <button
            onClick={onGenerate}
            className="bg-blue-500 text-white px-4 py-3 rounded-lg text-base w-full sm:w-auto hover:bg-blue-600 transition-colors duration-150"
          >
            🎲 สร้างคิวอัจฉริยะ
          </button>
          <button
            onClick={onForceFill}
            className="bg-red-500 text-white px-4 py-3 rounded-lg text-base w-full sm:w-auto hover:bg-red-600 transition-colors duration-150"
          >
            🔁 บังคับเติมคิว
          </button>
          <button
            onClick={() => { console.log('NextQueue: rules button clicked (rulesStrict currently)', rulesStrict); console.trace('NextQueue: rules click trace'); onToggleRules(); }}
            className={
              rulesStrict
                ? 'px-4 py-3 rounded-lg text-base w-full sm:w-auto bg-green-600 text-white hover:bg-green-700 transition-colors duration-150'
                : 'px-4 py-3 rounded-lg text-base w-full sm:w-auto bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors duration-150'
            }
            aria-pressed={rulesStrict}
            title="สลับกฎการจับคู่ (เข้มงวด / ผ่อนปรน)"
          >
            {rulesStrict ? 'กฎ: เข้มงวด' : 'กฎ: ผ่อนปรน'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">คิวถัดไป</h2>
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm"
          onClick={() => setShowManualModalEffective(true)}
        >
          เลือกผู้เล่นเอง
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <div>จำนวนกลุ่มที่สร้าง: <span className="font-medium">{queue.length}</span></div>
        <div>กลุ่มที่เป็นไปได้จากผู้เล่นที่มี: <span className="font-medium">{Math.floor(availableCount / 4)}</span></div>
        <div>ช่องว่างที่แสดง: <span className="font-medium">{Math.max(0, nextShow - queue.length)}</span></div>
        {queue.length === 0 && availableCount < 4 && (
          <div className="text-gray-500 mt-1">ผู้เล่นไม่เพียงพอที่จะสร้างกลุ่ม — มี <span className="font-medium">{availableCount}</span> คน</div>
        )}
      </div>

      <div className="space-y-3">

      {/* Manual select modal */}
      {showManualModalEffective && typeof window !== 'undefined' && typeof document !== 'undefined' &&
        require('react-dom').createPortal(
          <div className="fixed inset-0 z-9999 flex items-start justify-center px-4 pt-12">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowManualModalEffective(false)} />
            <div className="relative w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2">เลือกผู้เล่นเอง (เลือกครบ 4 คนเท่านั้น)</h3>
              <div className="max-h-64 overflow-y-auto mb-4 divide-y">
                {(players || []).filter(Boolean).filter(p => p.play_status !== 'stopped').map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 py-2 cursor-pointer rounded transition-colors duration-100 ${manualSelectedEffective.includes(p.id) ? 'bg-blue-500 text-white' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={manualSelectedEffective.includes(p.id)}
                      disabled={manualSelectedEffective.length >= 4 && !manualSelectedEffective.includes(p.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          if (manualSelectedEffective.length < 4) setManualSelectedEffective(sel => [...sel, p.id]);
                        } else {
                          setManualSelectedEffective(sel => sel.filter(id => id !== p.id));
                        }
                      }}
                      className="accent-blue-500 w-5 h-5"
                    />
                    <span className="flex-1 flex items-center gap-2">
                      {/* Avatar: gender icon with level-based background (match PlayerCard) */}
                      {(() => {
                        const { dotClass } = getLevelClasses(p);
                        const selected = manualSelectedEffective.includes(p.id);
                        const avatarBg = `${dotClass} ${selected ? 'ring-2 ring-blue-400' : ''}`;
                        return (
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${avatarBg} text-white shrink-0`}>
                            {p?.avatar ? (
                              <Image src={p.avatar} alt={p.name || 'avatar'} width={18} height={18} className="rounded-full" />
                            ) : (
                              <Image src={`/avatars/${String(p?.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male'}.svg`} alt="avatar" width={18} height={18} />
                            )}
                          </div>
                        );
                      })()}
                      <span className="font-medium text-xs">{p.name} ({p.matches})</span>
                      {busyMap[p.id] ? (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">คอร์ท {busyMap[p.id]}</span>
                      ) : null}
                      {queuedMap[p.id] ? (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">คิว {queuedMap[p.id]}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={() => setShowManualModalEffective(false)}>ยกเลิก</button>
                <button
                  className={`px-3 py-1 rounded bg-blue-600 text-white ${manualSelectedEffective.length !== 4 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  disabled={manualSelectedEffective.length !== 4}
                  onClick={() => {
                    if (manualSelectedEffective.length === 4) {
                      if (typeof onManualQueue === 'function') {
                        onManualQueue(manualSelectedEffective);
                      }
                      setShowManualModalEffective(false);
                      setManualSelectedEffective([]);
                    }
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Render auto groups first, then manual groups at the end */}
      {Array.from({ length: nextShow }).map((_, idx) => {
        const group = autoGroups[idx];
        if (!group) {
          return (
            <div key={"auto-"+idx} className="border rounded p-4 md:p-5 bg-gray-50 min-h-28 flex flex-col justify-between">
              <div className="text-gray-400">รอกลุ่ม</div>
            </div>
          );
        }
        const groupHasBusy = groupHasPlayerOnCourt(group, courts);
        return (
          <div
            key={"auto-"+idx}
            className={`border rounded p-4 md:p-5 min-h-28 flex flex-col justify-between bg-gray-50`}
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">คิวที่ #{idx + 1}</div>
                {group && availableCourtsEffective.length === 0 && (
                  <div className="text-gray-400 text-sm">รอคอร์ทว่าง</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 mb-3 text-sm md:text-base">
                {group.map((player) => (
                  <div key={player.id || player.name} className="flex items-center">
                    <PlayerCard player={player} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableCourtsEffective.length > 0 ? availableCourtsEffective.map(court => (
                  <button
                    key={court.id}
                    onClick={() => handleAssign(court.id, idx, group)}
                    className={`bg-blue-500 text-white px-3 py-1 rounded text-sm inline-flex items-center justify-center gap-2 ${groupHasBusy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                    aria-label={`กำหนดให้คอร์ท ${court.id}`}
                    title={`Assign to court ${court.id}`}
                    disabled={groupHasBusy}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">กำหนดให้คอร์ท</span>
                    <span className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium ${getBadgeClasses(court.id)}`}> 
                      {court.id}
                    </span>
                  </button>
                )) : (
                  <button
                    className="bg-gray-300 text-gray-500 px-3 py-1 rounded text-sm inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    disabled
                    title="No courts available"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">กำหนดให้คอร์ท</span>
                    <span className="w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium bg-gray-200 text-gray-500">?</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Render manual groups at the end */}
      {manualGroups.map((group, idx) => {
        const groupHasBusy = groupHasPlayerOnCourt(group, courts);
        return (
          <div
            key={"manual-"+idx}
            className="border border-blue-400 bg-blue-50 rounded p-4 md:p-5 min-h-28 flex flex-col justify-between"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-blue-700">แมตช์ (จัดเอง)</div>
                {group && availableCourtsEffective.length === 0 && (
                  <div className="text-gray-400 text-sm">รอคอร์ทว่าง</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 mb-3 text-sm md:text-base">
                {group.map((player) => (
                  <div key={player.id || player.name} className="flex items-center">
                    <PlayerCard player={player} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableCourtsEffective.length > 0 ? availableCourtsEffective.map(court => (
                  <button
                    key={court.id}
                    onClick={() => handleAssign(court.id, autoGroups.length + idx, group)}
                    className={`bg-blue-500 text-white px-3 py-1 rounded text-sm inline-flex items-center justify-center gap-2 ${groupHasBusy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                    aria-label={`กำหนดให้คอร์ท ${court.id}`}
                    title={`Assign to court ${court.id}`}
                    disabled={groupHasBusy}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">กำหนดให้คอร์ท</span>
                    <span className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium ${getBadgeClasses(court.id)}`}> 
                      {court.id}
                    </span>
                  </button>
                )) : (
                  <button
                    className="bg-gray-300 text-gray-500 px-3 py-1 rounded text-sm inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    disabled
                    title="No courts available"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">กำหนดให้คอร์ท</span>
                    <span className="w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium bg-gray-200 text-gray-500">?</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default NextQueue;