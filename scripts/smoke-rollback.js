// Smoke test for rollback logic (copied from src/app/page.js)
function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `P${i + 1}`,
    matches: Math.floor(Math.random() * 3),
    lastPlayedRound: Math.floor(Math.random() * 5) - 5,
    gender: i % 2 === 0 ? 'Male' : 'Female',
    teammates: {},
  }))
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

function rollbackCourtSnapshot(players, courts, courtId) {
  const playersCopy = clone(players)
  const courtsCopy = clone(courts)

  const court = courtsCopy.find(c => c.id === courtId)
  if (!court || !court.players || court.players.length === 0) return null

  const groupIds = court.players.map(p => p.id)

  const updatedPlayers = playersCopy.map(p => {
    if (!groupIds.includes(p.id)) return p
    return {
      ...p,
      matches: Math.max(0, (p.matches || 0) - 1),
      lastPlayedRound: (p.lastPlayedRound || -10) - 1,
    }
  })

  const updatedCourts = courtsCopy.map(c =>
    c.id === courtId ? { ...c, players: [], finished: true } : c
  )

  const rolledGroup = updatedPlayers.filter(p => groupIds.includes(p.id))

  const nextQueue = [rolledGroup]

  return { updatedPlayers, updatedCourts, nextQueue }
}

// --- Sample data ---
const players = makePlayers(12)

// assign players 1..4 to court 1
const courts = [
  { id: 1, players: [players[0], players[1], players[2], players[3]], finished: false },
  { id: 2, players: [], finished: true },
]

console.log('Before rollback:')
console.log('Court 1 players ids:', courts[0].players.map(p => p.id))
console.log('Players summary (id:matches,lastPlayedRound):')
players.slice(0,6).forEach(p => console.log(`${p.id}: ${p.matches}, ${p.lastPlayedRound}`))

const result = rollbackCourtSnapshot(players, courts, 1)

if (!result) {
  console.error('No rollback performed (court empty)')
  process.exit(2)
}

console.log('\nAfter rollback:')
console.log('Rolled group ids:', result.nextQueue[0].map(p => p.id))
console.log('Updated courts:')
console.log(result.updatedCourts)
console.log('Updated players summary for rolled players:')
result.nextQueue[0].forEach(p => console.log(`${p.id}: ${p.matches}, ${p.lastPlayedRound}`))

console.log('\nSmoke rollback test completed.')
