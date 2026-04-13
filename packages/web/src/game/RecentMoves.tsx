import { useGameStore } from '../store/gameStore'
import styles from './RecentMoves.module.css'

export function RecentMoves() {
  const recentMoves = useGameStore(s => s.recentMoves)

  if (recentMoves.length === 0) return null

  return (
    <div className={styles.moves}>
      {recentMoves.map((move, i) => (
        <div key={i} className={styles.entry}>
          <div className={styles.header}>
            <span className={styles.player}>{move.display_name}</span>
            {move.score_delta > 0 && (
              <span className={styles.scoreDelta}>+{move.score_delta}</span>
            )}
          </div>
          {move.type === 'place' && move.expression ? (
            <span className={styles.expression}>
              {move.expression} = {move.result}
            </span>
          ) : (
            <span className={styles.moveType}>
              {move.type === 'pass' ? 'Passed' : 'Exchanged tiles'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
