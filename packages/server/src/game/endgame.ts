import type { Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from './types'

export async function applyEndgame(
  gameId: string,
  reason: 'completion' | 'timeout' | 'forfeit' | 'stalemate',
  winnerPlayerId: string | null,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
): Promise<void> {
  if (reason === 'stalemate') {
    const players = await prisma.gamePlayer.findMany({ where: { gameId } })
    await prisma.$transaction(
      players.map((p) => {
        const rack = p.rack as Array<{ points: number }>
        const penalty = rack.reduce((sum, t) => sum + t.points, 0)
        return prisma.gamePlayer.update({
          where: { id: p.id },
          data: { score: Math.max(0, p.score - penalty) },
        })
      }),
    )
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { status: 'finished', endReason: reason, finishedAt: new Date() },
  })

  const finalPlayers = await prisma.gamePlayer.findMany({ where: { gameId } })

  io.to(`game:${gameId}`).emit('game:over', {
    reason,
    winner_player_id: winnerPlayerId,
    final_scores: finalPlayers.map((p) => ({ player_id: p.id, score: p.score })),
    timestamp: Date.now(),
  })
}
