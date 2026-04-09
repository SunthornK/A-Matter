import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'
import { applyEndgame } from '../endgame'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

export async function handleResign(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
): Promise<void> {
  const { gameId, playerId } = socket.data

  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: { players: true },
  })

  if (game.status !== 'active') return

  const otherPlayer = game.players.find((p) => p.id !== playerId)!
  await applyEndgame(gameId, 'forfeit', otherPlayer.id, io, prisma)
}
