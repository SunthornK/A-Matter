export type TileType = 'number' | 'operator' | 'equals' | 'dual_operator' | 'blank'
export type Direction = 'horizontal' | 'vertical'
export type BonusType = 'TW' | 'DW' | 'TL' | 'DL' | 'center' | null

export interface Fraction {
  numerator: number
  denominator: number
}

export interface BoardTile {
  tile_id: string
  /** Raw value from tile bag: "0"-"20", "+", "-", "×", "÷", "=", "+/-", "×/÷", "blank" */
  value: string
  /** Resolved value after dual/blank commitment. Used by validator. */
  display_value: string
  type: TileType
  points: number
  is_blank: boolean
  blank_designation: string | null
  dual_choice: '+' | '-' | '×' | '÷' | null
}

export interface PlacedTile extends BoardTile {
  row: number
  col: number
}

export interface Placement {
  tile_id: string
  rack_index: number
  row: number
  col: number
  dual_choice: '+' | '-' | '×' | '÷' | null
  blank_designation: string | null
}

/** 15×15 board — row-major, board[row][col] */
export type Board = (BoardTile | null)[][]

export interface EquationResult {
  direction: Direction
  start: { row: number; col: number }
  end: { row: number; col: number }
  expression: string
  left_value: Fraction
  right_value: Fraction
  is_valid: boolean
  score: number
}

export interface ValidationResult {
  is_valid: boolean
  equations: EquationResult[]
  total_score: number
  /** Present only when is_valid is false — human-readable reason */
  error?: string
}

/** Internal: a sequence of tiles extracted from the board for validation */
export interface TileSequence {
  direction: Direction
  start: { row: number; col: number }
  end: { row: number; col: number }
  tiles: (PlacedTile & { is_new: boolean })[]
}

/** Token types used by the parser/evaluator */
export type Token =
  | { kind: 'number'; value: number }
  | { kind: 'operator'; op: '+' | '-' | '×' | '÷' }
  | { kind: 'equals' }
  | { kind: 'negate' }
