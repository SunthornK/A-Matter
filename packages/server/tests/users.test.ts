import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/app'
import { prisma } from '@a-matter/db'

let authToken: string
let testUserId: string
const testUsername = `user_route_${Date.now()}`

beforeAll(async () => {
  const app = await buildApp()
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      username: testUsername,
      email: `${testUsername}@example.com`,
      password: 'Password123!',
      display_name: 'Route Tester',
    },
  })
  const body = JSON.parse(regRes.body)
  authToken = body.token
  testUserId = body.user.id
  await app.close()
})

afterAll(async () => {
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('GET /api/users/:username', () => {
  it('returns public profile for existing user', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${testUsername}`,
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.username).toBe(testUsername)
    expect(body.display_name).toBe('Route Tester')
    expect(body.glicko_rating).toBe(1500)
    expect(body.password_hash).toBeUndefined() // never exposed
    await app.close()
  })

  it('returns 404 for unknown username', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/nobody_xyz_123',
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('GET /api/users/:id/games', () => {
  it('returns empty array when user has no games', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${testUserId}/games`,
      headers: { authorization: `Bearer ${authToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.games)).toBe(true)
    await app.close()
  })

  it('requires authentication', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${testUserId}/games`,
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
