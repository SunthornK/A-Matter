/** Encode board coordinates as a string key for pendingPlacements */
export function makePendingKey(row: number, col: number): string {
  return `${row},${col}`
}

/** Decode a pendingPlacements key back to [row, col] */
export function parsePendingKey(key: string): [number, number] {
  const [r, c] = key.split(',').map(Number)
  return [r as number, c as number]
}
