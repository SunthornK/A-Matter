import type { FastifyInstance } from 'fastify'
import { createTileBag } from '@a-matter/validator/src/constants'

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

      const room = await app.prisma.room.create({
        data: {
          creatorId: user.user_id,
          inviteCode,
          type: 'private',
          timePerSideMs,
          status: 'waiting',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })

      return reply.status(201).send({ room_id: room.id, invite_code: room.inviteCode })
    },
  )

  // POST /api/rooms/join
  app.post<{ Body: { invite_code: string } }>(
    '/api/rooms/join',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['invite_code'],
          properties: {
            invite_code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
      },
    },
    async (req, reply) => {
      const user = req.user as { user_id: string }
      const { invite_code } = req.body

      const room = await app.prisma.room.findUnique({
        where: { inviteCode: invite_code },
        include: { game: { include: { players: true } } },
      })

      if (!room || room.status === 'closed') {
        return reply.status(404).send({ error: 'Room not found or closed' })
      }

      const existingPlayers = room.game?.players ?? []
      const alreadyJoined = existingPlayers.some((p) => p.userId === user.user_id)

      if (room.status === 'waiting' && !alreadyJoined) {
        // First player joining — create game + seat 1
        const emptyBoard = { cells: Array.from({ length: 15 }, () => Array(15).fill(null)) }
        const bag = shuffle(createTileBag())
        const rack1 = bag.slice(0, 8)
        const remainingBag = bag.slice(8)

        const game = await app.prisma.game.create({
          data: {
            roomId: room.id,
            mode: 'private',
            status: 'active',
            boardState: emptyBoard as unknown as never,
            tileBag: remainingBag as unknown as never,
          },
        })

        await app.prisma.gamePlayer.create({
          data: {
            gameId: game.id,
            userId: user.user_id,
            seat: 1,
            rack: rack1 as unknown as never,
            timeRemainingMs: room.timePerSideMs,
          },
        })

        await app.prisma.room.update({ where: { id: room.id }, data: { status: 'full' } })

        return { status: 'waiting', game_id: game.id }
      }

      if (room.status === 'full' && !alreadyJoined && room.game) {
        // Second player joining — deal tiles + start game
        const existingGame = room.game
        const currentBag = existingGame.tileBag as unknown as ReturnType<typeof createTileBag>
        const shuffledBag = shuffle(currentBag)
        const rack2 = shuffledBag.slice(0, 8)
        const finalBag = shuffledBag.slice(8)

        const player2 = await app.prisma.gamePlayer.create({
          data: {
            gameId: existingGame.id,
            userId: user.user_id,
            seat: 2,
            rack: rack2 as unknown as never,
            timeRemainingMs: room.timePerSideMs,
          },
        })

        // Seat 1 player goes first
        const seat1Player = existingGame.players.find((p) => p.seat === 1)
        await app.prisma.game.update({
          where: { id: existingGame.id },
          data: {
            tileBag: finalBag as unknown as never,
            currentTurnPlayerId: seat1Player?.id ?? player2.id,
          },
        })

        await app.prisma.room.update({ where: { id: room.id }, data: { status: 'in_game' } })

        return { status: 'ready', game_id: existingGame.id }
      }

      return reply.status(409).send({ error: 'Room is full or already in progress' })
    },
  )
}
