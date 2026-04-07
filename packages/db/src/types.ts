export type { User, Room, Game, GamePlayer, Move } from '@prisma/client'
export { Role, RoomType, RoomStatus, GameMode, GameStatus, EndReason, MoveAction } from '@prisma/client'

// ─── JSON field types ───────────────────────────────────────────────────────

export interface BoardCell {
  tile_id: string
  value: string
  display_value: string
  type: 'number' | 'operator' | 'equals' | 'dual_operator' | 'blank'
  points: number
  is_blank: boolean
  blank_designation: string | null
  dual_choice: '+' | '-' | '×' | '÷' | null
}

export interface BoardState {
  cells: (BoardCell | null)[][]
}

export interface TileBagEntry {
  tile_id: string
  value: string
  type: BoardCell['type']
  points: number
}

export interface MovePlacement {
  tile_id: string
  rack_index: number
  row: number
  col: number
  dual_choice: '+' | '-' | '×' | '÷' | null
  blank_designation: string | null
}

export interface MoveEquation {
  direction: 'horizontal' | 'vertical'
  start: { row: number; col: number }
  end: { row: number; col: number }
  expression: string
  left_value: { numerator: number; denominator: number }
  right_value: { numerator: number; denominator: number }
  is_valid: boolean
  score: number
}
