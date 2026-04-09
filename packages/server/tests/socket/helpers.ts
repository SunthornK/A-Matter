import { buildApp } from '../../src/app'
import { createSocketServer } from '../../src/socket'
import { prisma } from '@a-matter/db'
import { io as ioClient, type Socket } from 'socket.io-client'
import type { FastifyInstance } from 'fastify'
import type { Server } from 'socket.io'
import type { ClientEvents, ServerEvents } from '../../src/game/types'

export interface TestServer {
  app: FastifyInstance
  io: Server
  port: number
  stop: () => Promise<void>
}

export async function startTestServer(): Promise<TestServer> {
  const app = await buildApp()
  await app.listen({ port: 0, host: '127.0.0.1' })
  const address = app.server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const io = createSocketServer(app.server, prisma)
  return {
    app,
    io,
    port,
    stop: async () => {
      io.close()
      await app.close()
    },
  }
}

export type TestSocket = Socket<ServerEvents, ClientEvents>

export function connectSocket(port: number, token: string, gameId: string): TestSocket {
  return ioClient(`http://127.0.0.1:${port}`, {
    path: '/ws',
    query: { token, game_id: gameId },
    autoConnect: false,
  })
}

export function waitForEvent<K extends keyof ServerEvents>(
  socket: TestSocket,
  event: K,
): Promise<Parameters<ServerEvents[K]>[0]> {
  type Payload = Parameters<ServerEvents[K]>[0]
  return new Promise((resolve, reject) => {
    const handler = (data: Payload) => {
      clearTimeout(timer)
      resolve(data)
    }
    const timer = setTimeout(() => {
      socket.off(event as Parameters<TestSocket['off']>[0], handler as never)
      reject(new Error(`Timeout waiting for ${String(event)}`))
    }, 3000)
    socket.once(event as Parameters<TestSocket['once']>[0], handler as never)
  })
}

export interface TestGame {
  gameId: string
  aliceToken: string
  alicePlayerId: string
  bobToken: string
  bobPlayerId: string
  aliceUsername: string
  bobUsername: string
}

export async function createTestGame(app: FastifyInstance): Promise<TestGame> {
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const aliceUsername = `ws_alice_${uid}`
  const bobUsername = `ws_bob_${uid}`

  // Register Alice
  const aReg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: aliceUsername, email: `${aliceUsername}@test.com`, password: 'Password123!', display_name: 'Alice' },
  })
  const aliceToken = JSON.parse(aReg.body).token

  // Register Bob
  const bReg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: bobUsername, email: `${bobUsername}@test.com`, password: 'Password123!', display_name: 'Bob' },
  })
  const bobToken = JSON.parse(bReg.body).token

  // Alice creates room
  const roomRes = await app.inject({
    method: 'POST', url: '/api/rooms/create',
    headers: { authorization: `Bearer ${aliceToken}` },
    payload: { type: 'private', time_per_side_ms: 1320000 },
  })
  const { invite_code } = JSON.parse(roomRes.body)

  // Alice joins (creates game, gets seat 1)
  const join1 = await app.inject({
    method: 'POST', url: '/api/rooms/join',
    headers: { authorization: `Bearer ${aliceToken}` },
    payload: { invite_code },
  })
  const { game_id: gameId } = JSON.parse(join1.body)

  // Bob joins (gets seat 2, game becomes ready)
  await app.inject({
    method: 'POST', url: '/api/rooms/join',
    headers: { authorization: `Bearer ${bobToken}` },
    payload: { invite_code },
  })

  // Fetch player IDs from DB
  const players = await prisma.gamePlayer.findMany({
    where: { gameId },
    include: { user: { select: { username: true } } },
  })
  const alicePlayer = players.find((p) => p.user?.username === aliceUsername)!
  const bobPlayer = players.find((p) => p.user?.username === bobUsername)!

  return {
    gameId,
    aliceToken,
    alicePlayerId: alicePlayer.id,
    bobToken,
    bobPlayerId: bobPlayer.id,
    aliceUsername,
    bobUsername,
  }
}

export async function cleanupTestGame(game: TestGame): Promise<void> {
  await prisma.user.deleteMany({
    where: { username: { in: [game.aliceUsername, game.bobUsername] } },
  })
}
