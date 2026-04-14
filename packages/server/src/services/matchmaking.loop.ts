import type { PrismaClient } from '@prisma/client'
import { createTileBag } from '@a-matter/validator/src/constants'
import { getQueue, removeFromQueue, recordMatch } from './matchmaking.queue'
import type { QueueEntry } from './matchmaking.queue'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function ratingWindow(entry: QueueEntry): number {
  const waitedSeconds = (Date.now() - entry.joinedAt.getTime()) / 1000
  const expansion = Math.floor(waitedSeconds / 30) * 50
  return Math.min(150 + expansion, 400)
}

export function ratingsOverlap(a: QueueEntry, b: QueueEntry): boolean {
  const window = Math.max(ratingWindow(a), ratingWindow(b))
  return Math.abs(a.glickoRating - b.glickoRating) <= window
}

async function createMatchedGame(
  userId1: string,
  userId2: string,
  type: 'ranked' | 'quickplay',
  prisma: PrismaClient,
): Promise<string> {
  const emptyBoard = { cells: Array.from({ length: 15 }, () => Array(15).fill(null)) }
  const bag = shuffle(createTileBag())
  const rack1 = bag.slice(0, 8)
  const rack2 = bag.slice(8, 16)
  const remainingBag = bag.slice(16)

  const room = await prisma.room.create({
    data: {
      type,
      timePerSideMs: 1320000,
      status: 'in_game',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  const game = await prisma.game.create({
    data: {
      roomId: room.id,
      mode: type,
      status: 'active',
      boardState: emptyBoard as unknown as never,
      tileBag: remainingBag as unknown as never,
    },
  })

  const player1 = await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      userId: userId1,
      seat: 1,
      rack: rack1 as unknown as never,
      timeRemainingMs: 1320000,
    },
  })

  await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      userId: userId2,
      seat: 2,
      rack: rack2 as unknown as never,
      timeRemainingMs: 1320000,
    },
  })

  await prisma.game.update({
    where: { id: game.id },
    data: { currentTurnPlayerId: player1.id },
  })

  return game.id
}

async function matchQueue(
  type: 'ranked' | 'quickplay',
  prisma: PrismaClient,
): Promise<void> {
  const queue = [...getQueue(type)] as QueueEntry[]
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i]!
    for (let j = i + 1; j < queue.length; j++) {
      const b = queue[j]!
      const eligible = type === 'quickplay' || ratingsOverlap(a, b)
      if (eligible) {
        try {
          const gameId = await createMatchedGame(a.userId, b.userId, type, prisma)
          removeFromQueue(a.userId)
          removeFromQueue(b.userId)
          recordMatch(a.userId, gameId)
          recordMatch(b.userId, gameId)
        } catch (err) {
          console.error('matchmaking: failed to create game', err)
          // Both users remain in queue — will be retried next tick
        }
        return // one match per tick per queue
      }
    }
  }
}

export async function runMatchLoop(prisma: PrismaClient): Promise<void> {
  await matchQueue('ranked', prisma)
  await matchQueue('quickplay', prisma)
}

export function startMatchLoop(prisma: PrismaClient): ReturnType<typeof setInterval> {
  return setInterval(() => {
    runMatchLoop(prisma).catch(err => console.error('matchmaking loop error:', err))
  }, 2000)
}
