import type { ApiErrorBody } from '../types/api'
import { getToken } from '../utils/token'

export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message ?? body.error)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    let body: ApiErrorBody
    try {
      body = await res.json() as ApiErrorBody
    } catch {
      body = { error: res.statusText }
    }
    throw new ApiError(res.status, body)
  }
  return res.json() as Promise<T>
}
