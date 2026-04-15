import type { TileSequence, BonusType } from './types'

export function scoreMove(
  sequences: TileSequence[],
  bonusMap: Map<string, BonusType>,
  rackSizeBefore = 0,
  allRackTilesUsed = false,
): number {
  let total = 0
  for (const seq of sequences) {
    total += scoreSequence(seq, bonusMap)
  }
  if (rackSizeBefore === 8 && allRackTilesUsed) total += 40
  return total
}

function scoreSequence(seq: TileSequence, bonusMap: Map<string, BonusType>): number {
  let equationSum = 0
  let wordMultiplier = 1

  for (const tile of seq.tiles) {
    const key = `${tile.row},${tile.col}`
    const bonus = tile.is_new ? (bonusMap.get(key) ?? null) : null

    let tileScore = tile.points
    if (bonus === 'DL') tileScore *= 2
    else if (bonus === 'TL' || bonus === 'center') tileScore *= 3
    else if (bonus === 'DW') wordMultiplier *= 2
    else if (bonus === 'TW') wordMultiplier *= 3

    equationSum += tileScore
  }

  return equationSum * wordMultiplier
}
