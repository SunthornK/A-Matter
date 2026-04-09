import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, connectSocket, waitForEvent, createTestGame, cleanupTestGame, type TestServer, type TestGame } from './helpers'
import type { GameStatePayload, MoveResultPayload, GameOverPayload } from '../../src/game/types'

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

describe('move:pass', () => {
  it('rejects pass when not your turn', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    const notActing = aliceState.current_turn_player_id === game.alicePlayerId ? bob : alice
    const errP = waitForEvent(notActing, 'error')
    notActing.emit('move:pass')
    const err = await errP
    expect(err.code).toBe('NOT_YOUR_TURN')
    alice.disconnect()
    bob.disconnect()
  })

  it('pass advances the turn', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    const acting = aliceState.current_turn_player_id === game.alicePlayerId ? alice : bob
    const notActing = acting === alice ? bob : alice

    const moveResultP = waitForEvent(notActing, 'move:result')
    acting.emit('move:pass')
    const result = await moveResultP
    expect(result.action).toBe('pass')
    expect(result.score_earned).toBe(0)
    const actingPlayerId = aliceState.current_turn_player_id
    expect(result.next_player_id).not.toBe(actingPlayerId)
    alice.disconnect()
    bob.disconnect()
  })

  it('6 total passes (3 each) triggers stalemate', async () => {
    const freshGame = await createTestGame(server.app)
    const alice = connectSocket(server.port, freshGame.aliceToken, freshGame.gameId)
    const bob = connectSocket(server.port, freshGame.bobToken, freshGame.gameId)

    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([
      waitForEvent(alice, 'game:state'),
      waitForEvent(bob, 'game:state'),
    ])

    // Determine which socket acts first
    const firstSocket = aliceState.current_turn_player_id === freshGame.alicePlayerId ? alice : bob
    const secondSocket = firstSocket === alice ? bob : alice
    const sockets = [firstSocket, secondSocket]

    // Alternate passes 6 times
    for (let i = 0; i < 5; i++) {
      const acting = sockets[i % 2]!
      const other = sockets[(i + 1) % 2]!
      const resultP = waitForEvent(other, 'move:result')
      acting.emit('move:pass')
      await resultP
    }

    // 6th pass should trigger game:over
    const gameOverP = waitForEvent(alice, 'game:over')
    sockets[5 % 2]!.emit('move:pass')
    const gameOver = await gameOverP

    expect(gameOver.reason).toBe('stalemate')
    expect(gameOver.winner_player_id).toBeNull()

    alice.disconnect()
    bob.disconnect()
    await cleanupTestGame(freshGame)
  })
})
