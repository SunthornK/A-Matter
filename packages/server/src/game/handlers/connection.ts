import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'
import { buildGameState } from '../state'
import { handlePlace } from './place'
import { handleExchange } from './exchange'
import { handlePass } from './pass'
import { handleResign } from './resign'
import { startGameTimer, advanceTimer, stopGameTimer, setupHeartbeat } from '../timer'
import { applyEndgame } from '../endgame'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

// Track how many sockets are connected per game (to start timer only when both are present)
const connectedPerGame = new Map<string, Set<string>>()

// Grace timers: playerId → NodeJS.Timeout
const gracePeriodTimers = new Map<string, ReturnType<typeof setTimeout>>()
// Map from playerId → socket.id for reconnect detection
const playerSocketMap = new Map<string, string>()

export function onConnection(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
): void {
  const { gameId, playerId } = socket.data
  let turnStartedAt = Date.now()

  socket.join(`game:${gameId}`)

  // Track connected sockets
  if (!connectedPerGame.has(gameId)) connectedPerGame.set(gameId, new Set())
  connectedPerGame.get(gameId)!.add(socket.id)

  // Cancel any existing grace timer for this player (they reconnected)
  const existingGrace = gracePeriodTimers.get(playerId)
  if (existingGrace) {
    clearTimeout(existingGrace)
    gracePeriodTimers.delete(playerId)
    // Notify others they reconnected
    socket.to(`game:${gameId}`).emit('player:reconnect', { player_id: playerId })
  }
  playerSocketMap.set(playerId, socket.id)

  buildGameState(gameId, playerId, prisma)
    .then(async (state) => {
      socket.emit('game:state', state)
      turnStartedAt = Date.now()

      // Start timer once both players are connected
      const connected = connectedPerGame.get(gameId)!
      if (connected.size >= 2) {
        const players = await prisma.gamePlayer.findMany({ where: { gameId } })
        const playerTimes = new Map(players.map((p) => [p.id, p.timeRemainingMs]))
        startGameTimer(gameId, state.current_turn_player_id, playerTimes, io, prisma)
      }
    })
    .catch((err) => socket.emit('error', { code: 'STATE_ERROR', message: String(err) }))

  setupHeartbeat(socket as Parameters<typeof setupHeartbeat>[0])

  socket.on('state:request', () => {
    buildGameState(gameId, playerId, prisma)
      .then((state) => socket.emit('game:state', state))
      .catch((err) => socket.emit('error', { code: 'STATE_ERROR', message: String(err) }))
  })

  socket.on('tile_tracker:update', async (data) => {
    await prisma.gamePlayer.update({
      where: { id: playerId },
      data: { tileTracker: data.tracker as never },
    }).catch(() => {})
  })

  socket.on('move:place', (data) => {
    handlePlace(socket, io, data, prisma, turnStartedAt)
      .then(() => {
        turnStartedAt = Date.now()
        prisma.game.findUnique({ where: { id: gameId }, select: { currentTurnPlayerId: true } })
          .then((g) => { if (g?.currentTurnPlayerId) advanceTimer(gameId, g.currentTurnPlayerId) })
          .catch(() => {})
      })
      .catch((err) => socket.emit('error', { code: 'INTERNAL_ERROR', message: String(err) }))
  })

  socket.on('move:exchange', (data) => {
    handleExchange(socket, io, data, prisma, turnStartedAt)
      .then(() => {
        turnStartedAt = Date.now()
        prisma.game.findUnique({ where: { id: gameId }, select: { currentTurnPlayerId: true } })
          .then((g) => { if (g?.currentTurnPlayerId) advanceTimer(gameId, g.currentTurnPlayerId) })
          .catch(() => {})
      })
      .catch((err) => socket.emit('error', { code: 'INTERNAL_ERROR', message: String(err) }))
  })

  socket.on('move:pass', () => {
    handlePass(socket, io, prisma, turnStartedAt)
      .then(() => {
        turnStartedAt = Date.now()
        prisma.game.findUnique({ where: { id: gameId }, select: { currentTurnPlayerId: true } })
          .then((g) => { if (g?.currentTurnPlayerId) advanceTimer(gameId, g.currentTurnPlayerId) })
          .catch(() => {})
      })
      .catch((err) => socket.emit('error', { code: 'INTERNAL_ERROR', message: String(err) }))
  })

  socket.on('game:resign', () => {
    handleResign(socket, io, prisma)
      .then(() => stopGameTimer(gameId))
      .catch((err) => socket.emit('error', { code: 'INTERNAL_ERROR', message: String(err) }))
  })

  socket.on('disconnect', () => {
    const connected = connectedPerGame.get(gameId)
    if (connected) {
      connected.delete(socket.id)
      if (connected.size === 0) connectedPerGame.delete(gameId)
    }

    // Notify other player
    socket.to(`game:${gameId}`).emit('player:disconnect', { player_id: playerId })

    // Start 30s grace period — forfeit if not reconnected
    const grace = setTimeout(() => {
      gracePeriodTimers.delete(playerId)
      prisma.game.findUnique({ where: { id: gameId }, select: { status: true } })
        .then(async (g) => {
          if (!g || g.status !== 'active') return
          const players = await prisma.gamePlayer.findMany({ where: { gameId } })
          const other = players.find((p) => p.id !== playerId)
          if (other) await applyEndgame(gameId, 'forfeit', other.id, io, prisma)
          stopGameTimer(gameId)
        })
        .catch(() => {})
    }, 30_000)

    gracePeriodTimers.set(playerId, grace)
  })
}
