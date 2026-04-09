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

      const players = users.map((u, i) => ({
        rank: offset + i + 1,
        id: u.id,
        username: u.username,
        display_name: u.displayName,
        country: u.country,
        avatar_url: u.avatarUrl,
        glicko_rating: u.glickoRating,
        glicko_rd: u.glickoRd,
        games_played: u.gamesPlayed,
        games_won: u.gamesWon,
      }))

      return { players, limit, offset }
    },
  )
}
