import { describe, it, expect } from 'vitest'
import { makePendingKey, parsePendingKey } from '../../utils/board'

describe('makePendingKey', () => {
  it('formats row,col as "r,c"', () => {
    expect(makePendingKey(0, 0)).toBe('0,0')
    expect(makePendingKey(7, 14)).toBe('7,14')
  })
})

describe('parsePendingKey', () => {
  it('parses "r,c" into [row, col]', () => {
    expect(parsePendingKey('0,0')).toEqual([0, 0])
    expect(parsePendingKey('7,14')).toEqual([7, 14])
  })
})
