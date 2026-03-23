"use client"

import Image from "next/image"
import React from "react"

const PALETTE = [
  { dot: "bg-rose-500", name: "bg-rose-100 text-rose-800" },
  { dot: "bg-amber-500", name: "bg-amber-100 text-amber-800" },
  { dot: "bg-sky-500", name: "bg-sky-100 text-sky-800" },
  { dot: "bg-lime-500", name: "bg-lime-100 text-lime-800" },
  { dot: "bg-fuchsia-500", name: "bg-fuchsia-100 text-fuchsia-800" },
]

function deterministicIndex(id, mod = PALETTE.length) {
  if (!id) return 0
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % mod
}

function getLevelLabel(player) {
  return (player && typeof player.level === 'string') ? player.level : 'N-';
}

export function detectStatus(player) {
  // New mapping per request:
  // P = on-court (playing)
  // Q = explicitly flagged as having no next match
  // Fallback: R = not on queue / unknown
  const s = (player && (player.status || player.state || "")).toString().toLowerCase()

  // On-court detection -> P
  if (s === "p" || s === "playing" || s === "on_court" || s === "oncourt" || s === "in_play") return { code: 'P', bg: 'bg-emerald-500', text: 'text-white', title: 'อยู่ในคอร์ท' }
  if (player?.playing === true || player?.onCourt === true || player?.on_court === true) return { code: 'P', bg: 'bg-emerald-500', text: 'text-white', title: 'อยู่ในคอร์ท' }

  // No-next-match detection -> Q
  if (s === 'no_next' || s === 'no_next_match' || s === 'no next' || s === 'none' || s === 'no-match') return { code: 'Q', bg: 'bg-gray-200', text: 'text-gray-800', title: 'ไม่มีแมตช์ถัดไป' }
  if (player?.nextMatch === false || player?.next_match === false || player?.hasNext === false || player?.has_next === false) return { code: 'Q', bg: 'bg-gray-200', text: 'text-gray-800', title: 'ไม่มีแมตช์ถัดไป' }

  // If explicitly queued/on queue, keep previous behavior as R (or you can change)
  if (s === "q" || s === "queued" || s === "on_queue" || s === "onqueue" || s === "next") return { code: 'R', bg: 'bg-amber-500', text: 'text-white', title: 'อยู่ในคิว' }
  if (player?.inQueue === true || player?.queued === true) return { code: 'R', bg: 'bg-amber-500', text: 'text-white', title: 'อยู่ในคิว' }

  // Default -> R (not on queue / unknown)
  return { code: 'R', bg: 'bg-gray-100', text: 'text-gray-700', title: 'ไม่อยู่ในคิว' }
}

export default function PlayerCard({ player, showStatus = false }) {
  // Color by player level (same as PlayerList)
  const level = getLevelLabel(player);
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

  const status = detectStatus(player)

  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${dotClass} text-white shrink-0`}>
        {player?.avatar ? (
          <Image src={player.avatar} alt={player.name || "avatar"} width={20} height={20} className="rounded-full" />
        ) : (
          <Image src={`/avatars/${String(player?.gender || "male").toLowerCase() === "female" ? "female" : "male"}.svg`} alt="avatar" width={18} height={18} />
        )}
      </div>
      <div className="flex items-center gap-1">
        <div className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${nameBgClass}`}>
          {player?.name || "—"}
          {typeof player?.matches === 'number' && (
            <span className="ml-1 text-[10px] text-gray-500">({player.matches})</span>
          )}
        </div>
        {showStatus ? (
          <div title={status.title} className={`ml-1 text-[10px] px-1 py-0.5 rounded ${status.bg} ${status.text} font-semibold`}>{status.code}</div>
        ) : null}
      </div>
    </div>
  )
}
