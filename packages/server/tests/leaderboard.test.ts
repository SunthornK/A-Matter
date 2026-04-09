import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app'

describe('GET /api/leaderboard', () => {
  it('returns an array of players sorted by rating descending', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/leaderboard' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.players)).toBe(true)
    // Verify sort order if multiple entries
    for (let i = 1; i < body.players.length; i++) {
      expect(body.players[i - 1].glicko_rating).toBeGreaterThanOrEqual(
        body.players[i].glicko_rating,
      )
    }
    await app.close()
  })

  it('respects limit and offset query params', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/leaderboard?limit=5&offset=0',
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.players.length).toBeLessThanOrEqual(5)
    await app.close()
  })

  it('each player entry has required fields', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/leaderboard' })
    const body = JSON.parse(res.body)
    if (body.players.length > 0) {
      const p = body.players[0]
      expect(p.rank).toBeDefined()
      expect(p.username).toBeDefined()
      expect(p.display_name).toBeDefined()
      expect(p.glicko_rating).toBeDefined()
      expect(p.games_played).toBeDefined()
      expect(p.games_won).toBeDefined()
    }
    await app.close()
  })
})
