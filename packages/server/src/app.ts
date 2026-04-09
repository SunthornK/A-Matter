import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import addFormats from 'ajv-formats'
import { config } from './config'
import prismaPlugin from './plugins/prisma'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { leaderboardRoutes } from './routes/leaderboard'
import { authenticate } from './middleware/authenticate'

export async function buildApp() {
  const app = Fastify({
    logger: config.nodeEnv === 'development',
    ajv: {
      customOptions: { allErrors: true },
      plugins: [addFormats],
    },
  })

  await app.register(jwt, { secret: config.jwtSecret })
  await app.register(prismaPlugin)

  // Decorate with authenticate so routes can use it as a preHandler
  app.decorate('authenticate', authenticate)

  await app.register(authRoutes)
  await app.register(userRoutes)
  await app.register(leaderboardRoutes)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
