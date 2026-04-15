import { apiFetch, API_BASE } from './client'
import type { AuthResponse } from '../types/api'

export async function register(
  username: string,
  email: string,
  password: string,
  display_name: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, display_name }),
  })
}

export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function refreshToken(currentToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentToken}` },
  })
  if (!res.ok) throw new Error('Refresh failed')
  return res.json() as Promise<AuthResponse>
}

/** Decode the `exp` claim from a JWT without verifying the signature. */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!)) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
