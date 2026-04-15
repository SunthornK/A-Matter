import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { AuthUser } from '../types/api'
import { login as apiLogin, register as apiRegister, refreshToken, getTokenExpiry } from '../api/auth'
import { setJwt, clearJwt, getJwt } from '../utils/token'

const REFRESH_BEFORE_EXPIRY_MS = 60_000 // refresh 1 min before expiry

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  register: (username: string, email: string, password: string, displayName: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.id !== 'string' || typeof parsed?.username !== 'string' || typeof parsed?.display_name !== 'string') {
      localStorage.removeItem('user')
      return null
    }
    return parsed as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)
  const [isLoading, setIsLoading] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expiry = getTokenExpiry(token)
    if (!expiry) return
    const delay = expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS
    if (delay <= 0) return
    refreshTimerRef.current = setTimeout(async () => {
      const current = getJwt()
      if (!current) return
      try {
        const res = await refreshToken(current)
        setJwt(res.token)
        localStorage.setItem('user', JSON.stringify(res.user))
        scheduleRefresh(res.token)
      } catch {
        // Refresh failed — leave the user logged in; they'll get a 401 on the next API call
      }
    }, delay)
  }, [])

  // Schedule refresh for any token already in storage on mount
  useEffect(() => {
    const token = getJwt()
    if (token && user) scheduleRefresh(token)
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await apiLogin(username, password)
      setJwt(res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setUser(res.user)
      scheduleRefresh(res.token)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }, [scheduleRefresh])

  const register = useCallback(async (username: string, email: string, password: string, displayName: string) => {
    setIsLoading(true)
    try {
      const res = await apiRegister(username, email, password, displayName)
      setJwt(res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setUser(res.user)
      scheduleRefresh(res.token)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }, [scheduleRefresh])

  const logout = useCallback(() => {
    clearJwt()
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>')
  return ctx
}
