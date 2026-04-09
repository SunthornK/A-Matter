import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyTokenPayload } from '../services/auth.service'
import { config } from '../config'

export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.slice(7)
  let payload: { user_id: string; role: string; token_version: number }

  try {
    payload = verifyTokenPayload(token, config.jwtSecret)
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }

  // Check token_version against DB to support forced logout
  const user = await req.server.prisma.user.findUnique({
    where: { id: payload.user_id },
    select: { tokenVersion: true },
  })

  if (!user || user.tokenVersion !== payload.token_version) {
    return reply.status(401).send({ error: 'Token has been invalidated' })
  }

  req.user = payload
}
