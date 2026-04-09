import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app'
import { hashPassword, verifyPassword, signToken, verifyTokenPayload } from '../src/services/auth.service'

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
