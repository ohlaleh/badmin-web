"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getLevelClasses(player) {
  const level = (player && typeof player.level === 'string') ? player.level : (player && (player.level || player.rank || player.skill) ? String(player.level) : 'N-');
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

export default function PlayerListManage() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', gender: 'Male', level: 'N-', matches: 0, last_played_round: -10, play_status: 'active', teammates: {} })
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
      const list = Array.isArray(data.players) ? data.players : (Array.isArray(data) ? data : [])
      setPlayers(list)
    } catch (err) {
      console.error(err)
      setError('ไม่สามารถโหลดผู้เล่นได้')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', gender: 'Male', level: 'N-' })
    setShowForm(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      name: p.name || '',
      gender: p.gender || 'Male',
      level: p.level || 'N-',
      matches: typeof p.matches === 'number' ? p.matches : Number(p.matches || 0),
      last_played_round: typeof p.last_played_round === 'number' ? p.last_played_round : Number(p.last_played_round ?? (p.lastPlayedRound ?? -10)),
      play_status: p.play_status ?? p.playStatus ?? 'active',
      teammates: (p.teammates && typeof p.teammates === 'object') ? p.teammates : {},
    })
    setShowForm(true)
  }

  async function submitForm(e) {
    e.preventDefault()
    try {
      const payload = {
        name: form.name,
        gender: form.gender,
        level: form.level,
        matches: Number(form.matches || 0),
        last_played_round: Number(form.last_played_round ?? -10),
        play_status: form.play_status || 'active',
        teammates: typeof form.teammates === 'string' ? (JSON.parse(form.teammates || '{}')) : (form.teammates || {}),
      }

      if (editing) {
        const res = await fetch(`${API_BASE}/api/players/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Update failed')
        const updated = await res.json()
        setPlayers(prev => prev.map(p => p.id === editing.id ? (updated.player || updated) : p))
      } else {
        const res = await fetch(`${API_BASE}/api/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Create failed')
        const created = await res.json()
        setPlayers(prev => [ (created.player || created), ...prev ])
      }
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', gender: 'Male', level: 'N-', matches: 0, last_played_round: -10, play_status: 'active', teammates: {} })
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดขณะบันทึก')
    }
  }

  async function deletePlayer(p) {
    if (!confirm(`ลบผู้เล่น "${p.name}" หรือไม่ ?`)) return
    try {
      const res = await fetch(`${API_BASE}/api/players/${p.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setPlayers(prev => prev.filter(x => x.id !== p.id))
    } catch (err) {
      console.error(err)
      alert('ไม่สามารถลบผู้เล่นได้')
    }
  }

  // computed visible players by filter
  const _q = (filter || '').trim().toLowerCase()
  const visiblePlayers = Array.isArray(players)
    ? players.filter(p => !_q || (p.name && String(p.name).toLowerCase().includes(_q)))
    : []

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Player Management</h1>
        <div>
          <button onClick={openCreate} className="px-3 py-2 bg-blue-600 text-white rounded">New Player</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="mb-3">
        <input
          aria-label="ค้นหาผู้เล่น"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="ค้นหาผู้เล่น ชื่อ..."
          className="w-full md:w-1/3 border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-sm">#</th>
              <th className="p-3 text-sm">Name</th>
              <th className="p-3 text-sm">Gender</th>
              <th className="p-3 text-sm">Level</th>
              <th className="p-3 text-sm">Matches</th>
              <th className="p-3 text-sm">Last Round</th>
              <th className="p-3 text-sm">Status</th>
              <th className="p-3 text-sm">Teammates</th>
              <th className="p-3 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visiblePlayers.map((p, idx) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 align-middle text-sm">{idx + 1}</td>
                <td className="p-3 align-middle text-sm flex items-center gap-2">
                  <div className="relative inline-flex items-center justify-center w-8 h-8 rounded-full">
                    <div className={`w-full h-full flex items-center justify-center rounded-full overflow-hidden ${getLevelClasses(p).dotClass} text-white`}>
                      {p.avatar ? (
                        <Image src={p.avatar} alt={p.name || 'avatar'} width={20} height={20} className="w-4 h-4 rounded-full object-contain" />
                      ) : (
                        <Image src={`/avatars/${String(p?.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male'}.svg`} alt="avatar" width={20} height={20} className="w-4 h-4 object-contain" />
                      )}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${getLevelClasses(p).dotClass}`} />
                  </div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">matches: {p.matches ?? 0}</div>
                  </div>
                </td>
                <td className="p-3 align-middle text-sm">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getLevelClasses(p).nameBgClass}`}>
                    {p.gender}
                  </span>
                </td>
                <td className="p-3 align-middle text-sm">{p.level}</td>
                <td className="p-3 align-middle text-sm">{p.matches ?? 0}</td>
                <td className="p-3 align-middle text-sm">{p.last_played_round ?? p.lastPlayedRound ?? '-'}</td>
                <td className="p-3 align-middle text-sm">{p.play_status ?? p.playStatus ?? '-'}</td>
                <td className="p-3 align-middle text-sm">{p.teammates ? Object.keys(p.teammates).length : 0}</td>
                <td className="p-3 align-middle text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="px-2 py-1 bg-yellow-400 text-black rounded text-sm">Edit</button>
                    <button onClick={() => deletePlayer(p)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simple modal/form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <form onSubmit={submitForm} className="relative bg-white rounded p-6 shadow max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">{editing ? 'Edit Player' : 'New Player'}</h2>
            <div className="mb-2">
              <label className="block text-sm text-gray-700">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border px-2 py-1 rounded" />
            </div>
            <div className="mb-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700">Gender</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full border px-2 py-1 rounded">
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Level</label>
                <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="w-full border px-2 py-1 rounded">
                  <option value="N-">N-</option>
                  <option value="N">N</option>
                  <option value="S">S</option>
                  <option value="P">P</option>
                </select>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-700">Matches</label>
                <input type="number" value={form.matches} onChange={e => setForm(f => ({ ...f, matches: Number(e.target.value) }))} className="w-full border px-2 py-1 rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Last Played Round</label>
                <input type="number" value={form.last_played_round} onChange={e => setForm(f => ({ ...f, last_played_round: Number(e.target.value) }))} className="w-full border px-2 py-1 rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Play Status</label>
                <select value={form.play_status} onChange={e => setForm(f => ({ ...f, play_status: e.target.value }))} className="w-full border px-2 py-1 rounded">
                  <option value="active">active</option>
                  <option value="stopped">stopped</option>
                </select>
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-sm text-gray-700">Teammates (JSON object)</label>
              <textarea value={typeof form.teammates === 'string' ? form.teammates : JSON.stringify(form.teammates || {})} onChange={e => setForm(f => ({ ...f, teammates: e.target.value }))} placeholder='{"123":1, "456":2}' className="w-full border px-2 py-1 rounded h-24" />
              <div className="text-xs text-gray-400 mt-1">Provide teammates as a JSON object mapping playerId to count. Example: {"{\"123\":1}"}</div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
