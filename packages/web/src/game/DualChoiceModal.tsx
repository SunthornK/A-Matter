import { useState } from 'react'
import { useGameStore, gameStore } from '../store/gameStore'
import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'
import styles from './DualChoiceModal.module.css'

// All possible blank designations (numbers + operators)
const BLANK_OPTIONS = [
  '0','1','2','3','4','5','6','7','8','9',
  '10','11','12','13','14','15','16','17','18','19','20',
  '+','-','×','÷','=',
]

export function DualChoiceModal() {
  const pendingChoice = useGameStore(s => s.pendingChoice)
  const rack = useGameStore(s => s.rack)
  const [blankInput, setBlankInput] = useState('')

  if (!pendingChoice) return null

  const tile = rack[pendingChoice.rackIndex]
  if (!tile) return null

  const { row, col, rackIndex } = pendingChoice

  function confirm(dualChoice: '+' | '-' | '×' | '÷' | null, blankDesignation: string | null) {
    gameStore.getState().placeTile(rackIndex, row, col, dualChoice, blankDesignation)
  }

  function handleCancel() {
    gameStore.getState().setPendingChoice(null)
  }

  if (tile.type === 'dual_operator') {
    const [optA, optB] = tile.value === '+/-'
      ? ['+', '-'] as const
      : ['×', '÷'] as const

    return (
      <Modal
        title="Choose operator"
        onBackdropClick={handleCancel}
        body={
          <div className={styles.choiceRow}>
            <button className={styles.choiceBtn} onClick={() => confirm(optA, null)}>{optA}</button>
            <button className={styles.choiceBtn} onClick={() => confirm(optB, null)}>{optB}</button>
          </div>
        }
        actions={<Button variant="secondary" onClick={handleCancel}>Cancel</Button>}
      />
    )
  }

  // blank tile
  return (
    <Modal
      title="Designate blank tile"
      onBackdropClick={handleCancel}
      body={
        <div>
          <div className={styles.blankGrid}>
            {BLANK_OPTIONS.map(opt => (
              <button
                key={opt}
                className={`${styles.blankBtn} ${blankInput === opt ? styles.blankBtnSelected : ''}`}
                onClick={() => setBlankInput(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      }
      actions={
        <>
          <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!blankInput}
            onClick={() => blankInput && confirm(null, blankInput)}
          >
            Confirm
          </Button>
        </>
      }
    />
  )
}
