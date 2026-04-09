import type { PrismaClient } from '@prisma/client'
import type { BoardTile, EquationResult } from '@a-matter/validator'
import type { PlacementInput } from './types'

export interface RecordMoveArgs {
  prisma: PrismaClient
  gameId: string
  playerId: string
  turnNumber: number
  placements: PlacementInput[]
  equations: EquationResult[]
  scoreEarned: number
  newRack: BoardTile[]
  newBoard: (BoardTile | null)[][]
  newBag: BoardTile[]
  nextPlayerId: string
  timeSpentMs: number
}

export async function recordPlaceMove(args: RecordMoveArgs): Promise<void> {
  const {
    prisma, gameId, playerId, turnNumber,
    placements, equations, scoreEarned, newRack,
    newBoard, newBag, nextPlayerId, timeSpentMs,
  } = args

  await prisma.$transaction([
    prisma.move.create({
      data: {
        gameId,
        playerId,
        turnNumber,
        action: 'place',
        placements: placements as unknown as never,
        equations: equations as unknown as never,
        scoreEarned,
        timeSpentMs,
      },
    }),
    prisma.gamePlayer.update({
      where: { id: playerId },
      data: {
        rack: newRack as unknown as never,
        score: { increment: scoreEarned },
        consecutivePasses: 0,
      },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: {
        boardState: { cells: newBoard } as unknown as never,
        tileBag: newBag as unknown as never,
        turnNumber: { increment: 1 },
        currentTurnPlayerId: nextPlayerId,
      },
    }),
  ])
}

export async function recordPassMove(args: {
  prisma: PrismaClient
  gameId: string
  playerId: string
  turnNumber: number
  nextPlayerId: string
  newConsecutivePasses: number
  timeSpentMs: number
}): Promise<void> {
  const { prisma, gameId, playerId, turnNumber, nextPlayerId, newConsecutivePasses, timeSpentMs } = args
  await prisma.$transaction([
    prisma.move.create({
      data: { gameId, playerId, turnNumber, action: 'pass', scoreEarned: 0, timeSpentMs },
    }),
    prisma.gamePlayer.update({
      where: { id: playerId },
      data: { consecutivePasses: newConsecutivePasses },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: { turnNumber: { increment: 1 }, currentTurnPlayerId: nextPlayerId },
    }),
  ])
}

export async function recordExchangeMove(args: {
  prisma: PrismaClient
  gameId: string
  playerId: string
  turnNumber: number
  nextPlayerId: string
  exchangedIndices: number[]
  newRack: BoardTile[]
  newBag: BoardTile[]
  timeSpentMs: number
}): Promise<void> {
  const { prisma, gameId, playerId, turnNumber, nextPlayerId, exchangedIndices, newRack, newBag, timeSpentMs } = args
  await prisma.$transaction([
    prisma.move.create({
      data: {
        gameId, playerId, turnNumber, action: 'exchange',
        exchangedIndices: exchangedIndices as unknown as never,
        scoreEarned: 0, timeSpentMs,
      },
    }),
    prisma.gamePlayer.update({
      where: { id: playerId },
      data: { rack: newRack as unknown as never, consecutivePasses: 0, lastExchangeAt: new Date() },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: { tileBag: newBag as unknown as never, turnNumber: { increment: 1 }, currentTurnPlayerId: nextPlayerId },
    }),
  ])
}
