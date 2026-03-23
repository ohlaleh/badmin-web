/**
 * BADMINTON MATCHMAKING ENGINE (v2.0)
 * --------------------------------
 * ระบบจัดคิวและแบ่งทีมอัตโนมัติ เน้นความยุติธรรมและสมดุลของฝีมือ
 */

const LEVEL_WEIGHTS = { 'P': 4, 'S': 3, 'N': 2, 'N-': 1 };

/* =====================================================
   1. HELPERS & UTILS
===================================================== */

/**
 * แปลงค่าระดับฝีมือให้เป็น Label มาตรฐาน (P, S, N, N-)
 */
export function levelLabel(p) {
  if (!p) return 'N-';
  if (typeof p.level === 'string' && LEVEL_WEIGHTS[p.level]) return p.level;
  
  const lvl = p.level ?? p.rank ?? p.skill ?? 0;
  if (lvl >= 1800) return 'P';
  if (lvl >= 1500) return 'S';
  if (lvl >= 1200) return 'N';
  return 'N-';
}

/**
 * สลับตำแหน่ง Array แบบสุ่ม (Fisher-Yates)
 */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * เรียงลำดับตามความยุติธรรม (เล่นน้อยกว่า + พักนานกว่า ได้ก่อน)
 */
export function sortFair(players) {
  if (!players || !Array.isArray(players)) return [];

  return [...players].sort((a, b) => {
    const matchesA = a.matches ?? a.gamesPlayed ?? 0;
    const matchesB = b.matches ?? b.gamesPlayed ?? 0;

    if (matchesA !== matchesB) return matchesA - matchesB;

    const timeA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
    const timeB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
    return timeA - timeB;
  });
}

/* =====================================================
   2. TEAM & MATCH LOGIC
===================================================== */

/**
 * แบ่งทีม 2v2 แบบสมดุลที่สุด (1+4 vs 2+3)
 */
export function createTeams(group) {
  if (!group || group.length !== 4) return null;

  // เรียงจากเก่งไปอ่อนภายในกลุ่ม 4 คน
  const sorted = [...group].sort((a, b) => {
    const weightA = LEVEL_WEIGHTS[levelLabel(a)] || 0;
    const weightB = LEVEL_WEIGHTS[levelLabel(b)] || 0;
    return weightB - weightA;
  });

  return {
    teamA: [sorted[0], sorted[3]], // เก่งสุด + อ่อนสุด
    teamB: [sorted[1], sorted[2]], // กลาง + กลาง
  };
}

/**
 * สร้าง Match จาก 4 คนแรกในคิว
 */
export function createMatchFromQueue(queue) {
  if (queue.length < 4) return { match: null, queue };

  const selected = queue.slice(0, 4);
  const remaining = queue.slice(4);
  
  // ใช้ createTeams เพื่อให้ได้ทีมที่สมดุล
  const match = createTeams(selected);

  return { match, queue: remaining };
}

/* =====================================================
   3. CORE FLOW (ROUND & ROTATION)
===================================================== */

/**
 * จัดแมตช์เริ่มต้นสำหรับทุกสนาม
 */
export function generateMatches(players, courtCount = 2) {
  const playersPerRound = courtCount * 4;
  if (players.length < playersPerRound) {
    console.warn("จำนวนคนไม่พอสำหรับทุกสนาม");
  }

  const sorted = sortFair(players);
  const playingCandidates = sorted.slice(0, playersPerRound);
  const waiting = sorted.slice(playersPerRound);

  // Shuffle เฉพาะกลุ่มที่จะได้เล่น เพื่อไม่ให้คนเดิมๆ เจอกันบ่อย
  const playing = shuffle(playingCandidates);

  const courts = [];
  for (let i = 0; i < courtCount; i++) {
    const group = playing.slice(i * 4, i * 4 + 4);
    if (group.length === 4) {
      courts.push({
        court: i + 1,
        currentMatch: createTeams(group),
        status: 'occupied'
      });
    }
  }

  return { courts, waiting };
}

/**
 * เมื่อจบหนึ่งสนาม: อัปเดตสถิติคนเล่นจบ -> ย้ายไปท้ายคิว -> ดึงคนใหม่มาจัด NextMatch
 */
export function finishCourtWithNext(courtId, courts, queue) {
  const index = courts.findIndex(c => c.court === courtId);
  if (index === -1) return { courts, queue };

  const court = courts[index];
  const finishedPlayers = [
    ...(court.currentMatch?.teamA || []),
    ...(court.currentMatch?.teamB || [])
  ];

  const now = new Date().toISOString();
  const updatedFinished = finishedPlayers.map(p => ({
    ...p,
    matches: (p.matches || 0) + 1,
    lastPlayedAt: now
  }));

  // 1. ย้ายคนเล่นเสร็จไปต่อท้ายคิว
  let newQueue = [...queue, ...updatedFinished];

  // 2. ดัน Next Match ขึ้นมาเป็น Current (ถ้ามี)
  let newCurrent = court.nextMatch || null;

  // 3. จัดหา Next Match ใหม่จากหัวคิว
  const nextResult = createMatchFromQueue(newQueue);
  newQueue = nextResult.queue;

  const newCourts = [...courts];
  newCourts[index] = {
    ...court,
    currentMatch: newCurrent,
    nextMatch: nextResult.match,
    status: newCurrent ? 'occupied' : 'available'
  };

  return { courts: newCourts, queue: newQueue };
}