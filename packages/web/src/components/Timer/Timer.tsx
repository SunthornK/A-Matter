import { formatTime } from '../../utils/format'
import styles from './Timer.module.css'

interface TimerProps {
  ms: number
  active: boolean
}

export function Timer({ ms, active }: TimerProps) {
  const className = [
    styles.timer,
    active && ms < 60_000 ? styles.crit : '',
    active && ms < 300_000 && ms >= 60_000 ? styles.warn : '',
  ].filter(Boolean).join(' ')

  return <span className={className}>{formatTime(ms)}</span>
}
