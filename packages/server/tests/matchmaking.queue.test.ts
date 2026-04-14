import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  addToQueue, removeFromQueue, isInQueue,
  recordMatch, getMatch, clearMatch, clearAllMatches,
} from '../src/services/matchmaking.queue'

beforeEach(() => {
  removeFromQueue('user-1')
  removeFromQueue('user-2')
  clearAllMatches()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('recordMatch / getMatch / clearMatch', () => {
  it('getMatch returns gameId after recordMatch', () => {
    recordMatch('user-1', 'game-abc')
    expect(getMatch('user-1')).toBe('game-abc')
  })

  it('getMatch returns the same gameId on repeated calls until expiry', () => {
    recordMatch('user-1', 'game-abc')
    expect(getMatch('user-1')).toBe('game-abc')
    expect(getMatch('user-1')).toBe('game-abc')
  })

  it('getMatch returns null after 5-minute expiry', () => {
    vi.useFakeTimers()
    recordMatch('user-1', 'game-abc')
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(getMatch('user-1')).toBeNull()
  })

  it('getMatch returns gameId just before expiry', () => {
    vi.useFakeTimers()
    recordMatch('user-1', 'game-abc')
    vi.advanceTimersByTime(5 * 60 * 1000 - 1)
    expect(getMatch('user-1')).toBe('game-abc')
  })

  it('clearMatch removes entry before it is read', () => {
    recordMatch('user-1', 'game-abc')
    clearMatch('user-1')
    expect(getMatch('user-1')).toBeNull()
  })

  it('getMatch returns null for an unknown userId', () => {
    expect(getMatch('nobody')).toBeNull()
  })
})
