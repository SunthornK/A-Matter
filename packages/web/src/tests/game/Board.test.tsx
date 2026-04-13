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
