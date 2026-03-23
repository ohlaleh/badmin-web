"use client"

import React from 'react'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'

export default function AppHeader() {
  const { effectiveNextShow, resetting, requestReset } = useAppContext()

  return (
    <header className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold">Badmin</Link>
          <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="px-2 py-1 hover:bg-gray-100 rounded">Home</Link>
            <Link href="/player-manage" className="px-2 py-1 hover:bg-gray-100 rounded">Player Management</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block bg-indigo-600 text-white text-xs font-medium px-2 py-0.5 rounded">สามารถจัดได้ {effectiveNextShow} สนาม</span>
          <button
            onClick={() => requestReset()}
            className={`inline-flex items-center text-xs px-2 py-1 border rounded bg-white text-red-600 ${resetting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
            title="รีเซ็ตข้อมูลทั้งหมด"
            disabled={resetting}
          >
            {resetting ? (
              <svg className="animate-spin h-4 w-4 mr-2 text-red-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : null}
            รีเซ็ต
          </button>
        </div>
      </div>
    </header>
  )
}
