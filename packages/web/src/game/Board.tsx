import { Cell } from './Cell'
import styles from './Board.module.css'

export function Board() {
  return (
    <div className={styles.board}>
      {Array.from({ length: 15 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) => (
          <Cell key={`${row}-${col}`} row={row} col={col} />
        ))
      )}
    </div>
  )
}
