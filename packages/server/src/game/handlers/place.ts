import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData, PlacementInput } from '../types'
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

  // Load game state
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: { players: true },
  })

  // Check it's this player's turn
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
  const isFirstMove = game.turnNumber === 1

  // Map PlacementInput to Placement
  const placements: Placement[] = data.placements.map((p) => ({
    tile_id: p.tile_id,
    rack_index: p.rack_index,
    row: p.row,
    col: p.col,
    dual_choice: p.dual_choice,
    blank_designation: p.blank_designation,
  }))

  const result = validateMove({ board, placements, rack, rackSizeBefore: rack.length, isFirstMove })

  if (!result.is_valid) {
    socket.emit('error', { code: 'INVALID_MOVE', message: result.error ?? 'Invalid move' })
    return
  }

  // Remove placed tiles from rack
  const placedIndices = new Set(data.placements.map((p) => p.rack_index))
  const remainingRack = rack.filter((_, i) => !placedIndices.has(i))

  // Draw replacement tiles from bag
  const bag = shuffle(game.tileBag as unknown as BoardTile[])
  const drawCount = Math.min(data.placements.length, bag.length)
  const newTiles = bag.slice(0, drawCount)
  const newBag = bag.slice(drawCount)
  const newRack = [...remainingRack, ...newTiles]

  // Update board
  const newBoard = board.map((row) => [...row])
  for (const p of data.placements) {
    const tile = rack[p.rack_index]
    if (!tile) continue
    const placedTile: BoardTile = {
      ...tile,
      display_value: p.dual_choice ?? p.blank_designation ?? tile.display_value,
      dual_choice: p.dual_choice,
      blank_designation: p.blank_designation,
    }
    newBoard[p.row]![p.col] = placedTile
  }

  // Determine next player
  const otherPlayer = game.players.find((p) => p.id !== playerId)!
  const nextPlayerId = otherPlayer.id
  const timeSpentMs = Date.now() - turnStartedAt

  // Compute completion endgame bonus (if applicable) before the atomic write
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

  // Broadcast move:result to room
  io.to(`game:${gameId}`).emit('move:result', {
    player_id: playerId,
    turn_number: game.turnNumber,
    action: 'place',
    placements: data.placements,
    score_earned: result.total_score,
    new_score: myPlayer.score + result.total_score,
    next_player_id: nextPlayerId,
    timestamp: Date.now(),
  })

  // Send updated rack to acting player only
  socket.emit('rack:update', { rack: newRack, timestamp: Date.now() })

  if (isCompletion) {
    const updatedPlayers = await prisma.gamePlayer.findMany({ where: { gameId } })
    io.to(`game:${gameId}`).emit('game:over', {
      reason: 'completion',
      winner_player_id: playerId,
      final_scores: updatedPlayers.map((p) => ({ player_id: p.id, score: p.score })),
      timestamp: Date.now(),
    })
  }
}
