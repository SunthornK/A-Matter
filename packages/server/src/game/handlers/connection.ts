import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'
import { buildGameState } from '../state'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

export function onConnection(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
): void {
  const { gameId, playerId } = socket.data

  // Join the game room
  socket.join(`game:${gameId}`)

  // Send initial game state to this player only
  buildGameState(gameId, playerId, prisma)
    .then((state) => socket.emit('game:state', state))
    .catch((err) => socket.emit('error', { code: 'STATE_ERROR', message: String(err) }))

  // state:request — resync without reconnect
  socket.on('state:request', () => {
    buildGameState(gameId, playerId, prisma)
      .then((state) => socket.emit('game:state', state))
      .catch((err) => socket.emit('error', { code: 'STATE_ERROR', message: String(err) }))
  })
}
