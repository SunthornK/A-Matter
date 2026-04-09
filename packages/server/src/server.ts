import { buildApp } from './app'
import { config } from './config'
import { createSocketServer } from './socket'
import { prisma } from '@a-matter/db'

const app = await buildApp()

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  createSocketServer(app.server, prisma)
  console.log(`Server running on port ${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
