import type { BoardTile, BonusType } from './types'

interface TileDefinition {
  value: string
  type: BoardTile['type']
  points: number
  count: number
}

export const TILE_DEFINITIONS: TileDefinition[] = [
  { value: '0', type: 'number', points: 1, count: 5 },
  { value: '1', type: 'number', points: 1, count: 5 },
  { value: '2', type: 'number', points: 1, count: 5 },
  { value: '3', type: 'number', points: 1, count: 5 },
  { value: '4', type: 'number', points: 2, count: 5 },
  { value: '5', type: 'number', points: 2, count: 4 },
  { value: '6', type: 'number', points: 2, count: 4 },
  { value: '7', type: 'number', points: 2, count: 4 },
  { value: '8', type: 'number', points: 2, count: 4 },
  { value: '9', type: 'number', points: 2, count: 4 },
  { value: '10', type: 'number', points: 3, count: 3 },
  { value: '11', type: 'number', points: 4, count: 1 },
  { value: '12', type: 'number', points: 3, count: 3 },
  { value: '13', type: 'number', points: 6, count: 1 },
  { value: '14', type: 'number', points: 4, count: 1 },
  { value: '15', type: 'number', points: 4, count: 1 },
  { value: '16', type: 'number', points: 4, count: 1 },
  { value: '17', type: 'number', points: 6, count: 1 },
  { value: '18', type: 'number', points: 4, count: 1 },
  { value: '19', type: 'number', points: 7, count: 1 },
  { value: '20', type: 'number', points: 5, count: 1 },
  { value: '+', type: 'operator', points: 2, count: 4 },
  { value: '-', type: 'operator', points: 2, count: 4 },
  { value: '×', type: 'operator', points: 2, count: 4 },
  { value: '÷', type: 'operator', points: 2, count: 4 },
  { value: '+/-', type: 'dual_operator', points: 1, count: 5 },
  { value: '×/÷', type: 'dual_operator', points: 1, count: 4 },
  { value: '=', type: 'equals', points: 1, count: 11 },
  { value: 'blank', type: 'blank', points: 0, count: 4 },
]

export function createTileBag(): BoardTile[] {
  const tiles: BoardTile[] = []
  for (const def of TILE_DEFINITIONS) {
    for (let i = 0; i < def.count; i++) {
      const tile_id = `${def.value.replace(/\//g, '_')}_${String(i + 1).padStart(2, '0')}`
      tiles.push({
        tile_id,
        value: def.value,
        display_value: def.value,
        type: def.type,
        points: def.points,
        is_blank: def.type === 'blank',
        blank_designation: null,
        dual_choice: null,
      })
    }
  }
  return tiles
}

// Build the 15×15 bonus square map
const B: BonusType[][] = Array.from({ length: 15 }, () =>
  Array.from({ length: 15 }, (): BonusType => null),
)

function set(r: number, c: number, v: BonusType) {
  B[r]![c] = v
  B[14 - r]![c] = v
  B[r]![14 - c] = v
  B[14 - r]![14 - c] = v
}

B[7]![7] = 'center'
set(0, 0, 'TW')
set(0, 7, 'TW')
set(1, 1, 'DW')
set(2, 2, 'DW')
set(3, 3, 'DW')
set(4, 4, 'DW')
set(1, 5, 'TL')
set(1, 9, 'TL')
set(5, 1, 'TL')
set(5, 5, 'TL')
set(5, 9, 'TL')
set(5, 13, 'TL')
set(0, 3, 'DL')
set(0, 11, 'DL')
set(2, 6, 'DL')
set(2, 8, 'DL')
set(3, 0, 'DL')
set(3, 7, 'DL')
set(6, 2, 'DL')
set(6, 6, 'DL')
set(6, 8, 'DL')
set(7, 3, 'DL')

export const BONUS_SQUARES: readonly (BonusType[])[] = B
