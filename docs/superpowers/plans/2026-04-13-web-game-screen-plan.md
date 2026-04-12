# Web Frontend — Game Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete game screen: Zustand store, useGameSocket hook, Board, Rack, all game sub-components, and the GamePage that wires them together.

**Architecture:** Zustand store owns all live game state. Socket events pipe into store via `useGameSocket`. Every component subscribes only to its slice of the store — no prop-drilling of store values. `emit` from `useGameSocket` is passed down to `ActionButtons` as a prop.

**Tech Stack:** Zustand 4, socket.io-client 4, React 18, CSS Modules, Vitest + React Testing Library

**Prerequisite:** Plan 5 (web foundation) must be complete — this plan builds on `src/store/`, `src/hooks/`, `src/game/`, and `src/pages/GamePage.tsx`.

---

## File Map

| File | Purpose |
|------|---------|
| `packages/web/src/store/gameStore.ts` | Zustand store — full game state + all actions |
| `packages/web/src/hooks/useGameSocket.ts` | Socket.IO lifecycle; pipes events into gameStore |
| `packages/web/src/game/Board.tsx` | 15×15 grid — reads board + pendingPlacements |
| `packages/web/src/game/Board.module.css` | Board layout and cell sizing |
| `packages/web/src/game/Cell.tsx` | Single board cell — click to place or return |
| `packages/web/src/game/Cell.module.css` | Cell styles — bonus colors, occupied, pending |
| `packages/web/src/game/Rack.tsx` | 8-slot rack — click-to-select, drag-to-place |
| `packages/web/src/game/Rack.module.css` | Rack layout |
| `packages/web/src/game/RackTile.tsx` | Single rack tile — select, drag, flip |
| `packages/web/src/game/RackTile.module.css` | Rack tile styles — selected, flipped |
| `packages/web/src/game/InfoPanel.tsx` | Player cards, timer, recent moves, actions |
| `packages/web/src/game/InfoPanel.module.css` | Info panel layout |
| `packages/web/src/game/ActionButtons.tsx` | Play / Pass / Clear / Exchange / Resign |
| `packages/web/src/game/ActionButtons.module.css` | Action button layout |
| `packages/web/src/game/TileTracker.tsx` | Tile count sidebar — click to mark seen |
| `packages/web/src/game/TileTracker.module.css` | Tile tracker sidebar styles |
| `packages/web/src/game/RecentMoves.tsx` | Scrolling move log |
| `packages/web/src/game/RecentMoves.module.css` | Move log styles |
| `packages/web/src/game/DisconnectBanner.tsx` | Opponent disconnected banner |
| `packages/web/src/game/DisconnectBanner.module.css` | Banner styles |
| `packages/web/src/game/GameOverModal.tsx` | End-of-game modal |
| `packages/web/src/game/GameOverModal.module.css` | Game over modal styles |
| `packages/web/src/game/ExchangeModal.tsx` | Tile exchange modal |
| `packages/web/src/game/ExchangeModal.module.css` | Exchange modal styles |
| `packages/web/src/game/ResignModal.tsx` | Resign confirmation modal |
| `packages/web/src/game/ResignModal.module.css` | Resign modal styles |
| `packages/web/src/components/Timer/Timer.tsx` | Countdown display with warn/crit states |
| `packages/web/src/components/Timer/Timer.module.css` | Timer color states + pulse animation |
| `packages/web/src/components/Modal/Modal.tsx` | Base modal wrapper (backdrop + panel) |
| `packages/web/src/components/Modal/Modal.module.css` | Modal overlay styles |
| `packages/web/src/pages/GamePage.tsx` | Mounts useGameSocket; renders game layout |
| `packages/web/src/pages/GamePage.module.css` | Three-column game layout |
| `packages/web/src/tests/store/gameStore.test.ts` | Store action unit tests |
| `packages/web/src/tests/game/Board.test.tsx` | Board click-to-place and return tile tests |
| `packages/web/src/tests/game/Rack.test.tsx` | Rack tile select/deselect tests |
| `packages/web/src/tests/game/ActionButtons.test.tsx` | Play/Pass/Clear emit tests |

---

### Task 1: Zustand game store

**Files:**
- Create: `packages/web/src/store/gameStore.ts`
- Test: `packages/web/src/tests/store/gameStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/store/gameStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, gameStore } from '../../store/gameStore'
import type { GameStatePayload, MoveResultPayload, TimerSyncPayload, GameOverPayload } from '../../types/game'

// Helper to reset store between tests
beforeEach(() => {
  gameStore.getState().resetGame()
})

const basePlayer = {
  player_id: 'p1',
  display_name: 'Alice',
  score: 0,
  time_remaining_ms: 600_000,
  consecutive_passes: 0,
  tiles_remaining: 8,
}

const baseState: GameStatePayload = {
  seq: 1,
  game_id: 'g1',
  mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [{ value: '3', points: 2 }, null, null, null, null, null, null, null],
  bag: 90,
  turn_number: 1,
  current_turn_player_id: 'p1',
  players: [
    basePlayer,
    { player_id: 'p2', display_name: 'Bob', score: 0, time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8 },
  ],
  my_player_id: 'p1',
}

describe('applyGameState', () => {
  it('sets gameId, mode, board, rack, bag, players, myPlayerId', () => {
    gameStore.getState().applyGameState(baseState)
    const s = gameStore.getState()
    expect(s.gameId).toBe('g1')
    expect(s.mode).toBe('quickplay')
    expect(s.bag).toBe(90)
    expect(s.myPlayerId).toBe('p1')
    expect(s.players).toHaveLength(2)
    expect(s.rack[0]).toEqual({ value: '3', points: 2 })
  })
})

describe('placeTile / returnTile', () => {
  it('moves tile from rack to pendingPlacements', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)
    const s = gameStore.getState()
    expect(s.rack[0]).toBeNull()
    expect(s.pendingPlacements['7,7']).toEqual({ value: '3', rackIndex: 0 })
  })

  it('returns tile from board back to rack', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)
    gameStore.getState().returnTile('7,7')
    const s = gameStore.getState()
    expect(s.rack[0]).toEqual({ value: '3', points: 2 })
    expect(s.pendingPlacements['7,7']).toBeUndefined()
  })

  it('does nothing when rack slot is null', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(1, 7, 7)  // rack[1] is null
    expect(gameStore.getState().pendingPlacements['7,7']).toBeUndefined()
  })
})

describe('clearPending', () => {
  it('returns all pending tiles to rack', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)
    gameStore.getState().clearPending()
    const s = gameStore.getState()
    expect(Object.keys(s.pendingPlacements)).toHaveLength(0)
    expect(s.rack[0]).toEqual({ value: '3', points: 2 })
  })
})

describe('applyTimerSync', () => {
  it('updates player time remaining', () => {
    gameStore.getState().applyGameState(baseState)
    const sync: TimerSyncPayload = {
      players: [{ player_id: 'p1', time_remaining_ms: 300_000 }],
      timestamp: Date.now(),
    }
    gameStore.getState().applyTimerSync(sync)
    const p1 = gameStore.getState().players.find(p => p.playerId === 'p1')
    expect(p1?.timeRemainingMs).toBe(300_000)
  })
})

describe('applyGameOver', () => {
  it('sets gameOverResult', () => {
    gameStore.getState().applyGameState(baseState)
    const payload: GameOverPayload = {
      reason: 'score',
      winner_id: 'p1',
      final_scores: [{ player_id: 'p1', score: 120 }, { player_id: 'p2', score: 80 }],
    }
    gameStore.getState().applyGameOver(payload)
    expect(gameStore.getState().gameOverResult).toEqual(payload)
  })
})

describe('selectRackTile', () => {
  it('sets selectedRackIndex', () => {
    gameStore.getState().selectRackTile(3)
    expect(gameStore.getState().selectedRackIndex).toBe(3)
  })
  it('deselects when same index clicked again', () => {
    gameStore.getState().selectRackTile(3)
    gameStore.getState().selectRackTile(3)
    expect(gameStore.getState().selectedRackIndex).toBeNull()
  })
})

describe('toggleRackFlip', () => {
  it('toggles rackFlipped for a given index', () => {
    expect(gameStore.getState().rackFlipped[2]).toBeFalsy()
    gameStore.getState().toggleRackFlip(2)
    expect(gameStore.getState().rackFlipped[2]).toBe(true)
    gameStore.getState().toggleRackFlip(2)
    expect(gameStore.getState().rackFlipped[2]).toBe(false)
  })
})

describe('resetGame', () => {
  it('clears all state back to initial values', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)
    gameStore.getState().resetGame()
    const s = gameStore.getState()
    expect(s.gameId).toBeNull()
    expect(s.pendingPlacements).toEqual({})
    expect(s.gameOverResult).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/store/gameStore.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/store/gameStore.ts`**

```ts
import { create } from 'zustand'
import { makePendingKey, parsePendingKey } from '../utils/board'
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

const EMPTY_BOARD: (BoardCell | null)[][] = Array.from({ length: 15 }, () => Array(15).fill(null))

const initialState = {
  status: 'idle' as const,
  gameId: null,
  mode: null,
  board: EMPTY_BOARD,
  rack: Array(8).fill(null) as (RackTile | null)[],
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
    set({ rack })
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
    newRack[pending.rackIndex] = { value: pending.value, points: 0 }
    const newPending = { ...state.pendingPlacements }
    delete newPending[key]
    set({ rack: newRack, pendingPlacements: newPending })
  },

  clearPending: () => {
    const state = get()
    const newRack = [...state.rack]
    for (const pending of Object.values(state.pendingPlacements)) {
      newRack[pending.rackIndex] = { value: pending.value, points: 0 }
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

  resetGame: () => set({ ...initialState }),
}))

// Named selector hook for ergonomic subscriptions
export function useGameStore<T>(selector: (s: GameStore) => T): T {
  return gameStore(selector)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/store/gameStore.test.ts
```

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/store/gameStore.ts packages/web/src/tests/store/gameStore.test.ts
git commit -m "feat(web): Zustand game store with all actions and tests"
```

---

### Task 2: useGameSocket hook

**Files:**
- Create: `packages/web/src/hooks/useGameSocket.ts`

No unit test — socket lifecycle is integration-only. Verified implicitly by GamePage rendering in browser.

- [ ] **Step 1: Create `packages/web/src/hooks/useGameSocket.ts`**

```ts
import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { gameStore } from '../store/gameStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? ''

export function useGameSocket(
  gameId: string,
  token: string,
): (event: string, data?: unknown) => void {
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  useEffect(() => {
    const socket = io(WS_URL, {
      path: '/ws',
      query: { token, game_id: gameId },
      transports: ['websocket'],
    })
    socketRef.current = socket

    gameStore.setState({ status: 'connecting' })

    let lastSeq = -1

    socket.on('connect', () => gameStore.setState({ status: 'connected' }))
    socket.on('disconnect', () => gameStore.setState({ status: 'disconnected' }))

    socket.on('game:state', (payload) => {
      lastSeq = payload.seq ?? lastSeq
      gameStore.getState().applyGameState(payload)
    })

    socket.on('move:result', (payload) => {
      if (payload.seq != null && payload.seq !== lastSeq + 1) {
        socket.emit('state:request')
      }
      lastSeq = payload.seq ?? lastSeq
      gameStore.getState().applyMoveResult(payload)
    })

    socket.on('rack:update', (payload) => gameStore.getState().applyRackUpdate(payload))
    socket.on('timer:sync', (payload) => gameStore.getState().applyTimerSync(payload))
    socket.on('game:over', (payload) => gameStore.getState().applyGameOver(payload))

    socket.on('player:disconnect', ({ player_id }: { player_id: string }) => {
      if (player_id !== gameStore.getState().myPlayerId) {
        gameStore.getState().setOpponentDisconnected(true)
      }
    })

    socket.on('player:reconnect', ({ player_id }: { player_id: string }) => {
      if (player_id !== gameStore.getState().myPlayerId) {
        gameStore.getState().setOpponentDisconnected(false)
      }
    })

    socket.on('server:ping', () => socket.emit('server:pong'))

    return () => {
      socket.disconnect()
      socketRef.current = null
      gameStore.getState().resetGame()
    }
  }, [gameId, token])

  return useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/hooks/useGameSocket.ts
git commit -m "feat(web): useGameSocket hook — socket lifecycle and event piping"
```

---

### Task 3: Modal primitive + Timer component

**Files:**
- Create: `packages/web/src/components/Modal/Modal.tsx`
- Create: `packages/web/src/components/Modal/Modal.module.css`
- Create: `packages/web/src/components/Timer/Timer.tsx`
- Create: `packages/web/src/components/Timer/Timer.module.css`

- [ ] **Step 1: Create `packages/web/src/components/Modal/Modal.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.panel {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
  min-width: 320px;
  max-width: 480px;
  width: 100%;
}

.title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.body {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
```

- [ ] **Step 2: Create `packages/web/src/components/Modal/Modal.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  body?: ReactNode
  actions?: ReactNode
  onBackdropClick?: () => void
}

export function Modal({ title, body, actions, onBackdropClick }: ModalProps) {
  return (
    <div className={styles.overlay} onClick={onBackdropClick}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        {body && <div className={styles.body}>{body}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `packages/web/src/components/Timer/Timer.module.css`**

```css
.timer {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text);
  transition: color 0.3s;
}

.warn {
  color: var(--gold);
}

.crit {
  color: var(--red);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 4: Create `packages/web/src/components/Timer/Timer.tsx`**

```tsx
import { formatTime } from '../../utils/format'
import styles from './Timer.module.css'

interface TimerProps {
  ms: number
  active: boolean
}

export function Timer({ ms, active }: TimerProps) {
  const minutes = Math.floor(ms / 60_000)
  const className = [
    styles.timer,
    active && ms < 60_000 ? styles.crit : '',
    active && ms < 300_000 && ms >= 60_000 ? styles.warn : '',
  ].filter(Boolean).join(' ')

  return <span className={className}>{formatTime(ms)}</span>
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/Modal/ packages/web/src/components/Timer/
git commit -m "feat(web): Modal and Timer shared components"
```

---

### Task 4: Board + Cell

**Files:**
- Create: `packages/web/src/game/Board.tsx`
- Create: `packages/web/src/game/Board.module.css`
- Create: `packages/web/src/game/Cell.tsx`
- Create: `packages/web/src/game/Cell.module.css`
- Test: `packages/web/src/tests/game/Board.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/game/Board.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Board } from '../../game/Board'
import { gameStore } from '../../store/gameStore'
import type { GameStatePayload } from '../../types/game'

const baseState: GameStatePayload = {
  seq: 1,
  game_id: 'g1',
  mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [{ value: '3', points: 2 }, null, null, null, null, null, null, null],
  bag: 90,
  turn_number: 1,
  current_turn_player_id: 'p1',
  players: [{
    player_id: 'p1', display_name: 'Alice', score: 0,
    time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8,
  }],
  my_player_id: 'p1',
}

beforeEach(() => {
  gameStore.getState().resetGame()
  gameStore.getState().applyGameState(baseState)
})

describe('Board', () => {
  it('renders 225 cells', () => {
    render(<Board />)
    // Each cell has a data-testid of "cell-r-c"
    expect(screen.getAllByTestId(/^cell-\d+-\d+$/)).toHaveLength(225)
  })

  it('places tile on cell click when rack tile is selected', () => {
    gameStore.getState().selectRackTile(0)
    render(<Board />)
    fireEvent.click(screen.getByTestId('cell-7-7'))
    expect(gameStore.getState().pendingPlacements['7,7']).toEqual({ value: '3', rackIndex: 0 })
  })

  it('returns pending tile when clicking it again', () => {
    gameStore.getState().selectRackTile(0)
    render(<Board />)
    fireEvent.click(screen.getByTestId('cell-7-7'))
    fireEvent.click(screen.getByTestId('cell-7-7'))
    expect(gameStore.getState().pendingPlacements['7,7']).toBeUndefined()
    expect(gameStore.getState().rack[0]).toEqual({ value: '3', points: 2 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/game/Board.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/game/Cell.module.css`**

```css
.cell {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  user-select: none;
  background: var(--tile-bg);
  transition: background 0.1s;
}

.cell:hover {
  background: #252530;
}

/* Center star */
.center::after {
  content: '★';
  font-size: 10px;
  color: var(--text-muted);
}

/* Bonus squares */
.bonus3eq { background: var(--bonus-3eq); color: #c4a0ff; }
.bonus2eq { background: var(--bonus-2eq); color: #90c4ff; }
.bonus3pc { background: var(--bonus-3pc); color: #ffaaaa; }
.bonus2pc { background: var(--bonus-2pc); color: #90e090; }

/* Occupied by placed tile */
.occupied {
  background: var(--tile-bg);
  color: var(--tile-text);
}

.occupiedMine {
  border-color: var(--green);
  background: var(--green-dim);
}

.occupiedOpponent {
  border-color: var(--text-muted);
}

/* Pending tile (not yet submitted) */
.pending {
  background: var(--gold-dim);
  border-color: var(--gold);
  color: var(--gold);
}

/* Flash red animation for invalid move */
.invalid {
  animation: flashRed 0.4s ease-out;
}

@keyframes flashRed {
  0% { background: var(--red-dim); border-color: var(--red); }
  100% { background: var(--tile-bg); border-color: var(--border); }
}
```

- [ ] **Step 4: Create `packages/web/src/game/Cell.tsx`**

```tsx
import { useGameStore, gameStore } from '../store/gameStore'
import { makePendingKey } from '../utils/board'
import styles from './Cell.module.css'

// Bonus square coordinates — matches server layout
// b3eq = triple equation score, b2eq = double, b3pc = triple piece score, b2pc = double
const BONUS_MAP: Record<string, 'b3eq' | 'b2eq' | 'b3pc' | 'b2pc'> = {
  '0,0': 'b3eq', '0,7': 'b3eq', '0,14': 'b3eq',
  '7,0': 'b3eq', '7,14': 'b3eq',
  '14,0': 'b3eq', '14,7': 'b3eq', '14,14': 'b3eq',
  '0,3': 'b2eq', '0,11': 'b2eq', '3,0': 'b2eq', '3,14': 'b2eq',
  '11,0': 'b2eq', '11,14': 'b2eq', '14,3': 'b2eq', '14,11': 'b2eq',
  '3,3': 'b2eq', '3,11': 'b2eq', '11,3': 'b2eq', '11,11': 'b2eq',
  '1,5': 'b3pc', '1,9': 'b3pc', '5,1': 'b3pc', '5,13': 'b3pc',
  '9,1': 'b3pc', '9,13': 'b3pc', '13,5': 'b3pc', '13,9': 'b3pc',
  '2,6': 'b2pc', '2,8': 'b2pc', '6,2': 'b2pc', '6,12': 'b2pc',
  '8,2': 'b2pc', '8,12': 'b2pc', '12,6': 'b2pc', '12,8': 'b2pc',
  '5,5': 'b2pc', '5,9': 'b2pc', '9,5': 'b2pc', '9,9': 'b2pc',
}

interface CellProps {
  row: number
  col: number
}

export function Cell({ row, col }: CellProps) {
  const key = makePendingKey(row, col)
  const cell = useGameStore(s => s.board[row]?.[col] ?? null)
  const pending = useGameStore(s => s.pendingPlacements[key])
  const selectedRackIndex = useGameStore(s => s.selectedRackIndex)
  const myPlayerId = useGameStore(s => s.myPlayerId)

  const isCenter = row === 7 && col === 7
  const bonusType = BONUS_MAP[key] ?? null

  function handleClick() {
    const state = gameStore.getState()

    if (pending) {
      // Click on pending tile → return to rack
      state.returnTile(key)
      return
    }

    if (cell) {
      // Occupied by a locked tile — no action
      return
    }

    if (state.selectedRackIndex !== null) {
      state.placeTile(state.selectedRackIndex, row, col)
    }
  }

  const classNames = [
    styles.cell,
    isCenter && !cell && !pending ? styles.center : '',
    !cell && !pending && bonusType === 'b3eq' ? styles.bonus3eq : '',
    !cell && !pending && bonusType === 'b2eq' ? styles.bonus2eq : '',
    !cell && !pending && bonusType === 'b3pc' ? styles.bonus3pc : '',
    !cell && !pending && bonusType === 'b2pc' ? styles.bonus2pc : '',
    cell && !pending ? styles.occupied : '',
    cell && cell.owner === myPlayerId ? styles.occupiedMine : '',
    cell && cell.owner !== myPlayerId && cell.owner !== null ? styles.occupiedOpponent : '',
    pending ? styles.pending : '',
  ].filter(Boolean).join(' ')

  const displayValue = pending?.value ?? cell?.value ?? ''

  return (
    <div
      className={classNames}
      data-testid={`cell-${row}-${col}`}
      onClick={handleClick}
    >
      {displayValue}
    </div>
  )
}
```

- [ ] **Step 5: Create `packages/web/src/game/Board.module.css`**

```css
.board {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  width: 100%;
  max-width: 540px;
  aspect-ratio: 1;
}
```

- [ ] **Step 6: Create `packages/web/src/game/Board.tsx`**

```tsx
import { Cell } from './Cell'
import styles from './Board.module.css'

export function Board() {
  return (
    <div className={styles.board}>
      {Array.from({ length: 15 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) => (
          <Cell key={`${row}-${col}`} row={row} col={col} />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/game/Board.test.tsx
```

Expected: PASS (all 3 tests).

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/game/Board.tsx packages/web/src/game/Board.module.css packages/web/src/game/Cell.tsx packages/web/src/game/Cell.module.css packages/web/src/tests/game/Board.test.tsx
git commit -m "feat(web): Board and Cell components with click-to-place and return"
```

---

### Task 5: Rack + RackTile

**Files:**
- Create: `packages/web/src/game/Rack.tsx`
- Create: `packages/web/src/game/Rack.module.css`
- Create: `packages/web/src/game/RackTile.tsx`
- Create: `packages/web/src/game/RackTile.module.css`
- Test: `packages/web/src/tests/game/Rack.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/game/Rack.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Rack } from '../../game/Rack'
import { gameStore } from '../../store/gameStore'
import type { GameStatePayload } from '../../types/game'

const baseState: GameStatePayload = {
  seq: 1, game_id: 'g1', mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [
    { value: '3', points: 2 },
    { value: '+', points: 1 },
    null, null, null, null, null, null,
  ],
  bag: 90, turn_number: 1, current_turn_player_id: 'p1',
  players: [{ player_id: 'p1', display_name: 'Alice', score: 0, time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8 }],
  my_player_id: 'p1',
}

beforeEach(() => {
  gameStore.getState().resetGame()
  gameStore.getState().applyGameState(baseState)
})

describe('Rack', () => {
  it('renders 8 rack slots', () => {
    render(<Rack />)
    expect(screen.getAllByTestId(/^rack-slot-\d+$/)).toHaveLength(8)
  })

  it('selects tile on click', () => {
    render(<Rack />)
    fireEvent.click(screen.getByTestId('rack-slot-0'))
    expect(gameStore.getState().selectedRackIndex).toBe(0)
  })

  it('deselects tile when clicked again', () => {
    render(<Rack />)
    fireEvent.click(screen.getByTestId('rack-slot-0'))
    fireEvent.click(screen.getByTestId('rack-slot-0'))
    expect(gameStore.getState().selectedRackIndex).toBeNull()
  })

  it('flips tile on double click', () => {
    render(<Rack />)
    fireEvent.dblClick(screen.getByTestId('rack-slot-0'))
    expect(gameStore.getState().rackFlipped[0]).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/game/Rack.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/game/RackTile.module.css`**

```css
.tile {
  width: 100%;
  aspect-ratio: 1;
  background: var(--tile-bg);
  border: 2px solid var(--tile-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--tile-text);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.1s, background 0.1s;
  position: relative;
}

.tile:hover {
  border-color: var(--text-muted);
}

.selected {
  border-color: var(--green);
  background: var(--green-dim);
  color: var(--green);
}

.flipped {
  background: #1a1a22;
  color: transparent;
  border-color: var(--text-muted);
}

.flipped::after {
  content: '?';
  position: absolute;
  color: var(--text-muted);
}

.points {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 8px;
  color: var(--text-muted);
  font-weight: 400;
}

.empty {
  background: transparent;
  border: 2px dashed var(--border);
  cursor: default;
}
```

- [ ] **Step 4: Create `packages/web/src/game/RackTile.tsx`**

```tsx
import { useGameStore, gameStore } from '../store/gameStore'
import styles from './RackTile.module.css'

interface RackTileProps {
  index: number
}

export function RackTile({ index }: RackTileProps) {
  const tile = useGameStore(s => s.rack[index])
  const isSelected = useGameStore(s => s.selectedRackIndex === index)
  const isFlipped = useGameStore(s => !!s.rackFlipped[index])

  if (!tile) {
    return <div className={`${styles.tile} ${styles.empty}`} data-testid={`rack-slot-${index}`} />
  }

  function handleClick() {
    gameStore.getState().selectRackTile(index)
  }

  function handleDoubleClick() {
    gameStore.getState().toggleRackFlip(index)
  }

  const classNames = [
    styles.tile,
    isSelected ? styles.selected : '',
    isFlipped ? styles.flipped : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      data-testid={`rack-slot-${index}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {!isFlipped && tile.value}
      {!isFlipped && <span className={styles.points}>{tile.points}</span>}
    </div>
  )
}
```

- [ ] **Step 5: Create `packages/web/src/game/Rack.module.css`**

```css
.rack {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  width: 100%;
  max-width: 540px;
  padding: 8px 0;
}
```

- [ ] **Step 6: Create `packages/web/src/game/Rack.tsx`**

```tsx
import { RackTile } from './RackTile'
import styles from './Rack.module.css'

export function Rack() {
  return (
    <div className={styles.rack}>
      {Array.from({ length: 8 }, (_, i) => (
        <RackTile key={i} index={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/game/Rack.test.tsx
```

Expected: PASS (all 4 tests).

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/game/Rack.tsx packages/web/src/game/Rack.module.css packages/web/src/game/RackTile.tsx packages/web/src/game/RackTile.module.css packages/web/src/tests/game/Rack.test.tsx
git commit -m "feat(web): Rack and RackTile components with select and flip"
```

---

### Task 6: ActionButtons

**Files:**
- Create: `packages/web/src/game/ActionButtons.tsx`
- Create: `packages/web/src/game/ActionButtons.module.css`
- Test: `packages/web/src/tests/game/ActionButtons.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/game/ActionButtons.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionButtons } from '../../game/ActionButtons'
import { gameStore } from '../../store/gameStore'
import type { GameStatePayload } from '../../types/game'

const baseState: GameStatePayload = {
  seq: 1, game_id: 'g1', mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [{ value: '3', points: 2 }, null, null, null, null, null, null, null],
  bag: 90, turn_number: 1, current_turn_player_id: 'p1',
  players: [{ player_id: 'p1', display_name: 'Alice', score: 0, time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8 }],
  my_player_id: 'p1',
}

beforeEach(() => {
  gameStore.getState().resetGame()
  gameStore.getState().applyGameState(baseState)
})

describe('ActionButtons', () => {
  it('emits move:pass when Pass is clicked', () => {
    const emit = vi.fn()
    render(<ActionButtons emit={emit} />)
    fireEvent.click(screen.getByRole('button', { name: /pass/i }))
    expect(emit).toHaveBeenCalledWith('move:pass')
  })

  it('calls clearPending when Clear is clicked', () => {
    // Place a tile first
    gameStore.getState().placeTile(0, 7, 7)
    expect(Object.keys(gameStore.getState().pendingPlacements)).toHaveLength(1)

    const emit = vi.fn()
    render(<ActionButtons emit={emit} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(Object.keys(gameStore.getState().pendingPlacements)).toHaveLength(0)
    expect(emit).not.toHaveBeenCalled()
  })

  it('emits move:place with pending tiles when Play is clicked', () => {
    gameStore.getState().placeTile(0, 7, 7)
    const emit = vi.fn()
    render(<ActionButtons emit={emit} />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(emit).toHaveBeenCalledWith('move:place', {
      tiles: [{ value: '3', row: 7, col: 7 }],
    })
  })

  it('does not emit move:place when no tiles pending', () => {
    const emit = vi.fn()
    render(<ActionButtons emit={emit} />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(emit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/game/ActionButtons.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/game/ActionButtons.module.css`**

```css
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playBtn {
  width: 100%;
  padding: 14px;
  background: var(--green);
  color: #0d0d0f;
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 700;
  border-radius: var(--radius);
  transition: opacity 0.15s;
}

.playBtn:hover:not(:disabled) {
  opacity: 0.85;
}

.playBtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.secondaryRow {
  display: flex;
  gap: 8px;
}

.secondaryBtn {
  flex: 1;
  padding: 9px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius);
  transition: background 0.15s;
}

.secondaryBtn:hover:not(:disabled) {
  background: var(--tile-bg);
}

.resignBtn {
  composes: secondaryBtn;
  color: var(--text-muted);
}

.resignBtn:hover:not(:disabled) {
  color: var(--red);
  border-color: var(--red);
}
```

- [ ] **Step 4: Create `packages/web/src/game/ActionButtons.tsx`**

```tsx
import { useState } from 'react'
import { useGameStore, gameStore } from '../store/gameStore'
import { parsePendingKey } from '../utils/board'
import { ExchangeModal } from './ExchangeModal'
import { ResignModal } from './ResignModal'
import styles from './ActionButtons.module.css'

interface ActionButtonsProps {
  emit: (event: string, data?: unknown) => void
}

export function ActionButtons({ emit }: ActionButtonsProps) {
  const pendingPlacements = useGameStore(s => s.pendingPlacements)
  const [showExchange, setShowExchange] = useState(false)
  const [showResign, setShowResign] = useState(false)

  const hasPending = Object.keys(pendingPlacements).length > 0

  function handlePlay() {
    if (!hasPending) return
    const tiles = Object.entries(pendingPlacements).map(([key, pending]) => {
      const [row, col] = parsePendingKey(key)
      return { value: pending.value, row, col }
    })
    emit('move:place', { tiles })
  }

  function handlePass() {
    emit('move:pass')
  }

  function handleClear() {
    gameStore.getState().clearPending()
  }

  return (
    <>
      <div className={styles.actions}>
        <button
          className={styles.playBtn}
          onClick={handlePlay}
          disabled={!hasPending}
        >
          Play
        </button>
        <div className={styles.secondaryRow}>
          <button className={styles.secondaryBtn} onClick={handlePass}>Pass</button>
          <button className={styles.secondaryBtn} onClick={handleClear}>Clear</button>
          <button className={styles.secondaryBtn} onClick={() => setShowExchange(true)}>Exchange</button>
        </div>
        <button className={styles.resignBtn} onClick={() => setShowResign(true)}>Resign</button>
      </div>

      {showExchange && (
        <ExchangeModal
          emit={emit}
          onClose={() => setShowExchange(false)}
        />
      )}
      {showResign && (
        <ResignModal
          emit={emit}
          onClose={() => setShowResign(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/game/ActionButtons.test.tsx
```

Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/game/ActionButtons.tsx packages/web/src/game/ActionButtons.module.css packages/web/src/tests/game/ActionButtons.test.tsx
git commit -m "feat(web): ActionButtons — Play, Pass, Clear, Exchange, Resign"
```

---

### Task 7: ExchangeModal + ResignModal

**Files:**
- Create: `packages/web/src/game/ExchangeModal.tsx`
- Create: `packages/web/src/game/ExchangeModal.module.css`
- Create: `packages/web/src/game/ResignModal.tsx`
- Create: `packages/web/src/game/ResignModal.module.css`

- [ ] **Step 1: Create `packages/web/src/game/ExchangeModal.module.css`**

```css
.tileRow {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tile {
  width: 44px;
  height: 44px;
  background: var(--tile-bg);
  border: 2px solid var(--tile-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}

.tileSelected {
  border-color: var(--gold);
  background: var(--gold-dim);
  color: var(--gold);
}

.warning {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 16px;
}
```

- [ ] **Step 2: Create `packages/web/src/game/ExchangeModal.tsx`**

```tsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'
import styles from './ExchangeModal.module.css'

interface ExchangeModalProps {
  emit: (event: string, data?: unknown) => void
  onClose: () => void
}

export function ExchangeModal({ emit, onClose }: ExchangeModalProps) {
  const rack = useGameStore(s => s.rack)
  const bag = useGameStore(s => s.bag)
  const [selected, setSelected] = useState<number[]>([])

  const canExchange = bag >= 5

  function toggleTile(index: number) {
    setSelected(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  function handleConfirm() {
    if (selected.length === 0) return
    emit('move:exchange', { indices: selected })
    onClose()
  }

  return (
    <Modal
      title="Exchange Tiles"
      body={
        <>
          {!canExchange && (
            <p className={styles.warning}>Exchange requires at least 5 tiles in the bag ({bag} remaining).</p>
          )}
          <div className={styles.tileRow}>
            {rack.map((tile, i) =>
              tile ? (
                <div
                  key={i}
                  className={`${styles.tile} ${selected.includes(i) ? styles.tileSelected : ''}`}
                  onClick={() => canExchange && toggleTile(i)}
                >
                  {tile.value}
                </div>
              ) : null
            )}
          </div>
        </>
      }
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canExchange || selected.length === 0}
          >
            Exchange {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </>
      }
    />
  )
}
```

- [ ] **Step 3: Create `packages/web/src/game/ResignModal.module.css`**

```css
/* no additional styles beyond Modal base */
```

- [ ] **Step 4: Create `packages/web/src/game/ResignModal.tsx`**

```tsx
import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'
import styles from './ResignModal.module.css'

interface ResignModalProps {
  emit: (event: string, data?: unknown) => void
  onClose: () => void
}

export function ResignModal({ emit, onClose }: ResignModalProps) {
  function handleConfirm() {
    emit('game:resign')
    onClose()
  }

  return (
    <Modal
      title="Resign game?"
      body="This will end the game immediately and count as a loss."
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm}>Resign</Button>
        </>
      }
    />
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/game/ExchangeModal.tsx packages/web/src/game/ExchangeModal.module.css packages/web/src/game/ResignModal.tsx packages/web/src/game/ResignModal.module.css
git commit -m "feat(web): ExchangeModal and ResignModal"
```

---

### Task 8: GameOverModal + DisconnectBanner

**Files:**
- Create: `packages/web/src/game/GameOverModal.tsx`
- Create: `packages/web/src/game/GameOverModal.module.css`
- Create: `packages/web/src/game/DisconnectBanner.tsx`
- Create: `packages/web/src/game/DisconnectBanner.module.css`

- [ ] **Step 1: Create `packages/web/src/game/GameOverModal.module.css`**

```css
.reason {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.result {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
}

.win { color: var(--green); }
.loss { color: var(--red); }
.draw { color: var(--gold); }

.scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.scoreRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--tile-bg);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

.scoreValue {
  font-weight: 700;
  font-size: 16px;
}
```

- [ ] **Step 2: Create `packages/web/src/game/GameOverModal.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'
import { formatScore } from '../utils/format'
import styles from './GameOverModal.module.css'

const REASON_LABELS: Record<string, string> = {
  score: 'Game over',
  timeout: 'Time ran out',
  forfeit: 'Opponent forfeited',
  resign: 'Resignation',
  stalemate: 'Stalemate',
}

export function GameOverModal() {
  const navigate = useNavigate()
  const result = useGameStore(s => s.gameOverResult)
  const myPlayerId = useGameStore(s => s.myPlayerId)
  const players = useGameStore(s => s.players)

  if (!result) return null

  const isWin = result.winner_id === myPlayerId
  const isDraw = result.winner_id === null
  const resultText = isDraw ? 'Draw' : isWin ? 'You win' : 'You lose'
  const resultClass = isDraw ? styles.draw : isWin ? styles.win : styles.loss

  return (
    <Modal
      title=""
      body={
        <>
          <p className={styles.reason}>{REASON_LABELS[result.reason] ?? result.reason}</p>
          <p className={`${styles.result} ${resultClass}`}>{resultText}</p>
          <div className={styles.scores}>
            {result.final_scores.map(({ player_id, score }) => {
              const player = players.find(p => p.playerId === player_id)
              return (
                <div key={player_id} className={styles.scoreRow}>
                  <span>{player?.displayName ?? player_id}</span>
                  <span className={styles.scoreValue}>{formatScore(score)}</span>
                </div>
              )
            })}
          </div>
        </>
      }
      actions={
        <Button variant="primary" onClick={() => navigate('/lobby')}>
          Back to lobby
        </Button>
      }
    />
  )
}
```

- [ ] **Step 3: Create `packages/web/src/game/DisconnectBanner.module.css`**

```css
.banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--gold-dim);
  border-bottom: 1px solid var(--gold);
  color: var(--gold);
  padding: 10px 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  z-index: 50;
}
```

- [ ] **Step 4: Create `packages/web/src/game/DisconnectBanner.tsx`**

```tsx
import { useGameStore } from '../store/gameStore'
import styles from './DisconnectBanner.module.css'

export function DisconnectBanner() {
  const disconnected = useGameStore(s => s.opponentDisconnected)
  const players = useGameStore(s => s.players)
  const myPlayerId = useGameStore(s => s.myPlayerId)

  if (!disconnected) return null

  const opponent = players.find(p => p.playerId !== myPlayerId)

  return (
    <div className={styles.banner}>
      {opponent?.displayName ?? 'Opponent'} disconnected — waiting for them to reconnect (30s)
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/game/GameOverModal.tsx packages/web/src/game/GameOverModal.module.css packages/web/src/game/DisconnectBanner.tsx packages/web/src/game/DisconnectBanner.module.css
git commit -m "feat(web): GameOverModal and DisconnectBanner"
```

---

### Task 9: TileTracker + RecentMoves + InfoPanel

**Files:**
- Create: `packages/web/src/game/TileTracker.tsx`
- Create: `packages/web/src/game/TileTracker.module.css`
- Create: `packages/web/src/game/RecentMoves.tsx`
- Create: `packages/web/src/game/RecentMoves.module.css`
- Create: `packages/web/src/game/InfoPanel.tsx`
- Create: `packages/web/src/game/InfoPanel.module.css`

- [ ] **Step 1: Create `packages/web/src/game/TileTracker.module.css`**

```css
.tracker {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  background: var(--panel-bg);
  border-right: 1px solid var(--border);
  width: 72px;
  overflow-y: auto;
  height: 100%;
}

.heading {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  font-family: var(--font-ui);
  font-weight: 600;
}

.entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}

.entry:hover {
  background: var(--tile-bg);
}

.entrySeen {
  opacity: 0.4;
}

.tileLabel {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--tile-text);
}

.count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}
```

- [ ] **Step 2: Create `packages/web/src/game/TileTracker.tsx`**

The tile distribution for A-Matter (math tiles). Values: digits 0–9, operators +, -, ×, ÷, =, and blank.

```tsx
import { useGameStore, gameStore } from '../store/gameStore'
import styles from './TileTracker.module.css'

// Total tile counts in the bag (game design values)
const TILE_DISTRIBUTION: Record<string, number> = {
  '0': 4, '1': 6, '2': 6, '3': 6, '4': 5, '5': 5,
  '6': 5, '7': 4, '8': 4, '9': 4,
  '+': 8, '-': 6, '×': 4, '÷': 4, '=': 8,
  '_': 2,  // blank
}

export function TileTracker() {
  const tileTracker = useGameStore(s => s.tileTracker)
  const mode = useGameStore(s => s.mode)

  return (
    <div className={styles.tracker}>
      <div className={styles.heading}>Tiles</div>
      {Object.entries(TILE_DISTRIBUTION).map(([value, total]) => {
        const seen = tileTracker[value] ?? 0
        const remaining = total - seen
        const isSeen = remaining <= 0

        return (
          <div
            key={value}
            className={`${styles.entry} ${isSeen ? styles.entrySeen : ''}`}
            onClick={() => mode === 'ranked' && gameStore.getState().toggleTileTracked(value)}
            title={mode === 'ranked' ? 'Click to mark as seen' : undefined}
          >
            <span className={styles.tileLabel}>{value}</span>
            <span className={styles.count}>{remaining}x</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `packages/web/src/game/RecentMoves.module.css`**

```css
.moves {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  padding: 4px 0;
}

.entry {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  background: var(--tile-bg);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.player {
  font-weight: 600;
  color: var(--text);
}

.scoreDelta {
  color: var(--green);
  font-family: var(--font-mono);
}

.expression {
  font-family: var(--font-mono);
  color: var(--gold);
  font-size: 11px;
}

.moveType {
  color: var(--text-muted);
  font-style: italic;
}
```

- [ ] **Step 4: Create `packages/web/src/game/RecentMoves.tsx`**

```tsx
import { useGameStore } from '../store/gameStore'
import styles from './RecentMoves.module.css'

export function RecentMoves() {
  const recentMoves = useGameStore(s => s.recentMoves)

  if (recentMoves.length === 0) return null

  return (
    <div className={styles.moves}>
      {recentMoves.map((move, i) => (
        <div key={i} className={styles.entry}>
          <div className={styles.header}>
            <span className={styles.player}>{move.display_name}</span>
            {move.score_delta > 0 && (
              <span className={styles.scoreDelta}>+{move.score_delta}</span>
            )}
          </div>
          {move.type === 'place' && move.expression ? (
            <span className={styles.expression}>
              {move.expression} = {move.result}
            </span>
          ) : (
            <span className={styles.moveType}>
              {move.type === 'pass' ? 'Passed' : 'Exchanged tiles'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `packages/web/src/game/InfoPanel.module.css`**

```css
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--panel-bg);
  border-left: 1px solid var(--border);
  width: 220px;
  height: 100%;
  overflow-y: auto;
}

.playerCard {
  padding: 12px;
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.playerCard.active {
  border-color: var(--green);
}

.playerName {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.you {
  font-size: 10px;
  color: var(--green);
  font-weight: 400;
}

.score {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.tilesLeft {
  font-size: 11px;
  color: var(--text-muted);
}

.bagCount {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.divider {
  border: none;
  border-top: 1px solid var(--border);
}

.sectionLabel {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  font-weight: 600;
}
```

- [ ] **Step 6: Create `packages/web/src/game/InfoPanel.tsx`**

```tsx
import { useGameStore } from '../store/gameStore'
import { Timer } from '../components/Timer/Timer'
import { RecentMoves } from './RecentMoves'
import { formatScore } from '../utils/format'
import styles from './InfoPanel.module.css'

interface InfoPanelProps {
  emit: (event: string, data?: unknown) => void
}

export function InfoPanel({ emit: _emit }: InfoPanelProps) {
  const players = useGameStore(s => s.players)
  const myPlayerId = useGameStore(s => s.myPlayerId)
  const currentTurnPlayerId = useGameStore(s => s.currentTurnPlayerId)
  const bag = useGameStore(s => s.bag)

  // Show my card first
  const sorted = [...players].sort((a, b) =>
    a.playerId === myPlayerId ? -1 : b.playerId === myPlayerId ? 1 : 0
  )

  return (
    <div className={styles.panel}>
      {sorted.map(player => {
        const isMe = player.playerId === myPlayerId
        const isActive = player.playerId === currentTurnPlayerId
        return (
          <div
            key={player.playerId}
            className={`${styles.playerCard} ${isActive ? styles.active : ''}`}
          >
            <div className={styles.playerName}>
              <span>{player.displayName}</span>
              {isMe && <span className={styles.you}>you</span>}
            </div>
            <div className={styles.score}>{formatScore(player.score)}</div>
            <div className={styles.tilesLeft}>{player.tilesRemaining} tiles</div>
            <Timer ms={player.timeRemainingMs} active={isActive} />
          </div>
        )
      })}

      <p className={styles.bagCount}>{bag} tiles in bag</p>

      <hr className={styles.divider} />

      <div>
        <p className={styles.sectionLabel}>Recent moves</p>
        <RecentMoves />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/game/TileTracker.tsx packages/web/src/game/TileTracker.module.css packages/web/src/game/RecentMoves.tsx packages/web/src/game/RecentMoves.module.css packages/web/src/game/InfoPanel.tsx packages/web/src/game/InfoPanel.module.css
git commit -m "feat(web): TileTracker, RecentMoves, InfoPanel"
```

---

### Task 10: GamePage — wire everything together

**Files:**
- Create: `packages/web/src/pages/GamePage.tsx`
- Create: `packages/web/src/pages/GamePage.module.css`
- Modify: `packages/web/src/App.tsx` — replace GamePage stub with real import

- [ ] **Step 1: Create `packages/web/src/pages/GamePage.module.css`**

```css
.page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 8px;
  overflow: hidden;
}

.boardWrap {
  width: 100%;
  max-width: 540px;
}

.rackWrap {
  width: 100%;
  max-width: 540px;
}

.connecting {
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}
```

- [ ] **Step 2: Create `packages/web/src/pages/GamePage.tsx`**

```tsx
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGameSocket } from '../hooks/useGameSocket'
import { useGameStore } from '../store/gameStore'
import { getToken } from '../utils/token'
import { Board } from '../game/Board'
import { Rack } from '../game/Rack'
import { TileTracker } from '../game/TileTracker'
import { InfoPanel } from '../game/InfoPanel'
import { ActionButtons } from '../game/ActionButtons'
import { DisconnectBanner } from '../game/DisconnectBanner'
import { GameOverModal } from '../game/GameOverModal'
import styles from './GamePage.module.css'

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const token = getToken() ?? ''
  const status = useGameStore(s => s.status)
  const gameOverResult = useGameStore(s => s.gameOverResult)

  const emit = useGameSocket(gameId ?? '', token)

  if (!gameId) return <div className={styles.connecting}>Invalid game link.</div>

  if (status === 'connecting' || status === 'idle') {
    return <div className={styles.connecting}>Connecting…</div>
  }

  return (
    <div className={styles.page}>
      <DisconnectBanner />
      <TileTracker />
      <div className={styles.center}>
        <div className={styles.boardWrap}>
          <Board />
        </div>
        <div className={styles.rackWrap}>
          <Rack />
        </div>
        <ActionButtons emit={emit} />
      </div>
      <InfoPanel emit={emit} />
      {gameOverResult && <GameOverModal />}
    </div>
  )
}
```

- [ ] **Step 3: Replace GamePage stub in `packages/web/src/App.tsx`**

Find this line in App.tsx:
```ts
const GamePage = () => <div>Game — coming soon</div>
```

Replace it with:
```ts
import GamePage from './pages/GamePage'
```

And remove the `const GamePage = ...` line. The import goes at the top of the file with the other page imports.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 5: Run all web tests**

```bash
cd packages/web && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/GamePage.tsx packages/web/src/pages/GamePage.module.css packages/web/src/App.tsx
git commit -m "feat(web): GamePage wiring Board, Rack, InfoPanel, TileTracker, ActionButtons"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered |
|-----------------|---------|
| Zustand store — full GameStore interface | Task 1 |
| `applyGameState`, `applyMoveResult`, `applyRackUpdate`, `applyTimerSync`, `applyGameOver` | Task 1 |
| `placeTile`, `returnTile`, `clearPending`, `selectRackTile`, `toggleRackFlip` | Task 1 |
| `reorderRack`, `toggleTileTracked`, `setOpponentDisconnected`, `resetGame` | Task 1 |
| Auto tileTracker in non-ranked mode via `applyMoveResult` | Task 1 |
| Manual tileTracker in ranked mode via `toggleTileTracked` | Task 1 |
| `useGameSocket` — seq gap detection + `state:request` | Task 2 |
| `useGameSocket` — stable `emit` return via `useCallback` | Task 2 |
| `useGameSocket` — `resetGame()` on unmount | Task 2 |
| `server:ping` → `server:pong` heartbeat | Task 2 |
| Modal primitive with backdrop | Task 3 |
| Timer with warn (<5min) and crit (<1min pulse) | Task 3 |
| Board — 15×15 grid rendering | Task 4 |
| Board — click-to-place when rack tile selected | Task 4 |
| Board — click pending tile to return | Task 4 |
| Board — bonus square colors | Task 4 |
| Rack — 8 slots, click to select, double-click to flip | Task 5 |
| ActionButtons — Play emits `move:place` with tiles | Task 6 |
| ActionButtons — Pass emits `move:pass` | Task 6 |
| ActionButtons — Clear calls `clearPending` | Task 6 |
| ExchangeModal — disabled when bag < 5 | Task 7 |
| ResignModal — confirm before emitting `game:resign` | Task 7 |
| GameOverModal — shows win/loss/draw, final scores | Task 8 |
| DisconnectBanner — shows opponent name + 30s note | Task 8 |
| TileTracker sidebar — auto in non-ranked, manual click in ranked | Task 9 |
| RecentMoves — expression + score delta display | Task 9 |
| InfoPanel — player cards, timer, bag count, recent moves | Task 9 |
| GamePage — three-column layout (tracker, center, panel) | Task 10 |
| GamePage — `gameOverResult` triggers modal | Task 10 |
| `BoardCell.owner` absolute player_id (not relative) | Task 1 + 4 |

**Placeholder scan:** None found.

**Type consistency:** All `GameStatePayload`, `MoveResultPayload` etc. types from `types/game.ts` (Task 4 of Plan 5). `gameStore` / `useGameStore` exported from `store/gameStore.ts` and used consistently. `emit` prop type is `(event: string, data?: unknown) => void` everywhere it appears.
