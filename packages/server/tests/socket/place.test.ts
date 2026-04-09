import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, connectSocket, waitForEvent, createTestGame, cleanupTestGame, type TestServer, type TestGame } from './helpers'
import type { GameStatePayload } from '../../src/game/types'

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

describe('move:place', () => {
  it('rejects move when it is not the player\'s turn', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    // Seat 1 goes first; find who is NOT the current turn player
    const notActingSocket = aliceState.current_turn_player_id === game.alicePlayerId ? bob : alice

    const errorP = waitForEvent(notActingSocket, 'error')
    notActingSocket.emit('move:place', { placements: [] })
    const err = await errorP
    expect(err.code).toBe('NOT_YOUR_TURN')

    alice.disconnect()
    bob.disconnect()
  })

  it('rejects empty placements array from acting player', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    const actingSocket = aliceState.current_turn_player_id === game.alicePlayerId ? alice : bob

    const errorP = waitForEvent(actingSocket, 'error')
    actingSocket.emit('move:place', { placements: [] })
    const err = await errorP
    expect(err.code).toBe('INVALID_MOVE')

    alice.disconnect()
    bob.disconnect()
  })
})
