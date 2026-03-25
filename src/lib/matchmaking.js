// Helper: ตรวจสอบทีม
function isAllFemale(team) {
  return team.every(p => p.gender === 'Female');
}
function isMixedGender(team) {
  const hasMale = team.some(p => p.gender === 'Male');
  const hasFemale = team.some(p => p.gender === 'Female');
  return hasMale && hasFemale;
}
function isSameLevel(team) {
  return team.every(p => p.level === team[0].level);
}

/**
 * รับ array ของทีม (กลุ่มละ 4 คน) แล้วจัดลำดับความสำคัญ:
 * 1. ทีมผสมชายหญิง
 * 2. ทีมหญิงล้วนระดับเดียวกัน
 * 3. ทีมอื่นๆ
 */
export function prioritizeTeams(teams) {
  const mixedTeams = teams.filter(isMixedGender);
  const allFemaleSameLevel = teams.filter(team => isAllFemale(team) && isSameLevel(team));
  const otherTeams = teams.filter(team => !mixedTeams.includes(team) && !allFemaleSameLevel.includes(team));
  return [...mixedTeams, ...allFemaleSameLevel, ...otherTeams];
}
/**
 * หา group 4 คนที่ pair กันได้หมด (ทุกคนในทีม pair กันได้)
 * คืนค่าเป็น array ของกลุ่มละ 4 คน
 */
export function findValidTeamsOf4(players) {
  const used = new Set();
  const teams = [];
  for (let i = 0; i < players.length; i++) {
    if (used.has(players[i].id)) continue;
    for (let j = i + 1; j < players.length; j++) {
      if (used.has(players[j].id)) continue;
      for (let k = j + 1; k < players.length; k++) {
        if (used.has(players[k].id)) continue;
        for (let l = k + 1; l < players.length; l++) {
          if (used.has(players[l].id)) continue;
          const group = [players[i], players[j], players[k], players[l]];
          // เช็คทุกคู่ในกลุ่มนี้
          let valid = true;
          for (let a = 0; a < 4; a++) {
            for (let b = a + 1; b < 4; b++) {
              if (!canPair(group[a], group[b])) {
                valid = false;
                break;
              }
            }
            if (!valid) break;
          }
          if (valid) {
            teams.push(group);
            group.forEach(p => used.add(p.id));
            break;
          }
        }
        if (used.has(players[i].id)) break;
      }
      if (used.has(players[i].id)) break;
    }
  }
  return teams;
}
/**
 * สร้างคู่ (pair) ที่มากที่สุดจากกลุ่มผู้เล่น โดยเคารพ policy (greedy)
 * คืนค่าเป็น array ของ [playerA, playerB]
 */
export function greedyPairing(players) {
  const used = new Set();
  const pairs = [];
  for (let i = 0; i < players.length; i++) {
    if (used.has(players[i].id)) continue;
    for (let j = i + 1; j < players.length; j++) {
      if (used.has(players[j].id)) continue;
      if (canPair(players[i], players[j])) {
        pairs.push([players[i], players[j]]);
        used.add(players[i].id);
        used.add(players[j].id);
        break;
      }
    }
  }
  return pairs;
}
/**
 * ตรวจสอบว่าผู้เล่นสองคนสามารถจับคู่กันได้ตาม pairing_policy และ restricted_player_ids
 */
export function canPair(playerA, playerB) {
  // 1: ล็อคคู่ (ต้องเล่นกับคนใน list เท่านั้น)
  if (playerA.pairing_policy === 1 && !playerA.restricted_player_ids?.[playerB.id]) return false;
  // 2: แบนคู่ (ห้ามเจอคนใน list)
  if (playerA.pairing_policy === 2 && playerA.restricted_player_ids?.[playerB.id]) return false;
  // ตรวจสอบฝั่ง B ด้วย (optional, mutual respect)
  if (playerB.pairing_policy === 1 && !playerB.restricted_player_ids?.[playerA.id]) return false;
  if (playerB.pairing_policy === 2 && playerB.restricted_player_ids?.[playerA.id]) return false;
  return true;
}
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

  // ลองจับคู่แบบ 1+4 vs 2+3 ถ้าผ่าน policy ทุกคน
  const teamA = [sorted[0], sorted[3]];
  const teamB = [sorted[1], sorted[2]];
  if (
    canPair(teamA[0], teamA[1]) &&
    canPair(teamB[0], teamB[1]) &&
    canPair(teamA[0], teamB[0]) &&
    canPair(teamA[0], teamB[1]) &&
    canPair(teamA[1], teamB[0]) &&
    canPair(teamA[1], teamB[1]) &&
    canPair(teamB[0], teamB[1])
  ) {
    return { teamA, teamB };
  }
  // ถ้าไม่ผ่าน ลองสลับ permutation อื่น ๆ (optional: เพิ่ม logic advance)
  // (สำหรับ demo นี้ return null ถ้า policy ไม่ผ่าน)
  return null;
}

/**
 * สร้าง Match จาก 4 คนแรกในคิว
 */
export function createMatchFromQueue(queue) {
  if (queue.length < 4) return { match: null, queue };

  // หา 4 คนแรกที่สามารถจับคู่กันได้ตาม policy
  for (let i = 0; i <= queue.length - 4; i++) {
    const group = queue.slice(i, i + 4);
    const match = createTeams(group);
    if (match) {
      // ตัด 4 คนนี้ออกจาก queue
      const ids = new Set(group.map(p => p.id));
      const remaining = queue.filter(p => !ids.has(p.id));
      return { match, queue: remaining };
    }
  }
  // ถ้าไม่มีชุดไหนจับคู่ได้
  return { match: null, queue };
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
  // หา valid teams ทั้งหมดจากกลุ่มที่เล่นได้
  const playingCandidates = sorted.slice(0, playersPerRound);
  const waiting = sorted.slice(playersPerRound);
  const allTeams = findValidTeamsOf4(playingCandidates);
  const prioritizedTeams = prioritizeTeams(allTeams);

  const courts = [];
  for (let i = 0; i < courtCount; i++) {
    const group = prioritizedTeams[i];
    if (group && group.length === 4) {
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