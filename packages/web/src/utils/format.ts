/** Convert milliseconds to "MM:SS" display string */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Format an integer score with commas */
export function formatScore(score: number): string {
  return score.toLocaleString()
}
