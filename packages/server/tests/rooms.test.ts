import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/app'
import { prisma } from '@a-matter/db'

let aliceToken: string
let bobToken: string
let aliceId: string
const ts = Date.now()

beforeAll(async () => {
  const app = await buildApp()

  const aliceRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `alice_room_${ts}`, email: `alice_room_${ts}@test.com`, password: 'Password123!', display_name: 'Alice' },
  })
  aliceToken = JSON.parse(aliceRes.body).token
  aliceId = JSON.parse(aliceRes.body).user.id

  const bobRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `bob_room_${ts}`, email: `bob_room_${ts}@test.com`, password: 'Password123!', display_name: 'Bob' },
  })
  bobToken = JSON.parse(bobRes.body).token

  await app.close()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [`alice_room_${ts}`, `bob_room_${ts}`] } } })
  await prisma.$disconnect()
})

describe('POST /api/rooms/create', () => {
  it('creates a private room and returns an invite code', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms/create',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'private', time_per_side_ms: 1320000 },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.room_id).toBeDefined()
    expect(body.invite_code).toMatch(/^[A-Z0-9]{6}$/)
    await app.close()
  })

  it('requires authentication', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms/create',
      payload: { type: 'private' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('POST /api/rooms/join', () => {
  it('first joiner gets waiting status', async () => {
    const app = await buildApp()

    // Alice creates a room
    const createRes = await app.inject({
      method: 'POST', url: '/api/rooms/create',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'private', time_per_side_ms: 1320000 },
    })
    const { invite_code } = JSON.parse(createRes.body)

    // Alice joins her own room
    const joinRes = await app.inject({
      method: 'POST', url: '/api/rooms/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { invite_code },
    })
    expect(joinRes.statusCode).toBe(200)
    const body = JSON.parse(joinRes.body)
    expect(body.status).toBe('waiting')
    await app.close()
  })

  it('second joiner triggers game creation', async () => {
    const app = await buildApp()

    const createRes = await app.inject({
      method: 'POST', url: '/api/rooms/create',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'private', time_per_side_ms: 1320000 },
    })
    const { invite_code } = JSON.parse(createRes.body)

    // Alice joins first
    await app.inject({
      method: 'POST', url: '/api/rooms/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { invite_code },
    })

    // Bob joins second
    const joinRes = await app.inject({
      method: 'POST', url: '/api/rooms/join',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { invite_code },
    })
    expect(joinRes.statusCode).toBe(200)
    const body = JSON.parse(joinRes.body)
    expect(body.status).toBe('ready')
    expect(body.game_id).toBeDefined()
    await app.close()
  })

  it('returns 404 for invalid invite code', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST', url: '/api/rooms/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { invite_code: 'XXXXXX' },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
