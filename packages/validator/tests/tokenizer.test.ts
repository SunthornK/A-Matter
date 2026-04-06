import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/tokenizer'
import type { BoardTile } from '../src/types'

function num(v: string, points = 1): BoardTile {
  return { tile_id: `t_${v}`, value: v, display_value: v, type: 'number', points, is_blank: false, blank_designation: null, dual_choice: null }
}
function op(v: string): BoardTile {
  return { tile_id: `t_${v}`, value: v, display_value: v, type: 'operator', points: 2, is_blank: false, blank_designation: null, dual_choice: null }
}
function eq(): BoardTile {
  return { tile_id: 't_eq', value: '=', display_value: '=', type: 'equals', points: 1, is_blank: false, blank_designation: null, dual_choice: null }
}
function dual(v: '+/-' | '×/÷', choice: '+' | '-' | '×' | '÷'): BoardTile {
  return { tile_id: `t_d${v}`, value: v, display_value: choice, type: 'dual_operator', points: 1, is_blank: false, blank_designation: null, dual_choice: choice }
}
function blank(designation: string): BoardTile {
  return { tile_id: 't_blank', value: 'blank', display_value: designation, type: 'blank', points: 0, is_blank: true, blank_designation: designation, dual_choice: null }
}

describe('tokenize', () => {
  it('single number tile → number token', () => {
    expect(tokenize([num('5')])).toEqual([{ kind: 'number', value: 5 }])
  })

  it('two adjacent number tiles "1","2" → number token 12', () => {
    expect(tokenize([num('1'), num('2')])).toEqual([{ kind: 'number', value: 12 }])
  })

  it('multi-digit tile "12" → number token 12', () => {
    expect(tokenize([num('12', 3)])).toEqual([{ kind: 'number', value: 12 }])
  })

  it('simple equation 5+3=8 tokenizes correctly', () => {
    expect(tokenize([num('5'), op('+'), num('3'), eq(), num('8')])).toEqual([
      { kind: 'number', value: 5 },
      { kind: 'operator', op: '+' },
      { kind: 'number', value: 3 },
      { kind: 'equals' },
      { kind: 'number', value: 8 },
    ])
  })

  it('leading minus on left side → negate token', () => {
    expect(tokenize([op('-'), num('6'), op('+'), num('10'), eq(), num('4')])).toEqual([
      { kind: 'negate' },
      { kind: 'number', value: 6 },
      { kind: 'operator', op: '+' },
      { kind: 'number', value: 10 },
      { kind: 'equals' },
      { kind: 'number', value: 4 },
    ])
  })

  it('leading minus on right side of equals → negate token', () => {
    expect(tokenize([num('4'), eq(), op('-'), num('6'), op('+'), num('10')])).toEqual([
      { kind: 'number', value: 4 },
      { kind: 'equals' },
      { kind: 'negate' },
      { kind: 'number', value: 6 },
      { kind: 'operator', op: '+' },
      { kind: 'number', value: 10 },
    ])
  })

  it('minus NOT at start is subtraction, not negation', () => {
    expect(tokenize([num('10'), op('-'), num('6'), eq(), num('4')])).toEqual([
      { kind: 'number', value: 10 },
      { kind: 'operator', op: '-' },
      { kind: 'number', value: 6 },
      { kind: 'equals' },
      { kind: 'number', value: 4 },
    ])
  })

  it('dual operator resolved by dual_choice', () => {
    expect(tokenize([num('5'), dual('+/-', '+'), num('3'), eq(), num('8')])).toEqual([
      { kind: 'number', value: 5 },
      { kind: 'operator', op: '+' },
      { kind: 'number', value: 3 },
      { kind: 'equals' },
      { kind: 'number', value: 8 },
    ])
  })

  it('blank tile used as number uses blank_designation', () => {
    expect(tokenize([blank('7'), op('+'), num('3'), eq(), num('10')])).toEqual([
      { kind: 'number', value: 7 },
      { kind: 'operator', op: '+' },
      { kind: 'number', value: 3 },
      { kind: 'equals' },
      { kind: 'number', value: 10 },
    ])
  })
})
