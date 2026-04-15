import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData, PlacementInput, BoardCellEntry, PlayerStateEntry } from '../types'
import type { BoardTile, Placement } from '@a-matter/validator'
import { validateMove } from '@a-matter/validator'
import { recordPlaceMove } from '../db'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export async function handlePlace(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  data: { placements: PlacementInput[] },
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

  if (!data.placements || data.placements.length === 0) {
    socket.emit('error', { code: 'INVALID_MOVE', message: 'Placements cannot be empty' })
    return
  }

  const myPlayer = game.players.find((p) => p.id === playerId)!
  const rack = myPlayer.rack as unknown as BoardTile[]
  const board = (game.boardState as { cells: (BoardTile | null)[][] }).cells
  const isFirstMove = board.every((row) => row.every((cell) => cell == null))

  const placements: Placement[] = data.placements.map((p) => ({
    tile_id: p.tile_id,
    rack_index: p.rack_index,
    row: p.row,
    col: p.col,
    dual_choice: p.dual_choice,
    blank_designation: p.blank_designation,
  }))

  const result = validateMove({ board, placements, rack, isFirstMove, rackSizeBefore: rack.length })

  if (!result.is_valid) {
    socket.emit('error', { code: 'INVALID_MOVE', message: result.error ?? 'Invalid move' })
    return
  }

  const placedIndices = new Set(data.placements.map((p) => p.rack_index))
  const remainingRack = rack.filter((_, i) => !placedIndices.has(i))

  const bag = shuffle(game.tileBag as unknown as BoardTile[])
  const drawCount = Math.min(data.placements.length, bag.length)
  const newTiles = bag.slice(0, drawCount)
  const newBag = bag.slice(drawCount)
  const newRack = [...remainingRack, ...newTiles]

  // Update board, storing owner so the client can highlight tiles by player
  const newBoard = board.map((row) => [...row])
  const placedTilesForPayload: Array<{ value: string; row: number; col: number; points: number }> = []
  for (const p of data.placements) {
    const tile = rack[p.rack_index]
    if (!tile) continue
    const placedTile: BoardCellEntry = {
      ...tile,
      display_value: p.dual_choice ?? p.blank_designation ?? tile.display_value,
      dual_choice: p.dual_choice,
      blank_designation: p.blank_designation,
      owner: playerId,
    }
    newBoard[p.row]![p.col] = placedTile as unknown as BoardTile
    // Use tile.value (original rack identity) not display_value so the tracker counts blanks as blanks
    placedTilesForPayload.push({ value: tile.value, row: p.row, col: p.col, points: tile.points })
  }

  const otherPlayer = game.players.find((p) => p.id !== playerId)!
  const nextPlayerId = otherPlayer.id
  const timeSpentMs = Date.now() - turnStartedAt

  const isCompletion = newRack.length === 0 && newBag.length === 0
  const opponentRack = otherPlayer.rack as unknown as BoardTile[]
  const winnerBonus = isCompletion
    ? opponentRack.reduce((sum, t) => sum + t.points, 0) * 2
    : 0

  await recordPlaceMove({
    prisma, gameId, playerId,
    turnNumber: game.turnNumber,
    placements: data.placements,
    equations: result.equations,
    scoreEarned: result.total_score,
    newRack,
    newBoard,
    newBag,
    nextPlayerId,
    timeSpentMs,
    completionEndgame: isCompletion ? { winnerBonus } : undefined,
  })

  // Build enriched board with owner fields preserved
  const enrichedBoard: (BoardCellEntry | null)[][] = newBoard.map((row) =>
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
      score: myPlayer.score + result.total_score + (isCompletion ? winnerBonus : 0),
      time_remaining_ms: myPlayer.timeRemainingMs,
      consecutive_passes: 0,
      tiles_remaining: newRack.length,
    },
    {
      player_id: otherPlayer.id,
      user_id: otherPlayer.userId,
      display_name: otherPlayer.user?.displayName ?? `Guest ${otherPlayer.seat}`,
      seat: otherPlayer.seat,
      score: otherPlayer.score,
      time_remaining_ms: otherPlayer.timeRemainingMs,
      consecutive_passes: otherPlayer.consecutivePasses,
      tiles_remaining: opponentRack.length,
    },
  ]

  const firstEq = result.equations[0]

  io.to(`game:${gameId}`).emit('move:result', {
    seq: game.turnNumber + 1,
    type: 'place',
    player_id: playerId,
    score_delta: result.total_score,
    board: enrichedBoard,
    placed_tiles: placedTilesForPayload,
    expression: firstEq?.expression,
    result: firstEq?.right_value
      ? firstEq.right_value.numerator / firstEq.right_value.denominator
      : undefined,
    bag: newBag.length,
    consecutive_passes: 0,
    turn_number: game.turnNumber + 1,
    current_turn_player_id: nextPlayerId,
    players: updatedPlayers,
    timestamp: Date.now(),
  })

  socket.emit('rack:update', { rack: newRack, timestamp: Date.now() })

  if (isCompletion) {
    const updatedFinalPlayers = await prisma.gamePlayer.findMany({ where: { gameId } })
    io.to(`game:${gameId}`).emit('game:over', {
      reason: 'score',
      winner_id: playerId,
      final_scores: updatedFinalPlayers.map((p) => ({ player_id: p.id, score: p.score })),
      timestamp: Date.now(),
    })
  }
}
