// JWT — persists across sessions
export function getJwt(): string | null {
  return localStorage.getItem('token')
}

export function setJwt(token: string): void {
  localStorage.setItem('token', token)
}

export function clearJwt(): void {
  localStorage.removeItem('token')
}

// Guest — dies on tab close
export function getGuestToken(): string | null {
  return sessionStorage.getItem('guestToken')
}

export function generateGuestToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function setGuestToken(token: string): void {
  sessionStorage.setItem('guestToken', token)
}

export function getToken(): string | null {
  return getJwt() ?? getGuestToken()
}
