import type { PrismaClient } from '@prisma/client'
import type { Socket } from 'socket.io'
import type { ClientEvents, ServerEvents, SocketData } from './types'
import { verifyTokenPayload } from '../services/auth.service'
import { config } from '../config'

export function authMiddleware(prisma: PrismaClient) {
  return async (
    socket: Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>,
    next: (err?: Error) => void,
  ) => {
    const token = socket.handshake.query['token']
    const gameId = socket.handshake.query['game_id']

    if (!gameId || typeof gameId !== 'string') {
      return next(new Error('game_id query param is required'))
    }

    // Guest token path
    const guestToken = socket.handshake.query['guest_token']
    if (guestToken && typeof guestToken === 'string') {
      const player = await prisma.gamePlayer.findFirst({
        where: { guestToken, gameId },
        include: { game: true },
      })
      if (!player || player.game.status !== 'active') {
        return next(new Error('Unauthorized'))
      }
      socket.data = {
        userId: null,
        guestToken,
        gameId,
        playerId: player.id,
        seat: player.seat,
        displayName: `Guest ${player.seat}`,
      }
      return next()
    }

    // JWT path
    if (!token || typeof token !== 'string') {
      return next(new Error('Unauthorized: missing token'))
    }

    let payload: { user_id: string; token_version: number }
    try {
      payload = verifyTokenPayload(token, config.jwtSecret)
    } catch {
      return next(new Error('Unauthorized: invalid token'))
    }

    // Check token_version
    const user = await prisma.user.findUnique({
      where: { id: payload.user_id },
      select: { tokenVersion: true, displayName: true },
    })
    if (!user || user.tokenVersion !== payload.token_version) {
      return next(new Error('Unauthorized: token invalidated'))
    }

    // Find the game player for this user in this game
    const player = await prisma.gamePlayer.findFirst({
      where: { userId: payload.user_id, gameId },
      include: { game: true },
    })
    if (!player) {
      return next(new Error('Unauthorized: not a player in this game'))
    }
    if (player.game.status !== 'active') {
      return next(new Error('Game is not active'))
    }

    socket.data = {
      userId: payload.user_id,
      guestToken: null,
      gameId,
      playerId: player.id,
      seat: player.seat,
      displayName: user.displayName,
    }
    next()
  }
}
