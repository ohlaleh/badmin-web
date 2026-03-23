/**
 * LIGHTWEIGHT MATCHMAKER HELPERS
 * ระบบจัดการคิวและจัดทีมแบบ Pure Functions สำหรับใช้ใน UI
 */

// น้ำหนักคะแนนตามระดับฝีมือ
const LEVEL_WEIGHTS = { 'P': 4, 'S': 3, 'N': 2, 'N-': 1 };

/**
 * ระบุระดับฝีมือจากคะแนน (Rank/Skill) หรือค่า Level
 */
export function levelLabel(p) {
  if (!p) return 'N-';
  // ถ้ามีค่า level เป็น String อยู่แล้ว (P, S, N, N-) ให้ใช้ค่านั้นเลย
  if (typeof p.level === 'string' && LEVEL_WEIGHTS[p.level]) return p.level;
  
  const lvl = p.level ?? p.rank ?? p.skill ?? 0;
  if (lvl >= 1800) return 'P';
  if (lvl >= 1500) return 'S';
  if (lvl >= 1200) return 'N';
  return 'N-';
}

/**
 * จัดลำดับคนในกลุ่ม 4 คนให้สมดุลที่สุด (Team A: [0,1] vs Team B: [2,3])
 * 0 = เก่งสุด, 3 = อ่อนสุด
 */
export function findBalancedOrdering(group) {
  if (!group || group.length !== 4) return group; // คืนค่าเดิมถ้าข้อมูลไม่ครบ

  // Helper ในการดึงค่าน้ำหนัก (ควรดึงจากระดับฝีมือ N-, N, S, P)
  const getWeight = (p) => {
    // ดึงค่า Weight จาก Config หรือ Normalizer ของคุณ
    if (typeof LEVEL_WEIGHTS !== 'undefined') {
      return LEVEL_WEIGHTS[p.level] || 0;
    }
    // Fallback logic
    const weights = { 'P': 40, 'S': 30, 'N': 20, 'N-': 10 };
    return weights[p.level] || 0;
  };

  // 1. เรียงลำดับจากเก่งไปอ่อน (ถ้า Weight เท่ากัน ให้คนแข่งเยอะกว่าเป็นตัวตั้ง - เพื่อกระจายความล้า)
  const sorted = [...group].sort((a, b) => {
    const diff = getWeight(b) - getWeight(a);
    if (diff !== 0) return diff;
    return (b.matches || 0) - (a.matches || 0); 
  });

  /**
   * 2. ใช้สูตร 1+4 vs 2+3
   * Team A: sorted[0] (เก่งสุด) + sorted[3] (อ่อนสุด)
   * Team B: sorted[1] (เก่งรอง) + sorted[2] (อ่อนรอง)
   */
  const balancedGroup = [
    sorted[0], sorted[3], // Team A
    sorted[1], sorted[2]  // Team B
  ];

  // 3. แนบข้อมูล "ความต่างของคะแนน" ไว้ใช้ตรวจสอบ (Optional)
  const teamAScore = getWeight(sorted[0]) + getWeight(sorted[3]);
  const teamBScore = getWeight(sorted[1]) + getWeight(sorted[2]);
  balancedGroup.balanceGap = Math.abs(teamAScore - teamBScore);

  return balancedGroup;
}

/**
 * ตรวจสอบว่าในกลุ่มมีคนที่เคยเป็นคู่หู (Teammate) กันมาก่อนหรือไม่
 * โดยเช็คเฉพาะคู่ที่จะต้องลงแข่งด้วยกัน (Team A: 0-1, Team B: 2-3)
 */
export function hasRepeatTeammate(group) {
  if (!group || group.length !== 4) return false;

  const checkPair = (p1, p2) => {
    if (!p1 || !p2 || !p1.teammates) return false;
    
    // ตรวจสอบทั้งกรณี key เป็น String และ Number
    const p2Id = String(p2.id);
    const hasPlayedBefore = p1.teammates[p2Id] !== undefined && p1.teammates[p2Id] > 0;
    
    return hasPlayedBefore;
  };

  // ตรวจสอบคู่ Team A
  if (checkPair(group[0], group[1])) return true;
  
  // ตรวจสอบคู่ Team B
  if (checkPair(group[2], group[3])) return true;

  return false;
}

/**
 * สร้างกลุ่มใหม่จากผู้เล่นที่ว่างอยู่ทั้งหมด
 */
export function buildGroups({ players = [], courts = [], rulesStrict = true, round = 0, COOLDOWN = 1 }) {
  const busyIds = (courts || []).flatMap(c => (c.players || []).map(p => p.id));
  let available = (players || []).filter(p => !busyIds.includes(p.id) && p.play_status !== 'stopped');

  if (rulesStrict) {
    available = available.filter(p => round - (p.lastPlayedRound ?? -10) >= COOLDOWN);
  }

  // คำนวณลำดับความสำคัญ (คนเล่นน้อย + พักนาน ได้ก่อน)
  available = available
    .map(p => ({ 
      ...p, 
      priority: rulesStrict 
        ? (p.matches ?? 0) * 10 + (round - (p.lastPlayedRound ?? 0)) * -1 + Math.random() 
        : (p.matches ?? 0) * 10 + Math.random() 
    }))
    .sort((a, b) => a.priority - b.priority);

  const groups = [];
  while (available.length >= 4) {
    const group = available.splice(0, 4);
    const balanced = findBalancedOrdering(group);
    const finalGroup = balanced || group;

    if (rulesStrict && hasRepeatTeammate(finalGroup)) {
      // ถ้ากฎเข้มงวดแล้วเจอคู่ซ้ำ ให้ข้ามกลุ่มนี้ไปก่อน (หรือจะจัดการ shuffle ใหม่ก็ได้)
      continue; 
    }
    groups.push(finalGroup);
  }
  return groups;
}

/**
 * เติมกลุ่มใหม่เข้าไปในคิวที่มีอยู่เดิม (Append)
 */
export function appendGroups({ prevQueue = [], players = [], courts = [], rulesStrict = true, round = 0, COOLDOWN = 1, effectiveNextShow = 10 }) {
  const prev = Array.isArray(prevQueue) ? [...prevQueue] : [];
  if (prev.length >= effectiveNextShow) return prev;

  const busyIds = (courts || []).flatMap(c => (c.players || []).map(p => p.id));
  const queuedIds = prev.flatMap(g => g.map(p => p.id));

  let available = (players || []).filter(p => !busyIds.includes(p.id) && !queuedIds.includes(p.id) && p.play_status !== 'stopped');

  if (rulesStrict) {
    available = available.filter(p => round - (p.lastPlayedRound ?? -10) >= COOLDOWN);
  }

  available = available
    .map(p => ({ 
      ...p, 
      priority: rulesStrict 
        ? (p.matches ?? 0) * 10 + (round - (p.lastPlayedRound ?? 0)) * -1 + Math.random() 
        : (p.matches ?? 0) * 10 + Math.random() 
    }))
    .sort((a, b) => a.priority - b.priority);

  const groupsToAdd = [];
  while (available.length >= 4 && prev.length + groupsToAdd.length < effectiveNextShow) {
    const group = available.splice(0, 4);
    const balanced = findBalancedOrdering(group);
    const finalGroup = balanced || group;

    if (rulesStrict && hasRepeatTeammate(finalGroup)) continue;
    
    groupsToAdd.push(finalGroup);
  }

  return [...prev, ...groupsToAdd];
}

/**
 * บังคับเติมคิว (ฉุกเฉิน) - เน้นระบายคนว่างที่แมตช์น้อยที่สุดลงสนาม
 * โดยข้ามกฎ Cooldown และ Teammate History ทั้งหมด
 */
export function forceFillAppendGroups({ prevQueue = [], players = [], courts = [], effectiveNextShow = 10 }) {
  // 1. เตรียมข้อมูลพื้นฐาน (Deep Copy เพื่อป้องกัน Side Effects)
  const currentQueue = Array.isArray(prevQueue) ? [...prevQueue] : [];
  const busyInCourts = new Set((courts || []).flatMap(c => (c.players || []).map(p => p.id)));
  const alreadyInQueue = new Set(currentQueue.flatMap(g => g.map(p => p.id)));

  // 2. กรองเฉพาะคนว่าง (Active, ไม่อยู่ในสนาม, ไม่ได้อยู่ในคิวเดิม)
  let available = (players || [])
    .filter(p => p && p.id && p.play_status !== 'stopped')
    .filter(p => !busyInCourts.has(p.id) && !alreadyInQueue.has(p.id));

  // 3. เรียงลำดับตามความยุติธรรม (ใครเล่นน้อยที่สุดมาก่อน)
  // หากแมตช์เท่ากัน ให้คนที่มีระดับฝีมือต่ำกว่า (N-) มีโอกาสก่อน (Optional)
  available.sort((a, b) => (a.matches ?? 0) - (b.matches ?? 0));

  const newGroups = [];
  const maxToFill = Math.max(0, effectiveNextShow - currentQueue.length);

  // 4. วนลูปสร้างกลุ่ม (ครั้งละ 4 คน)
  while (available.length >= 4 && newGroups.length < maxToFill) {
    const rawGroup = available.splice(0, 4);
    
    // พยายามจัดสมดุลทีม (เช่น 1+4 vs 2+3) แม้จะเป็นคิวฉุกเฉิน
    // หาก findBalancedOrdering ส่งค่ากลับมาไม่ถูกต้อง ให้ใช้ rawGroup แทน
    let finalGroup = rawGroup;
    try {
        if (typeof findBalancedOrdering === 'function') {
            finalGroup = findBalancedOrdering(rawGroup) || rawGroup;
        }
    } catch (e) {
        console.warn("forceFill: findBalancedOrdering failed", e);
    }

    // ใส่ Tag พิเศษเพื่อให้ UI แสดงผลต่างจากคิวปกติ (เช่น ขอบสีส้ม หรือ Badge "Emergency")
    finalGroup.isForced = true; 
    
    newGroups.push(finalGroup);
  }

  return [...currentQueue, ...newGroups];
}