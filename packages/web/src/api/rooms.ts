import { apiFetch } from './client'
import type { RoomResponse } from '../types/api'

export async function createRoom(): Promise<RoomResponse> {
  return apiFetch<RoomResponse>('/api/rooms', { method: 'POST' })
}

export async function joinRoom(
  invite_code: string,
  display_name?: string,
): Promise<RoomResponse> {
  return apiFetch<RoomResponse>('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify(display_name ? { invite_code, display_name } : { invite_code }),
  })
}
