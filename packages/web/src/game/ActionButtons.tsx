import { useState } from 'react'
import { useGameStore, gameStore } from '../store/gameStore'
import { parsePendingKey } from '../utils/board'
import { ExchangeModal } from './ExchangeModal'
import { ResignModal } from './ResignModal'
import styles from './ActionButtons.module.css'

interface ActionButtonsProps {
  emit: (event: string, data?: unknown) => void
}

export function ActionButtons({ emit }: ActionButtonsProps) {
  const pendingPlacements = useGameStore(s => s.pendingPlacements)
  const [showExchange, setShowExchange] = useState(false)
  const [showResign, setShowResign] = useState(false)

  const hasPending = Object.keys(pendingPlacements).length > 0

  function handlePlay() {
    if (!hasPending) return
    const tiles = Object.entries(pendingPlacements).map(([key, pending]) => {
      const [row, col] = parsePendingKey(key)
      return { value: pending.value, row, col }
    })
    emit('move:place', { tiles })
  }

  function handlePass() {
    emit('move:pass')
  }

  function handleClear() {
    gameStore.getState().clearPending()
  }

  return (
    <>
      <div className={styles.actions}>
        <button
          className={styles.playBtn}
          onClick={handlePlay}
          disabled={!hasPending}
        >
          Play
        </button>
        <div className={styles.secondaryRow}>
          <button className={styles.secondaryBtn} onClick={handlePass}>Pass</button>
          <button className={styles.secondaryBtn} onClick={handleClear}>Clear</button>
          <button className={styles.secondaryBtn} onClick={() => setShowExchange(true)}>Exchange</button>
        </div>
        <button className={styles.resignBtn} onClick={() => setShowResign(true)}>Resign</button>
      </div>

      {showExchange && (
        <ExchangeModal
          emit={emit}
          onClose={() => setShowExchange(false)}
        />
      )}
      {showResign && (
        <ResignModal
          emit={emit}
          onClose={() => setShowResign(false)}
        />
      )}
    </>
  )
}
