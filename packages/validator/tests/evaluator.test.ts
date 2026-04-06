import { describe, it, expect } from 'vitest'
import { evaluate, EvaluationError } from '../src/evaluator'
import type { Token } from '../src/types'

function n(v: number): Token { return { kind: 'number', value: v } }
function add(): Token { return { kind: 'operator', op: '+' } }
function sub(): Token { return { kind: 'operator', op: '-' } }
function mul(): Token { return { kind: 'operator', op: '×' } }
function div(): Token { return { kind: 'operator', op: '÷' } }
function neg(): Token { return { kind: 'negate' } }

describe('evaluate', () => {
  it('single number 5 → 5/1', () => {
    expect(evaluate([n(5)])).toEqual({ numerator: 5, denominator: 1 })
  })

  it('5+3 → 8/1', () => {
    expect(evaluate([n(5), add(), n(3)])).toEqual({ numerator: 8, denominator: 1 })
  })

  it('10-6 → 4/1', () => {
    expect(evaluate([n(10), sub(), n(6)])).toEqual({ numerator: 4, denominator: 1 })
  })

  it('2×3 → 6/1', () => {
    expect(evaluate([n(2), mul(), n(3)])).toEqual({ numerator: 6, denominator: 1 })
  })

  it('2÷4 → 1/2', () => {
    expect(evaluate([n(2), div(), n(4)])).toEqual({ numerator: 1, denominator: 2 })
  })

  it('operator precedence: 2+3×4 → 14 (not 20)', () => {
    expect(evaluate([n(2), add(), n(3), mul(), n(4)])).toEqual({ numerator: 14, denominator: 1 })
  })

  it('operator precedence: 10-2×3 → 4', () => {
    expect(evaluate([n(10), sub(), n(2), mul(), n(3)])).toEqual({ numerator: 4, denominator: 1 })
  })

  it('negation: -6+10 → 4', () => {
    expect(evaluate([neg(), n(6), add(), n(10)])).toEqual({ numerator: 4, denominator: 1 })
  })

  it('negation with multiplication: -2×3 → -6', () => {
    expect(evaluate([neg(), n(2), mul(), n(3)])).toEqual({ numerator: -6, denominator: 1 })
  })

  it('2÷4 equals 4÷8 — both evaluate to 1/2', () => {
    const a = evaluate([n(2), div(), n(4)])
    const b = evaluate([n(4), div(), n(8)])
    expect(a).toEqual(b)
  })

  it('division by zero throws EvaluationError', () => {
    expect(() => evaluate([n(5), div(), n(0)])).toThrow(EvaluationError)
  })

  it('0÷5 → 0/1 (zero divided by non-zero is legal)', () => {
    expect(evaluate([n(0), div(), n(5)])).toEqual({ numerator: 0, denominator: 1 })
  })

  it('consecutive operators throws EvaluationError', () => {
    expect(() => evaluate([n(5), add(), add(), n(3)])).toThrow(EvaluationError)
  })
})
