import type { PrismaClient } from '@prisma/client'
import type { ExtendedError } from 'socket.io/dist/namespace'
import type { Socket } from 'socket.io'
import type { ClientEvents, ServerEvents, SocketData } from './types'

export function authMiddleware(_prisma: PrismaClient) {
  return async (_socket: Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>, next: (err?: ExtendedError) => void) => {
    next(new Error('Not implemented') as ExtendedError)
  }
}
