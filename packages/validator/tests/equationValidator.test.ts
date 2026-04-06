import { describe, it, expect } from 'vitest'
import { validateEquation } from '../src/equationValidator'
import type { PlacedTile, TileSequence } from '../src/types'

function makeTile(value: string, row: number, col: number): PlacedTile & { is_new: boolean } {
  const type = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20'].includes(value)
    ? 'number' as const
    : value === '=' ? 'equals' as const
    : 'operator' as const
  return {
    tile_id: `t_${value}_${row}_${col}`,
    value, display_value: value, type, points: 2,
    is_blank: false, blank_designation: null, dual_choice: null,
    row, col, is_new: true,
  }
}

function makeSeq(tiles: (PlacedTile & { is_new: boolean })[]): TileSequence {
  return {
    direction: 'horizontal',
    start: { row: tiles[0]!.row, col: tiles[0]!.col },
    end: { row: tiles[tiles.length - 1]!.row, col: tiles[tiles.length - 1]!.col },
    tiles,
  }
}

describe('validateEquation', () => {
  it('valid: 5+3=8', () => {
    const seq = makeSeq([
      makeTile('5', 7, 3), makeTile('+', 7, 4), makeTile('3', 7, 5),
      makeTile('=', 7, 6), makeTile('8', 7, 7),
    ])
    const result = validateEquation(seq)
    expect(result.is_valid).toBe(true)
    expect(result.expression).toBe('5+3=8')
  })

  it('valid: 2÷4=4÷8 (fraction equality)', () => {
    const seq = makeSeq([
      makeTile('2', 7, 0), makeTile('÷', 7, 1), makeTile('4', 7, 2),
      makeTile('=', 7, 3), makeTile('4', 7, 4), makeTile('÷', 7, 5), makeTile('8', 7, 6),
    ])
    expect(validateEquation(seq).is_valid).toBe(true)
  })

  it('valid: -6+10=4 (leading negation)', () => {
    const seq = makeSeq([
      makeTile('-', 7, 0), makeTile('6', 7, 1), makeTile('+', 7, 2),
      makeTile('10', 7, 3), makeTile('=', 7, 4), makeTile('4', 7, 5),
    ])
    expect(validateEquation(seq).is_valid).toBe(true)
  })

  it('invalid: 5+3=9 (wrong equality)', () => {
    const seq = makeSeq([
      makeTile('5', 7, 3), makeTile('+', 7, 4), makeTile('3', 7, 5),
      makeTile('=', 7, 6), makeTile('9', 7, 7),
    ])
    expect(validateEquation(seq).is_valid).toBe(false)
  })

  it('invalid: no equals sign', () => {
    const seq = makeSeq([makeTile('5', 7, 3), makeTile('+', 7, 4), makeTile('3', 7, 5)])
    const result = validateEquation(seq)
    expect(result.is_valid).toBe(false)
    expect(result.error).toMatch(/equals/i)
  })

  it('invalid: two equals signs', () => {
    const seq = makeSeq([
      makeTile('5', 7, 3), makeTile('=', 7, 4), makeTile('3', 7, 5),
      makeTile('=', 7, 6), makeTile('8', 7, 7),
    ])
    expect(validateEquation(seq).is_valid).toBe(false)
  })

  it('invalid: division by zero', () => {
    const seq = makeSeq([
      makeTile('5', 7, 3), makeTile('÷', 7, 4), makeTile('0', 7, 5),
      makeTile('=', 7, 6), makeTile('1', 7, 7),
    ])
    expect(validateEquation(seq).is_valid).toBe(false)
  })

  it('valid: 0÷5=0', () => {
    const seq = makeSeq([
      makeTile('0', 7, 3), makeTile('÷', 7, 4), makeTile('5', 7, 5),
      makeTile('=', 7, 6), makeTile('0', 7, 7),
    ])
    expect(validateEquation(seq).is_valid).toBe(true)
  })

  it('invalid: negative result on right side', () => {
    const seq = makeSeq([
      makeTile('3', 7, 0), makeTile('-', 7, 1), makeTile('10', 7, 2),
      makeTile('=', 7, 3), makeTile('-', 7, 4), makeTile('7', 7, 5),
    ])
    expect(validateEquation(seq).is_valid).toBe(false)
  })

  it('invalid: consecutive operators 10+-6=4', () => {
    const seq = makeSeq([
      makeTile('10', 7, 0), makeTile('+', 7, 1), makeTile('-', 7, 2),
      makeTile('6', 7, 3), makeTile('=', 7, 4), makeTile('4', 7, 5),
    ])
    expect(validateEquation(seq).is_valid).toBe(false)
  })

  it('invalid: leading zero — tiles "0","7" adjacent', () => {
    const seq = makeSeq([
      makeTile('0', 7, 0), makeTile('7', 7, 1), makeTile('+', 7, 2),
      makeTile('3', 7, 3), makeTile('=', 7, 4), makeTile('10', 7, 5),
    ])
    const result = validateEquation(seq)
    expect(result.is_valid).toBe(false)
    expect(result.error).toMatch(/leading zero/i)
  })

  it('invalid: unary plus +7=7', () => {
    const seq = makeSeq([
      makeTile('+', 7, 0), makeTile('7', 7, 1),
      makeTile('=', 7, 2), makeTile('7', 7, 3),
    ])
    expect(validateEquation(seq).is_valid).toBe(false)
  })

  it('invalid: -0 is illegal', () => {
    const seq = makeSeq([
      makeTile('-', 7, 0), makeTile('0', 7, 1),
      makeTile('=', 7, 2), makeTile('0', 7, 3),
    ])
    const result = validateEquation(seq)
    expect(result.is_valid).toBe(false)
    expect(result.error).toMatch(/-0/i)
  })
})
