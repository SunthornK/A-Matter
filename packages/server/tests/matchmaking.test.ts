import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { buildApp } from '../src/app'
import { prisma } from '@a-matter/db'
import { recordMatch, clearMatch, clearAllQueues } from '../src/services/matchmaking.queue'

let aliceToken: string
let aliceId: string
let bobToken: string
const ts = Date.now()

beforeAll(async () => {
  const app = await buildApp()

  const aRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `alice_mm_${ts}`, email: `alice_mm_${ts}@test.com`, password: 'Password123!', display_name: 'Alice MM' },
  })
  const aBody = JSON.parse(aRes.body)
  expect(aRes.statusCode).toBe(201)
  expect(aBody.user?.id).toBeTruthy()
  aliceToken = aBody.token
  aliceId = aBody.user.id

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

afterEach(() => {
  clearAllQueues()
  clearMatch(aliceId)
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

describe('GET /api/matchmaking/status', () => {
  it('returns not_queued when user is not in queue', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'not_queued' })
    await app.close()
  })

  it('returns queued with queue_type when user is in queue', async () => {
    const app = await buildApp()
    await app.inject({
      method: 'POST', url: '/api/matchmaking/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'ranked' },
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'queued', queue_type: 'ranked' })
    // clean up
    await app.inject({ method: 'DELETE', url: '/api/matchmaking/leave', headers: { authorization: `Bearer ${aliceToken}` } })
    await app.close()
  })

  it('returns matched with game_id when match has been recorded', async () => {
    const app = await buildApp()
    recordMatch(aliceId, 'game-test-xyz')
    const res = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('matched')
    expect(body.game_id).toBe('game-test-xyz')
    // getMatch is not consumed on read — second call still returns matched
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    const body2 = JSON.parse(res2.body)
    expect(body2.status).toBe('matched')
    expect(body2.game_id).toBe('game-test-xyz')
    // Explicitly clear it after testing
    clearMatch(aliceId)
    await app.close()
  })

  it('requires authentication', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/matchmaking/status' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
