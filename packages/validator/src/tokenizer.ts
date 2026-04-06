import type { BoardTile, Token } from './types'

export function tokenize(tiles: BoardTile[]): Token[] {
  const raw = buildRawTokens(tiles)
  return applyNegation(raw)
}

type RawToken = Token

function buildRawTokens(tiles: BoardTile[]): RawToken[] {
  const tokens: RawToken[] = []
  let i = 0
  while (i < tiles.length) {
    const tile = tiles[i]!
    if (tile.type === 'number' || (tile.type === 'blank' && isNumericDesignation(tile.display_value))) {
      let numStr = tile.display_value
      while (i + 1 < tiles.length) {
        const next = tiles[i + 1]!
        if (next.type === 'number' || (next.type === 'blank' && isNumericDesignation(next.display_value))) {
          numStr += next.display_value
          i++
        } else {
          break
        }
      }
      tokens.push({ kind: 'number', value: parseInt(numStr, 10) })
    } else if (tile.type === 'equals') {
      tokens.push({ kind: 'equals' })
    } else if (tile.type === 'operator') {
      tokens.push({ kind: 'operator', op: tile.display_value as '+' | '-' | '×' | '÷' })
    } else if (tile.type === 'dual_operator') {
      tokens.push({ kind: 'operator', op: tile.display_value as '+' | '-' | '×' | '÷' })
    } else if (tile.type === 'blank') {
      tokens.push({ kind: 'operator', op: tile.display_value as '+' | '-' | '×' | '÷' })
    }
    i++
  }
  return tokens
}

function isNumericDesignation(v: string): boolean {
  return /^\d+$/.test(v)
}

function applyNegation(tokens: RawToken[]): Token[] {
  const result: Token[] = []
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!
    const prev = result[result.length - 1]
    const isLeadingPosition = prev === undefined || prev.kind === 'equals'
    if (tok.kind === 'operator' && tok.op === '-' && isLeadingPosition) {
      result.push({ kind: 'negate' })
    } else {
      result.push(tok)
    }
  }
  return result
}
