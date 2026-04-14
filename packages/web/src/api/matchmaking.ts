import { apiFetch } from './client'
import type { MatchStatusResponse } from '../types/api'

export async function joinQueue(type: 'ranked' | 'quickplay'): Promise<void> {
  await apiFetch('/api/matchmaking/join', {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}

export async function leaveQueue(): Promise<void> {
  await apiFetch('/api/matchmaking/leave', { method: 'DELETE' })
}

export async function getMatchStatus(): Promise<MatchStatusResponse> {
  return apiFetch<MatchStatusResponse>('/api/matchmaking/status')
}
