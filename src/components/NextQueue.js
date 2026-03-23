"use client";

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
  ]
  let n = 0
  if (typeof id === 'number' && Number.isFinite(id)) n = Math.abs(id)
  else if (typeof id === 'string') n = Array.from(id).reduce((s, ch) => s + ch.charCodeAt(0), 0)
  const idx = n % palette.length
  return `${palette[idx].bg} ${palette[idx].text}`
}

import { useState } from "react";

export default function NextQueue({
  queue = [],
  courts = [],
  onAssign,
  nextShow = 5,
  availableCount = 0,
  players = [], // pass all players from parent
  onManualQueue, // callback to parent
}) {
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSelected, setManualSelected] = useState([]);
  
  const availableCourts = courts.filter(
    c => (c.players || []).length === 0
  );

  // Split queue into auto and manual groups
  const manualGroups = queue.filter(g => g.manualGroup);
  const autoGroups = queue.filter(g => !g.manualGroup);

  // Helper: check if any player in group is on court
  function groupHasPlayerOnCourt(group) {
    const busyPlayerIds = courts.flatMap(c => (c.players || []).map(p => p.id));
    return group.some(player => busyPlayerIds.includes(player.id));
  }

  // Wrap onAssign to prevent assigning if any player is on court
  function handleAssign(courtId, groupIdx, group) {
    if (groupHasPlayerOnCourt(group)) {
      if (typeof window !== 'undefined') {
        window.alert('มีผู้เล่นในกลุ่มนี้ที่อยู่ในคอร์ทแล้ว ไม่สามารถกำหนดซ้ำได้');
      }
      return;
    }
    onAssign(courtId, groupIdx);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">คิวถัดไป</h2>
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm"
          onClick={() => setShowManualModal(true)}
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
      {showManualModal && typeof window !== 'undefined' && typeof document !== 'undefined' &&
        require('react-dom').createPortal(
          <div className="fixed inset-0 z-9999 flex items-start justify-center px-4 pt-12">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowManualModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2">เลือกผู้เล่นเอง (เลือกครบ 4 คนเท่านั้น)</h3>
              <div className="max-h-64 overflow-y-auto mb-4 divide-y">
                {(players || []).filter(Boolean).map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 py-2 cursor-pointer rounded transition-colors duration-100 ${manualSelected.includes(p.id) ? 'bg-blue-500 text-white' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={manualSelected.includes(p.id)}
                      disabled={manualSelected.length >= 4 && !manualSelected.includes(p.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          if (manualSelected.length < 4) setManualSelected(sel => [...sel, p.id]);
                        } else {
                          setManualSelected(sel => sel.filter(id => id !== p.id));
                        }
                      }}
                      className="accent-blue-500 w-5 h-5"
                    />
                    <span className="flex-1 flex items-center gap-2">
                      {/* Avatar placeholder */}
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-base ${manualSelected.includes(p.id) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {p.name?.[0] || '?'}
                      </span>
                      <span className="font-medium text-base">{p.name}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded border ${manualSelected.includes(p.id) ? 'bg-blue-400 text-white border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>{p.level}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded border ${manualSelected.includes(p.id) ? 'bg-blue-400 text-white border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>{p.gender === 'Male' ? 'ชาย' : 'หญิง'}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={() => setShowManualModal(false)}>ยกเลิก</button>
                <button
                  className={`px-3 py-1 rounded bg-blue-600 text-white ${manualSelected.length !== 4 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  disabled={manualSelected.length !== 4}
                  onClick={() => {
                    if (manualSelected.length === 4) {
                      if (typeof onManualQueue === 'function') {
                        onManualQueue(manualSelected);
                      }
                      setShowManualModal(false);
                      setManualSelected([]);
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
        const groupHasBusy = groupHasPlayerOnCourt(group);
        return (
          <div
            key={"auto-"+idx}
            className={`border rounded p-4 md:p-5 min-h-28 flex flex-col justify-between bg-gray-50`}
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">แมตช์ที่ #{idx + 1}</div>
                {group && availableCourts.length === 0 && (
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
              {availableCourts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableCourts.map(court => (
                    <button
                      key={court.id}
                      onClick={() => handleAssign(court.id, idx, group)}
                      className={`bg-blue-500 text-white px-3 py-1 rounded text-sm inline-flex items-center justify-center gap-2 ${groupHasBusy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                      aria-label={`กำหนดให้คอร์ท ${court.id}`}
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
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Render manual groups at the end */}
      {manualGroups.map((group, idx) => {
        const groupHasBusy = groupHasPlayerOnCourt(group);
        return (
          <div
            key={"manual-"+idx}
            className="border border-blue-400 bg-blue-50 rounded p-4 md:p-5 min-h-28 flex flex-col justify-between"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-blue-700">แมตช์ (จัดเอง Manual)</div>
                {group && availableCourts.length === 0 && (
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
              {availableCourts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableCourts.map(court => (
                    <button
                      key={court.id}
                      onClick={() => handleAssign(court.id, autoGroups.length + idx, group)}
                      className={`bg-blue-500 text-white px-3 py-1 rounded text-sm inline-flex items-center justify-center gap-2 ${groupHasBusy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                      aria-label={`กำหนดให้คอร์ท ${court.id}`}
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
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}