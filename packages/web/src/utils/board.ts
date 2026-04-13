/** Encode board coordinates as a string key for pendingPlacements */
export function makePendingKey(row: number, col: number): string {
  return `${row},${col}`
}

/** Decode a pendingPlacements key back to [row, col] */
export function parsePendingKey(key: string): [number, number] {
  const parts = key.split(',')
  const r = parts[0] !== undefined ? Number(parts[0]) : 0
  const c = parts[1] !== undefined ? Number(parts[1]) : 0
  return [r, c]
}
