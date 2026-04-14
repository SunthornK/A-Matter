import { buildApp } from './app'
import { config } from './config'
import { createSocketServer } from './socket'
import { prisma } from '@a-matter/db'
import { startMatchLoop } from './services/matchmaking.loop'

const app = await buildApp()

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  createSocketServer(app.server, prisma)
  const matchLoopInterval = startMatchLoop(prisma)
  console.log(`Server running on port ${config.port}`)

  process.on('SIGTERM', async () => {
    clearInterval(matchLoopInterval)
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
