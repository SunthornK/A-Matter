import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../src/client'
import { replayGame } from '../src/replayGame'
import type { BoardState, TileBagEntry } from '../src/types'

let testGameId: string
let testPlayer1Id: string

beforeAll(async () => {
  const room = await prisma.room.create({
    data: {
      type: 'quickplay',
      status: 'in_game',
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    },
  })

  const emptyBoard: BoardState = {
    cells: Array.from({ length: 15 }, () => Array(15).fill(null)),
  }

  // Build a minimal 100-tile bag for testing
  const initialBag: TileBagEntry[] = Array.from({ length: 100 }, (_, i) => ({
    tile_id: `tile_${i}`,
    value: String(i % 10),
    type: 'number' as const,
    points: 1,
  }))

  const game = await prisma.game.create({
    data: {
      roomId: room.id,
      mode: 'quickplay',
      status: 'active',
      boardState: emptyBoard as any,
      tileBag: initialBag as any,
      turnNumber: 1,
    },
  })
  testGameId = game.id

  const p1 = await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      seat: 1,
      score: 0,
      rack: [] as any,
      timeRemainingMs: 1320000,
      guestToken: 'replay-test-guest-1',
    },
  })
  testPlayer1Id = p1.id

  await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      seat: 2,
      score: 0,
      rack: [] as any,
      timeRemainingMs: 1320000,
      guestToken: 'replay-test-guest-2',
    },
  })

  await prisma.game.update({
    where: { id: testGameId },
    data: { currentTurnPlayerId: testPlayer1Id },
  })
})

afterAll(async () => {
  await prisma.move.deleteMany({ where: { gameId: testGameId } })
  await prisma.gamePlayer.deleteMany({ where: { gameId: testGameId } })
  await prisma.game.delete({ where: { id: testGameId } })
  await prisma.$disconnect()
})

describe('replayGame', () => {
  it('returns 15x15 empty board and 100-tile bag for a game with no moves', async () => {
    const result = await replayGame(testGameId)
    expect(result.boardState.cells).toHaveLength(15)
    result.boardState.cells.forEach((row) => expect(row).toHaveLength(15))
    expect(result.tileBag).toHaveLength(100)
    expect(result.turnNumber).toBe(1)
  })

  it('throws for unknown game id', async () => {
    await expect(
      replayGame('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('Game not found')
  })

  it('after a pass move, turn advances and bag stays full', async () => {
    await prisma.move.create({
      data: {
        gameId: testGameId,
        playerId: testPlayer1Id,
        turnNumber: 1,
        action: 'pass',
        scoreEarned: 0,
        timeSpentMs: 5000,
      },
    })

    const result = await replayGame(testGameId)
    expect(result.tileBag).toHaveLength(100)
    expect(result.turnNumber).toBe(2)
  })
})
