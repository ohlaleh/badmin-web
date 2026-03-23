"use client"

import React, { useEffect, useRef, useState } from "react"

import PlayerCard from "./PlayerCard"

export default function CourtStatus({ courts = [], onFinish = () => {}, onRollback = () => {}, onAssignNext = () => {} }) {
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [targetCourt, setTargetCourt] = useState(null)
  const modalRef = useRef(null)
  const lastActiveRef = useRef(null)

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
    <div className="space-y-4">
      {courts.map((c) => (
        <div key={c.id} className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-200 min-h-37.5">
          <div className="flex items-start gap-6 w-full h-full">
            <div className="w-full">
              <div className="text-xs text-gray-500">Court {c.id}</div>
              {(!c.players || c.players.length === 0) ? (
                <div className="mt-2 flex items-center h-full">
                  <div className="text-sm text-gray-400">No players assigned</div>
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

                  {/* actions span both columns */}
                  <div className="col-span-2 mt-3 flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors duration-150"
                      onClick={() => onFinish(c.id, true)}
                    >
                      Finish
                    </button>

                    <button
                      className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 transition-colors duration-150"
                      onClick={() => openRollback(c)}
                    >
                      Rollback
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {rollbackOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rollback-title"
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-12"
        >
          <div className="fixed inset-0 bg-black/40" onClick={() => setRollbackOpen(false)} />
          <div ref={modalRef} tabIndex={-1} className="relative z-10 w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={(e) => e.stopPropagation()} style={{ transformOrigin: 'top' }}>
            <h3 id="rollback-title" className="text-lg font-semibold">Confirm Rollback</h3>
            <p className="text-sm text-gray-600 mt-2">This will remove players from the court and return them to the Next queue.</p>

            <div className="mt-4">
              <div className="text-sm text-gray-800">Court: <span className="font-medium">{targetCourt?.id}</span></div>
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
                Cancel
              </button>
              <button className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors duration-150" onClick={confirmRollback}>
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
