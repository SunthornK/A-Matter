import type { Fraction, Token } from './types'
import { frac, fracAdd, fracSub, fracMul, fracDiv } from './fraction'

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvaluationError'
  }
}

export function evaluate(tokens: Token[]): Fraction {
  if (tokens.length === 0) throw new EvaluationError('Empty expression')
  validateStructure(tokens)

  const working = [...tokens]
  if (working[0]?.kind === 'negate') {
    working.shift()
    const first = working[0]
    if (!first || first.kind !== 'number') throw new EvaluationError('Negate must precede a number')
    working[0] = { kind: 'number', value: -(first.value) }
  }

  return evalAddSub(working)
}

function validateStructure(tokens: Token[]): void {
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i]!
    const nxt = tokens[i + 1]!
    if (cur.kind === 'operator' && nxt.kind === 'operator') {
      throw new EvaluationError(`Consecutive operators at position ${i}`)
    }
  }
}

interface Part { op: '+' | '-' | null; tokens: Token[] }

function evalAddSub(tokens: Token[]): Fraction {
  const parts = splitOnAddSub(tokens)
  if (parts.length === 1) return evalMulDiv(parts[0]!.tokens)

  let result = evalMulDiv(parts[0]!.tokens)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]!
    const operand = evalMulDiv(part.tokens)
    if (part.op === '+') result = fracAdd(result, operand)
    else result = fracSub(result, operand)
  }
  return result
}

function splitOnAddSub(tokens: Token[]): Part[] {
  const parts: Part[] = []
  let current: Token[] = []
  let currentOp: '+' | '-' | null = null

  for (const tok of tokens) {
    if (tok.kind === 'operator' && (tok.op === '+' || tok.op === '-')) {
      parts.push({ op: currentOp, tokens: current })
      current = []
      currentOp = tok.op
    } else {
      current.push(tok)
    }
  }
  parts.push({ op: currentOp, tokens: current })
  return parts
}

function evalMulDiv(tokens: Token[]): Fraction {
  if (tokens.length === 0) throw new EvaluationError('Empty sub-expression')
  const first = tokens[0]
  if (!first || first.kind !== 'number') throw new EvaluationError('Expected number')

  let result = frac(first.value, 1)
  let i = 1
  while (i < tokens.length) {
    const op = tokens[i]
    const operand = tokens[i + 1]
    if (!op || op.kind !== 'operator') throw new EvaluationError(`Expected operator at ${i}`)
    if (!operand || operand.kind !== 'number') throw new EvaluationError(`Expected number at ${i + 1}`)
    if (op.op === '×') result = fracMul(result, frac(operand.value, 1))
    else if (op.op === '÷') {
      if (operand.value === 0) throw new EvaluationError('Division by zero')
      result = fracDiv(result, frac(operand.value, 1))
    }
    i += 2
  }
  return result
}
