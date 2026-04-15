import type { TileSequence, Fraction } from './types'
import { tokenize } from './tokenizer'
import { evaluate, EvaluationError } from './evaluator'
import { fracEq, fracToNumber } from './fraction'

export interface EquationValidationResult {
  is_valid: boolean
  expression: string
  left_value: Fraction | null
  right_value: Fraction | null
  error?: string
}

export function validateEquation(sequence: TileSequence): EquationValidationResult {
  const tiles = sequence.tiles
  const expression = tiles.map((t) => t.display_value).join('')

  const leadingZeroError = checkLeadingZeros(tiles)
  if (leadingZeroError) {
    return { is_valid: false, expression, left_value: null, right_value: null, error: leadingZeroError }
  }

  const tokens = tokenize(tiles)

  const equalsPositions = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.kind === 'equals')
    .map(({ i }) => i)

  if (equalsPositions.length === 0) {
    return { is_valid: false, expression, left_value: null, right_value: null, error: 'No equals sign in equation' }
  }

  // Reject consecutive equals signs (e.g. "3==3")
  for (let k = 1; k < equalsPositions.length; k++) {
    if (equalsPositions[k]! === equalsPositions[k - 1]! + 1) {
      return { is_valid: false, expression, left_value: null, right_value: null, error: 'Consecutive equals signs are not allowed' }
    }
  }

  // Split token stream into segments separated by '='
  // e.g. 7+6=10+3=13 → [[7,+,6], [10,+,3], [13]]
  const segmentBoundaries = [-1, ...equalsPositions, tokens.length]
  const segments = []
  for (let k = 0; k + 1 < segmentBoundaries.length; k++) {
    segments.push(tokens.slice(segmentBoundaries[k]! + 1, segmentBoundaries[k + 1]!))
  }

  for (const seg of segments) {
    if (seg[0]?.kind === 'operator' && seg[0].op === '+') {
      return { is_valid: false, expression, left_value: null, right_value: null, error: 'Unary plus is not allowed' }
    }
    if (seg[0]?.kind === 'negate' && seg[1]?.kind === 'number' && seg[1].value === 0) {
      return { is_valid: false, expression, left_value: null, right_value: null, error: '-0 is not a valid expression' }
    }
  }

  try {
    const values = segments.map(evaluate)

    for (const v of values) {
      if (fracToNumber(v) < 0) {
        return { is_valid: false, expression, left_value: values[0]!, right_value: values[values.length - 1]!, error: 'Negative result in equation' }
      }
    }

    // All segments must evaluate to the same value
    const allEqual = values.every((v) => fracEq(v, values[0]!))
    const leftValue = values[0]!
    const rightValue = values[values.length - 1]!
    return {
      is_valid: allEqual,
      expression,
      left_value: leftValue,
      right_value: rightValue,
      error: allEqual ? undefined : `${expression} does not balance`,
    }
  } catch (err) {
    const message = err instanceof EvaluationError ? err.message : 'Invalid expression'
    return { is_valid: false, expression, left_value: null, right_value: null, error: message }
  }
}

function checkLeadingZeros(tiles: TileSequence['tiles']): string | null {
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!
    if (tile.type === 'number' || (tile.type === 'blank' && /^\d+$/.test(tile.display_value))) {
      const numStr = tile.display_value
      const nextTile = tiles[i + 1]
      if (
        numStr === '0' &&
        nextTile &&
        (nextTile.type === 'number' || (nextTile.type === 'blank' && /^\d+$/.test(nextTile.display_value)))
      ) {
        return 'Leading zero: tile "0" cannot be followed by another number tile'
      }
    }
  }
  return null
}
