import type { FastifyInstance } from 'fastify'
import { hashPassword, verifyPassword, signToken } from '../services/auth.service'
import { config } from '../config'

interface RegisterBody {
  username: string
  email: string
  password: string
  display_name: string
}

interface LoginBody {
  username: string
  password: string
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/api/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password', 'display_name'],
        properties: {
          username: { type: 'string', minLength: 2, maxLength: 30, pattern: '^[a-z0-9_]+$' },
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8 },
          display_name: { type: 'string', minLength: 1, maxLength: 50 },
        },
      },
    },
  }, async (req, reply) => {
    const { username, email, password, display_name } = req.body

    const existing = await app.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Username or email already taken' })
    }

    const passwordHash = await hashPassword(password)
    const user = await app.prisma.user.create({
      data: { username, email, passwordHash, displayName: display_name },
    })

    const token = signToken(
      { user_id: user.id, role: user.role === 'admin' ? 'admin' : 'user', token_version: user.tokenVersion },
      config.jwtSecret,
      config.jwtTtlSeconds,
    )

    return reply.status(201).send({
      token,
      user: { id: user.id, username: user.username, display_name: user.displayName },
    })
  })

  app.post<{ Body: LoginBody }>('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body

    const user = await app.prisma.user.findUnique({ where: { username } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = signToken(
      { user_id: user.id, role: user.role === 'admin' ? 'admin' : 'user', token_version: user.tokenVersion },
      config.jwtSecret,
      config.jwtTtlSeconds,
    )

    return reply.send({
      token,
      user: { id: user.id, username: user.username, display_name: user.displayName },
    })
  })
}
