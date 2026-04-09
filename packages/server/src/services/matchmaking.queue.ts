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
