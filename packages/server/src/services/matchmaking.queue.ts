export interface QueueEntry {
  userId: string
  glickoRating: number
  queueType: 'ranked' | 'quickplay'
  joinedAt: Date
}

// Module-level singleton — shared across all requests in the same process
const queues: { ranked: QueueEntry[]; quickplay: QueueEntry[] } = {
  ranked: [],
  quickplay: [],
}

export function addToQueue(entry: QueueEntry): void {
  const queue = queues[entry.queueType]
  // Remove existing entry for this user (re-queue is idempotent)
  const idx = queue.findIndex((e) => e.userId === entry.userId)
  if (idx !== -1) queue.splice(idx, 1)
  // Insert sorted by rating ascending (for binary search matching)
  const insertAt = queue.findIndex((e) => e.glickoRating > entry.glickoRating)
  if (insertAt === -1) queue.push(entry)
  else queue.splice(insertAt, 0, entry)
}

export function removeFromQueue(userId: string): boolean {
  let removed = false
  for (const queue of Object.values(queues)) {
    const idx = queue.findIndex((e) => e.userId === userId)
    if (idx !== -1) {
      queue.splice(idx, 1)
      removed = true
    }
  }
  return removed
}

export function getQueue(type: 'ranked' | 'quickplay'): readonly QueueEntry[] {
  return queues[type]
}

export function isInQueue(userId: string): boolean {
  return Object.values(queues).some((q) => q.some((e) => e.userId === userId))
}

// ── Matched-games map ──────────────────────────────────────────────────────

interface MatchedEntry {
  gameId: string
  matchedAt: number
}

const MATCH_EXPIRY_MS = 5 * 60 * 1000

const matchedGames = new Map<string, MatchedEntry>()

export function recordMatch(userId: string, gameId: string): void {
  matchedGames.set(userId, { gameId, matchedAt: Date.now() })
}

/** Returns the gameId and clears the entry on first read. Returns null if not found or expired. */
export function getMatch(userId: string): string | null {
  const entry = matchedGames.get(userId)
  if (!entry) return null
  if (Date.now() - entry.matchedAt >= MATCH_EXPIRY_MS) {
    matchedGames.delete(userId)
    return null
  }
  matchedGames.delete(userId)
  return entry.gameId
}

export function clearMatch(userId: string): void {
  matchedGames.delete(userId)
}

/** For use in tests only — clears the entire matched-games map. */
export function clearAllMatches(): void {
  matchedGames.clear()
}
