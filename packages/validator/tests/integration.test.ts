import { describe, it, expect } from 'vitest'
import { validateMove } from '../src/index'
import type { Board, Placement, BoardTile } from '../src/types'

function emptyBoard(): Board {
  return Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null))
}

function tile(value: string, tile_id?: string): BoardTile {
  const type = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20'].includes(value)
    ? 'number' as const
    : value === '=' ? 'equals' as const
    : 'operator' as const
  return { tile_id: tile_id ?? `t_${value}`, value, display_value: value, type, points: 2, is_blank: false, blank_designation: null, dual_choice: null }
}

function p(row: number, col: number, value: string): Placement {
  return { tile_id: `t_${value}`, rack_index: 0, row, col, dual_choice: null, blank_designation: null }
}

describe('validateMove — first move', () => {
  it('valid first move: 5+3=8 across center', () => {
    const board = emptyBoard()
    const rack = [tile('5'), tile('+'), tile('3'), tile('='), tile('8')]
    const placements: Placement[] = [
      p(7, 5, '5'), p(7, 6, '+'), p(7, 7, '3'), p(7, 8, '='), p(7, 9, '8'),
    ]
    const result = validateMove({ board, placements, rack, rackSizeBefore: 5, isFirstMove: true })
    expect(result.is_valid).toBe(true)
    expect(result.equations).toHaveLength(1)
    expect(result.equations[0]!.is_valid).toBe(true)
    expect(result.total_score).toBeGreaterThan(0)
  })

  it('invalid: first move not covering center', () => {
    const board = emptyBoard()
    const rack = [tile('5'), tile('+'), tile('3'), tile('='), tile('8')]
    const placements: Placement[] = [
      p(0, 0, '5'), p(0, 1, '+'), p(0, 2, '3'), p(0, 3, '='), p(0, 4, '8'),
    ]
    const result = validateMove({ board, placements, rack, rackSizeBefore: 5, isFirstMove: true })
    expect(result.is_valid).toBe(false)
    expect(result.error).toMatch(/center/i)
  })

  it('invalid equation: 5+3=9 fails math check', () => {
    const board = emptyBoard()
    const rack = [tile('5'), tile('+'), tile('3'), tile('='), tile('9')]
    const placements: Placement[] = [
      p(7, 5, '5'), p(7, 6, '+'), p(7, 7, '3'), p(7, 8, '='), p(7, 9, '9'),
    ]
    const result = validateMove({ board, placements, rack, rackSizeBefore: 5, isFirstMove: true })
    expect(result.is_valid).toBe(false)
  })
})

describe('validateMove — subsequent move', () => {
  it('valid move connecting to existing tile vertically', () => {
    const board = emptyBoard()
    board[7]![5] = tile('5')
    board[7]![6] = tile('+')
    board[7]![7] = tile('3')
    board[7]![8] = tile('=')
    board[7]![9] = tile('8')

    // Vertical at col 7 through existing (7,7)='3': 1+3=4
    const rack = [tile('1'), tile('+'), tile('='), tile('4')]
    const placements: Placement[] = [
      p(5, 7, '1'), p(6, 7, '+'), p(8, 7, '='), p(9, 7, '4'),
    ]
    const result = validateMove({ board, placements, rack, rackSizeBefore: 4, isFirstMove: false })
    expect(result.is_valid).toBe(true)
  })

  it('invalid: no connection to existing tiles', () => {
    const board = emptyBoard()
    board[7]![7] = tile('5')
    const rack = [tile('1'), tile('+'), tile('2'), tile('='), tile('3')]
    const placements: Placement[] = [
      p(0, 0, '1'), p(0, 1, '+'), p(0, 2, '2'), p(0, 3, '='), p(0, 4, '3'),
    ]
    const result = validateMove({ board, placements, rack, rackSizeBefore: 5, isFirstMove: false })
    expect(result.is_valid).toBe(false)
  })

  it('invalid tile not in rack', () => {
    const board = emptyBoard()
    board[7]![7] = tile('5')
    const rack = [tile('1')]
    const placements: Placement[] = [p(7, 8, '9')]  // tile '9' not in rack
    const result = validateMove({ board, placements, rack, rackSizeBefore: 1, isFirstMove: false })
    expect(result.is_valid).toBe(false)
  })
})
