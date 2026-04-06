import { describe, it, expect } from 'vitest'
import {
  frac,
  reduce,
  fracAdd,
  fracSub,
  fracMul,
  fracDiv,
  fracEq,
  fracToNumber,
} from '../src/fraction'

describe('frac', () => {
  it('creates and auto-reduces 2/4 to 1/2', () => {
    expect(frac(2, 4)).toEqual({ numerator: 1, denominator: 2 })
  })
  it('normalizes negative denominator: 1/-2 → -1/2', () => {
    expect(frac(1, -2)).toEqual({ numerator: -1, denominator: 2 })
  })
  it('throws on zero denominator', () => {
    expect(() => frac(1, 0)).toThrow('Division by zero')
  })
  it('integer 5 → 5/1', () => {
    expect(frac(5, 1)).toEqual({ numerator: 5, denominator: 1 })
  })
})

describe('reduce', () => {
  it('reduces 6/4 to 3/2', () => {
    expect(reduce(6, 4)).toEqual({ numerator: 3, denominator: 2 })
  })
  it('reduces 0/5 to 0/1', () => {
    expect(reduce(0, 5)).toEqual({ numerator: 0, denominator: 1 })
  })
})

describe('fracAdd', () => {
  it('1/2 + 1/3 = 5/6', () => {
    expect(fracAdd(frac(1, 2), frac(1, 3))).toEqual(frac(5, 6))
  })
  it('1/4 + 3/4 = 1/1', () => {
    expect(fracAdd(frac(1, 4), frac(3, 4))).toEqual(frac(1, 1))
  })
})

describe('fracSub', () => {
  it('3/4 - 1/4 = 1/2', () => {
    expect(fracSub(frac(3, 4), frac(1, 4))).toEqual(frac(1, 2))
  })
  it('1/2 - 3/4 = -1/4', () => {
    expect(fracSub(frac(1, 2), frac(3, 4))).toEqual(frac(-1, 4))
  })
})

describe('fracMul', () => {
  it('2/3 × 3/4 = 1/2', () => {
    expect(fracMul(frac(2, 3), frac(3, 4))).toEqual(frac(1, 2))
  })
  it('0 × anything = 0', () => {
    expect(fracMul(frac(0, 1), frac(7, 3))).toEqual(frac(0, 1))
  })
})

describe('fracDiv', () => {
  it('1/2 ÷ 1/4 = 2', () => {
    expect(fracDiv(frac(1, 2), frac(1, 4))).toEqual(frac(2, 1))
  })
  it('throws when dividing by zero fraction', () => {
    expect(() => fracDiv(frac(1, 2), frac(0, 1))).toThrow('Division by zero')
  })
  it('2÷4 equals 4÷8 (both reduce to 1/2)', () => {
    expect(fracDiv(frac(2, 1), frac(4, 1))).toEqual(fracDiv(frac(4, 1), frac(8, 1)))
  })
})

describe('fracEq', () => {
  it('1/2 equals 2/4', () => {
    expect(fracEq(frac(1, 2), frac(2, 4))).toBe(true)
  })
  it('1/2 does not equal 1/3', () => {
    expect(fracEq(frac(1, 2), frac(1, 3))).toBe(false)
  })
})

describe('fracToNumber', () => {
  it('3/2 → 1.5', () => {
    expect(fracToNumber(frac(3, 2))).toBeCloseTo(1.5)
  })
})
