import { RackTile } from './RackTile'
import styles from './Rack.module.css'

export function Rack() {
  return (
    <div className={styles.rack}>
      {Array.from({ length: 8 }, (_, i) => (
        <RackTile key={i} index={i} />
      ))}
    </div>
  )
}
