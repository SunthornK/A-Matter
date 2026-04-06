import { describe, it, expect } from 'vitest'
import { validateMoveStructure, MoveStructureError } from '../src/moveStructure'
import type { Board, Placement, BoardTile } from '../src/types'

function emptyBoard(): Board {
  return Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null))
}

function tile(value: string): BoardTile {
  return { tile_id: `t_${value}`, value, display_value: value, type: 'number', points: 1, is_blank: false, blank_designation: null, dual_choice: null }
}

function placement(row: number, col: number, value = '5'): Placement {
  return { tile_id: `t_${value}`, rack_index: 0, row, col, dual_choice: null, blank_designation: null }
}

describe('single axis', () => {
  it('all placements in same row → valid', () => {
    expect(() =>
      validateMoveStructure(emptyBoard(), [placement(7, 5), placement(7, 7), placement(7, 9)], true),
    ).not.toThrow()
  })

  it('placements in different rows AND columns → throws', () => {
    expect(() =>
      validateMoveStructure(emptyBoard(), [placement(7, 5), placement(8, 6)], true),
    ).toThrow(MoveStructureError)
  })
})

describe('first move center', () => {
  it('first move covering center (7,7) → valid', () => {
    expect(() =>
      validateMoveStructure(emptyBoard(), [placement(7, 6), placement(7, 7), placement(7, 8)], true),
    ).not.toThrow()
  })

  it('first move NOT covering center → throws', () => {
    expect(() =>
      validateMoveStructure(emptyBoard(), [placement(7, 5), placement(7, 6)], true),
    ).toThrow(MoveStructureError)
  })
})

describe('connection', () => {
  it('subsequent move connecting to existing tile → valid', () => {
    const board = emptyBoard()
    board[7]![7] = tile('5')
    expect(() =>
      validateMoveStructure(board, [placement(7, 8), placement(7, 9)], false),
    ).not.toThrow()
  })

  it('subsequent move with no connection to existing → throws', () => {
    const board = emptyBoard()
    board[7]![7] = tile('5')
    expect(() =>
      validateMoveStructure(board, [placement(0, 0), placement(0, 1)], false),
    ).toThrow(MoveStructureError)
  })
})

describe('contiguity', () => {
  it('tiles with existing fill between them → valid (no gap)', () => {
    const board = emptyBoard()
    board[7]![7] = tile('8')
    expect(() =>
      validateMoveStructure(board, [placement(7, 6), placement(7, 8)], false),
    ).not.toThrow()
  })

  it('tiles with a genuine gap → throws', () => {
    const board = emptyBoard()
    board[7]![0] = tile('1')
    expect(() =>
      validateMoveStructure(board, [placement(7, 1), placement(7, 3)], false),
    ).toThrow(MoveStructureError)
  })
})
