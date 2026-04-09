import type { PrismaClient } from '@prisma/client'
import type { BoardTile } from '@a-matter/validator'
import type { GameStatePayload, PlayerStateEntry } from './types'

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

  const board = (game.boardState as { cells: (BoardTile | null)[][] }).cells

  const players: PlayerStateEntry[] = game.players.map((p) => ({
    player_id: p.id,
    user_id: p.userId,
    display_name: p.user?.displayName ?? `Guest ${p.seat}`,
    seat: p.seat,
    score: p.score,
    time_remaining_ms: p.timeRemainingMs,
    rack_count: (p.rack as BoardTile[]).length,
  }))

  const myPlayer = game.players.find((p) => p.id === requestingPlayerId)
  if (!myPlayer) throw new Error(`Player ${requestingPlayerId} not in game ${gameId}`)

  return {
    game_id: gameId,
    board,
    turn_number: game.turnNumber,
    current_turn_player_id: game.currentTurnPlayerId ?? '',
    players,
    my_rack: myPlayer.rack as BoardTile[],
    my_player_id: requestingPlayerId,
    status: game.status === 'active' ? 'active' : 'finished',
    timestamp: Date.now(),
  }
}
