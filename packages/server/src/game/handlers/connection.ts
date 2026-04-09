import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'
import { buildGameState } from '../state'
import { handlePlace } from './place'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

export function onConnection(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
): void {
  const { gameId, playerId } = socket.data
  let turnStartedAt = Date.now()

  socket.join(`game:${gameId}`)

  buildGameState(gameId, playerId, prisma)
    .then((state) => {
      socket.emit('game:state', state)
      turnStartedAt = Date.now()
    })
    .catch((err) => socket.emit('error', { code: 'STATE_ERROR', message: String(err) }))

  socket.on('state:request', () => {
    buildGameState(gameId, playerId, prisma)
      .then((state) => socket.emit('game:state', state))
      .catch((err) => socket.emit('error', { code: 'STATE_ERROR', message: String(err) }))
  })

  socket.on('move:place', (data) => {
    handlePlace(socket, io, data, prisma, turnStartedAt).catch((err) => {
      socket.emit('error', { code: 'INTERNAL_ERROR', message: String(err) })
    })
  })
}
