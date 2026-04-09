import type { Socket, Server } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import type { ClientEvents, ServerEvents, SocketData } from '../types'
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
    include: { players: true },
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

  // 3-second debounce
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

  io.to(`game:${gameId}`).emit('move:result', {
    player_id: playerId,
    turn_number: game.turnNumber,
    action: 'exchange',
    score_earned: 0,
    new_score: myPlayer.score,
    next_player_id: otherPlayer.id,
    timestamp: Date.now(),
  })

  socket.emit('rack:update', { rack: newRack, timestamp: Date.now() })
}
