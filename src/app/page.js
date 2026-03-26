"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from '@/context/AppContext'
import PlayerList from "@/components/PlayerList";
import CourtStatus from "@/components/CourtStatus";
import NextQueue from "@/components/NextQueue";
import Toasts from "@/components/Toasts";
import showToast from "@/lib/toast";
import { normalizePlayer, normalizeCourts, normalizeQueue } from '@/lib/normalizers'
import { buildGroups, appendGroups, forceFillAppendGroups, hasRepeatTeammate } from '@/lib/matchmaker'

const COURT_COUNT = 2;
const COOLDOWN = 1;
const NEXT_SHOW = 10;
const TOTAL_PLAYERS = 32;

export default function Page() {

  // ---------------- ROUND ----------------
  const [round, setRound] = useState(0);

  // ---------------- PLAYERS ----------------
  // start empty — authoritative player list is loaded from the API
  const [players, setPlayers] = useState([]);

  // ---------------- COURTS ----------------
  const [courts, setCourts] = useState(
    Array.from({ length: COURT_COUNT }, (_, i) => ({
      id: i + 1,
      players: [],
      finished: true,
    }))
  );

  const [nextQueue, setNextQueue] = useState([]);
  const [rulesStrict, setRulesStrict] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishTargetCourt, setFinishTargetCourt] = useState(null);
  const pageToggleLastRef = useRef(0);
  const forceFillLastRef = useRef(0);
  const refillLastRef = useRef(0);
  const guardedToggleRules = useCallback(() => {
    const now = Date.now();
    if (!pageToggleLastRef.current) pageToggleLastRef.current = 0;
    if (now - pageToggleLastRef.current < 300) {
      console.log('Ignored duplicate toggle (dev double-invoke)');
      return;
    }
    pageToggleLastRef.current = now;
    console.log('NextQueue: toggle rules (was)', rulesStrict);
    setRulesStrict(s => !s);
  }, [rulesStrict]);

  const guardedForceFill = () => {
    const now = Date.now();
    if (!forceFillLastRef.current) forceFillLastRef.current = 0;
    if (now - forceFillLastRef.current < 300) {
      console.log('Ignored duplicate forceFill (dev double-invoke)');
      return;
    }
    forceFillLastRef.current = now;
    console.log('Page: guardedForceFill invoked');
    forceFillQueue();
  };


  // ====================================================
  // API base (allow override via NEXT_PUBLIC_API_URL)
  const API_BASE = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) || 'http://127.0.0.1:3333';

  // Normalizers are provided by `src/lib/normalizers.js`

  // Fetch courts from API and normalize
  const fetchCourts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/courts`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load courts');
      const data = await res.json();
      const list = Array.isArray(data.courts) ? data.courts : (Array.isArray(data) ? data : []);
      setCourts(normalizeCourts(list));
    } catch (err) {
      console.error('fetchCourts error', err);
      showToast('ไม่สามารถโหลดสถานะคอร์ทจากเซิร์ฟเวอร์ได้', 'error');
    }
  }, [API_BASE]);

  // Load players from API and refresh on `players:updated` events
  const loadPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const res = await fetch(`${API_BASE}/api/players`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load players');
      const data = await res.json();
      const list = Array.isArray(data.players) ? data.players : (Array.isArray(data) ? data : []);
      const norm = (list || []).map(normalizePlayer).filter(Boolean);
      setPlayers(norm);
    } catch (err) {
      console.error('fetchPlayers error', err);
    } finally {
      setLoadingPlayers(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    let mounted = true;
    loadPlayers();
    const onUpdated = () => { if (mounted) loadPlayers(); };
    window.addEventListener('players:updated', onUpdated);
    fetchCourts().catch(() => {});
    return () => {
      mounted = false;
      window.removeEventListener('players:updated', onUpdated);
    };
  }, [API_BASE, fetchCourts, loadPlayers]);

  // SMART MATCHMAKING (delegates to shared matchmaker)
  // ====================================================
  function generateNextQueue() {
    const groups = buildGroups({ players, courts, rulesStrict, round, COOLDOWN });
    console.debug('generateNextQueue', { groups: groups.length, rulesStrict });
    setNextQueue(groups);
  }

  // Refill (append) nextQueue up to NEXT_SHOW without replacing existing entries
  function refillNextQueue() {
    setNextQueue(prev => {
      if (prev.length >= effectiveNextShow) return prev;
      return appendGroups({ prevQueue: prev, players, courts, rulesStrict, round, COOLDOWN, effectiveNextShow });
    });
  }

  // teammate-repeat detection provided by matchmaker

  // ====================================================
  // ASSIGN MATCH
  // ====================================================
  async function assignNextToCourt(courtId, index) {
    const group = nextQueue[index];
    if (!group) return;

    // 1. เตรียมข้อมูล Round ล่วงหน้าเพื่อความแม่นยำ
    const currentRound = round; 
    const nextRound = currentRound + 1;

    // 2. Optimistic Update สำหรับรายชื่อผู้เล่น (Matches + Teammates)
    const updatedPlayers = players.map(p => {
      const isPlayerInGroup = group.find(x => x.id === p.id);
      if (!isPlayerInGroup) return p;

      const newTeammates = { ...p.teammates };
      group.forEach(t => {
        if (t.id !== p.id) {
          newTeammates[t.id] = (newTeammates[t.id] || 0) + 1;
        }
      });

      return {
        ...p,
        matches: (p.matches || 0) + 1,
        lastPlayedRound: currentRound,
        teammates: newTeammates,
      };
    });

    // 3. อัปเดต State สนามทันที (แสดงสถานะ Occupied)
    const groupWithUpdatedStats = updatedPlayers.filter(p => group.some(g => g.id === p.id));
    
    setCourts(prev => prev.map(c => 
      c.id === courtId 
        ? { ...c, players: groupWithUpdatedStats, status: 'occupied', finished: false, loading: true } // เพิ่ม loading flag
        : c
    ));

    setPlayers(updatedPlayers);
    setRound(nextRound);

    // 4. จัดการคิวถัดไป (Remove & Refill)
    setNextQueue(prev => {
      const newQ = prev.filter((_, i) => i !== index);
      return appendGroups({ 
        prevQueue: newQ, 
        players: updatedPlayers, 
        courts: courts.map(c => c.id === courtId ? { ...c, players: groupWithUpdatedStats } : c), 
        rulesStrict: false, 
        round: nextRound, 
        COOLDOWN, 
        effectiveNextShow 
      });
    });

    // 5. Backend Sync
    try {
      const res = await fetch(`${API_BASE}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: currentRound,
          court_id: courtId,
          player_ids: groupWithUpdatedStats.map(p => p.id),
          result: 'playing',
          provisional: true,
        }),
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const match = data.match || data;

      // อัปเดต match_id เข้าไปที่สนาม และปลดสถานะ loading
      setCourts(prev => prev.map(c => 
        c.id === courtId ? { ...c, match_id: match.id, loading: false } : c
      ));
      
      showToast('จัดลงสนามเรียบร้อย', 'success');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      // ในกรณี Error รุนแรง อาจพิจารณา Rollback state หรือให้ผู้ใช้ลองกดใหม่
    }
  }

  // ====================================================
  // FORCE FILL (EMERGENCY) - delegates to matchmaker
  // ====================================================
  function forceFillQueue() {
    setNextQueue(prev => forceFillAppendGroups({ prevQueue: prev, players, courts, effectiveNextShow }));
  }

  // ====================================================
  // FINISH COURT
  // ====================================================
  async function finishCourt(courtId, manual = false) {
    // 1. หาข้อมูลคอร์ทปัจจุบันจาก State ล่าสุด
    const currentCourt = courts.find(c => c.id === courtId);
    if (!currentCourt || !currentCourt.players || currentCourt.players.length === 0) {
      showToast('คอร์ทนี้ว่างอยู่แล้ว', 'info');
      return;
    }

    const matchId = currentCourt.match_id;
    const playerIds = currentCourt.players.map(p => p.id);

    // 2. Optimistic Update: ทำให้คอร์ทว่างทันทีใน UI
    setCourts(prev => prev.map(c =>
      c.id === courtId 
        ? { ...c, players: [], finished: true, match_id: undefined, status: 'available', loading: true } 
        : c
    ));

    try {
      // 3. ตรวจสอบว่ามี match_id หรือไม่ (ต้องมีเพื่อส่ง PATCH ไปจบแมตช์)
      if (!matchId) {
        throw new Error('ไม่พบ Match ID สำหรับคอร์ทนี้ (อาจไม่ได้สร้างแมตช์ตอนเริ่ม)');
      }

      const res = await fetch(`${API_BASE}/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ 
          round, 
          court_id: courtId, 
          player_ids: playerIds, 
          result: manual ? 'manual' : 'auto',
          status: 'finished' // บอกสถานะให้ชัดเจน
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || 'บันทึกจบแมตช์ไม่สำเร็จ');
      }

      const data = await res.json();

      // 4. อัปเดตข้อมูลผู้เล่นและคิวจากสิ่งที่ Server คำนวณให้ใหม่ (Fresh Data)
      if (data?.players) {
        setPlayers(data.players.map(normalizePlayer).filter(Boolean));
      }

      if (data?.newQueue) {
        setNextQueue(prev => {
          const manualGroups = prev.filter(g => g.manualGroup);
          const serverQueue = normalizeQueue(data.newQueue);
          // เอากลุ่มจาก Server ขึ้นก่อน แล้วตามด้วย Manual ที่ค้างอยู่ (หรือสลับตามใจชอบ)
          return [...serverQueue, ...manualGroups];
        });
      }

      showToast('จบแมตช์และอัปเดตสถิติเรียบร้อย', 'success');

      // 5. (Auto-assign after finish is disabled)

    } catch (err) {
      console.error('finishCourt error:', err);
      showToast(err.message, 'error');
      
      // Fallback: ถ้า Error ยังต้องทำให้คอร์ทกลับมาใช้งานได้ (หรือ Rollback)
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, loading: false } : c));
    } finally {
      // โหลดข้อมูลสนามล่าสุดเผื่อมีการเปลี่ยนแปลงจาก Admin ท่านอื่น
      await fetchCourts();
    }
  }

  // ====================================================
  // ROLLBACK: undo last assignment on a court
  // ====================================================
  function rollbackCourt(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.players || court.players.length === 0) {
        showToast('ไม่สามารถยกเลิกได้ เนื่องจากคอร์ทว่าง', 'error');
        return;
    }

    const groupIds = court.players.map(p => p.id);
    const match_id = court.match_id;

    // 1. รักษาลำดับเดิมของกลุ่ม (0,1 vs 2,3) เพื่อโยนกลับเข้าคิวให้หน้าตาเหมือนเดิม
    const groupToReturn = [...court.players];

    // 2. Optimistic Update: แก้ไข State ทันทีเพื่อให้ UI ตอบสนอง
    setPlayers(prev => prev.map(p => {
        if (!groupIds.includes(p.id)) return p;
        return {
            ...p,
            matches: Math.max(0, (p.matches || 0) - 1),
            // คืนค่า Round ให้เป็นค่าที่ "น่าจะ" เป็น (หรือปล่อยให้ Matchmaker คำนวณใหม่จากสถิติจริง)
            lastPlayedRound: Math.max(-1, (p.lastPlayedRound || 0) - 1),
        };
    }));

    setCourts(prev => prev.map(c =>
        c.id === courtId 
            ? { ...c, players: [], finished: false, match_id: undefined, status: 'available' } 
            : c
    ));

    // โยนกลุ่มนี้กลับไปที่หัวคิว (เพื่อให้ Admin เห็นว่าคนกลุ่มนี้กลับมาว่างแล้ว)
    setNextQueue(prev => [groupToReturn, ...prev]);

    // 3. Async API Call: ลบแมตช์บน Server
    (async () => {
        try {
            if (!match_id) {
                showToast('ยกเลิกเฉพาะในแอป (ไม่พบ Match ID บนเซิร์ฟเวอร์)', 'info');
                return;
            }

            const res = await fetch(`${API_BASE}/api/matches/${match_id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Server failed to delete match');
            }

            const data = await res.json();
            
            // ถ้า Server คืนค่าผู้เล่นที่เป็นปัจจุบันที่สุด (Authoritative) มาให้ ให้ใช้ค่านั้นเลย
            if (data?.players) {
                setPlayers(data.players.map(normalizePlayer));
            }
            
            // ถ้า Server คำนวณคิวให้ใหม่หลังจากยกเลิก ก็อัปเดตตาม
            if (data?.newQueue) {
                setNextQueue(prev => {
                    const manualOnes = prev.filter(g => g.manualGroup);
                    return [...normalizeQueue(data.newQueue), ...manualOnes];
                });
            }

            showToast('ยกเลิกแมตช์เรียบร้อย ข้อมูลถูก Rollback แล้ว', 'success');
            window.dispatchEvent(new CustomEvent('players:updated'));

        } catch (err) {
            console.error('rollbackCourt Error:', err);
            showToast('เกิดข้อผิดพลาดในการยกเลิกบนเซิร์ฟเวอร์', 'error');
        } finally {
            await fetchCourts(); // Refresh สถานะสนามให้ชัวร์
        }
    })();
  }

  // Open reset confirmation modal (typed confirmation)
  function resetAll() {
    setResetConfirmText('');
    setShowResetModal(true);
  }

  function requestFinishCourt(courtId) {
    setFinishTargetCourt(courtId);
    setShowFinishModal(true);
  }

  function cancelFinishRequest() {
    setFinishTargetCourt(null);
    setShowFinishModal(false);
  }

  async function confirmFinishRequest() {
    const cid = finishTargetCourt;
    setFinishTargetCourt(null);
    setShowFinishModal(false);
    if (cid != null) {
      // call existing finishCourt flow with manual=true
      await finishCourt(cid, true);
    }
  }

  async function performReset() {
    // try to reset on server first; fall back to client-only reset on failure
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // adopt server-provided authoritative state when available
        if (data?.players && Array.isArray(data.players)) {
          const norm = data.players.map(normalizePlayer).filter(Boolean);
          setPlayers(norm);
        } else {
          // ensure client reset if server returns no players list
          setPlayers(prev => (prev || []).map(p => ({ ...p, matches: 0, lastPlayedRound: -10, teammates: {} })));
        }

        if (data?.courts && Array.isArray(data.courts)) {
          setCourts(normalizeCourts(data.courts));
        } else {
          setCourts(Array.from({ length: COURT_COUNT }, (_, i) => ({ id: i + 1, players: [], finished: true })));
        }

        if (data?.newQueue && Array.isArray(data.newQueue)) setNextQueue(normalizeQueue(data.newQueue));
        else setNextQueue([]);

        if (typeof data?.round === 'number') setRound(data.round);
        else setRound(0);

        try { window.dispatchEvent(new CustomEvent('players:updated')); } catch (e) {}
        showToast('รีเซ็ตข้อมูลบนเซิร์ฟเวอร์เรียบร้อย', 'success');
        setResetting(false);
        return;
      }

      // non-ok response: fall back to local reset
      throw new Error('Server reset failed');
    } catch (err) {
      // client-side fallback reset
      setPlayers(prev => (prev || []).map(p => ({
        ...p,
        matches: 0,
        lastPlayedRound: -10,
        teammates: {},
      })));
      setCourts(Array.from({ length: COURT_COUNT }, (_, i) => ({ id: i + 1, players: [], finished: true, status: 'available', current_players: [] })));
      setNextQueue([]);
      setRound(0);
      try { window.dispatchEvent(new CustomEvent('players:updated')); } catch (e) {}
      showToast(String(err || 'Failed to reset on server — client state reset'), 'error');
      setResetting(false);
    }
  }

  function autoFillCourt(courtId) {
    // autoFillCourt is no longer used — auto-assignment is disabled
  }

  // Handler passed to PlayerList to create a player on the server.
  // This function is intentionally synchronous (starts an async job)
  // because `PlayerList` calls `onAdd(createdLocal)` without awaiting.
  function handleAddPlayer(createdLocal) {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: createdLocal.name, level: createdLocal.level ?? null, gender: createdLocal.gender ?? null }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.message || 'Failed to create player');
        }

        const data = await res.json();
        const newPlayer = normalizePlayer(data.player || data) || (data.player || data);

        // prepend the newly created player into our local players state
        setPlayers(prev => [newPlayer, ...(prev || [])]);
        // notify any UI component that prefers to fetch direct from API
        try { window.dispatchEvent(new CustomEvent('players:updated')); } catch (e) { /* ignore in non-browser env */ }
        // show success toast
        showToast('สร้างผู้เล่นเรียบร้อย', 'success');
      } catch (err) {
        // fallback: keep the optimistic local player so UI isn't blocked
        console.error('create player failed, falling back to local', err);
        setPlayers(prev => [createdLocal, ...(prev || [])]);
        showToast(String(err || 'Failed to create player'), 'error');
      }
    })();
  }

  // ====================================================
  const sortedPlayers = [...players].sort(
    (a, b) => a.matches - b.matches
  );


  // current available players (not in court and passed cooldown)
  const busyIdsForAvailable = courts.flatMap(c => (c.players || []).map(p => p.id));
  // temporarily ignore cooldown when reporting available count
  const availableCount = players.filter(
    p => !busyIdsForAvailable.includes(p.id)
  ).length;

  // compute effective NEXT_SHOW based on how many full groups can be formed from available players
  const effectiveNextShow = Math.min(NEXT_SHOW, Math.floor(availableCount / 4));

  // Provide header state/actions via AppContext instead of window events
  try {
    // dynamic import via require to avoid server-side reference failures
  } catch (e) {}

  // Register header state with AppContext when running in the browser
  useEffect(() => {
    let mounted = true
    try {
      const { useAppContext } = require('@/context/AppContext')
      // If require/import succeeded and this module is a client-side hook,
      // we can't call hooks conditionally here. Instead, page registers
      // values by calling the exported setter functions on window as a
      // fallback for environments where context isn't used. However, since
      // we implemented AppContext as a client provider and `page.js` is a
      // client component, we'll import the hook normally at runtime below.
    } catch (e) {
      // ignore — fallback to event-based behaviour if context import isn't resolvable
    }
  }, [])


  // Auto-refill Next queue whenever players/courts/round change
  useEffect(() => {
    // guard against duplicate rapid invocations (React StrictMode mounts twice in dev)
    const now = Date.now();
    if (now - (refillLastRef.current || 0) < 300) return;
    refillLastRef.current = now;
    refillNextQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, courts, round]);

  // Sync with AppContext (header)
  const appCtx = useAppContext();

  useEffect(() => {
    if (!appCtx) return;
    appCtx.setEffectiveNextShow(effectiveNextShow);
  }, [appCtx, effectiveNextShow]);

  useEffect(() => {
    if (!appCtx) return;
    appCtx.setResetting(resetting);
  }, [appCtx, resetting]);

  useEffect(() => {
    if (!appCtx) return;
    const unsubscribe = appCtx.setOnRequestReset(() => resetAll());
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); }
  }, [appCtx]);

  return (
    <div>
      <Toasts />
      {showResetModal && (
        <div className="fixed inset-0 z-9999 flex items-start justify-center px-4 pt-12">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowResetModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">ยืนยันการรีเซ็ตข้อมูล</h3>
            <p className="text-sm text-gray-600 mt-2">พิมพ์ <span className="font-mono">RESET</span> เพื่อยืนยันการรีเซ็ตข้อมูลทั้งหมด (ไม่สามารถย้อนกลับได้)</p>
            <input
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-3"
              placeholder="พิมพ์ RESET ที่นี่"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={() => setShowResetModal(false)}>ยกเลิก</button>
              <button
                className={`px-3 py-1 rounded bg-red-600 text-white ${resetConfirmText === 'RESET' ? 'hover:bg-red-700' : 'opacity-50 cursor-not-allowed'}`}
                disabled={resetConfirmText !== 'RESET'}
                onClick={async () => { setShowResetModal(false); setResetConfirmText(''); await performReset(); }}
              >ยืนยันรีเซ็ต</button>
            </div>
          </div>
        </div>
      )}
      {showFinishModal && (
        <div className="fixed inset-0 z-9999 flex items-start justify-center px-4 pt-12">
          <div className="fixed inset-0 bg-black/40" onClick={cancelFinishRequest} />
          <div className="relative w-full max-w-md bg-white rounded-lg p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">ยืนยันการบันทึกผล</h3>
            <p className="text-sm text-gray-600 mt-2">คุณแน่ใจหรือไม่ว่าต้องการบันทึกผลแมตช์นี้เป็น <span className="font-medium">Finish</span> ?</p>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 rounded border hover:bg-gray-100" onClick={cancelFinishRequest}>ยกเลิก</button>
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={confirmFinishRequest}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
      

      <main className="flex flex-col gap-2 p-2 md:p-4">
        {/* Row 1: 4 columns for each court */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {courts.map((court, idx) => (
            <CourtStatus
              key={court.id || idx}
              courts={[court]}
              onFinish={(cid, manual) => {
                if (manual) requestFinishCourt(cid);
                else finishCourt(cid, manual);
              }}
              onRollback={rollbackCourt}
              round={round}
              onGenerate={generateNextQueue}
              onForceFill={guardedForceFill}
              rulesStrict={rulesStrict}
                // guard against duplicate rapid calls (React StrictMode may double-invoke handlers in dev)
                onToggleRules={guardedToggleRules}
              onReloadCourts={fetchCourts}
            />
          ))}
        </div>
        {/* Row 2: 3 columns — PlayerList 1/3, NextQueue 2/3 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <NextQueue
              queue={[
                ...nextQueue.filter(g => !g.manualGroup).slice(0, effectiveNextShow),
                ...nextQueue.filter(g => g.manualGroup)
              ]}
              courts={courts}
              onAssign={assignNextToCourt}
              onRefill={refillNextQueue}
              onGenerate={generateNextQueue}
              onForceFill={guardedForceFill}
              onToggleRules={guardedToggleRules}
              rulesStrict={rulesStrict}
              round={round}
              nextShow={effectiveNextShow}
              availableCount={availableCount}
              players={players}
              onManualQueue={ids => {
                // Allow manual group to be added regardless of court/queue status
                const selected = players.filter(p => ids.includes(p.id));
                if (selected.length === 4) {
                  setNextQueue(prev => [...prev, Object.assign(Array.from(selected), { manualGroup: true })]);
                }
              }}
            />
          </div>
          <div className="md:col-span-2">
            <PlayerList players={sortedPlayers} nextQueue={nextQueue} courts={courts} onAdd={handleAddPlayer} loadPlayers={loadPlayers} generateNextQueue={generateNextQueue} />
          </div>
        </div>
      </main>
    </div>
  );
}