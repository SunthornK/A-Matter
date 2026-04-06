import type { Board, Placement } from './types'

export class MoveStructureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoveStructureError'
  }
}

const CENTER = { row: 7, col: 7 }

export function validateMoveStructure(board: Board, placements: Placement[], isFirstMove: boolean): void {
  if (placements.length === 0) throw new MoveStructureError('No placements provided')

  checkSingleAxis(placements)
  checkNoDuplicateCells(placements, board)

  if (isFirstMove) {
    checkFirstMoveCenter(placements)
  } else {
    checkConnection(board, placements)
    checkContiguity(board, placements)
  }
}

function checkSingleAxis(placements: Placement[]): void {
  const rows = new Set(placements.map((p) => p.row))
  const cols = new Set(placements.map((p) => p.col))
  if (rows.size > 1 && cols.size > 1) {
    throw new MoveStructureError('All placed tiles must be in the same row or the same column')
  }
}

function checkNoDuplicateCells(placements: Placement[], board: Board): void {
  const seen = new Set<string>()
  for (const p of placements) {
    const key = `${p.row},${p.col}`
    if (seen.has(key)) throw new MoveStructureError(`Duplicate placement at (${p.row},${p.col})`)
    seen.add(key)
    if (board[p.row]?.[p.col] !== null && board[p.row]?.[p.col] !== undefined) {
      throw new MoveStructureError(`Cell (${p.row},${p.col}) is already occupied`)
    }
  }
}

function checkFirstMoveCenter(placements: Placement[]): void {
  const coversCenter = placements.some((p) => p.row === CENTER.row && p.col === CENTER.col)
  if (!coversCenter) {
    throw new MoveStructureError('First move must cover the center square (7,7)')
  }
}

function checkConnection(board: Board, placements: Placement[]): void {
  const newCells = new Set(placements.map((p) => `${p.row},${p.col}`))
  const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]]

  for (const p of placements) {
    for (const [dr, dc] of deltas) {
      const r = p.row + dr!
      const c = p.col + dc!
      const key = `${r},${c}`
      if (!newCells.has(key) && board[r]?.[c] != null) {
        return
      }
    }
  }
  throw new MoveStructureError('Placed tiles must connect to at least one existing tile')
}

function checkContiguity(board: Board, placements: Placement[]): void {
  if (placements.length <= 1) return

  const rows = new Set(placements.map((p) => p.row))
  const newCells = new Set(placements.map((p) => `${p.row},${p.col}`))
  const isHorizontal = rows.size === 1

  if (isHorizontal) {
    const row = placements[0]!.row
    const minCol = Math.min(...placements.map((p) => p.col))
    const maxCol = Math.max(...placements.map((p) => p.col))
    for (let c = minCol; c <= maxCol; c++) {
      const key = `${row},${c}`
      if (!newCells.has(key) && (board[row]?.[c] == null)) {
        throw new MoveStructureError(`Gap at (${row},${c}) — placements must form a contiguous line`)
      }
    }
  } else {
    const col = placements[0]!.col
    const minRow = Math.min(...placements.map((p) => p.row))
    const maxRow = Math.max(...placements.map((p) => p.row))
    for (let r = minRow; r <= maxRow; r++) {
      const key = `${r},${col}`
      if (!newCells.has(key) && (board[r]?.[col] == null)) {
        throw new MoveStructureError(`Gap at (${r},${col}) — placements must form a contiguous line`)
      }
    }
  }
}
