import { apiFetch } from './client'
import type { AuthResponse } from '../types/api'

export async function register(
  username: string,
  password: string,
  display_name: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, display_name }),
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
