"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from '@/context/AppContext'
import PlayerList from "@/components/PlayerList";
import CourtStatus from "@/components/CourtStatus";
import NextQueue from "@/components/NextQueue";
import Toasts from "@/components/Toasts";
import showToast from "@/lib/toast";

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

  // Normalizers: ensure server-provided shapes are safe for the UI
  const normalizePlayer = useCallback((p) => {
    if (!p) return null;
    return {
      id: p.id,
      name: p.name ?? p.full_name ?? p.nickname ?? String(p.id),
      matches: Number(p.matches ?? 0),
      lastPlayedRound: Number(p.lastPlayedRound ?? p.last_played_round ?? -10),
      gender: p.gender ?? 'Male',
      teammates: (p.teammates && typeof p.teammates === 'object') ? p.teammates : (p.teammate_counts && typeof p.teammate_counts === 'object' ? p.teammate_counts : {}),
      level: p.level ?? p.rank ?? p.skill ?? 0,
      play_status: p.play_status,
    };
  }, []);

  const normalizeCourts = useCallback((courtsData) => {
    if (!Array.isArray(courtsData)) return Array.from({ length: COURT_COUNT }, (_, i) => ({ id: i + 1, players: [], finished: true, status: 'available', current_players: [] }));
    return courtsData.map((c, idx) => ({
      id: c?.id ?? (idx + 1),
      name: c?.name ?? `Court ${c?.id ?? (idx + 1)}`,
      status: c?.status ?? 'available',
      current_players: Array.isArray(c?.current_players) ? c.current_players : [],
      players: Array.isArray(c?.players) ? c.players.map(normalizePlayer).filter(Boolean) : [],
      finished: typeof c?.finished === 'boolean' ? c.finished : Boolean(Number(c?.finished)),
      created_at: c?.created_at,
      updated_at: c?.updated_at,
      match_id: c?.match_id,
    }));
  }, [normalizePlayer]);

  const normalizeQueue = useCallback((queueData) => {
    if (!Array.isArray(queueData)) return [];
    return queueData.map(g => Array.isArray(g) ? g.map(normalizePlayer).filter(Boolean) : []);
  }, [normalizePlayer]);

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
  }, [API_BASE, normalizeCourts]);

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
  }, [API_BASE, normalizePlayer]);

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
  }, [API_BASE, fetchCourts, normalizePlayer, loadPlayers]);

  // SMART MATCHMAKING
  // ====================================================
  function generateNextQueue() {
    console.log('SMART MATCHMAKING...generateNextQueue')
    const busyIds = courts.flatMap(c =>
      (c.players || []).map(p => p.id)
    );

    // available players — exclude those currently on court and those marked stopped
    let available = players.filter(p => !busyIds.includes(p.id) && p.play_status !== 'stopped');

    // apply cooldown rule when strict
    if (rulesStrict) {
      available = available.filter(p => round - p.lastPlayedRound >= COOLDOWN);
    }

    // fairness score
    available = available
      .map(p => ({
        ...p,
        priority: rulesStrict
          ? p.matches * 10 + (round - p.lastPlayedRound) * -1 + Math.random()
          : p.matches * 10 + Math.random(),
      }))
      .sort((a, b) => a.priority - b.priority);

    const groups = [];

    // helper: map player to level label
    function levelLabel(p) {
      const lvl = (p && (p.level ?? p.rank ?? p.skill)) || 0;
      if (lvl >= 1800) return "P";
      if (lvl >= 1500) return "S";
      if (lvl >= 1200) return "N";
      return "N-";
    }

    // try to reorder 4 players into two teams (A,B) of two players each
    // such that the multiset of level labels on each team matches
    function findBalancedOrdering(group) {
      if (!group || group.length !== 4) return null;
      const idx = [0,1,2,3];
      // try all combinations for team A (choose 2 indices)
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          const aIdx = [i, j];
          const bIdx = idx.filter(k => k !== i && k !== j);
          const aLabels = aIdx.map(k => levelLabel(group[k])).sort().join(',');
          const bLabels = bIdx.map(k => levelLabel(group[k])).sort().join(',');
          if (aLabels === bLabels) {
            // return ordering: team A players first, then team B
            return [group[aIdx[0]], group[aIdx[1]], group[bIdx[0]], group[bIdx[1]]];
          }
        }
      }
      return null;
    }

    while (available.length >= 4) {
      const group = available.splice(0, 4);

      // attempt to balance by level where possible
      const balanced = findBalancedOrdering(group);
      const finalGroup = balanced || group;

      // if strict, ensure no immediate teammate repeats
      if (rulesStrict) {
        if (!hasRepeatTeammate(finalGroup)) groups.push(finalGroup);
      } else {
        groups.push(finalGroup);
      }
    }

    console.debug("generateNextQueue", { busyCount: busyIds.length, availableCount: players.length - busyIds.length, groups: groups.length, rulesStrict });

    setNextQueue(groups);
  }

  // Refill (append) nextQueue up to NEXT_SHOW without replacing existing entries
  function refillNextQueue() {
    console.log('Refill (append) nextQueue ');
    
    setNextQueue(prev => {
      if (prev.length >= effectiveNextShow) return prev;

      const busyIds = courts.flatMap(c => (c.players || []).map(p => p.id));
      const queuedIds = prev.flatMap(g => g.map(p => p.id));

      let available = players.filter(p => !busyIds.includes(p.id) && !queuedIds.includes(p.id));

      if (rulesStrict) {
        available = available.filter(p => round - p.lastPlayedRound >= COOLDOWN);
      }

      available = available
        .map(p => ({
          ...p,
          priority: rulesStrict ? p.matches * 10 + (round - p.lastPlayedRound) * -1 + Math.random() : p.matches * 10 + Math.random(),
        }))
        .sort((a, b) => a.priority - b.priority);

      const groupsToAdd = [];

      // helper: level label for balancing (same thresholds as PlayerCard)
      function levelLabel(p) {
        const lvl = (p && (p.level ?? p.rank ?? p.skill)) || 0;
        if (lvl >= 1800) return "P";
        if (lvl >= 1500) return "S";
        if (lvl >= 1200) return "N";
        return "N-";
      }

      function findBalancedOrdering(group) {
        if (!group || group.length !== 4) return null;
        const idx = [0,1,2,3];
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            const aIdx = [i, j];
            const bIdx = idx.filter(k => k !== i && k !== j);
            const aLabels = aIdx.map(k => levelLabel(group[k])).sort().join(',');
            const bLabels = bIdx.map(k => levelLabel(group[k])).sort().join(',');
            if (aLabels === bLabels) {
              return [group[aIdx[0]], group[aIdx[1]], group[bIdx[0]], group[bIdx[1]]];
            }
          }
        }
        return null;
      }

      while (available.length >= 4 && prev.length + groupsToAdd.length < effectiveNextShow) {
        const group = available.splice(0, 4);
        const balanced = findBalancedOrdering(group);
        const finalGroup = balanced || group;
        if (rulesStrict) {
          if (!hasRepeatTeammate(finalGroup)) groupsToAdd.push(finalGroup);
        } else {
          groupsToAdd.push(finalGroup);
        }
      }

      console.debug("refillNextQueue", { prevLength: prev.length, groupsToAdd: groupsToAdd.length, rulesStrict });

      return [...prev, ...groupsToAdd];
    });
  }

  function hasRepeatTeammate(group) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[i].teammates[group[j].id]) {
          return true;
        }
      }
    }
    return false;
  }

  // ====================================================
  // ASSIGN MATCH
  // ====================================================
  function assignNextToCourt(courtId, index) {
    const group = nextQueue[index];
    if (!group) return;

    const updatedPlayers = players.map(p => {
      const g = group.find(x => x.id === p.id);
      if (!g) return p;

      const newTeammates = { ...p.teammates };

      group.forEach(t => {
        if (t.id !== p.id)
          newTeammates[t.id] =
            (newTeammates[t.id] || 0) + 1;
      });

      return {
        ...p,
        matches: p.matches + 1,
        lastPlayedRound: round,
        teammates: newTeammates,
      };
    });

    setPlayers(updatedPlayers);

    const updatedGroup = updatedPlayers.filter(p =>
      group.some(g => g.id === p.id)
    );

    // compute updated courts synchronously so we can use it immediately
    const updatedCourts = courts.map(c =>
        c.id === courtId
          ? { ...c, players: updatedGroup, finished: false, status: 'occupied' }
          : c
    );

    console.info("assignNextToCourt: assigning group to court", { courtId, groupIds: group.map(g => g.id), round });

    setCourts(updatedCourts);

    console.debug("assignNextToCourt: updatedCourts", updatedCourts);

    // remove the assigned group and try to refill queue up to NEXT_SHOW
    setNextQueue(prev => {
      const newQ = prev.filter((_, i) => i !== index);

      // compute busy and queued ids using the updated courts we just set
      const busyIds = updatedCourts.flatMap(c => (c.players || []).map(p => p.id));
      const queuedIds = newQ.flatMap(g => g.map(p => p.id));

      // temporarily ignore cooldown and teammate constraints
      let available = players.filter(
        p => !busyIds.includes(p.id) && !queuedIds.includes(p.id)
      );

      // fairness/priority
      available = available
        .map(p => ({
          ...p,
          priority:
            p.matches * 10 +
            (round - p.lastPlayedRound) * -1 +
            Math.random(),
        }))
        .sort((a, b) => a.priority - b.priority);

      const groupsToAdd = [];

      while (
        available.length >= 4 &&
        newQ.length + groupsToAdd.length < effectiveNextShow
      ) {
        const group = available.splice(0, 4);
        groupsToAdd.push(group);
      }

      console.info("assignNextToCourt: groups added", { added: groupsToAdd.length, courtId, effectiveNextShow });

      return [...newQ, ...groupsToAdd];
    });

    setRound(r => r + 1);

    // Create a provisional match on the server so it can be completed or cancelled later.
    (async () => {
      try {
        const payload = {
          round: round,
          court_id: courtId,
          player_ids: updatedGroup.map(p => p.id),
          result: 'playing',
          provisional: true,
        };

        const res = await fetch(`${API_BASE}/api/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.message || 'Failed to create provisional match');
        }

        const data = await res.json();
        const match = data.match || data;

        // Debug log: show what match_id is being attached
        // console.log('assignNextToCourt: received match', match);

        // attach match_id to the assigned court so future finish/cancel operations can reference it
        if (match && match.id) {
          setCourts(prev => {
            const updated = prev.map(c => c.id === courtId ? { ...c, match_id: match.id } : c);
            // Debug log: show courts after attaching match_id
            // console.log('assignNextToCourt: courts after attaching match_id', updated);
            return updated;
          });
        } else {
          console.warn('assignNextToCourt: No match.id returned from backend!', match);
        }

        // Only refresh player list after match creation is fully completed
        showToast('จัดลงสนามเรียบร้อย', 'success');
        try {
          const res = await fetch(`${API_BASE}/api/players`, { headers: { Accept: 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data.players) ? data.players : (Array.isArray(data) ? data : []);
            setPlayers((list || []).map(normalizePlayer).filter(Boolean));
          }
        } catch (e) {
          console.warn('assignNextToCourt: failed to refresh player list', e);
        }
      } catch (err) {
        console.error('assignNextToCourt: provisional match creation failed', err);
        showToast(String(err || 'Failed to create provisional match'), 'error');
      }
    })();
  }

  // ====================================================
  // FORCE FILL (EMERGENCY) - ignores cooldown and teammate-repeat
  // ====================================================
  function forceFillQueue() {
    setNextQueue(prev => {
      const newQ = [...prev];

      // choose players not currently on court and not already queued
      const busyIds = courts.flatMap(c => (c.players || []).map(p => p.id));
      const queuedIds = newQ.flatMap(g => g.map(p => p.id));

      let available = players.filter(p => !busyIds.includes(p.id) && !queuedIds.includes(p.id));

      // simple deterministic order (by matches asc, then id)
      available = available.sort((a, b) => a.matches - b.matches || a.id - b.id);

      const groupsToAdd = [];

      // attempt to balance levels when force-filling
      function levelLabel(p) {
        const lvl = (p && (p.level ?? p.rank ?? p.skill)) || 0;
        if (lvl >= 1800) return "P";
        if (lvl >= 1500) return "S";
        if (lvl >= 1200) return "N";
        return "N-";
      }

      function findBalancedOrdering(group) {
        if (!group || group.length !== 4) return null;
        const idx = [0,1,2,3];
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            const aIdx = [i, j];
            const bIdx = idx.filter(k => k !== i && k !== j);
            const aLabels = aIdx.map(k => levelLabel(group[k])).sort().join(',');
            const bLabels = bIdx.map(k => levelLabel(group[k])).sort().join(',');
            if (aLabels === bLabels) {
              return [group[aIdx[0]], group[aIdx[1]], group[bIdx[0]], group[bIdx[1]]];
            }
          }
        }
        return null;
      }

      while (available.length >= 4 && newQ.length + groupsToAdd.length < effectiveNextShow) {
        const group = available.splice(0, 4);
        const balanced = findBalancedOrdering(group);
        groupsToAdd.push(balanced || group);
      }

      console.info("forceFillQueue: forced groups added", { added: groupsToAdd.length, effectiveNextShow });

      return [...newQ, ...groupsToAdd];
    });
  }

  // ====================================================
  // FINISH COURT
  // ====================================================
  function finishCourt(courtId, manual = false) {
    // compute updated courts synchronously so we can use the new state immediately
    const updatedCourts = courts.map(c =>
      c.id === courtId ? { ...c, players: [], finished: true, match_id: undefined, status: 'available' } : c
    );

    setCourts(updatedCourts);
    // console.info("finishCourt: court finished", { courtId, manual, round });

    // capture the player ids that were on the court so we can report to the server
    const court = courts.find(c => c.id === courtId);
    const groupIds = (court && court.players ? court.players.map(p => p.id) : []);

    // async POST to server to register match finish
    (async () => {
      if (!groupIds || groupIds.length === 0) {
        // nothing to report; fall back to existing behavior
        if (!manual) {
          setTimeout(() => assignNextToCourt(courtId, 0), 100);
        } else {
          // manual fallback: refill local nextQueue up to effectiveNextShow, but preserve manual groups
          setNextQueue(prev => {
            const manualGroups = prev.filter(g => g.manualGroup);
            const newQ = prev.filter(g => !g.manualGroup);

            const busyIds = updatedCourts
                .filter(c => c.id !== courtId)
                .flatMap(c => (c.players || []).map(p => p.id));

            const queuedIds = newQ.flatMap(g => g.map(p => p.id));

            let available = players.filter(
              p => !busyIds.includes(p.id) && !queuedIds.includes(p.id)
            );

            available = available
              .map(p => ({
                ...p,
                priority: p.matches * 10 + Math.random(),
              }))
              .sort((a, b) => a.priority - b.priority);

            const groupsToAdd = [];

            while (
              available.length >= 4 &&
              newQ.length + groupsToAdd.length < effectiveNextShow
            ) {
              const group = available.splice(0, 4);
              groupsToAdd.push(group);
            }

            console.info("finishCourt (manual fallback): groups added", { courtId, added: groupsToAdd.length, effectiveNextShow });

            return [...newQ, ...groupsToAdd, ...manualGroups];
          });
        }
        return;
      }

      try {
        // Only allow finishing if a provisional match exists (must have match_id)
        if (court && court.match_id) {
          const match_id = court.match_id;
          const res = await fetch(`${API_BASE}/api/matches/${match_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ round, court_id: courtId, player_ids: groupIds, result: manual ? 'manual' : 'auto' }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.message || 'Failed to complete provisional match');
          }

          const data = await res.json();

          if (data?.newQueue) {
            // preserve manual groups when updating nextQueue from backend
            setNextQueue(prev => {
              const manualGroups = prev.filter(g => g.manualGroup);
              return [...normalizeQueue(data.newQueue), ...manualGroups];
            });
          }
          if (data?.players && Array.isArray(data.players)) setPlayers(data.players.map(normalizePlayer).filter(Boolean));
          try { window.dispatchEvent(new CustomEvent('players:updated')); } catch (e) {}
          showToast('บันทึกจบแมตช์เรียบร้อย', 'success');

          // Always reload courts after finishing
          await fetchCourts();

          if (!manual) {
            setTimeout(() => assignNextToCourt(courtId, 0), 100);
          }

          return;
        } else {
          // No provisional match exists, cannot finish
          showToast('ไม่พบแมตช์สำหรับคอร์ทนี้ กรุณา Assign ก่อน', 'error');
          return;
        }
      } catch (err) {
        console.error('finishCourt: failed to POST match', err);
        showToast(String(err || 'Failed to record match'), 'error');

        // on error, preserve UX: still auto-assign or refill locally
        if (!manual) {
          setTimeout(() => assignNextToCourt(courtId, 0), 100);
        } else {
          setNextQueue(prev => {
            const newQ = [...prev];

            const busyIds = updatedCourts
              .filter(c => c.id !== courtId)
              .flatMap(c => (c.players || []).map(p => p.id));

            const queuedIds = newQ.flatMap(g => g.map(p => p.id));

            let available = players.filter(
              p => !busyIds.includes(p.id) && !queuedIds.includes(p.id)
            );

            available = available
              .map(p => ({
                ...p,
                priority: p.matches * 10 + Math.random(),
              }))
              .sort((a, b) => a.priority - b.priority);

            const groupsToAdd = [];

            while (
              available.length >= 4 &&
              newQ.length + groupsToAdd.length < effectiveNextShow
            ) {
              const group = available.splice(0, 4);
              groupsToAdd.push(group);
            }

            return [...newQ, ...groupsToAdd];
          });
        }
      }
    })();
  }

  // ====================================================
  // ROLLBACK: undo last assignment on a court
  // ====================================================
  function rollbackCourt(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.players || court.players.length === 0) return;

    const groupIds = court.players.map(p => p.id);

    // revert players' matches and lastPlayedRound
    const updatedPlayers = players.map(p => {
      if (!groupIds.includes(p.id)) return p;
      return {
        ...p,
        matches: Math.max(0, (p.matches || 0) - 1),
        lastPlayedRound: (p.lastPlayedRound || -10) - 1,
      };
    });

    // make the court available
    const updatedCourts = courts.map(c =>
      c.id === courtId ? { ...c, players: [], finished: true, match_id: undefined, status: 'available' } : c
    );

    // push the rolled-back group to the front of nextQueue
    const rolledGroup = updatedPlayers.filter(p => groupIds.includes(p.id));

    setPlayers(updatedPlayers);
    setCourts(updatedCourts);

    setNextQueue(prev => [rolledGroup, ...prev]);

    // decrement round (but not below 0)
    setRound(r => Math.max(0, r - 1));

    console.info("rollbackCourt: rolled back court", { courtId, groupIds });

    // If this court had a provisional match recorded on the server, attempt to delete it.
    (async () => {
      try {
        const match_id = court.match_id;
        if (!match_id) return;

        const res = await fetch(`${API_BASE}/api/matches/${match_id}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || 'Failed to delete provisional match');
        }

        // adopt authoritative players if server returned them
        const data = await res.json().catch(() => ({}));
        if (data?.players && Array.isArray(data.players)) {
          setPlayers(data.players.map(normalizePlayer).filter(Boolean));
        }

        try { window.dispatchEvent(new CustomEvent('players:updated')); } catch (e) {}
        showToast('ยกเลิกแมตช์บนเซิร์ฟเวอร์เรียบร้อย', 'success');
      } catch (err) {
        console.error('rollbackCourt: failed to delete provisional match', err);
        showToast(String(err || 'Failed to cancel provisional match on server'), 'error');
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