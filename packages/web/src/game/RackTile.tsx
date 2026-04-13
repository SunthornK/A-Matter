import { useGameStore, gameStore } from '../store/gameStore'
import styles from './RackTile.module.css'

interface RackTileProps {
  index: number
}

export function RackTile({ index }: RackTileProps) {
  const tile = useGameStore(s => s.rack[index])
  const isSelected = useGameStore(s => s.selectedRackIndex === index)
  const isFlipped = useGameStore(s => !!s.rackFlipped[index])

  if (!tile) {
    return <div className={`${styles.tile} ${styles.empty}`} data-testid={`rack-slot-${index}`} />
  }

  function handleClick() {
    gameStore.getState().selectRackTile(index)
  }

  function handleDoubleClick() {
    gameStore.getState().toggleRackFlip(index)
  }

  const classNames = [
    styles.tile,
    isSelected ? styles.selected : '',
    isFlipped ? styles.flipped : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      data-testid={`rack-slot-${index}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {!isFlipped && tile.value}
      {!isFlipped && <span className={styles.points}>{tile.points}</span>}
    </div>
  )
}
