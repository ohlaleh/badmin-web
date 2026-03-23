"use client"

import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import PlayerCard from "./PlayerCard"

export default function CourtStatus({ courts = [], onFinish = () => {}, onRollback = () => {}, onAssignNext = () => {}, round = 0, onGenerate = () => {}, onForceFill = () => {}, rulesStrict = true, onToggleRules = () => {} }) {
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [targetCourt, setTargetCourt] = useState(null)
  const modalRef = useRef(null)
  const lastActiveRef = useRef(null)

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

  useEffect(() => {
    if (rollbackOpen) {
      lastActiveRef.current = document.activeElement
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      modalRef.current?.focus()
      return () => {
        document.body.style.overflow = prev
        lastActiveRef.current?.focus?.()
      }
    }
  }, [rollbackOpen])

  useEffect(() => {
    function onKey(e) {
      if (!rollbackOpen) return
      if (e.key === "Escape") {
        setRollbackOpen(false)
        setTargetCourt(null)
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
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
    <div className="sticky top-16 self-start">
      <div className="space-y-4 pr-2">
      {courts.map((c) => (
        <div key={c.id} className="w-full min-h-24 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-start gap-6 w-full">
            <div className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">คอร์ท</div>
                  <div className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium ${getBadgeClasses(c.id)}`} aria-hidden="true">{c.id}</div>
                  {/* Status badge */}
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${c.status === 'occupied' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-700'}`}
                    title={c.status === 'occupied' ? 'กำลังเล่น' : 'ว่าง'}>
                    {c.status === 'occupied' ? 'กำลังเล่น' : 'ว่าง'}
                  </span>
                </div>

                {(c.players && c.players.length > 0) ? (
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors duration-150"
                      onClick={() => onFinish(c.id, true)}
                      >
                      เสร็จสิ้น
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 transition-colors duration-150"
                      onClick={() => openRollback(c)}
                    >
                      ย้อนกลับ
                    </button>
                  </div>
                ) : null}
              </div>
              {(!c.players || c.players.length === 0) ? (
                <div className="mt-2">
                  <div className="text-sm text-gray-400">ยังไม่มีผู้เล่น</div>
                </div>
              ) : (
                <div className="mt-2 w-full grid grid-cols-2 gap-4 items-start divide-x divide-gray-100">
                  {/* Team A (left) */}
                  <div className="pr-4">
                    <div className="mt-2 flex flex-col items-start gap-2">
                      {(c.players.slice(0, 2)).map((p) => (
                        <div key={p.id || p.name} className="flex items-center">
                          <PlayerCard player={p} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team B (right) */}
                  <div className="pl-4">
                    <div className="mt-2 flex flex-col items-start gap-2">
                      {(c.players.length > 2) ? (
                        (c.players.slice(2, 4)).map((p) => (
                          <div key={p.id || p.name} className="flex items-center">
                            <PlayerCard player={p} />
                          </div>
                        ))
                      ) : null}
                    </div>
                  </div>

                  {/* actions previously here are now in the header */}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {rollbackOpen && createPortal(
        <div
          role="dialog"
            aria-modal="true"
            aria-labelledby="rollback-title"
            className="fixed inset-0 z-9999 flex items-start justify-center px-4 pt-12"
        >
          <div className="fixed inset-0 bg-black/40" onClick={() => setRollbackOpen(false)} />
          <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={(e) => e.stopPropagation()} style={{ transformOrigin: 'top' }}>
            <h3 id="rollback-title" className="text-lg font-semibold">ยืนยันการย้อนกลับ</h3>
            <p className="text-sm text-gray-600 mt-2">การดำเนินการนี้จะนำผู้เล่นออกจากคอร์ทแล้วกลับไปยังคิวถัดไป</p>

            <div className="mt-4">
              <div className="text-sm text-gray-800">คอร์ท: <span className="font-medium">{targetCourt?.id}</span></div>
              <div className="mt-2 space-y-2">
                {(targetCourt?.players || []).map((p) => (
                  <div key={p.id || p.name} className="flex items-center gap-3">
                    <PlayerCard player={p} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-1 rounded border hover:bg-gray-100 transition-colors duration-150" onClick={() => { setRollbackOpen(false); setTargetCourt(null) }}>
                ยกเลิก
              </button>
              <button className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors duration-150" onClick={confirmRollback}>
                ยืนยันย้อนกลับ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      </div>
    </div>
  )
}
