import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/app'
import { prisma } from '@a-matter/db'

let aliceToken: string
let bobToken: string
const ts = Date.now()

beforeAll(async () => {
  const app = await buildApp()

  const aRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `alice_mm_${ts}`, email: `alice_mm_${ts}@test.com`, password: 'Password123!', display_name: 'Alice MM' },
  })
  aliceToken = JSON.parse(aRes.body).token

  const bRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `bob_mm_${ts}`, email: `bob_mm_${ts}@test.com`, password: 'Password123!', display_name: 'Bob MM' },
  })
  bobToken = JSON.parse(bRes.body).token

  await app.close()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [`alice_mm_${ts}`, `bob_mm_${ts}`] } } })
  await prisma.$disconnect()
})

describe('POST /api/matchmaking/join', () => {
  it('adds player to ranked queue and returns 202', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/matchmaking/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'ranked' },
    })
    expect(res.statusCode).toBe(202)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('queued')
    expect(body.queue_type).toBe('ranked')
    await app.close()
  })

  it('adds player to quickplay queue', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/matchmaking/join',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { type: 'quickplay' },
    })
    expect(res.statusCode).toBe(202)
    expect(JSON.parse(res.body).queue_type).toBe('quickplay')
    await app.close()
  })

  it('requires authentication', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/matchmaking/join',
      payload: { type: 'ranked' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('DELETE /api/matchmaking/leave', () => {
  it('removes player from queue and returns 200', async () => {
    const app = await buildApp()

    // Join first
    await app.inject({
      method: 'POST', url: '/api/matchmaking/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'ranked' },
    })

    // Then leave
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/matchmaking/leave',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('left')
    await app.close()
  })

  it('returns 200 even if player was not in queue', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/matchmaking/leave',
      headers: { authorization: `Bearer ${bobToken}` },
    })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})
