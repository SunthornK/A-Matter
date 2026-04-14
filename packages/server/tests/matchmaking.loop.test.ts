import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  addToQueue, removeFromQueue, isInQueue, getMatch, clearAllMatches,
} from '../src/services/matchmaking.queue'
import { runMatchLoop, ratingWindow, ratingsOverlap } from '../src/services/matchmaking.loop'
import type { QueueEntry } from '../src/services/matchmaking.queue'

// Minimal prisma mock — only the methods createMatchedGame calls
const mockPrisma = {
  room: { create: vi.fn() },
  game: { create: vi.fn(), update: vi.fn() },
  gamePlayer: { create: vi.fn() },
} as unknown as PrismaClient

const USER_IDS = ['user-1', 'user-2', 'user-3']

beforeEach(() => {
  vi.clearAllMocks()
  for (const id of USER_IDS) {
    removeFromQueue(id)
  }
  clearAllMatches()
  mockPrisma.room.create = vi.fn().mockResolvedValue({ id: 'room-1' })
  mockPrisma.game.create = vi.fn().mockResolvedValue({ id: 'game-1' })
  mockPrisma.game.update = vi.fn().mockResolvedValue({})
  // player-1 for seat 1, player-2 for seat 2
  ;(mockPrisma.gamePlayer.create as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ id: 'player-1', seat: 1 })
    .mockResolvedValueOnce({ id: 'player-2', seat: 2 })
})

describe('ratingWindow', () => {
  it('returns 150 for a freshly queued player', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() }
    expect(ratingWindow(e)).toBe(150)
  })

  it('returns 200 after 30 seconds', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 30_000) }
    expect(ratingWindow(e)).toBe(200)
  })

  it('returns 250 after 60 seconds', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 60_000) }
    expect(ratingWindow(e)).toBe(250)
  })

  it('caps at 400 after 5+ minutes', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 300_000) }
    expect(ratingWindow(e)).toBe(400)
  })
})

describe('ratingsOverlap', () => {
  it('returns true when difference is within the fresh window of 150', () => {
    const a: QueueEntry = { userId: 'u1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() }
    const b: QueueEntry = { userId: 'u2', glickoRating: 1600, queueType: 'ranked', joinedAt: new Date() }
    // |1500 - 1600| = 100 ≤ 150
    expect(ratingsOverlap(a, b)).toBe(true)
  })

  it('returns false when difference exceeds both windows', () => {
    const a: QueueEntry = { userId: 'u1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() }
    const b: QueueEntry = { userId: 'u2', glickoRating: 1800, queueType: 'ranked', joinedAt: new Date() }
    // |1500 - 1800| = 300 > 150
    expect(ratingsOverlap(a, b)).toBe(false)
  })

  it('uses the wider of the two windows', () => {
    // a has waited 60s → window 250; b is fresh → window 150; diff = 175
    const a: QueueEntry = { userId: 'u1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 60_000) }
    const b: QueueEntry = { userId: 'u2', glickoRating: 1675, queueType: 'ranked', joinedAt: new Date() }
    // max(250, 150) = 250 ≥ 175 → overlap
    expect(ratingsOverlap(a, b)).toBe(true)
  })
})

describe('runMatchLoop', () => {
  it('quickplay: pairs any two players regardless of rating', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1000, queueType: 'quickplay', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 2000, queueType: 'quickplay', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(getMatch('user-1')).toBe('game-1')
    expect(getMatch('user-2')).toBe('game-1')
  })

  it('ranked: pairs players within rating window', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1600, queueType: 'ranked', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(getMatch('user-1')).toBe('game-1')
    expect(getMatch('user-2')).toBe('game-1')
  })

  it('ranked: does not pair players outside rating window', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1800, queueType: 'ranked', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(getMatch('user-1')).toBeNull()
    expect(getMatch('user-2')).toBeNull()
  })

  it('both players are removed from queue after a successful match', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(isInQueue('user-1')).toBe(false)
    expect(isInQueue('user-2')).toBe(false)
  })

  it('keeps players in queue if DB game creation fails', async () => {
    mockPrisma.room.create = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(isInQueue('user-1')).toBe(true)
    expect(isInQueue('user-2')).toBe(true)
    expect(getMatch('user-1')).toBeNull()
    expect(getMatch('user-2')).toBeNull()
  })
})
