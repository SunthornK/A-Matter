import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, connectSocket, waitForEvent, createTestGame, cleanupTestGame, type TestServer, type TestGame } from './helpers'

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

describe('Socket.IO connection', () => {
  it('connects successfully with valid token and game_id', async () => {
    const socket = connectSocket(server.port, game.aliceToken, game.gameId)
    const connectPromise = new Promise<void>((resolve, reject) => {
      socket.on('connect', resolve)
      socket.on('connect_error', reject)
    })
    socket.connect()
    await connectPromise
    expect(socket.connected).toBe(true)
    socket.disconnect()
  })

  it('rejects connection with invalid token', async () => {
    const socket = connectSocket(server.port, 'not.a.token', game.gameId)
    const error = await new Promise<Error>((resolve) => {
      socket.on('connect_error', resolve)
      socket.connect()
    })
    expect(error.message).toMatch(/unauthorized/i)
    socket.disconnect()
  })

  it('rejects connection with missing game_id', async () => {
    const socket = connectSocket(server.port, game.aliceToken, '')
    const error = await new Promise<Error>((resolve) => {
      socket.on('connect_error', resolve)
      socket.connect()
    })
    expect(error.message).toMatch(/game_id/i)
    socket.disconnect()
  })

  it('receives game:state on connect', async () => {
    const socket = connectSocket(server.port, game.aliceToken, game.gameId)
    const statePromise = waitForEvent(socket, 'game:state')
    socket.connect()
    const state = await statePromise
    expect(state.game_id).toBe(game.gameId)
    expect(state.my_player_id).toBe(game.alicePlayerId)
    expect(Array.isArray(state.rack)).toBe(true)
    expect(state.rack.length).toBe(8)
    expect(state.board).toHaveLength(15)
    expect(state.players).toHaveLength(2)
    socket.disconnect()
  })

  it('receives game:state on state:request', async () => {
    const socket = connectSocket(server.port, game.aliceToken, game.gameId)
    socket.connect()
    await waitForEvent(socket, 'game:state')  // initial state
    const statePromise = waitForEvent(socket, 'game:state')
    socket.emit('state:request')
    const state = await statePromise
    expect(state.game_id).toBe(game.gameId)
    socket.disconnect()
  })
})
