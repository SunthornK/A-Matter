import { create } from 'zustand'
import { makePendingKey } from '../utils/board'
import type {
  GameStatePayload,
  MoveResultPayload,
  RackUpdatePayload,
  TimerSyncPayload,
  GameOverPayload,
  MoveLogEntry,
} from '../types/game'

interface BoardCell {
  value: string
  owner: string | null
  isBonus: boolean
  bonusType: 'b3eq' | 'b2eq' | 'b3pc' | 'b2pc' | null
}

interface RackTile {
  value: string
  points: number
}

interface PendingTile {
  value: string
  rackIndex: number
}

interface PlayerState {
  playerId: string
  displayName: string
  score: number
  timeRemainingMs: number
  consecutivePasses: number
  tilesRemaining: number
}

interface GameStore {
  // connection
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

  // game metadata
  gameId: string | null
  mode: 'ranked' | 'quickplay' | 'private' | null

  // board + tiles
  board: (BoardCell | null)[][]
  rack: (RackTile | null)[]
  confirmedRack: (RackTile | null)[]   // last server-confirmed rack, used to restore points on returnTile
  pendingPlacements: Record<string, PendingTile>
  bag: number

  // turn
  turnNumber: number
  currentTurnPlayerId: string | null

  // players
  players: PlayerState[]
  myPlayerId: string | null

  // tile tracker — tileValue → count seen so far
  tileTracker: Record<string, number>

  // end state
  gameOverResult: GameOverPayload | null

  // ui state (client-only)
  selectedRackIndex: number | null
  rackFlipped: Record<number, boolean>
  opponentDisconnected: boolean
  opponentDisconnectedAt: number | null

  // move log
  recentMoves: MoveLogEntry[]

  // actions
  applyGameState: (payload: GameStatePayload) => void
  applyMoveResult: (payload: MoveResultPayload) => void
  applyRackUpdate: (payload: RackUpdatePayload) => void
  applyTimerSync: (payload: TimerSyncPayload) => void
  applyGameOver: (payload: GameOverPayload) => void
  placeTile: (rackIndex: number, row: number, col: number) => void
  returnTile: (key: string) => void
  clearPending: () => void
  selectRackTile: (index: number | null) => void
  toggleRackFlip: (index: number) => void
  setOpponentDisconnected: (disconnected: boolean) => void
  reorderRack: (fromIndex: number, toIndex: number) => void
  toggleTileTracked: (value: string) => void
  resetGame: () => void
}

const makeEmptyBoard = (): (BoardCell | null)[][] =>
  Array.from({ length: 15 }, () => Array(15).fill(null))

const initialState = {
  status: 'idle' as const,
  gameId: null,
  mode: null,
  board: makeEmptyBoard(),
  rack: Array(8).fill(null) as (RackTile | null)[],
  confirmedRack: Array(8).fill(null) as (RackTile | null)[],
  pendingPlacements: {} as Record<string, PendingTile>,
  bag: 0,
  turnNumber: 0,
  currentTurnPlayerId: null,
  players: [],
  myPlayerId: null,
  tileTracker: {} as Record<string, number>,
  gameOverResult: null,
  selectedRackIndex: null,
  rackFlipped: {} as Record<number, boolean>,
  opponentDisconnected: false,
  opponentDisconnectedAt: null,
  recentMoves: [] as MoveLogEntry[],
}

export const gameStore = create<GameStore>((set, get) => ({
  ...initialState,

  applyGameState: (payload) => {
    const board: (BoardCell | null)[][] = payload.board.map(row =>
      row.map(cell =>
        cell
          ? {
              value: cell.value,
              owner: cell.owner,
              isBonus: cell.is_bonus,
              bonusType: cell.bonus_type,
            }
          : null
      )
    )
    const rack: (RackTile | null)[] = payload.rack.map(t =>
      t ? { value: t.value, points: t.points } : null
    )
    const players: PlayerState[] = payload.players.map(p => ({
      playerId: p.player_id,
      displayName: p.display_name,
      score: p.score,
      timeRemainingMs: p.time_remaining_ms,
      consecutivePasses: p.consecutive_passes,
      tilesRemaining: p.tiles_remaining,
    }))
    set({
      gameId: payload.game_id,
      mode: payload.mode,
      board,
      rack,
      confirmedRack: rack,
      pendingPlacements: {},
      bag: payload.bag,
      turnNumber: payload.turn_number,
      currentTurnPlayerId: payload.current_turn_player_id,
      players,
      myPlayerId: payload.my_player_id,
      selectedRackIndex: null,
    })
  },

  applyMoveResult: (payload) => {
    const board: (BoardCell | null)[][] = payload.board.map(row =>
      row.map(cell =>
        cell
          ? {
              value: cell.value,
              owner: cell.owner,
              isBonus: cell.is_bonus,
              bonusType: cell.bonus_type,
            }
          : null
      )
    )
    const players: PlayerState[] = payload.players.map(p => ({
      playerId: p.player_id,
      displayName: p.display_name,
      score: p.score,
      timeRemainingMs: p.time_remaining_ms,
      consecutivePasses: p.consecutive_passes,
      tilesRemaining: p.tiles_remaining,
    }))

    const state = get()
    const displayName = state.players.find(p => p.playerId === payload.player_id)?.displayName ?? payload.player_id
    const newEntry: MoveLogEntry = {
      seq: payload.seq ?? state.recentMoves.length,
      type: payload.type,
      player_id: payload.player_id,
      display_name: displayName,
      expression: payload.expression,
      result: payload.result,
      score_delta: payload.score_delta,
      turn_number: payload.turn_number,
    }

    // Auto-populate tileTracker in non-ranked mode
    let tileTracker = state.tileTracker
    if (state.mode !== 'ranked' && payload.placed_tiles) {
      tileTracker = { ...tileTracker }
      for (const tile of payload.placed_tiles) {
        tileTracker[tile.value] = (tileTracker[tile.value] ?? 0) + 1
      }
    }

    set({
      board,
      bag: payload.bag,
      turnNumber: payload.turn_number,
      currentTurnPlayerId: payload.current_turn_player_id,
      players,
      pendingPlacements: {},
      selectedRackIndex: null,
      tileTracker,
      recentMoves: [newEntry, ...state.recentMoves].slice(0, 50),
    })
  },

  applyRackUpdate: (payload) => {
    const rack: (RackTile | null)[] = payload.rack.map(t =>
      t ? { value: t.value, points: t.points } : null
    )
    set({ rack, confirmedRack: rack })
  },

  applyTimerSync: (payload) => {
    set(state => ({
      players: state.players.map(p => {
        const update = payload.players.find(u => u.player_id === p.playerId)
        return update ? { ...p, timeRemainingMs: update.time_remaining_ms } : p
      }),
    }))
  },

  applyGameOver: (payload) => {
    set({ gameOverResult: payload })
  },

  placeTile: (rackIndex, row, col) => {
    const state = get()
    const tile = state.rack[rackIndex]
    if (!tile) return
    const key = makePendingKey(row, col)
    const newRack = [...state.rack]
    newRack[rackIndex] = null
    const newRackFlipped = { ...state.rackFlipped }
    delete newRackFlipped[rackIndex]
    set({
      rack: newRack,
      pendingPlacements: { ...state.pendingPlacements, [key]: { value: tile.value, rackIndex } },
      selectedRackIndex: null,
      rackFlipped: newRackFlipped,
    })
  },

  returnTile: (key) => {
    const state = get()
    const pending = state.pendingPlacements[key]
    if (!pending) return
    const newRack = [...state.rack]
    const originalPoints = state.confirmedRack[pending.rackIndex]?.points ?? 0
    newRack[pending.rackIndex] = { value: pending.value, points: originalPoints }
    const newPending = { ...state.pendingPlacements }
    delete newPending[key]
    set({ rack: newRack, pendingPlacements: newPending })
  },

  clearPending: () => {
    const state = get()
    const newRack = [...state.rack]
    for (const pending of Object.values(state.pendingPlacements)) {
      const originalPoints = state.confirmedRack[pending.rackIndex]?.points ?? 0
      newRack[pending.rackIndex] = { value: pending.value, points: originalPoints }
    }
    set({ rack: newRack, pendingPlacements: {}, selectedRackIndex: null })
  },

  selectRackTile: (index) => {
    set(state => ({
      selectedRackIndex: state.selectedRackIndex === index ? null : index,
    }))
  },

  toggleRackFlip: (index) => {
    set(state => ({
      rackFlipped: { ...state.rackFlipped, [index]: !state.rackFlipped[index] },
    }))
  },

  setOpponentDisconnected: (disconnected) => {
    set({
      opponentDisconnected: disconnected,
      opponentDisconnectedAt: disconnected ? Date.now() : null,
    })
  },

  reorderRack: (fromIndex, toIndex) => {
    const state = get()
    const newRack = [...state.rack]
    if (fromIndex < 0 || fromIndex >= newRack.length || toIndex < 0 || toIndex >= newRack.length) return
    const moved = newRack[fromIndex]
    newRack[fromIndex] = newRack[toIndex] ?? null
    newRack[toIndex] = moved ?? null
    set({ rack: newRack })
  },

  toggleTileTracked: (value) => {
    set(state => {
      const current = state.tileTracker[value] ?? 0
      return {
        tileTracker: { ...state.tileTracker, [value]: current > 0 ? 0 : 1 },
      }
    })
  },

  resetGame: () => set({ ...initialState, board: makeEmptyBoard() }),
}))

// Named selector hook for ergonomic subscriptions
export function useGameStore<T>(selector: (s: GameStore) => T): T {
  return gameStore(selector)
}
