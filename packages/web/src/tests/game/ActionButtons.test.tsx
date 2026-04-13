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
