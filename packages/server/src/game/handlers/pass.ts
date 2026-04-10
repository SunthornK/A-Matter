import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'
import { recordPassMove } from '../db'
import { applyEndgame } from '../endgame'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

export async function handlePass(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
  turnStartedAt: number,
): Promise<void> {
  const { gameId, playerId } = socket.data
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: { players: true },
  })

  if (game.currentTurnPlayerId !== playerId) {
    socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'It is not your turn' })
    return
  }

  const myPlayer = game.players.find((p) => p.id === playerId)!
  const otherPlayer = game.players.find((p) => p.id !== playerId)!
  const newConsecutivePasses = myPlayer.consecutivePasses + 1
  const timeSpentMs = Date.now() - turnStartedAt

  await recordPassMove({
    prisma, gameId, playerId,
    turnNumber: game.turnNumber,
    nextPlayerId: otherPlayer.id,
    newConsecutivePasses,
    timeSpentMs,
  })

  io.to(`game:${gameId}`).emit('move:result', {
    player_id: playerId,
    turn_number: game.turnNumber,
    action: 'pass',
    score_earned: 0,
    new_score: myPlayer.score,
    next_player_id: otherPlayer.id,
    timestamp: Date.now(),
  })

  // Stalemate: both players have passed 3 times each
  if (newConsecutivePasses >= 3 && otherPlayer.consecutivePasses >= 3) {
    await applyEndgame(gameId, 'stalemate', null, io, prisma)
  }
}
