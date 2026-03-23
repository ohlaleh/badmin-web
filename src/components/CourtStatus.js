"use client"

import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import PlayerCard from "./PlayerCard"

export default function CourtStatus({ 
  courts = [], 
  onFinish = () => {}, 
  onRollback = () => {}, 
  // รับ props เพิ่มเติมหากจำเป็น
}) {
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [targetCourt, setTargetCourt] = useState(null)
  const modalRef = useRef(null)
  const lastActiveRef = useRef(null)

  // ฟังก์ชันช่วยจัดการสีตาม ID คอร์ท
  function getBadgeClasses(id) {
    const palette = [
      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      { bg: 'bg-amber-100', text: 'text-amber-700' },
      { bg: 'bg-rose-100', text: 'text-rose-700' },
    ]
    const idx = (id - 1) % palette.length
    return `${palette[idx].bg} ${palette[idx].text}`
  }

  // --- Modal Logic (คงไว้ตามเดิมของคุณเพราะจัดการ Accessibility ได้ดีมาก) ---
  useEffect(() => {
    if (rollbackOpen) {
      lastActiveRef.current = document.activeElement
      document.body.style.overflow = "hidden"
      modalRef.current?.focus()
      return () => { document.body.style.overflow = "auto" }
    }
  }, [rollbackOpen])

  function openRollback(court) {
    setTargetCourt(court)
    setRollbackOpen(true)
  }

  function confirmRollback() {
    if (!targetCourt) return
    onRollback(targetCourt.id)
    setRollbackOpen(false)
    setTargetCourt(null)
  }

  return (
    <div className="space-y-4">
      {courts.map((c) => (
        <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
          {/* Header ส่วนหัวของคอร์ท */}
          <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getBadgeClasses(c.id)}`}>
                {c.id}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">คอร์ท</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.status === 'occupied' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                  <span className="text-xs font-semibold text-gray-700">
                    {c.status === 'occupied' ? 'กำลังแข่ง' : 'ว่าง'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {c.players?.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFinish(c.id)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all"
                >
                  จบแมตช์
                </button>
                <button
                  onClick={() => openRollback(c)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  title="ยกเลิกแมตช์"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Body ส่วนแสดงผู้เล่น */}
          <div className="p-4">
            {!c.players || c.players.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                <span className="text-gray-300 text-sm italic">กำลังรอผู้เล่น...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100 relative">
                {/* VS Badge ตรงกลาง */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 border border-gray-100 rounded-md text-[10px] font-black text-gray-300 z-10">
                  ปะทะ
                </div>

                {/* Team A: Index 0, 1 (ตามที่ matchmaker ส่งมา) */}
                <div className="pr-4 space-y-3">
                  <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-2">ทีม A</div>
                  <div className="space-y-2">
                    {c.players.slice(0, 2).map((p) => (
                      <PlayerCard key={p.id} player={p} />
                    ))}
                  </div>
                </div>

                {/* Team B: Index 2, 3 (ตามที่ matchmaker ส่งมา) */}
                <div className="pl-4 space-y-3">
                  <div className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-2 text-right">ทีม B</div>
                  <div className="space-y-2 flex flex-col items-end">
                    {c.players.slice(2, 4).map((p) => (
                      <PlayerCard key={p.id} player={p} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Rollback Modal Portal (คงเดิม) */}
      {rollbackOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setRollbackOpen(false)} />
          <div ref={modalRef} className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">ยกเลิกแมตช์นี้?</h3>
              <p className="text-sm text-gray-500 mt-2">ผู้เล่นในคอร์ท {targetCourt?.id} จะถูกส่งกลับไปยังคิวเริ่มต้น</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all" onClick={() => setRollbackOpen(false)}>
                ปิดหน้าต่าง
              </button>
              <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-100" onClick={confirmRollback}>
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}