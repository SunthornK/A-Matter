import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionButtons } from '../../game/ActionButtons'
import { gameStore } from '../../store/gameStore'
import type { GameStatePayload, RackTilePayload } from '../../types/game'

const tile3: RackTilePayload = {
  tile_id: '3_01', value: '3', type: 'number', display_value: '3',
  is_blank: false, blank_designation: null, dual_choice: null, points: 2,
}

const baseState: GameStatePayload = {
  seq: 1, game_id: 'g1', mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [tile3, null, null, null, null, null, null, null],
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

  it('emits move:place with correct PlacementInput when Play is clicked', () => {
    gameStore.getState().placeTile(0, 7, 7)
    const emit = vi.fn()
    render(<ActionButtons emit={emit} />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(emit).toHaveBeenCalledWith('move:place', {
      placements: [{ tile_id: '3_01', rack_index: 0, row: 7, col: 7, dual_choice: null, blank_designation: null }],
    })
  })

  it('does not emit move:place when no tiles pending', () => {
    const emit = vi.fn()
    render(<ActionButtons emit={emit} />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(emit).not.toHaveBeenCalled()
  })
})
