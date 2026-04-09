import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, connectSocket, waitForEvent, createTestGame, cleanupTestGame, type TestServer, type TestGame } from './helpers'
import type { GameStatePayload, GameOverPayload } from '../../src/game/types'

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

describe('game:resign', () => {
  it('resign immediately ends the game with forfeit', async () => {
    const freshGame = await createTestGame(server.app)
    const alice = connectSocket(server.port, freshGame.aliceToken, freshGame.gameId)
    const bob = connectSocket(server.port, freshGame.bobToken, freshGame.gameId)

    alice.connect()
    bob.connect()
    await Promise.all([
      waitForEvent(alice, 'game:state'),
      waitForEvent(bob, 'game:state'),
    ])

    const gameOverP = waitForEvent(bob, 'game:over')
    alice.emit('game:resign')
    const gameOver = await gameOverP

    expect(gameOver.reason).toBe('forfeit')
    expect(gameOver.winner_player_id).toBe(freshGame.bobPlayerId)

    alice.disconnect()
    bob.disconnect()
    await cleanupTestGame(freshGame)
  })

  it('either player can resign', async () => {
    const freshGame = await createTestGame(server.app)
    const alice = connectSocket(server.port, freshGame.aliceToken, freshGame.gameId)
    const bob = connectSocket(server.port, freshGame.bobToken, freshGame.gameId)

    alice.connect()
    bob.connect()
    await Promise.all([
      waitForEvent(alice, 'game:state'),
      waitForEvent(bob, 'game:state'),
    ])

    const gameOverP = waitForEvent(alice, 'game:over')
    bob.emit('game:resign')
    const gameOver = await gameOverP

    expect(gameOver.reason).toBe('forfeit')
    expect(gameOver.winner_player_id).toBe(freshGame.alicePlayerId)

    alice.disconnect()
    bob.disconnect()
    await cleanupTestGame(freshGame)
  })
})
