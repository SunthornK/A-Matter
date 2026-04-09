import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'

export function onConnection(
  _socket: Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  _io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  _prisma: PrismaClient,
): void {
  // stub
}
