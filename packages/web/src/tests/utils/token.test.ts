import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getJwt, setJwt, clearJwt,
  getGuestToken, generateGuestToken, setGuestToken,
  getToken,
} from '../../utils/token'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('getJwt / setJwt / clearJwt', () => {
  it('returns null when nothing stored', () => {
    expect(getJwt()).toBeNull()
  })
  it('stores and retrieves JWT', () => {
    setJwt('abc')
    expect(getJwt()).toBe('abc')
  })
  it('clears JWT', () => {
    setJwt('abc')
    clearJwt()
    expect(getJwt()).toBeNull()
  })
})

describe('generateGuestToken', () => {
  it('returns 64 hex chars', () => {
    const token = generateGuestToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })
  it('returns unique values each call', () => {
    expect(generateGuestToken()).not.toBe(generateGuestToken())
  })
})

describe('getToken', () => {
  it('prefers JWT over guest token', () => {
    setJwt('jwt-token')
    setGuestToken('guest-token')
    expect(getToken()).toBe('jwt-token')
  })
  it('falls back to guest token when no JWT', () => {
    setGuestToken('guest-token')
    expect(getToken()).toBe('guest-token')
  })
  it('returns null when nothing stored', () => {
    expect(getToken()).toBeNull()
  })
})
