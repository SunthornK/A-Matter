import { useGameStore } from '../store/gameStore'
import { Timer } from '../components/Timer/Timer'
import { RecentMoves } from './RecentMoves'
import { formatScore } from '../utils/format'
import styles from './InfoPanel.module.css'

interface InfoPanelProps {
  emit: (event: string, data?: unknown) => void
}

export function InfoPanel({ emit: _emit }: InfoPanelProps) {
  const players = useGameStore(s => s.players)
  const myPlayerId = useGameStore(s => s.myPlayerId)
  const currentTurnPlayerId = useGameStore(s => s.currentTurnPlayerId)
  const bag = useGameStore(s => s.bag)

  // Show my card first
  const sorted = [...players].sort((a, b) =>
    a.playerId === myPlayerId ? -1 : b.playerId === myPlayerId ? 1 : 0
  )

  return (
    <div className={styles.panel}>
      {sorted.map(player => {
        const isMe = player.playerId === myPlayerId
        const isActive = player.playerId === currentTurnPlayerId
        return (
          <div
            key={player.playerId}
            className={`${styles.playerCard} ${isActive ? styles.active : ''}`}
          >
            <div className={styles.playerName}>
              <span>{player.displayName}</span>
              {isMe && <span className={styles.you}>you</span>}
            </div>
            <div className={styles.score}>{formatScore(player.score)}</div>
            <div className={styles.tilesLeft}>{player.tilesRemaining} tiles</div>
            <Timer ms={player.timeRemainingMs} active={isActive} />
          </div>
        )
      })}

      <p className={styles.bagCount}>{bag} tiles in bag</p>

      <hr className={styles.divider} />

      <div>
        <p className={styles.sectionLabel}>Recent moves</p>
        <RecentMoves />
      </div>
    </div>
  )
}
