import { apiFetch } from './client'
import type { UserProfile, MatchHistoryResponse } from '../types/api'

export async function getProfile(username: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/users/${username}`)
}

export async function getMatches(userId: string, limit = 20, offset = 0): Promise<MatchHistoryResponse> {
  return apiFetch<MatchHistoryResponse>(`/api/users/${userId}/games?limit=${limit}&offset=${offset}`)
}
