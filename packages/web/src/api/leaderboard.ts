import { apiFetch } from './client'
import type { LeaderboardResponse } from '../types/api'

export async function getLeaderboard(page = 1, country?: string): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ page: String(page) })
  if (country) params.set('country', country)
  return apiFetch<LeaderboardResponse>(`/api/leaderboard?${params}`)
}
