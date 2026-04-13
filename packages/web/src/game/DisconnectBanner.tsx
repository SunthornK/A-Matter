import { useGameStore } from '../store/gameStore'
import styles from './DisconnectBanner.module.css'

export function DisconnectBanner() {
  const disconnected = useGameStore(s => s.opponentDisconnected)
  const players = useGameStore(s => s.players)
  const myPlayerId = useGameStore(s => s.myPlayerId)

  if (!disconnected) return null

  const opponent = players.find(p => p.playerId !== myPlayerId)

  return (
    <div className={styles.banner}>
      {opponent?.displayName ?? 'Opponent'} disconnected — waiting for them to reconnect (30s)
    </div>
  )
}
