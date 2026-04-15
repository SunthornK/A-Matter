import type { FastifyInstance } from 'fastify'
import { createTileBag } from '@a-matter/validator/src/constants'
import { verifyTokenPayload } from '../services/auth.service'
import { config } from '../config'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export async function roomRoutes(app: FastifyInstance) {
  // POST /api/rooms/create
  app.post<{ Body: { type: 'private'; time_per_side_ms?: number } }>(
    '/api/rooms/create',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['private'] },
            time_per_side_ms: { type: 'integer', minimum: 60000 },
          },
        },
      },
    },
    async (req, reply) => {
      const user = req.user as { user_id: string }
      const timePerSideMs = req.body.time_per_side_ms ?? 1320000

      // Generate unique invite code
      let inviteCode = generateInviteCode()
      while (await app.prisma.room.findUnique({ where: { inviteCode } })) {
        inviteCode = generateInviteCode()
      }

      // Create room + game + seat 1 for the host in one transaction
      const emptyBoard = { cells: Array.from({ length: 15 }, () => Array(15).fill(null)) }
      const bag = shuffle(createTileBag())
      const rack1 = bag.slice(0, 8)
      const remainingBag = bag.slice(8)

      const { gameId, invite_code } = await app.prisma.$transaction(async (tx) => {
        const room = await tx.room.create({
          data: {
            creatorId: user.user_id,
            inviteCode,
            type: 'private',
            timePerSideMs,
            status: 'waiting',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        })

        const game = await tx.game.create({
          data: {
            roomId: room.id,
            mode: 'private',
            status: 'active',
            boardState: emptyBoard as unknown as never,
            tileBag: remainingBag as unknown as never,
          },
        })

        await tx.gamePlayer.create({
          data: {
            gameId: game.id,
            userId: user.user_id,
            seat: 1,
            rack: rack1 as unknown as never,
            timeRemainingMs: timePerSideMs,
          },
        })

        return { gameId: game.id, invite_code: room.inviteCode }
      })

      return reply.status(201).send({ game_id: gameId, invite_code })
    },
  )

  // POST /api/rooms/join  — works for both logged-in users and guests
  app.post<{
    Body: { invite_code: string; display_name?: string; guest_token?: string }
  }>(
    '/api/rooms/join',
    {
      schema: {
        body: {
          type: 'object',
          required: ['invite_code'],
          properties: {
            invite_code: { type: 'string', minLength: 6, maxLength: 6 },
            display_name: { type: 'string', minLength: 1, maxLength: 50 },
            guest_token: { type: 'string', minLength: 64, maxLength: 64 },
          },
        },
      },
    },
    async (req, reply) => {
      const { invite_code, display_name, guest_token } = req.body

      // Resolve identity: try JWT first, fall back to guest fields
      let userId: string | null = null
      const authHeader = req.headers['authorization']
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const payload = verifyTokenPayload(authHeader.slice(7), config.jwtSecret)
          const dbUser = await app.prisma.user.findUnique({
            where: { id: payload.user_id },
            select: { tokenVersion: true },
          })
          if (dbUser && dbUser.tokenVersion === payload.token_version) {
            userId = payload.user_id
          }
        } catch {
          // not a valid JWT — treat as unauthenticated
        }
      }

      if (!userId && (!display_name || !guest_token)) {
        return reply
          .status(401)
          .send({ error: 'Login required, or provide display_name and guest_token' })
      }

      const room = await app.prisma.room.findUnique({
        where: { inviteCode: invite_code },
        include: { game: { include: { players: true } } },
      })

      if (!room || room.status === 'closed') {
        return reply.status(404).send({ error: 'Room not found or closed' })
      }

      // Already a player — return current state
      const alreadyJoined = room.game?.players.some((p) =>
        userId ? p.userId === userId : p.guestToken === guest_token,
      )
      if (alreadyJoined) {
        return {
          status: room.status === 'in_game' ? 'ready' : 'waiting',
          game_id: room.game!.id,
        }
      }

      // Room already has both players — reject
      if (room.status === 'in_game') {
        return reply.status(409).send({ error: 'Game already in progress' })
      }

      if (!room.game) {
        return reply.status(500).send({ error: 'Room has no game' })
      }

      // Add joiner as seat 2, deal their tiles, and start the game
      const existingGame = room.game
      const currentBag = existingGame.tileBag as unknown as ReturnType<typeof createTileBag>
      const shuffledBag = shuffle(currentBag)
      const rack2 = shuffledBag.slice(0, 8)
      const finalBag = shuffledBag.slice(8)

      const gameId = await app.prisma.$transaction(async (tx) => {
        const player2 = await tx.gamePlayer.create({
          data: {
            gameId: existingGame.id,
            ...(userId ? { userId } : { guestToken: guest_token }),
            seat: 2,
            rack: rack2 as unknown as never,
            timeRemainingMs: room.timePerSideMs,
          },
        })

        const seat1Player = existingGame.players.find((p) => p.seat === 1)
        await tx.game.update({
          where: { id: existingGame.id },
          data: {
            tileBag: finalBag as unknown as never,
            currentTurnPlayerId: seat1Player?.id ?? player2.id,
          },
        })

        await tx.room.update({ where: { id: room.id }, data: { status: 'in_game' } })

        return existingGame.id
      })

      return { status: 'ready', game_id: gameId }
    },
  )

  // GET /api/rooms/:inviteCode/status  — polled by WaitingRoomPage
  app.get<{ Params: { inviteCode: string } }>(
    '/api/rooms/:inviteCode/status',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { inviteCode } = req.params
      const room = await app.prisma.room.findUnique({
        where: { inviteCode },
        include: { game: { select: { id: true } } },
      })
      if (!room) return reply.status(404).send({ error: 'Room not found' })
      return {
        status: room.status,
        game_id: room.game?.id ?? null,
      }
    },
  )
}
