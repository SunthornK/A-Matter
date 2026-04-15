import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData, BoardCellEntry, PlayerStateEntry } from '../types'
import type { BoardTile } from '@a-matter/validator'
import { recordExchangeMove } from '../db'

type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export async function handleExchange(
  socket: GameSocket,
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
  data: { indices: number[] },
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

  if (!data.indices || data.indices.length === 0) {
    socket.emit('error', { code: 'INVALID_MOVE', message: 'Must exchange at least one tile' })
    return
  }

  const myPlayer = game.players.find((p) => p.id === playerId)!
  const rack = myPlayer.rack as unknown as BoardTile[]

  const invalidIdx = data.indices.find((i) => i < 0 || i >= rack.length)
  if (invalidIdx !== undefined) {
    socket.emit('error', { code: 'INVALID_MOVE', message: `Index ${invalidIdx} out of range` })
    return
  }

  const bag = game.tileBag as unknown as BoardTile[]
  if (bag.length < data.indices.length) {
    socket.emit('error', { code: 'INVALID_MOVE', message: 'Not enough tiles in bag to exchange' })
    return
  }

  if (myPlayer.lastExchangeAt) {
    const msSinceLast = Date.now() - myPlayer.lastExchangeAt.getTime()
    if (msSinceLast < 3000) {
      socket.emit('error', { code: 'INVALID_MOVE', message: 'Exchange is on cooldown' })
      return
    }
  }

  const tilesToReturn = data.indices.map((i) => rack[i]!)
  const remainingRack = rack.filter((_, i) => !data.indices.includes(i))
  const shuffledBag = shuffle([...bag, ...tilesToReturn])
  const newTiles = shuffledBag.slice(0, data.indices.length)
  const newBag = shuffledBag.slice(data.indices.length)
  const newRack = [...remainingRack, ...newTiles]

  const otherPlayer = game.players.find((p) => p.id !== playerId)!
  const timeSpentMs = Date.now() - turnStartedAt

  await recordExchangeMove({
    prisma, gameId, playerId,
    turnNumber: game.turnNumber,
    nextPlayerId: otherPlayer.id,
    exchangedIndices: data.indices,
    newRack,
    newBag,
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
      tiles_remaining: (otherPlayer.rack as unknown as BoardTile[]).length,
    },
  ]

  io.to(`game:${gameId}`).emit('move:result', {
    seq: game.turnNumber + 1,
    type: 'exchange',
    player_id: playerId,
    score_delta: 0,
    board: enrichedBoard,
    bag: newBag.length,
    consecutive_passes: 0,
    turn_number: game.turnNumber + 1,
    current_turn_player_id: otherPlayer.id,
    players: updatedPlayers,
    timestamp: Date.now(),
  })

  socket.emit('rack:update', { rack: newRack, timestamp: Date.now() })
}
