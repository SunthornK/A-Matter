import type { PrismaClient } from '@prisma/client'
import type { BoardTile } from '@a-matter/validator'
import type { GameStatePayload, PlayerStateEntry, BoardCellEntry } from './types'

export async function buildGameState(
  gameId: string,
  requestingPlayerId: string,
  prisma: PrismaClient,
): Promise<GameStatePayload> {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      players: {
        include: { user: { select: { displayName: true } } },
      },
    },
  })

  const rawBoard = (game.boardState as { cells: (BoardTile | null)[][] }).cells
  const board: (BoardCellEntry | null)[][] = rawBoard.map((row) =>
    row.map((cell) =>
      cell
        ? { ...cell, owner: (cell as unknown as { owner?: string | null }).owner ?? null }
        : null,
    ),
  )

  const players: PlayerStateEntry[] = game.players.map((p) => ({
    player_id: p.id,
    user_id: p.userId,
    display_name: p.user?.displayName ?? `Guest ${p.seat}`,
    seat: p.seat,
    score: p.score,
    time_remaining_ms: p.timeRemainingMs,
    consecutive_passes: p.consecutivePasses,
    tiles_remaining: (p.rack as unknown as BoardTile[]).length,
  }))

  const myPlayer = game.players.find((p) => p.id === requestingPlayerId)
  if (!myPlayer) throw new Error(`Player ${requestingPlayerId} not in game ${gameId}`)

  return {
    seq: game.turnNumber,
    game_id: gameId,
    mode: game.mode as 'ranked' | 'quickplay' | 'private',
    board,
    rack: myPlayer.rack as unknown as BoardTile[],
    bag: (game.tileBag as unknown as BoardTile[]).length,
    turn_number: game.turnNumber,
    current_turn_player_id: game.currentTurnPlayerId ?? '',
    players,
    my_player_id: requestingPlayerId,
    status: game.status === 'active' ? 'active' : 'finished',
    timestamp: Date.now(),
  }
}
