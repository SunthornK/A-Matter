import { describe, it, expect, afterAll } from 'vitest'
import { buildApp } from '../src/app'
import { hashPassword, verifyPassword, signToken, verifyTokenPayload } from '../src/services/auth.service'
import { prisma } from '@a-matter/db'

describe('health', () => {
  it('GET /health returns 200', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'ok' })
    await app.close()
  })
})

describe('auth service', () => {
  it('hashPassword produces a bcrypt hash', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).toMatch(/^\$2[ab]\$/)
    expect(hash).not.toBe('secret123')
  })

  it('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('correct', hash)).toBe(true)
  })

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('signToken produces a JWT string', () => {
    const token = signToken(
      { user_id: 'uuid-1', role: 'user', token_version: 0 },
      'test-secret',
      60,
    )
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('verifyTokenPayload decodes a valid token', () => {
    const token = signToken(
      { user_id: 'uuid-1', role: 'user', token_version: 0 },
      'test-secret',
      60,
    )
    const payload = verifyTokenPayload(token, 'test-secret')
    expect(payload.user_id).toBe('uuid-1')
    expect(payload.role).toBe('user')
    expect(payload.token_version).toBe(0)
  })

  it('verifyTokenPayload throws for expired token', () => {
    const token = signToken(
      { user_id: 'uuid-1', role: 'user', token_version: 0 },
      'test-secret',
      -1, // already expired
    )
    expect(() => verifyTokenPayload(token, 'test-secret')).toThrow()
  })

  it('verifyTokenPayload throws for wrong secret', () => {
    const token = signToken(
      { user_id: 'uuid-1', role: 'user', token_version: 0 },
      'secret-a',
      60,
    )
    expect(() => verifyTokenPayload(token, 'secret-b')).toThrow()
  })
})

// Clean up test users after each auth route test run
const testUsernames: string[] = []
afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: testUsernames } } })
})

describe('POST /api/auth/register', () => {
  it('creates a user and returns a JWT', async () => {
    const app = await buildApp()
    const username = `reg_test_${Date.now()}`
    testUsernames.push(username)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username,
        email: `${username}@example.com`,
        password: 'Password123!',
        display_name: 'Test User',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.token).toBeDefined()
    expect(typeof body.token).toBe('string')
    expect(body.user.username).toBe(username)
    await app.close()
  })

  it('returns 409 for duplicate username', async () => {
    const app = await buildApp()
    const username = `dup_test_${Date.now()}`
    testUsernames.push(username)

    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username, email: `${username}@example.com`, password: 'Password123!', display_name: 'First' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username, email: `${username}2@example.com`, password: 'Password123!', display_name: 'Second' },
    })
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 409 for duplicate email', async () => {
    const app = await buildApp()
    const email = `dup_email_${Date.now()}@example.com`
    const u1 = `dup_email_user1_${Date.now()}`
    const u2 = `dup_email_user2_${Date.now()}`
    testUsernames.push(u1, u2)

    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: u1, email, password: 'Password123!', display_name: 'First' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: u2, email, password: 'Password123!', display_name: 'Second' },
    })
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 400 for missing fields', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'no_email' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('POST /api/auth/login', () => {
  it('returns JWT for valid credentials', async () => {
    const app = await buildApp()
    const username = `login_test_${Date.now()}`
    testUsernames.push(username)

    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username, email: `${username}@example.com`, password: 'Password123!', display_name: 'Login Test' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: 'Password123!' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.token).toBeDefined()
    await app.close()
  })

  it('returns 401 for wrong password', async () => {
    const app = await buildApp()
    const username = `wrong_pw_${Date.now()}`
    testUsernames.push(username)

    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username, email: `${username}@example.com`, password: 'Password123!', display_name: 'WP Test' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: 'WrongPassword!' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 401 for unknown username', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nobody_exists_xyz', password: 'anything' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('authenticate middleware', () => {
  it('rejects requests with no token', async () => {
    const app = await buildApp()
    // Register a protected test route
    app.get('/test-protected', { preHandler: [app.authenticate] }, async () => ({ ok: true }))
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/test-protected' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('rejects requests with invalid token', async () => {
    const app = await buildApp()
    app.get('/test-protected2', { preHandler: [app.authenticate] }, async () => ({ ok: true }))
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/test-protected2',
      headers: { authorization: 'Bearer not.a.token' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('allows requests with a valid token', async () => {
    const app = await buildApp()
    app.get('/test-protected3', { preHandler: [app.authenticate] }, async (req) => {
      return { user_id: (req.user as { user_id: string }).user_id }
    })
    await app.ready()

    // Create a user + get token
    const username = `mw_test_${Date.now()}`
    testUsernames.push(username)
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username, email: `${username}@example.com`, password: 'Password123!', display_name: 'MW' },
    })
    const { token } = JSON.parse(regRes.body)

    const res = await app.inject({
      method: 'GET',
      url: '/test-protected3',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).user_id).toBeDefined()
    await app.close()
  })
})
