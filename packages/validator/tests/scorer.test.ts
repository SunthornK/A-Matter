import { describe, it, expect } from 'vitest'
import { scoreMove } from '../src/scorer'
import type { TileSequence, BoardTile, BonusType } from '../src/types'

function tile(value: string, points: number): BoardTile {
  return { tile_id: `t_${value}`, value, display_value: value, type: 'number', points, is_blank: false, blank_designation: null, dual_choice: null }
}

function makeTiles(specs: Array<{ value: string; points: number; row: number; col: number; is_new: boolean }>) {
  return specs.map(({ value, points, row, col, is_new }) => ({
    ...tile(value, points), row, col, is_new,
  }))
}

function makeSeq(tiles: ReturnType<typeof makeTiles>): TileSequence {
  return {
    direction: 'horizontal',
    start: { row: tiles[0]!.row, col: tiles[0]!.col },
    end: { row: tiles[tiles.length - 1]!.row, col: tiles[tiles.length - 1]!.col },
    tiles,
  }
}

describe('scoreMove', () => {
  it('plain equation with no bonus squares: sum of tile points', () => {
    const seq = makeSeq(makeTiles([
      { value: '5', points: 2, row: 7, col: 3, is_new: true },
      { value: '+', points: 2, row: 7, col: 4, is_new: true },
      { value: '3', points: 2, row: 7, col: 5, is_new: true },
      { value: '=', points: 1, row: 7, col: 6, is_new: true },
      { value: '8', points: 2, row: 7, col: 7, is_new: true },
    ]))
    expect(scoreMove([seq], new Map())).toBe(9)
  })

  it('DL on a newly placed tile doubles its face value only', () => {
    const seq = makeSeq(makeTiles([
      { value: '5', points: 2, row: 7, col: 3, is_new: true },  // DL
      { value: '+', points: 2, row: 7, col: 4, is_new: true },
      { value: '3', points: 2, row: 7, col: 5, is_new: true },
      { value: '=', points: 1, row: 7, col: 6, is_new: true },
      { value: '8', points: 2, row: 7, col: 7, is_new: true },
    ]))
    const bonusMap = new Map<string, BonusType>([['7,3', 'DL']])
    // 5 tile: 2×2=4, rest: 2+2+1+2=7 → total 11
    expect(scoreMove([seq], bonusMap)).toBe(11)
  })

  it('TW on a newly placed tile triples the whole equation', () => {
    const seq = makeSeq(makeTiles([
      { value: '5', points: 2, row: 0, col: 0, is_new: true },  // TW
      { value: '+', points: 2, row: 0, col: 1, is_new: true },
      { value: '3', points: 2, row: 0, col: 2, is_new: true },
      { value: '=', points: 1, row: 0, col: 3, is_new: true },
      { value: '8', points: 2, row: 0, col: 4, is_new: true },
    ]))
    const bonusMap = new Map<string, BonusType>([['0,0', 'TW']])
    // Sum: 2+2+2+1+2=9, ×3=27
    expect(scoreMove([seq], bonusMap)).toBe(27)
  })

  it('DL on existing tile does NOT apply multiplier', () => {
    const seq = makeSeq(makeTiles([
      { value: '5', points: 2, row: 7, col: 3, is_new: false },  // DL but NOT new
      { value: '+', points: 2, row: 7, col: 4, is_new: true },
      { value: '3', points: 2, row: 7, col: 5, is_new: true },
      { value: '=', points: 1, row: 7, col: 6, is_new: true },
      { value: '8', points: 2, row: 7, col: 7, is_new: true },
    ]))
    const bonusMap = new Map<string, BonusType>([['7,3', 'DL']])
    // DL ignored because tile is not new → 2+2+2+1+2=9
    expect(scoreMove([seq], bonusMap)).toBe(9)
  })

  it('bingo: using all 8 rack tiles adds +40', () => {
    const seq = makeSeq(makeTiles(
      Array.from({ length: 8 }, (_, i) => ({ value: String(i), points: 2, row: 7, col: i, is_new: true }))
    ))
    // 8 tiles × 2 points = 16, + 40 bingo = 56
    expect(scoreMove([seq], new Map(), 8, true)).toBe(56)
  })

  it('no bingo when rack was fewer than 8', () => {
    const seq = makeSeq(makeTiles(
      Array.from({ length: 5 }, (_, i) => ({ value: String(i), points: 2, row: 7, col: i, is_new: true }))
    ))
    // 5 tiles × 2 = 10, rackSizeBefore=5 but not 8 → no bonus
    expect(scoreMove([seq], new Map(), 5, true)).toBe(10)
  })

  it('two equations scored separately and summed', () => {
    const seq1 = makeSeq(makeTiles([
      { value: '2', points: 1, row: 7, col: 0, is_new: true },
      { value: '+', points: 2, row: 7, col: 1, is_new: true },
      { value: '3', points: 1, row: 7, col: 2, is_new: true },
      { value: '=', points: 1, row: 7, col: 3, is_new: true },
      { value: '5', points: 2, row: 7, col: 4, is_new: true },
    ]))
    const seq2 = makeSeq(makeTiles([
      { value: '1', points: 1, row: 5, col: 2, is_new: true },
      { value: '+', points: 2, row: 6, col: 2, is_new: false },
      { value: '2', points: 1, row: 7, col: 2, is_new: false },
      { value: '=', points: 1, row: 8, col: 2, is_new: true },
      { value: '3', points: 1, row: 9, col: 2, is_new: true },
    ]))
    // seq1: 1+2+1+1+2=7, seq2: 1+2+1+1+1=6 → total 13
    expect(scoreMove([seq1, seq2], new Map())).toBe(13)
  })
})
