import type { FastifyInstance } from 'fastify'

// In-memory banned user IDs (single-process only)
const bannedUsers = new Set<string>()

export function isBanned(userId: string): boolean {
  return bannedUsers.has(userId)
}

export async function adminRoutes(app: FastifyInstance) {
  // GET /api/admin/games/active
  app.get(
    '/api/admin/games/active',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as { role: string }
      if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' })

      const games = await app.prisma.game.findMany({
        where: { status: 'active' },
        include: { players: { include: { user: { select: { displayName: true } } } } },
        orderBy: { startedAt: 'desc' },
      })

      return games.map((g) => ({
        id: g.id,
        mode: g.mode,
        created_at: g.startedAt.toISOString(),
        players: g.players.map((p) => ({
          display_name: p.user?.displayName ?? null,
          score: p.score,
        })),
      }))
    },
  )

  // POST /api/admin/games/:gameId/end
  app.post<{ Params: { gameId: string } }>(
    '/api/admin/games/:gameId/end',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as { role: string }
      if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' })

      const { gameId } = req.params
      const game = await app.prisma.game.findUnique({ where: { id: gameId } })
      if (!game) return reply.status(404).send({ error: 'Game not found' })

      await app.prisma.game.update({ where: { id: gameId }, data: { status: 'finished' } })
      return reply.status(204).send()
    },
  )

  // POST /api/admin/users/:userId/ban
  app.post<{ Params: { userId: string } }>(
    '/api/admin/users/:userId/ban',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as { role: string }
      if (user.role !== 'admin') return reply.status(403).send({ error: 'Forbidden' })

      const { userId } = req.params
      const target = await app.prisma.user.findUnique({ where: { id: userId } })
      if (!target) return reply.status(404).send({ error: 'User not found' })

      bannedUsers.add(userId)
      return reply.status(204).send()
    },
  )
}
