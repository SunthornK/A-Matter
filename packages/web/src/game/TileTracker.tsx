import { useGameStore, gameStore } from '../store/gameStore'
import styles from './TileTracker.module.css'

// Total tile counts in the bag (game design values)
const TILE_DISTRIBUTION: Record<string, number> = {
  '0': 4, '1': 6, '2': 6, '3': 6, '4': 5, '5': 5,
  '6': 5, '7': 4, '8': 4, '9': 4,
  '+': 8, '-': 6, '×': 4, '÷': 4, '=': 8,
  '_': 2,  // blank
}

export function TileTracker() {
  const tileTracker = useGameStore(s => s.tileTracker)
  const mode = useGameStore(s => s.mode)

  return (
    <div className={styles.tracker}>
      <div className={styles.heading}>Tiles</div>
      {Object.entries(TILE_DISTRIBUTION).map(([value, total]) => {
        const seen = tileTracker[value] ?? 0
        const remaining = total - seen
        const isSeen = remaining <= 0

        return (
          <div
            key={value}
            className={`${styles.entry} ${isSeen ? styles.entrySeen : ''}`}
            onClick={() => mode === 'ranked' && gameStore.getState().toggleTileTracked(value)}
            title={mode === 'ranked' ? 'Click to mark as seen' : undefined}
          >
            <span className={styles.tileLabel}>{value}</span>
            <span className={styles.count}>{remaining}x</span>
          </div>
        )
      })}
    </div>
  )
}
