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
  if (equalsPositions.length > 1) {
    return { is_valid: false, expression, left_value: null, right_value: null, error: 'Multiple equals signs' }
  }

  const eqIdx = equalsPositions[0]!
  const leftTokens = tokens.slice(0, eqIdx)
  const rightTokens = tokens.slice(eqIdx + 1)

  if (leftTokens[0]?.kind === 'operator' && leftTokens[0].op === '+') {
    return { is_valid: false, expression, left_value: null, right_value: null, error: 'Unary plus is not allowed' }
  }
  if (rightTokens[0]?.kind === 'operator' && rightTokens[0].op === '+') {
    return { is_valid: false, expression, left_value: null, right_value: null, error: 'Unary plus is not allowed' }
  }

  if (leftTokens[0]?.kind === 'negate' && leftTokens[1]?.kind === 'number' && leftTokens[1].value === 0) {
    return { is_valid: false, expression, left_value: null, right_value: null, error: '-0 is not a valid expression' }
  }
  if (rightTokens[0]?.kind === 'negate' && rightTokens[1]?.kind === 'number' && rightTokens[1].value === 0) {
    return { is_valid: false, expression, left_value: null, right_value: null, error: '-0 is not a valid expression' }
  }

  try {
    const leftValue = evaluate(leftTokens)
    const rightValue = evaluate(rightTokens)

    if (fracToNumber(leftValue) < 0) {
      return { is_valid: false, expression, left_value: leftValue, right_value: rightValue, error: 'Negative result on left side' }
    }
    if (fracToNumber(rightValue) < 0) {
      return { is_valid: false, expression, left_value: leftValue, right_value: rightValue, error: 'Negative result on right side' }
    }

    const isValid = fracEq(leftValue, rightValue)
    return {
      is_valid: isValid,
      expression,
      left_value: leftValue,
      right_value: rightValue,
      error: isValid ? undefined : `${expression} does not balance`,
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
