import type { FastifyInstance } from 'fastify'

export async function userRoutes(app: FastifyInstance) {
  // GET /api/users/:username — public profile
  app.get<{ Params: { username: string } }>('/api/users/:username', async (req, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { username: req.params.username },
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
        createdAt: true,
      },
    })

    if (!user) return reply.status(404).send({ error: 'User not found' })

    return {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      country: user.country,
      avatar_url: user.avatarUrl,
      glicko_rating: user.glickoRating,
      glicko_rd: user.glickoRd,
      games_played: user.gamesPlayed,
      games_won: user.gamesWon,
      created_at: user.createdAt,
    }
  })

  // GET /api/users/:id/games — match history (authenticated)
  app.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>(
    '/api/users/:id/games',
    { preHandler: [app.authenticate] },
    async (req) => {
      const limit = Math.min(Math.max(1, parseInt(req.query.limit ?? '20', 10) || 20), 100)
      const offset = Math.max(0, parseInt(req.query.offset ?? '0', 10) || 0)

      const gamePlayers = await app.prisma.gamePlayer.findMany({
        where: { userId: req.params.id },
        include: {
          game: {
            select: {
              id: true,
              mode: true,
              status: true,
              endReason: true,
              startedAt: true,
              finishedAt: true,
              players: {
                select: {
                  userId: true,
                  score: true,
                  seat: true,
                  user: { select: { username: true, displayName: true } },
                },
              },
            },
          },
        },
        orderBy: { game: { startedAt: 'desc' } },
        take: limit,
        skip: offset,
      })

      const games = gamePlayers.map((gp) => ({
        game_id: gp.game.id,
        mode: gp.game.mode,
        status: gp.game.status,
        end_reason: gp.game.endReason,
        started_at: gp.game.startedAt,
        finished_at: gp.game.finishedAt,
        my_score: gp.score,
        players: gp.game.players.map((p) => ({
          user_id: p.userId,
          username: p.user?.username ?? null,
          display_name: p.user?.displayName ?? null,
          score: p.score,
          seat: p.seat,
        })),
      }))

      return { games, limit, offset }
    },
  )
}
