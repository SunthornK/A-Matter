import type { Board, Placement, BoardTile, ValidationResult, EquationResult } from './types'
import { validateMoveStructure, MoveStructureError } from './moveStructure'
import { extractSequences } from './boardExtractor'
import { validateEquation } from './equationValidator'
import { scoreMove } from './scorer'
import { BONUS_SQUARES } from './constants'

export interface ValidateMoveInput {
  board: Board
  placements: Placement[]
  rack: BoardTile[]
  rackSizeBefore: number
  isFirstMove: boolean
}

export function validateMove(input: ValidateMoveInput): ValidationResult {
  const { board, placements, rack, rackSizeBefore, isFirstMove } = input

  // Step 1: Resolve tiles from rack
  const placedTileMap = new Map<string, BoardTile>()
  for (const placement of placements) {
    const rackTile = rack.find((t) => t?.tile_id === placement.tile_id)
    if (!rackTile) {
      return { is_valid: false, equations: [], total_score: 0, error: `Tile ${placement.tile_id} not found in rack` }
    }
    const resolvedTile: BoardTile = {
      ...rackTile,
      display_value: resolveTile(rackTile, placement),
    }
    placedTileMap.set(placement.tile_id, resolvedTile)
  }

  // Step 2: Validate move structure
  try {
    validateMoveStructure(board, placements, isFirstMove)
  } catch (err) {
    if (err instanceof MoveStructureError) {
      return { is_valid: false, equations: [], total_score: 0, error: err.message }
    }
    throw err
  }

  // Step 3: Extract affected sequences
  const sequences = extractSequences(board, placements, placedTileMap)

  // Step 4: Validate each sequence mathematically
  const equationResults: EquationResult[] = []
  for (const seq of sequences) {
    const eqResult = validateEquation(seq)
    equationResults.push({
      direction: seq.direction,
      start: seq.start,
      end: seq.end,
      expression: eqResult.expression,
      left_value: eqResult.left_value ?? { numerator: 0, denominator: 1 },
      right_value: eqResult.right_value ?? { numerator: 0, denominator: 1 },
      is_valid: eqResult.is_valid,
      score: 0,
    })
    if (!eqResult.is_valid) {
      return {
        is_valid: false,
        equations: equationResults,
        total_score: 0,
        error: eqResult.error ?? 'Invalid equation',
      }
    }
  }

  // Step 5: Score
  const bonusMap = buildBonusMap()
  const allRackTilesUsed = placements.length === rackSizeBefore
  const totalScore = scoreMove(sequences, bonusMap, rackSizeBefore, allRackTilesUsed)

  const scoredEquations: EquationResult[] = equationResults.map((eq, i) => ({
    ...eq,
    score: sequences[i] ? scoreMove([sequences[i]!], bonusMap, rackSizeBefore, false) : 0,
  }))

  return {
    is_valid: true,
    equations: scoredEquations,
    total_score: totalScore,
  }
}

function resolveTile(
  tile: BoardTile,
  placement: Pick<Placement, 'dual_choice' | 'blank_designation'>,
): string {
  if (tile.type === 'dual_operator' && placement.dual_choice) {
    return placement.dual_choice
  }
  if (tile.type === 'blank' && placement.blank_designation) {
    return placement.blank_designation
  }
  return tile.value
}

function buildBonusMap(): Map<string, NonNullable<(typeof BONUS_SQUARES)[0][0]>> {
  const map = new Map<string, NonNullable<(typeof BONUS_SQUARES)[0][0]>>()
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const bonus = BONUS_SQUARES[r]?.[c]
      if (bonus) map.set(`${r},${c}`, bonus)
    }
  }
  return map
}

export type { ValidationResult, EquationResult, BoardTile, Placement, Board } from './types'
