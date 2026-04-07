import { prisma } from './client'
import type { BoardState, TileBagEntry, BoardCell, MovePlacement } from './types'
import type { MoveAction } from '@prisma/client'

export interface ReplayResult {
  boardState: BoardState
  tileBag: TileBagEntry[]
  /** score per player_id */
  scores: Map<string, number>
  turnNumber: number
}

/**
 * Reconstructs full game state by replaying all moves from the moves log.
 * The moves table is the single source of truth.
 */
export async function replayGame(gameId: string): Promise<ReplayResult> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: { orderBy: { seat: 'asc' } },
      moves: { orderBy: { turnNumber: 'asc' } },
    },
  })

  if (!game) throw new Error(`Game not found: ${gameId}`)

  // Initialize empty 15x15 board
  const board: (BoardCell | null)[][] = Array.from({ length: 15 }, () =>
    Array.from({ length: 15 }, () => null),
  )

  // Build tile map from the initial bag stored in the game
  const initialBag = game.tileBag as unknown as TileBagEntry[]
  const bagMap = new Map<string, TileBagEntry>(initialBag.map((t) => [t.tile_id, t]))

  const scores = new Map<string, number>()
  for (const player of game.players) {
    scores.set(player.id, 0)
  }

  let turnNumber = 1

  for (const move of game.moves) {
    const action = move.action as MoveAction

    if (action === 'place') {
      const placements = move.placements as unknown as MovePlacement[] | null
      if (placements) {
        for (const placement of placements) {
          const tile = bagMap.get(placement.tile_id)
          if (tile) {
            const cell: BoardCell = {
              tile_id: tile.tile_id,
              value: tile.value,
              display_value:
                placement.dual_choice ??
                placement.blank_designation ??
                tile.value,
              type: tile.type,
              points: tile.points,
              is_blank: tile.type === 'blank',
              blank_designation: placement.blank_designation,
              dual_choice: placement.dual_choice,
            }
            board[placement.row]![placement.col] = cell
            bagMap.delete(placement.tile_id)
          }
        }
        scores.set(
          move.playerId,
          (scores.get(move.playerId) ?? 0) + move.scoreEarned,
        )
      }
    }
    // exchange and pass: no board/bag changes needed for replay

    turnNumber = move.turnNumber + 1
  }

  return {
    boardState: { cells: board },
    tileBag: Array.from(bagMap.values()),
    scores,
    turnNumber,
  }
}
