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

const tile3 = {
  tile_id: '3_01', value: '3', type: 'number' as const, display_value: '3',
  is_blank: false, blank_designation: null, dual_choice: null, points: 2,
}

const baseState: GameStatePayload = {
  seq: 1,
  game_id: 'g1',
  mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [tile3, null, null, null, null, null, null, null],
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
    expect(s.rack[0]).toMatchObject({ value: '3', points: 2 })
  })
})

describe('placeTile / returnTile', () => {
  it('moves tile from rack to pendingPlacements', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)
    const s = gameStore.getState()
    expect(s.rack[0]).toBeNull()
    expect(s.pendingPlacements['7,7']).toMatchObject({ value: '3', rackIndex: 0 })
  })

  it('returns tile from board back to rack', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)
    gameStore.getState().returnTile('7,7')
    const s = gameStore.getState()
    expect(s.rack[0]).toMatchObject({ value: '3', points: 2 })
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
    expect(s.rack[0]).toMatchObject({ value: '3', points: 2 })
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

describe('applyMoveResult', () => {
  it('updates board, bag, players, clears pending, appends move log', () => {
    gameStore.getState().applyGameState(baseState)
    gameStore.getState().placeTile(0, 7, 7)

    const moveResult: MoveResultPayload = {
      seq: 2,
      type: 'place',
      player_id: 'p1',
      bag: 85,
      turn_number: 2,
      current_turn_player_id: 'p2',
      consecutive_passes: 0,
      board: Array.from({ length: 15 }, () => Array(15).fill(null)),
      players: [
        { player_id: 'p1', display_name: 'Alice', score: 20, time_remaining_ms: 590_000, consecutive_passes: 0, tiles_remaining: 7 },
        { player_id: 'p2', display_name: 'Bob', score: 0, time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8 },
      ],
      expression: '3+2',
      result: 5,
      score_delta: 20,
      placed_tiles: [{ value: '3', row: 7, col: 7, points: 2 }],
    }

    gameStore.getState().applyMoveResult(moveResult)
    const s = gameStore.getState()
    expect(s.bag).toBe(85)
    expect(s.currentTurnPlayerId).toBe('p2')
    expect(Object.keys(s.pendingPlacements)).toHaveLength(0)
    expect(s.recentMoves).toHaveLength(1)
    expect(s.recentMoves[0]).toMatchObject({ type: 'place', player_id: 'p1', display_name: 'Alice', score_delta: 20 })
  })

  it('auto-increments tileTracker in quickplay mode', () => {
    gameStore.getState().applyGameState(baseState)
    const moveResult: MoveResultPayload = {
      seq: 2, type: 'place', player_id: 'p1', bag: 85, turn_number: 2,
      current_turn_player_id: 'p2', consecutive_passes: 0,
      board: Array.from({ length: 15 }, () => Array(15).fill(null)),
      players: [
        { player_id: 'p1', display_name: 'Alice', score: 0, time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8 },
        { player_id: 'p2', display_name: 'Bob', score: 0, time_remaining_ms: 600_000, consecutive_passes: 0, tiles_remaining: 8 },
      ],
      expression: '3', result: 3, score_delta: 0,
      placed_tiles: [{ value: '3', row: 7, col: 7, points: 2 }],
    }
    gameStore.getState().applyMoveResult(moveResult)
    expect(gameStore.getState().tileTracker['3']).toBe(1)
  })
})

describe('setOpponentDisconnected', () => {
  it('sets disconnected=true and records timestamp', () => {
    gameStore.getState().setOpponentDisconnected(true)
    const s = gameStore.getState()
    expect(s.opponentDisconnected).toBe(true)
    expect(s.opponentDisconnectedAt).toBeTypeOf('number')
  })

  it('clears disconnected and timestamp', () => {
    gameStore.getState().setOpponentDisconnected(true)
    gameStore.getState().setOpponentDisconnected(false)
    const s = gameStore.getState()
    expect(s.opponentDisconnected).toBe(false)
    expect(s.opponentDisconnectedAt).toBeNull()
  })
})

describe('reorderRack', () => {
  it('swaps two rack slots', () => {
    gameStore.getState().applyGameState(baseState)
    // rack[0] = { value: '3', points: 2 }, rack[1] = null
    gameStore.getState().reorderRack(0, 1)
    const s = gameStore.getState()
    expect(s.rack[0]).toBeNull()
    expect(s.rack[1]).toMatchObject({ value: '3', points: 2 })
  })

  it('does nothing when index out of bounds', () => {
    gameStore.getState().applyGameState(baseState)
    const before = gameStore.getState().rack.map(t => t?.value ?? null)
    gameStore.getState().reorderRack(0, 99)
    const after = gameStore.getState().rack.map(t => t?.value ?? null)
    expect(after).toEqual(before)
  })
})

describe('toggleTileTracked', () => {
  it('sets 0 → 1', () => {
    gameStore.getState().toggleTileTracked('3')
    expect(gameStore.getState().tileTracker['3']).toBe(1)
  })
  it('resets nonzero → 0', () => {
    gameStore.getState().toggleTileTracked('3')
    gameStore.getState().toggleTileTracked('3')
    expect(gameStore.getState().tileTracker['3']).toBe(0)
  })
})
