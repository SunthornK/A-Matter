import { useState, useEffect } from 'react'
import { formatTime } from '../../utils/format'
import styles from './Timer.module.css'

interface TimerProps {
  ms: number
  active: boolean
}

export function Timer({ ms, active }: TimerProps) {
  const [display, setDisplay] = useState(ms)

  // Reset when server sends a new value
  useEffect(() => {
    setDisplay(ms)
  }, [ms])

  // Count down locally each second while it's this player's turn
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setDisplay(d => Math.max(0, d - 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [active, ms]) // restart interval when server syncs

  const className = [
    styles.timer,
    active && display < 60_000 ? styles.crit : '',
    active && display < 300_000 && display >= 60_000 ? styles.warn : '',
  ].filter(Boolean).join(' ')

  return <span className={className}>{formatTime(display)}</span>
}
