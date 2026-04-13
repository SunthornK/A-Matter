import { useGameStore, gameStore } from '../store/gameStore'
import { makePendingKey } from '../utils/board'
import styles from './Cell.module.css'

// Bonus square coordinates — matches server layout
const BONUS_MAP: Record<string, 'b3eq' | 'b2eq' | 'b3pc' | 'b2pc'> = {
  '0,0': 'b3eq', '0,7': 'b3eq', '0,14': 'b3eq',
  '7,0': 'b3eq', '7,14': 'b3eq',
  '14,0': 'b3eq', '14,7': 'b3eq', '14,14': 'b3eq',
  '0,3': 'b2eq', '0,11': 'b2eq', '3,0': 'b2eq', '3,14': 'b2eq',
  '11,0': 'b2eq', '11,14': 'b2eq', '14,3': 'b2eq', '14,11': 'b2eq',
  '3,3': 'b2eq', '3,11': 'b2eq', '11,3': 'b2eq', '11,11': 'b2eq',
  '1,5': 'b3pc', '1,9': 'b3pc', '5,1': 'b3pc', '5,13': 'b3pc',
  '9,1': 'b3pc', '9,13': 'b3pc', '13,5': 'b3pc', '13,9': 'b3pc',
  '2,6': 'b2pc', '2,8': 'b2pc', '6,2': 'b2pc', '6,12': 'b2pc',
  '8,2': 'b2pc', '8,12': 'b2pc', '12,6': 'b2pc', '12,8': 'b2pc',
  '5,5': 'b2pc', '5,9': 'b2pc', '9,5': 'b2pc', '9,9': 'b2pc',
}

interface CellProps {
  row: number
  col: number
}

export function Cell({ row, col }: CellProps) {
  const key = makePendingKey(row, col)
  const cell = useGameStore(s => s.board[row]?.[col] ?? null)
  const pending = useGameStore(s => s.pendingPlacements[key])
  const myPlayerId = useGameStore(s => s.myPlayerId)

  const isCenter = row === 7 && col === 7
  const bonusType = BONUS_MAP[key] ?? null

  function handleClick() {
    const state = gameStore.getState()

    if (pending) {
      state.returnTile(key)
      return
    }

    if (cell) {
      return
    }

    if (state.selectedRackIndex !== null) {
      state.placeTile(state.selectedRackIndex, row, col)
    }
  }

  const classNames = [
    styles.cell,
    isCenter && !cell && !pending ? styles.center : '',
    !cell && !pending && bonusType === 'b3eq' ? styles.bonus3eq : '',
    !cell && !pending && bonusType === 'b2eq' ? styles.bonus2eq : '',
    !cell && !pending && bonusType === 'b3pc' ? styles.bonus3pc : '',
    !cell && !pending && bonusType === 'b2pc' ? styles.bonus2pc : '',
    cell && !pending ? (
      cell.owner === myPlayerId ? styles.occupiedMine :
      cell.owner !== null ? styles.occupiedOpponent :
      styles.occupied
    ) : '',
    pending ? styles.pending : '',
  ].filter(Boolean).join(' ')

  const displayValue = pending?.value ?? cell?.value ?? ''

  return (
    <div
      className={classNames}
      data-testid={`cell-${row}-${col}`}
      onClick={handleClick}
    >
      {displayValue}
    </div>
  )
}
