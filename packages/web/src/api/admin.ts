import { apiFetch } from './client'
import type { ActiveGame } from '../types/api'

export async function getActiveGames(): Promise<ActiveGame[]> {
  return apiFetch<ActiveGame[]>('/api/admin/games/active')
}

export async function forceEndGame(gameId: string): Promise<void> {
  return apiFetch<void>(`/api/admin/games/${gameId}/end`, { method: 'POST' })
}

export async function banUser(userId: string): Promise<void> {
  return apiFetch<void>(`/api/admin/users/${userId}/ban`, { method: 'POST' })
}
