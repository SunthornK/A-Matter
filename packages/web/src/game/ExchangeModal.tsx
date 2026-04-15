import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'
import styles from './ExchangeModal.module.css'

interface ExchangeModalProps {
  emit: (event: string, data?: unknown) => void
  onClose: () => void
}

export function ExchangeModal({ emit, onClose }: ExchangeModalProps) {
  const rack = useGameStore(s => s.rack)
  const bag = useGameStore(s => s.bag)
  const [selected, setSelected] = useState<number[]>([])

  const canExchange = bag >= 5

  function toggleTile(index: number) {
    setSelected(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  function handleConfirm() {
    if (selected.length === 0) return
    emit('move:exchange', { indices: selected })
    onClose()
  }

  return (
    <Modal
      title="Exchange Tiles"
      body={
        <>
          {!canExchange && (
            <p className={styles.warning}>Exchange requires at least 5 tiles in the bag ({bag} remaining).</p>
          )}
          <div className={styles.tileRow}>
            {rack.map((tile, i) =>
              tile ? (
                <div
                  key={i}
                  className={`${styles.tile} ${selected.includes(i) ? styles.tileSelected : ''} ${!canExchange ? styles.tileDisabled : ''}`}
                  onClick={() => canExchange && toggleTile(i)}
                >
                  {tile.type === 'blank' ? '' : tile.value}
                </div>
              ) : null
            )}
          </div>
        </>
      }
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canExchange || selected.length === 0}
          >
            Exchange {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </>
      }
    />
  )
}
