import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app'

describe('health', () => {
  it('GET /health returns 200', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'ok' })
    await app.close()
  })
})
