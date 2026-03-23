"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Image from 'next/image'
import PlayerCard from "./PlayerCard";

/**
 * ฟังก์ชันช่วยจัดการสีตาม ID คอร์ท (ใช้ร่วมกับ CourtStatus)
 */
function getCourtBadgeStyle(id) {
  const palette = [
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
  ];
  const idx = (id - 1) % palette.length;
  return `${palette[idx].bg} ${palette[idx].text}`;
}

export default function NextQueue({
  queue = [],
  courts = [],
  round = 0,
  players = [],
  rulesStrict = true,
  onGenerate,
  onForceFill,
  onToggleRules,
  onAssign,
  onManualQueue,
  availableCount = 0
}) {
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSelected, setManualSelected] = useState([]);

  // --- Logic: ตรวจสอบว่าใครยุ่งอยู่บ้าง ---
  const busyPlayerIds = useMemo(() => 
    courts.flatMap(c => (c.players || []).map(p => p.id)), 
  [courts]);

  const availableCourts = useMemo(() => 
    courts.filter(c => !c.players || c.players.length === 0), 
  [courts]);

  // --- Logic: แยกประเภทกลุ่มในคิว ---
  const autoGroups = queue.filter(g => !g.manualGroup);
  const manualGroups = queue.filter(g => g.manualGroup);

  return (
    <div className="space-y-6">
      {/* ส่วนควบคุมหลัก */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-800">รอบที่ {round}</h2>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">การจัดการคิว</p>
          </div>
          <button
            onClick={onToggleRules}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              rulesStrict 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}
          >
            {rulesStrict ? '🛡️ กฎเข้มงวด' : '🔓 กฎผ่อนปรน'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onGenerate}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            🎲 สุ่มคิวอัจฉริยะ
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
          >
            👤 จัดทีมเอง
          </button>
        </div>
      </div>

      {/* รายการคิวถัดไป */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">คิวถัดไป</h3>
        
        {queue.length === 0 && (
          <div className="py-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-gray-300">
             <span className="text-sm italic">ยังไม่มีคิวในขณะนี้</span>
             <p className="text-[10px] mt-1">กดปุ่มด้านบนเพื่อเริ่มจัดคิว</p>
          </div>
        )}

        {queue.map((group, idx) => {
          const isManual = group.manualGroup;
          const hasBusyPlayer = group.some(p => busyPlayerIds.includes(p.id));

          return (
            <div 
              key={idx} 
              className={`relative overflow-hidden rounded-2xl border transition-all ${
                isManual ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white shadow-sm'
              }`}
            >
              {isManual && (
                <div className="absolute top-0 right-0 bg-amber-200 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase">
                  จัดเอง
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase">คิวที่ #{idx + 1}</span>
                  {hasBusyPlayer && (
                    <span className="text-[9px] font-bold text-rose-500 animate-pulse">ผู้เล่นยังติดแข่งอยู่</span>
                  )}
                </div>

                {/* ผู้เล่น 4 คนในคิว */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {group.map((p) => (
                    <PlayerCard key={p.id} player={p} size="sm" />
                  ))}
                </div>

                {/* ปุ่มลงสนาม */}
                <div className="flex flex-wrap gap-2">
                  {availableCourts.length > 0 ? (
                    availableCourts.map(court => (
                      <button
                        key={court.id}
                        disabled={hasBusyPlayer}
                        onClick={() => onAssign(court.id, idx)}
                        className={`flex-1 min-w-20 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          hasBusyPlayer 
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100'
                        }`}
                      >
                        เข้าคอร์ท <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${getCourtBadgeStyle(court.id)}`}>{court.id}</span>
                      </button>
                    ))
                  ) : (
                    <div className="w-full py-2 bg-gray-50 rounded-lg text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      รอคอร์ทว่าง...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal จัดทีมเอง (Manual Selection) */}
      {showManualModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowManualModal(false)} />
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800">จัดทีมด้วยตนเอง</h3>
              <p className="text-xs text-gray-500">เลือกผู้เล่นที่ต้องการให้ลงสนาม {manualSelected.length}/4 คน</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {players.filter(p => p.play_status !== 'stopped').map((p) => {
                const isSelected = manualSelected.includes(p.id);
                const isBusy = busyPlayerIds.includes(p.id);
                
                return (
                  <button
                    key={p.id}
                    disabled={manualSelected.length >= 4 && !isSelected}
                    onClick={() => {
                      if (isSelected) setManualSelected(s => s.filter(id => id !== p.id));
                      else setManualSelected(s => [...s, p.id]);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'
                    } ${(manualSelected.length >= 4 && !isSelected) ? 'opacity-40' : ''}`}
                  >
                    <PlayerCard player={p} size="sm" />
                    {isBusy && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">ติดแข่ง</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button className="flex-1 py-3 text-sm font-bold text-gray-400" onClick={() => setShowManualModal(false)}>ยกเลิก</button>
              <button 
                disabled={manualSelected.length !== 4}
                className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 disabled:opacity-30"
                onClick={() => {
                  onManualQueue(manualSelected);
                  setShowManualModal(false);
                  setManualSelected([]);
                }}
              >
                ยืนยันกลุ่มนี้
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}