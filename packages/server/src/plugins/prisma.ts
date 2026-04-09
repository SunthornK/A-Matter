import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@a-matter/db'

async function prismaPlugin(app: FastifyInstance) {
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export default fp(prismaPlugin, { name: 'prisma' })
