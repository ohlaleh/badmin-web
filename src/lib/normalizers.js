// Shared normalizers and small helpers used across the app
export function normalizePlayer(p) {
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
}

export function normalizeCourts(courtsData, courtCount = 2) {
  if (!Array.isArray(courtsData)) return Array.from({ length: courtCount }, (_, i) => ({ id: i + 1, players: [], finished: true, status: 'available', current_players: [] }));
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
}

export function normalizeQueue(queueData) {
  if (!Array.isArray(queueData)) return [];
  return queueData.map(g => Array.isArray(g) ? g.map(normalizePlayer).filter(Boolean) : []);
}

export function getLevelClasses(player) {
  const lvlVal = (player && (player.level || player.rank || player.skill));
  const level = (player && typeof player.level === 'string') ? player.level : (lvlVal != null ? String(lvlVal) : 'N-');
  let nameBgClass = 'bg-slate-100 text-slate-800';
  let dotClass = 'bg-slate-400';
  if (level === 'N-') {
    nameBgClass = 'bg-amber-100 text-amber-800';
    dotClass = 'bg-amber-500';
  } else if (level === 'N') {
    nameBgClass = 'bg-blue-100 text-blue-800';
    dotClass = 'bg-blue-500';
  } else if (level === 'S') {
    nameBgClass = 'bg-emerald-100 text-emerald-800';
    dotClass = 'bg-emerald-500';
  } else if (level === 'P') {
    nameBgClass = 'bg-violet-100 text-violet-800';
    dotClass = 'bg-violet-500';
  }
  return { nameBgClass, dotClass };
}
