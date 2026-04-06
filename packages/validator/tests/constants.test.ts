import { describe, it, expect } from 'vitest'
import { TILE_DEFINITIONS, createTileBag, BONUS_SQUARES } from '../src/constants'

describe('tile bag', () => {
  it('total tile count is exactly 100', () => {
    const bag = createTileBag()
    expect(bag).toHaveLength(100)
  })

  it('each tile has a unique tile_id', () => {
    const bag = createTileBag()
    const ids = new Set(bag.map((t) => t.tile_id))
    expect(ids.size).toBe(100)
  })

  it('blank tiles have 0 points', () => {
    const bag = createTileBag()
    bag.filter((t) => t.type === 'blank').forEach((t) => {
      expect(t.points).toBe(0)
    })
  })

  it('exactly 4 blank tiles', () => {
    const bag = createTileBag()
    expect(bag.filter((t) => t.type === 'blank')).toHaveLength(4)
  })

  it('exactly 11 equals tiles', () => {
    const bag = createTileBag()
    expect(bag.filter((t) => t.type === 'equals')).toHaveLength(11)
  })

  it('number tiles 0-3 have 5 copies each', () => {
    const bag = createTileBag()
    for (const n of ['0', '1', '2', '3']) {
      expect(bag.filter((t) => t.value === n)).toHaveLength(5)
    }
  })

  it('TILE_DEFINITIONS sums to 100', () => {
    const total = TILE_DEFINITIONS.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(100)
  })
})

describe('bonus squares', () => {
  it('BONUS_SQUARES is a 15×15 grid', () => {
    expect(BONUS_SQUARES).toHaveLength(15)
    BONUS_SQUARES.forEach((row) => expect(row).toHaveLength(15))
  })

  it('center square (7,7) is "center"', () => {
    expect(BONUS_SQUARES[7]?.[7]).toBe('center')
  })

  it('corner (0,0) is "TW"', () => {
    expect(BONUS_SQUARES[0]?.[0]).toBe('TW')
  })

  it('board is symmetric — top-left mirrors bottom-right', () => {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(BONUS_SQUARES[r]?.[c]).toBe(BONUS_SQUARES[14 - r]?.[14 - c])
      }
    }
  })
})
