import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { gameStore } from '../store/gameStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? ''

export function useGameSocket(
  gameId: string,
  jwt: string,
  guestToken: string,
): (event: string, data?: unknown) => void {
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  useEffect(() => {
    // Skip connection if gameId is empty (invalid game link guard in GamePage)
    if (!gameId) return

    const query: Record<string, string> = { game_id: gameId }
    if (guestToken) {
      query.guest_token = guestToken
    } else {
      query.token = jwt
    }

    const socket = io(WS_URL, {
      path: '/ws',
      query,
      transports: ['websocket'],
    })
    socketRef.current = socket

    gameStore.setState({ status: 'connecting' })

    let lastSeq = -1

    socket.on('connect', () => gameStore.setState({ status: 'connected' }))
    socket.on('disconnect', () => gameStore.setState({ status: 'disconnected' }))

    socket.on('game:state', (payload) => {
      lastSeq = payload.seq ?? lastSeq
      gameStore.getState().applyGameState(payload)
    })

    socket.on('move:result', (payload) => {
      if (payload.seq != null && payload.seq !== lastSeq + 1) {
        socket.emit('state:request')
      }
      lastSeq = payload.seq ?? lastSeq
      gameStore.getState().applyMoveResult(payload)
    })

    socket.on('rack:update', (payload) => gameStore.getState().applyRackUpdate(payload))
    socket.on('timer:sync', (payload) => gameStore.getState().applyTimerSync(payload))
    socket.on('game:over', (payload) => gameStore.getState().applyGameOver(payload))

    socket.on('player:disconnect', ({ player_id }: { player_id: string }) => {
      if (player_id !== gameStore.getState().myPlayerId) {
        gameStore.getState().setOpponentDisconnected(true)
      }
    })

    socket.on('player:reconnect', ({ player_id }: { player_id: string }) => {
      if (player_id !== gameStore.getState().myPlayerId) {
        gameStore.getState().setOpponentDisconnected(false)
      }
    })

    socket.on('error', ({ message }: { code: string; message: string }) => {
      gameStore.getState().setError(message)
    })

    socket.on('server:ping', () => socket.emit('server:pong'))

    return () => {
      socket.disconnect()
      socketRef.current = null
      gameStore.getState().resetGame()
    }
  }, [gameId, jwt, guestToken])

  return useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])
}
