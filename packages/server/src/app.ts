import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import addFormats from 'ajv-formats'
import { config } from './config'
import prismaPlugin from './plugins/prisma'
import { authRoutes } from './routes/auth'

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
  await app.register(authRoutes)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
