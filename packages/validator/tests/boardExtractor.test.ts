import { describe, it, expect } from 'vitest'
import { extractSequences } from '../src/boardExtractor'
import type { Board, Placement, BoardTile } from '../src/types'

function emptyBoard(): Board {
  return Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null))
}

function tile(value: string): BoardTile {
  return { tile_id: `t_${value}`, value, display_value: value, type: 'number', points: 1, is_blank: false, blank_designation: null, dual_choice: null }
}

function placement(row: number, col: number, value = '5'): Placement {
  return { tile_id: `p_${value}_${row}_${col}`, rack_index: 0, row, col, dual_choice: null, blank_designation: null }
}

describe('extractSequences', () => {
  it('single new tile adjacent to only one existing tile — run of 2 → no sequences (< 3 tiles)', () => {
    const board = emptyBoard()
    board[7]![7] = tile('5')
    const p = placement(7, 8, '3')
    const seqs = extractSequences(board, [p], new Map([[p.tile_id, tile('3')]]))
    expect(seqs).toHaveLength(0)
  })

  it('horizontal run of 5 tiles with 1 new → one sequence', () => {
    const board = emptyBoard()
    board[7]![5] = tile('1')
    board[7]![6] = tile('+')
    board[7]![8] = tile('=')
    board[7]![9] = tile('4')
    const p = placement(7, 7, '3')
    const seqs = extractSequences(board, [p], new Map([[p.tile_id, tile('3')]]))
    expect(seqs).toHaveLength(1)
    expect(seqs[0]!.direction).toBe('horizontal')
    expect(seqs[0]!.tiles).toHaveLength(5)
  })

  it('sequence shorter than 3 tiles is excluded', () => {
    const board = emptyBoard()
    board[7]![7] = tile('5')
    const p = placement(7, 8, '3')
    const seqs = extractSequences(board, [p], new Map([[p.tile_id, tile('3')]]))
    expect(seqs.every((s) => s.tiles.length >= 3)).toBe(true)
  })

  it('newly placed tile is marked is_new: true, existing tiles is_new: false', () => {
    const board = emptyBoard()
    board[7]![5] = tile('1')
    board[7]![6] = tile('+')
    board[7]![8] = tile('=')
    board[7]![9] = tile('4')
    const p = placement(7, 7, '3')
    const seqs = extractSequences(board, [p], new Map([[p.tile_id, tile('3')]]))
    const seq = seqs[0]!
    const newTiles = seq.tiles.filter((t) => t.is_new)
    const oldTiles = seq.tiles.filter((t) => !t.is_new)
    expect(newTiles).toHaveLength(1)
    expect(oldTiles).toHaveLength(4)
  })

  it('same row — only one horizontal sequence returned (not duplicated)', () => {
    const board = emptyBoard()
    board[7]![5] = tile('1')
    board[7]![6] = tile('+')
    board[7]![8] = tile('=')
    board[7]![9] = tile('4')
    const p1 = placement(7, 7, '3')
    const p2 = placement(7, 10, '7')
    const map = new Map([[p1.tile_id, tile('3')], [p2.tile_id, tile('7')]])
    const seqs = extractSequences(board, [p1, p2], map)
    // Both placements are in row 7 — should yield ONE horizontal sequence, not two
    const horizontal = seqs.filter((s) => s.direction === 'horizontal')
    expect(horizontal).toHaveLength(1)
  })
})
