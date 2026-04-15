import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Rack } from '../../game/Rack'
import { gameStore } from '../../store/gameStore'
import type { GameStatePayload, RackTilePayload } from '../../types/game'

const baseState: GameStatePayload = {
  seq: 1, game_id: 'g1', mode: 'quickplay',
  board: Array.from({ length: 15 }, () => Array(15).fill(null)),
  rack: [
    { tile_id: '3_01', value: '3', type: 'number', display_value: '3', is_blank: false, blank_designation: null, dual_choice: null, points: 2 } satisfies RackTilePayload,
    { tile_id: '+_01', value: '+', type: 'operator', display_value: '+', is_blank: false, blank_designation: null, dual_choice: null, points: 1 } satisfies RackTilePayload,
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
