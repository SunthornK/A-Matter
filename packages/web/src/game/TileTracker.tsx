import { useGameStore, gameStore } from '../store/gameStore'
import styles from './TileTracker.module.css'

// Total tile counts in the bag (A-Math spec, 100 tiles total)
const TILE_DISTRIBUTION: Record<string, number> = {
  '0': 5, '1': 6, '2': 6, '3': 5, '4': 5, '5': 4,
  '6': 4, '7': 4, '8': 4, '9': 4,
  '10': 2, '11': 1, '12': 2, '13': 1, '14': 1,
  '15': 1, '16': 1, '17': 1, '18': 1, '19': 1, '20': 1,
  '+': 4, '-': 4, '×': 4, '÷': 4,
  '+/-': 5, '×/÷': 4,
  '=': 11,
  'blank': 4,
}

const TILE_LABELS: Record<string, string> = {
  'blank': '□',
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
            className={`${styles.entry} ${mode === 'ranked' ? styles.entryRanked : ''} ${isSeen ? styles.entrySeen : ''}`}
            onClick={() => mode === 'ranked' && gameStore.getState().toggleTileTracked(value)}
            title={mode === 'ranked' ? 'Click to mark as seen' : undefined}
          >
            <span className={styles.tileLabel}>{TILE_LABELS[value] ?? value}</span>
            <span className={styles.count}>{remaining}x</span>
          </div>
        )
      })}
    </div>
  )
}
