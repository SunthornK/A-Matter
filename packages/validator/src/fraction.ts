import type { Fraction } from './types'

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

export function reduce(numerator: number, denominator: number): Fraction {
  if (denominator === 0) throw new Error('Division by zero')
  if (numerator === 0) return { numerator: 0, denominator: 1 }
  const sign = denominator < 0 ? -1 : 1
  const g = gcd(Math.abs(numerator), Math.abs(denominator))
  return {
    numerator: (sign * numerator) / g,
    denominator: (sign * denominator) / g,
  }
}

export function frac(numerator: number, denominator: number): Fraction {
  if (denominator === 0) throw new Error('Division by zero')
  return reduce(numerator, denominator)
}

export function fracAdd(a: Fraction, b: Fraction): Fraction {
  return reduce(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  )
}

export function fracSub(a: Fraction, b: Fraction): Fraction {
  return reduce(
    a.numerator * b.denominator - b.numerator * a.denominator,
    a.denominator * b.denominator,
  )
}

export function fracMul(a: Fraction, b: Fraction): Fraction {
  return reduce(a.numerator * b.numerator, a.denominator * b.denominator)
}

export function fracDiv(a: Fraction, b: Fraction): Fraction {
  if (b.numerator === 0) throw new Error('Division by zero')
  return reduce(a.numerator * b.denominator, a.denominator * b.numerator)
}

export function fracEq(a: Fraction, b: Fraction): boolean {
  return a.numerator * b.denominator === b.numerator * a.denominator
}

export function fracToNumber(f: Fraction): number {
  return f.numerator / f.denominator
}
