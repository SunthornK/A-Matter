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
