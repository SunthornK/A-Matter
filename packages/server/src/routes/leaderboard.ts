import type { FastifyInstance } from 'fastify'

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/leaderboard',
    async (req) => {
      const limit = Math.min(Math.max(1, parseInt(req.query.limit ?? '50', 10) || 50), 100)
      const offset = Math.max(0, parseInt(req.query.offset ?? '0', 10) || 0)

      const users = await app.prisma.user.findMany({
        where: { gamesPlayed: { gt: 0 } },
        orderBy: { glickoRating: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          country: true,
          avatarUrl: true,
          glickoRating: true,
          glickoRd: true,
          gamesPlayed: true,
          gamesWon: true,
        },
        take: limit,
        skip: offset,
      })

      const entries = users.map((u, i) => ({
        rank: offset + i + 1,
        user_id: u.id,
        username: u.username,
        display_name: u.displayName,
        country: u.country,
        rating: u.glickoRating,
        games_played: u.gamesPlayed,
        games_won: u.gamesWon,
      }))

      const total = await app.prisma.user.count({ where: { gamesPlayed: { gt: 0 } } })
      const page = Math.floor(offset / limit) + 1

      return { entries, total, page }
    },
  )
}
