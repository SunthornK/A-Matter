import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from './game/types'
import { authMiddleware } from './game/auth.middleware'
import { onConnection } from './game/handlers/connection'

export function createSocketServer(
  httpServer: HttpServer,
  prisma: PrismaClient,
): Server<ClientEvents, ServerEvents, Record<string, never>, SocketData> {
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: { origin: '*' },
      path: '/ws',
    },
  )

  io.use(authMiddleware(prisma))
  io.on('connection', (socket) => onConnection(socket, io, prisma))

  return io
}
