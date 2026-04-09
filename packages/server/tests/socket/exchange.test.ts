import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, connectSocket, waitForEvent, createTestGame, cleanupTestGame, type TestServer, type TestGame } from './helpers'
import type { GameStatePayload, MoveResultPayload, RackUpdatePayload } from '../../src/game/types'

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

describe('move:exchange', () => {
  it('rejects exchange when not your turn', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    const notActing = aliceState.current_turn_player_id === game.alicePlayerId ? bob : alice
    const errP = waitForEvent(notActing, 'error')
    notActing.emit('move:exchange', { indices: [0] })
    const err = await errP
    expect(err.code).toBe('NOT_YOUR_TURN')
    alice.disconnect()
    bob.disconnect()
  })

  it('rejects exchange with empty indices', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    const acting = aliceState.current_turn_player_id === game.alicePlayerId ? alice : bob
    const errP = waitForEvent(acting, 'error')
    acting.emit('move:exchange', { indices: [] })
    const err = await errP
    expect(err.code).toBe('INVALID_MOVE')
    alice.disconnect()
    bob.disconnect()
  })

  it('successfully exchanges tiles', async () => {
    const alice = connectSocket(server.port, game.aliceToken, game.gameId)
    const bob = connectSocket(server.port, game.bobToken, game.gameId)
    const aliceStateP = waitForEvent(alice, 'game:state')
    const bobStateP = waitForEvent(bob, 'game:state')
    alice.connect()
    bob.connect()
    const [aliceState] = await Promise.all([aliceStateP, bobStateP])

    const isAliceTurn = aliceState.current_turn_player_id === game.alicePlayerId
    const actingSocket = isAliceTurn ? alice : bob

    const rackUpdateP = waitForEvent(actingSocket, 'rack:update')
    const moveResultP = waitForEvent(alice, 'move:result')
    actingSocket.emit('move:exchange', { indices: [0] })
    const [rackUpdate, moveResult] = await Promise.all([rackUpdateP, moveResultP])

    expect(Array.isArray(rackUpdate.rack)).toBe(true)
    expect(moveResult.action).toBe('exchange')
    expect(moveResult.score_earned).toBe(0)
    alice.disconnect()
    bob.disconnect()
  })
})
