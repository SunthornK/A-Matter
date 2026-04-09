import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { config } from './config'
import prismaPlugin from './plugins/prisma'

export async function buildApp() {
  const app = Fastify({
    logger: config.nodeEnv === 'development',
  })

  // Plugins
  await app.register(jwt, { secret: config.jwtSecret })
  await app.register(prismaPlugin)

  // Health check
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
