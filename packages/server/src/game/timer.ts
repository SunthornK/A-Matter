import type { Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from './types'
import { applyEndgame } from './endgame'

const SYNC_INTERVAL_MS = 10_000
const TICK_MS = 1_000

interface TimerState {
  currentPlayerId: string
  timeRemaining: Map<string, number>  // playerId → ms
  tickInterval: ReturnType<typeof setInterval> | null
  syncInterval: ReturnType<typeof setInterval> | null
}

// Module-level map — one GameTimer per active game
const activeTimers = new Map<string, TimerState>()

type GameIO = Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>

export function startGameTimer(
  gameId: string,
  currentPlayerId: string,
  playerTimes: Map<string, number>,
  io: GameIO,
  prisma: PrismaClient,
): void {
  stopGameTimer(gameId)

  const state: TimerState = {
    currentPlayerId,
    timeRemaining: new Map(playerTimes),
    tickInterval: null,
    syncInterval: null,
  }

  state.tickInterval = setInterval(() => {
    const remaining = (state.timeRemaining.get(state.currentPlayerId) ?? 0) - TICK_MS
    state.timeRemaining.set(state.currentPlayerId, Math.max(0, remaining))

    if (remaining <= 0) {
      stopGameTimer(gameId)
      // Find the other player (winner on timeout)
      prisma.gamePlayer.findMany({ where: { gameId } }).then((players) => {
        const winner = players.find((p) => p.id !== state.currentPlayerId)
        return applyEndgame(gameId, 'timeout', winner?.id ?? null, io, prisma)
      }).catch(() => {/* game may already be finished */})
    }
  }, TICK_MS)

  state.syncInterval = setInterval(() => {
    const players = Array.from(state.timeRemaining.entries()).map(([player_id, time_remaining_ms]) => ({
      player_id,
      time_remaining_ms,
    }))
    io.to(`game:${gameId}`).emit('timer:sync', { players, timestamp: Date.now() })

    // Persist to DB
    players.forEach(({ player_id, time_remaining_ms }) => {
      prisma.gamePlayer.update({
        where: { id: player_id },
        data: { timeRemainingMs: time_remaining_ms },
      }).catch(() => {})
    })
  }, SYNC_INTERVAL_MS)

  activeTimers.set(gameId, state)
}

export function advanceTimer(gameId: string, nextPlayerId: string): void {
  const state = activeTimers.get(gameId)
  if (state) state.currentPlayerId = nextPlayerId
}

export function stopGameTimer(gameId: string): void {
  const state = activeTimers.get(gameId)
  if (!state) return
  if (state.tickInterval) clearInterval(state.tickInterval)
  if (state.syncInterval) clearInterval(state.syncInterval)
  activeTimers.delete(gameId)
}

export function setupHeartbeat(
  socket: { id: string; emit: (event: string) => void; disconnect: () => void; once: (event: string, fn: () => void) => void; on: (event: string, fn: () => void) => void },
): void {
  const interval = setInterval(() => {
    let ponged = false
    socket.emit('server:ping')
    const timeout = setTimeout(() => {
      if (!ponged) socket.disconnect()
    }, 10_000)
    socket.once('server:pong', () => {
      ponged = true
      clearTimeout(timeout)
    })
  }, 30_000)

  socket.on('disconnect', () => clearInterval(interval))
}
