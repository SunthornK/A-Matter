import { describe, it, expect } from 'vitest'
import type { Fraction, ValidationResult } from '../src/types'

describe('types', () => {
  it('Fraction can represent 1/2', () => {
    const f: Fraction = { numerator: 1, denominator: 2 }
    expect(f.numerator).toBe(1)
    expect(f.denominator).toBe(2)
  })

  it('ValidationResult shape is correct', () => {
    const result: ValidationResult = {
      is_valid: true,
      equations: [],
      total_score: 0,
    }
    expect(result.is_valid).toBe(true)
  })
})
