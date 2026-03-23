/**
 * BADMINTON MATCHMAKING ENGINE
 * --------------------------------
 * courts: 4
 * players per court: 4
 * total per round: 16
 */

/* =====================================================
   SHUFFLE (Fisher-Yates)
===================================================== */
export function shuffle(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/* =====================================================
   SORT BY FAIRNESS
   คนที่เล่นน้อย + เล่นนานแล้ว ได้ก่อน
===================================================== */
export function sortFair(players) {
  return [...players].sort((a, b) => {
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }

    return new Date(a.lastPlayedAt || 0) -
           new Date(b.lastPlayedAt || 0);
  });
}

/* =====================================================
   CREATE TEAMS (2v2)
===================================================== */
function createTeams(group) {
  // group = 4 players
  return {
    teamA: [group[0], group[2]],
    teamB: [group[1], group[3]],
  };
}

/* =====================================================
   BUILD COURTS
===================================================== */
function assignCourts(players, courtCount) {
  const courts = [];

  for (let i = 0; i < courtCount; i++) {
    const group = players.slice(i * 4, i * 4 + 4);

    const teams = createTeams(group);

    courts.push({
      court: i + 1,
      teamA: teams.teamA,
      teamB: teams.teamB,
    });
  }

  return courts;
}

/* =====================================================
   MAIN MATCH GENERATOR
===================================================== */
export function generateMatches(
  players,
  courtCount = 4
) {
  const playersPerRound = courtCount * 4;

  if (players.length < playersPerRound) {
    throw new Error("Not enough players");
  }

  // 1️⃣ fairness sort
  const fairPlayers = sortFair(players);

  // 2️⃣ shuffle only top candidates
  const shuffled = shuffle(fairPlayers);

  // 3️⃣ choose players for playing
  const playing = shuffled.slice(0, playersPerRound);

  // 4️⃣ waiting queue
  const waiting = shuffled.slice(playersPerRound);

  // 5️⃣ assign courts
  const courts = assignCourts(playing, courtCount);

  return {
    courts,
    playing,
    waiting,
  };
}

/* =====================================================
   ROTATE QUEUE AFTER ROUND FINISH
===================================================== */
export function rotateQueue(
  playing,
  waiting
) {
  const now = new Date().toISOString();

  // update stats
  const updatedPlayers = playing.map((p) => ({
    ...p,
    gamesPlayed: (p.gamesPlayed || 0) + 1,
    lastPlayedAt: now,
  }));

  // move players to queue tail
  return [...waiting, ...updatedPlayers];
}

/* =====================================================
   GENERATE NEXT ROUND (ONE BUTTON FLOW)
===================================================== */
export function nextRound(
  currentPlayers,
  courtCount = 4
) {
  const match = generateMatches(
    currentPlayers,
    courtCount
  );

  const newQueue = rotateQueue(
    match.playing,
    match.waiting
  );

  return {
    courts: match.courts,
    queue: newQueue,
  };
}

/* =====================================================
   WHEN ONE COURT FINISH
===================================================== */
export function replaceCourtMatch(
  courtId,
  courts,
  queue
) {
  const courtIndex = courts.findIndex(
    (c) => c.court === courtId
  );

  if (courtIndex === -1) return { courts, queue };

  const finishedCourt = courts[courtIndex];

  // 1️⃣ players ที่เล่นเสร็จ
  const finishedPlayers = [
    ...finishedCourt.teamA,
    ...finishedCourt.teamB,
  ];

  const now = new Date().toISOString();

  const updatedFinished = finishedPlayers.map(p => ({
    ...p,
    gamesPlayed: (p.gamesPlayed || 0) + 1,
    lastPlayedAt: now
  }));

  // 2️⃣ เอาไปท้ายคิว
  const newQueue = [...queue, ...updatedFinished];

  // 3️⃣ เอา 4 คนใหม่
  const nextPlayers = newQueue.slice(0, 4);
  const remainingQueue = newQueue.slice(4);

  // shuffle team
  const shuffled = shuffle(nextPlayers);

  const newMatch = {
    court: courtId,
    teamA: [shuffled[0], shuffled[2]],
    teamB: [shuffled[1], shuffled[3]],
  };

  // 4️⃣ replace court
  const newCourts = [...courts];
  newCourts[courtIndex] = newMatch;

  return {
    courts: newCourts,
    queue: remainingQueue,
  };
}

/* =====================================================
   CREATE MATCH FROM QUEUE (4 PLAYERS)
===================================================== */
export function createMatchFromQueue(queue) {

  if (queue.length < 4) {
    return { match: null, queue };
  }

  const selected = queue.slice(0, 4);
  const remaining = queue.slice(4);

  const shuffled = shuffle(selected);

  const match = {
    teamA: [shuffled[0], shuffled[2]],
    teamB: [shuffled[1], shuffled[3]],
  };

  return {
    match,
    queue: remaining,
  };
}

export function finishCourtWithNext(
  courtId,
  courts,
  queue
) {

  const index = courts.findIndex(
    c => c.court === courtId
  );

  if (index === -1) return { courts, queue };

  const court = courts[index];

  /* ---------- players finished ---------- */
  const finishedPlayers = [
    ...court.currentMatch.teamA,
    ...court.currentMatch.teamB
  ];

  const now = new Date().toISOString();

  const updated = finishedPlayers.map(p => ({
    ...p,
    gamesPlayed: (p.gamesPlayed || 0) + 1,
    lastPlayedAt: now
  }));

  let newQueue = [...queue, ...updated];

  /* ---------- promote NEXT → CURRENT ---------- */
  let newCurrent = court.nextMatch;

  /* ---------- generate NEW NEXT ---------- */
  const nextResult = createMatchFromQueue(newQueue);

  newQueue = nextResult.queue;

  const updatedCourt = {
    court: courtId,
    currentMatch: newCurrent,
    nextMatch: nextResult.match
  };

  const newCourts = [...courts];
  newCourts[index] = updatedCourt;

  return {
    courts: newCourts,
    queue: newQueue
  };
}