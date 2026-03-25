"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation' // เพิ่มเพื่อเช็คหน้าปัจจุบัน
import { useAppContext } from '@/context/AppContext'

export default function AppHeader() {
  const { effectiveNextShow, resetting, requestReset } = useAppContext()
  const pathname = usePathname() // ดึง path ปัจจุบัน

  // Helper สำหรับเช็ค Active Link
  const isActive = (path) => pathname === path

  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Close mobile nav on route change
  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <header className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left Side: Logo & Nav */}
        <div className="flex items-center gap-8">
          {/* Hamburger for mobile */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(v => !v)}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
              <span className="font-black text-xs">BQ</span>
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600 tracking-tighter">
              Badmin Q
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              href="/" 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive('/') 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              แดชบอร์ด
            </Link>
            <Link 
              href="/player-manage" 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive('/player-manage') 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              จัดการผู้เล่น
            </Link>
          </nav>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute top-0 right-0 w-56 bg-white h-full shadow-lg flex flex-col p-6 animate-in slide-in-from-right duration-200">
              <button
                className="self-end mb-6 p-2 rounded-xl text-gray-400 hover:text-gray-700"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Link
                href="/"
                className={`block px-4 py-3 rounded-xl text-base font-bold mb-2 transition-all ${
                  isActive('/')
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                }`}
                onClick={() => setMobileNavOpen(false)}
              >
                แดชบอร์ด
              </Link>
              <Link
                href="/player-manage"
                className={`block px-4 py-3 rounded-xl text-base font-bold transition-all ${
                  isActive('/player-manage')
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                }`}
                onClick={() => setMobileNavOpen(false)}
              >
                จัดการผู้เล่น
              </Link>
            </div>
          </div>

        )}

        {/* Right Side: Status & Action */}
        <div className="flex items-center gap-4">
          {/* Badge: สถานะคิว */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available</span>
            <span className="text-sm font-black text-indigo-600 leading-none">
              {effectiveNextShow} สนาม
            </span>
          </div>

          <div className="h-8 w-[1px] bg-gray-100 hidden sm:block mx-1" />

          {/* Reset Button */}
          <button
            onClick={() => {
              if (confirm("⚠️ คุณต้องการรีเซ็ตจำนวน Matches และประวัติทั้งหมดหรือไม่? (ข้อมูลชื่อผู้เล่นจะไม่หาย)")) {
                requestReset()
              }
            }}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all
              ${resetting 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95'}
            `}
            disabled={resetting}
          >
            {resetting ? (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {resetting ? 'กำลังรีเซ็ต...' : 'รีเซ็ตวันใหม่'}
          </button>
        </div>
      </div>
    </header>
  )
}