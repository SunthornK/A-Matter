import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getGuestToken } from '../utils/token'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** If true, also accepts a guest token (for /game/:gameId) */
  allowGuest?: boolean
}

export function RequireAuth({ children, allowGuest }: Props) {
  const { user } = useAuth()
  const location = useLocation()

  const hasAccess = user !== null || (allowGuest && getGuestToken() !== null)

  if (!hasAccess) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  // TODO: server must include role in the JWT payload and login response
  if (user.role !== 'admin') {
    return <Navigate to="/lobby" replace />
  }
  return <>{children}</>
}
