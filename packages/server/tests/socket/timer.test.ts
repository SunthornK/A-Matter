import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, connectSocket, waitForEvent, createTestGame, cleanupTestGame, type TestServer, type TestGame } from './helpers'
import type { GameStatePayload, TimerSyncPayload } from '../../src/game/types'

let server: TestServer
let game: TestGame

beforeAll(async () => {
  server = await startTestServer()
  game = await createTestGame(server.app)
})

afterAll(async () => {
  await cleanupTestGame(game)
  await server.stop()
})

describe('timer', () => {
  it('receives timer:sync within 15 seconds of connecting', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent<GameStatePayload>(alice, 'game:state')
    alice.connect()
    bob.connect()
    await aliceStateP

    const syncP = new Promise<TimerSyncPayload>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No timer:sync received within 15s')), 15000)
      alice.once('timer:sync', (data: TimerSyncPayload) => {
        clearTimeout(timeout)
        resolve(data)
      })
    })

    const sync = await syncP
    expect(Array.isArray(sync.players)).toBe(true)
    expect(sync.players).toHaveLength(2)
    expect(sync.players[0]!.time_remaining_ms).toBeGreaterThan(0)

    alice.disconnect()
    bob.disconnect()
  }, 20000)  // 20s timeout for this test
})
