import { apiFetch } from './client'
import type { RoomResponse, RoomStatusResponse } from '../types/api'

export async function createRoom(): Promise<RoomResponse> {
  return apiFetch<RoomResponse>('/api/rooms/create', {
    method: 'POST',
    body: JSON.stringify({ type: 'private' }),
  })
}

export async function joinRoom(
  invite_code: string,
  display_name?: string,
  guest_token?: string,
): Promise<RoomResponse> {
  const body: Record<string, string> = { invite_code }
  if (display_name) body.display_name = display_name
  if (guest_token) body.guest_token = guest_token
  return apiFetch<RoomResponse>('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getRoomStatus(inviteCode: string): Promise<RoomStatusResponse> {
  return apiFetch<RoomStatusResponse>(`/api/rooms/${inviteCode}/status`)
}
