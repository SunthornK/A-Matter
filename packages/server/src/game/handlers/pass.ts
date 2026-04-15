import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData, BoardCellEntry, PlayerStateEntry } from '../types'
import type { BoardTile } from '@a-matter/validator'
import { recordPassMove } from '../db'
import { applyEndgame } from '../endgame'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

export async function handlePass(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  prisma: PrismaClient,
  turnStartedAt: number,
): Promise<void> {
  const { gameId, playerId } = socket.data

  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      players: { include: { user: { select: { displayName: true } } } },
    },
  })

  if (game.currentTurnPlayerId !== playerId) {
    socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'It is not your turn' })
    return
  }

  const myPlayer = game.players.find((p) => p.id === playerId)!
  const otherPlayer = game.players.find((p) => p.id !== playerId)!
  const newConsecutivePasses = myPlayer.consecutivePasses + 1
  const timeSpentMs = Date.now() - turnStartedAt

  await recordPassMove({
    prisma, gameId, playerId,
    turnNumber: game.turnNumber,
    nextPlayerId: otherPlayer.id,
    newConsecutivePasses,
    timeSpentMs,
  })

  const currentBoard = (game.boardState as { cells: (BoardTile | null)[][] }).cells
  const enrichedBoard: (BoardCellEntry | null)[][] = currentBoard.map((row) =>
    row.map((cell) =>
      cell
        ? { ...cell, owner: (cell as unknown as { owner?: string | null }).owner ?? null }
        : null,
    ),
  )

  const updatedPlayers: PlayerStateEntry[] = [
    {
      player_id: playerId,
      user_id: myPlayer.userId,
      display_name: myPlayer.user?.displayName ?? `Guest ${myPlayer.seat}`,
      seat: myPlayer.seat,
      score: myPlayer.score,
      time_remaining_ms: myPlayer.timeRemainingMs,
      consecutive_passes: newConsecutivePasses,
      tiles_remaining: (myPlayer.rack as unknown as BoardTile[]).length,
    },
    {
      player_id: otherPlayer.id,
      user_id: otherPlayer.userId,
      display_name: otherPlayer.user?.displayName ?? `Guest ${otherPlayer.seat}`,
      seat: otherPlayer.seat,
      score: otherPlayer.score,
      time_remaining_ms: otherPlayer.timeRemainingMs,
      consecutive_passes: otherPlayer.consecutivePasses,
      tiles_remaining: (otherPlayer.rack as unknown as BoardTile[]).length,
    },
  ]

  io.to(`game:${gameId}`).emit('move:result', {
    seq: game.turnNumber + 1,
    type: 'pass',
    player_id: playerId,
    score_delta: 0,
    board: enrichedBoard,
    bag: (game.tileBag as unknown as BoardTile[]).length,
    consecutive_passes: newConsecutivePasses,
    turn_number: game.turnNumber + 1,
    current_turn_player_id: otherPlayer.id,
    players: updatedPlayers,
    timestamp: Date.now(),
  })

  if (newConsecutivePasses >= 3 && otherPlayer.consecutivePasses >= 3) {
    await applyEndgame(gameId, 'stalemate', null, io, prisma)
  }
}
