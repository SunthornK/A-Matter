import type { FastifyInstance } from 'fastify'
import { addToQueue, removeFromQueue, getQueueEntry, getMatch } from '../services/matchmaking.queue'

export async function matchmakingRoutes(app: FastifyInstance) {
  // POST /api/matchmaking/join
  app.post<{ Body: { type: 'ranked' | 'quickplay' } }>(
    '/api/matchmaking/join',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['type'],
          properties: { type: { type: 'string', enum: ['ranked', 'quickplay'] } },
        },
      },
    },
    async (req, reply) => {
      const user = req.user as { user_id: string }

      // Fetch current rating from DB
      const dbUser = await app.prisma.user.findUnique({
        where: { id: user.user_id },
        select: { glickoRating: true },
      })
      if (!dbUser) return reply.status(401).send({ error: 'User not found' })

      addToQueue({
        userId: user.user_id,
        glickoRating: dbUser.glickoRating,
        queueType: req.body.type,
        joinedAt: new Date(),
      })

      return reply.status(202).send({ status: 'queued', queue_type: req.body.type })
    },
  )

  // DELETE /api/matchmaking/leave
  app.delete(
    '/api/matchmaking/leave',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as { user_id: string }
      removeFromQueue(user.user_id)
      return reply.send({ status: 'left' })
    },
  )

  // GET /api/matchmaking/status
  app.get(
    '/api/matchmaking/status',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as { user_id: string }

      const gameId = getMatch(user.user_id)
      if (gameId) {
        return reply.send({ status: 'matched', game_id: gameId })
      }

      const queueEntry = getQueueEntry(user.user_id)
      if (queueEntry) {
        return reply.send({ status: 'queued', queue_type: queueEntry.queueType })
      }

      return reply.send({ status: 'not_queued' })
    },
  )
}
