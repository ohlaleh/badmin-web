"use client"

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { getLevelClasses } from '@/lib/normalizers'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function PlayerListManage() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ 
    name: '', 
    gender: 'Male', 
    level: 'N-', 
    matches: 0, 
    last_played_round: -10, 
    play_status: 'active', 
    teammates: {} 
  })
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  async function fetchPlayers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/players`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      // รองรับทั้ง { players: [] } และ []
      const list = Array.isArray(data.players) ? data.players : (Array.isArray(data) ? data : [])
      setPlayers(list)
    } catch (err) {
      console.error(err)
      setError('ไม่สามารถโหลดข้อมูลผู้เล่นได้')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', gender: 'Male', level: 'N-', matches: 0, last_played_round: -1, play_status: 'active', teammates: {} })
    setShowForm(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      name: p.name || '',
      gender: p.gender || 'Male',
      level: p.level || 'N-',
      matches: Number(p.matches || 0),
      last_played_round: Number(p.last_played_round ?? -1),
      play_status: p.play_status || 'active',
      teammates: (p.teammates && typeof p.teammates === 'object') ? p.teammates : {},
    })
    setShowForm(true)
  }

  async function submitForm(e) {
    e.preventDefault()
    
    // 1. Validate JSON สำหรับ teammates
    let finalTeammates = {}
    if (typeof form.teammates === 'string') {
      try {
        finalTeammates = JSON.parse(form.teammates || '{}')
      } catch (err) {
        alert('รูปแบบ JSON เพื่อนร่วมทีมไม่ถูกต้อง (ตรวจสอบเครื่องหมายคำพูด หรือวงเล็บ)')
        return
      }
    } else {
      finalTeammates = form.teammates
    }

    try {
      const payload = {
        ...form,
        matches: Number(form.matches),
        last_played_round: Number(form.last_played_round),
        teammates: finalTeammates
      }

      const url = editing ? `${API_BASE}/api/players/${editing.id}` : `${API_BASE}/api/players`
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      
      await fetchPlayers() // รีโหลดข้อมูลเพื่อให้สถิติ Sync กับ Backend
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      alert(err.message)
    }
  }

  async function deletePlayer(p) {
    if (!confirm(`ยืนยันการลบผู้เล่น "${p.name}"? ข้อมูลสถิติจะหายไปทั้งหมด`)) return
    try {
      const res = await fetch(`${API_BASE}/api/players/${p.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')
      setPlayers(prev => prev.filter(x => x.id !== p.id))
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  // Filter Logic
  const visiblePlayers = useMemo(() => {
    const _q = filter.trim().toLowerCase()
    return players.filter(p => !_q || p.name?.toLowerCase().includes(_q))
  }, [players, filter])

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">จัดการรายชื่อผู้เล่น</h1>
          <p className="text-sm text-gray-500">จัดการข้อมูลระดับฝีมือ และสถิติแมตช์ย้อนหลัง</p>
        </div>
        <button 
          onClick={openCreate} 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
          เพิ่มผู้เล่นใหม่
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="ค้นหาชื่อ..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
          <div className="absolute right-3 top-2.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">ผู้เล่น</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">ระดับ</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">แมตช์</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">รอบล่าสุด</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">สถานะ</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visiblePlayers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 p-0.5">
                        <div className="relative w-full h-full rounded-full overflow-hidden">
                          <Image
                            src={p.avatar || `/avatars/${p.gender?.toLowerCase() === 'female' ? 'female' : 'male'}.svg`}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{p.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-medium">{p.gender === 'Male' ? 'ชาย' : 'หญิง'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      p.level === 'P' ? 'bg-purple-100 text-purple-600' :
                      p.level === 'S' ? 'bg-rose-100 text-rose-600' :
                      p.level === 'N' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {p.level}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-mono font-bold text-gray-700">{p.matches ?? 0}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-gray-500">{p.last_played_round > -1 ? `#${p.last_played_round}` : '-'}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${p.play_status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className={`text-xs font-medium ${p.play_status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {p.play_status === 'active' ? 'ปกติ' : 'หยุด'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button onClick={() => deletePlayer(p)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form 
            onSubmit={submitForm} 
            className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800">{editing ? 'แก้ไขข้อมูลผู้เล่น' : 'เพิ่มผู้เล่นใหม่'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ชื่อผู้เล่น</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">เพศ</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Male">ชาย</option>
                    <option value="Female">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ระดับฝีมือ</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="N-">N- (เริ่มต้น)</option>
                    <option value="N">N (ทั่วไป)</option>
                    <option value="S">S (เก่ง)</option>
                    <option value="P">P (โปร)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">แมตช์รวม</label>
                  <input type="number" value={form.matches} onChange={e => setForm(f => ({ ...f, matches: e.target.value }))} className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">รอบล่าสุด</label>
                  <input type="number" value={form.last_played_round} onChange={e => setForm(f => ({ ...f, last_played_round: e.target.value }))} className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">สถานะ</label>
                  <select value={form.play_status} onChange={e => setForm(f => ({ ...f, play_status: e.target.value }))} className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none">
                    <option value="active">ปกติ</option>
                    <option value="stopped">หยุดเล่น</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ประวัติเพื่อนร่วมทีม (JSON)</label>
                <textarea 
                  value={typeof form.teammates === 'string' ? form.teammates : JSON.stringify(form.teammates)} 
                  onChange={e => setForm(f => ({ ...f, teammates: e.target.value }))} 
                  placeholder='{"12": 1, "45": 2}'
                  className="w-full border-gray-200 border rounded-xl px-4 py-2 text-xs font-mono h-24 outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors">ยกเลิก</button>
              <button type="submit" className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                บันทึกข้อมูล
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}