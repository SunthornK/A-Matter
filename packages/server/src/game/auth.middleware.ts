import type { PrismaClient } from '@prisma/client'
import type { Socket } from 'socket.io'
import type { ClientEvents, ServerEvents, SocketData } from './types'

export function authMiddleware(_prisma: PrismaClient) {
  return async (_socket: Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>, next: (err?: Error) => void) => {
    next(new Error('Not implemented'))
  }
}
