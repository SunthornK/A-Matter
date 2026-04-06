import type { Board, BoardTile, Placement, PlacedTile, TileSequence } from './types'

export function extractSequences(
  board: Board,
  placements: Placement[],
  placedTileMap: Map<string, BoardTile>,
): TileSequence[] {
  // Build virtual board including new placements
  const virtualBoard: Board = board.map((row) => [...row])
  for (const p of placements) {
    const t = placedTileMap.get(p.tile_id)
    if (t) virtualBoard[p.row]![p.col] = t
  }

  const newCellSet = new Set(placements.map((p) => `${p.row},${p.col}`))
  const sequences: TileSequence[] = []
  const checkedRows = new Set<number>()
  const checkedCols = new Set<number>()

  for (const p of placements) {
    // Check horizontal run through this row (only once per row)
    if (!checkedRows.has(p.row)) {
      checkedRows.add(p.row)
      const seq = extractLine(virtualBoard, p.row, p.col, 'horizontal', newCellSet)
      if (seq) sequences.push(seq)
    }

    // Check vertical run through this column (only once per column)
    if (!checkedCols.has(p.col)) {
      checkedCols.add(p.col)
      const seq = extractLine(virtualBoard, p.row, p.col, 'vertical', newCellSet)
      if (seq) sequences.push(seq)
    }
  }

  return sequences
}

function extractLine(
  board: Board,
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical',
  newCellSet: Set<string>,
): TileSequence | null {
  // Find start of run
  let startRow = row
  let startCol = col
  while (
    direction === 'horizontal'
      ? startCol > 0 && board[startRow]?.[startCol - 1] != null
      : startRow > 0 && board[startRow - 1]?.[startCol] != null
  ) {
    if (direction === 'horizontal') startCol--
    else startRow--
  }

  // Collect all tiles in the run
  const tiles: (PlacedTile & { is_new: boolean })[] = []
  let r = startRow
  let c = startCol
  while (r < 15 && c < 15 && board[r]?.[c] != null) {
    const boardTile = board[r]![c]!
    tiles.push({ ...boardTile, row: r, col: c, is_new: newCellSet.has(`${r},${c}`) })
    if (direction === 'horizontal') c++
    else r++
  }

  // Must be ≥ 3 tiles and contain at least one new tile
  const hasNewTile = tiles.some((t) => t.is_new)
  if (tiles.length < 3 || !hasNewTile) return null

  return {
    direction,
    start: { row: tiles[0]!.row, col: tiles[0]!.col },
    end: { row: tiles[tiles.length - 1]!.row, col: tiles[tiles.length - 1]!.col },
    tiles,
  }
}
