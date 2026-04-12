# Web Frontend — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `packages/web` Vite + React + TypeScript package with CSS globals, token utilities, API client, AuthContext, Login page, Register page, and route guards.

**Architecture:** CSS Modules for all styling, no CSS-in-JS. AuthContext holds the current user and token. All REST calls go through a typed `apiFetch` wrapper. Route guards use React Router v6 `<Navigate>`.

**Tech Stack:** Vite 5, React 18, TypeScript 5, React Router v6, TanStack Query v5, Vitest + React Testing Library, CSS Modules

---

## File Map

| File | Purpose |
|------|---------|
| `packages/web/package.json` | Package config — deps, scripts |
| `packages/web/vite.config.ts` | Vite + React plugin, proxy to API |
| `packages/web/tsconfig.json` | TypeScript config |
| `packages/web/index.html` | HTML shell |
| `packages/web/src/main.tsx` | React root mount |
| `packages/web/src/App.tsx` | Router + QueryClient provider + route table |
| `packages/web/src/styles/globals.css` | CSS reset, variables, font imports |
| `packages/web/src/utils/token.ts` | JWT + guest token helpers |
| `packages/web/src/utils/format.ts` | formatTime, formatScore |
| `packages/web/src/utils/board.ts` | makePendingKey, parsePendingKey |
| `packages/web/src/api/client.ts` | apiFetch wrapper + ApiError |
| `packages/web/src/api/auth.ts` | register, login API functions |
| `packages/web/src/api/rooms.ts` | createRoom, joinRoom stubs |
| `packages/web/src/api/users.ts` | getProfile, getMatches stubs |
| `packages/web/src/api/leaderboard.ts` | getLeaderboard stub |
| `packages/web/src/api/admin.ts` | getActiveGames, forceEnd, banUser stubs |
| `packages/web/src/types/api.ts` | REST response types |
| `packages/web/src/types/game.ts` | Game payload types mirroring server |
| `packages/web/src/contexts/AuthContext.tsx` | AuthContext + AuthProvider |
| `packages/web/src/hooks/useAuth.ts` | useAuth hook |
| `packages/web/src/components/Button/Button.tsx` | Styled button primitive |
| `packages/web/src/components/Button/Button.module.css` | Button styles |
| `packages/web/src/pages/LoginPage.tsx` | Login form |
| `packages/web/src/pages/LoginPage.module.css` | Login page styles |
| `packages/web/src/pages/RegisterPage.tsx` | Register form |
| `packages/web/src/pages/RegisterPage.module.css` | Register page styles |
| `packages/web/src/router/guards.tsx` | RequireAuth, RequireAdmin components |
| `packages/web/src/tests/utils/token.test.ts` | Token utility unit tests |
| `packages/web/src/tests/utils/board.test.ts` | Board utility unit tests |
| `packages/web/src/tests/contexts/AuthContext.test.tsx` | AuthContext tests |
| `packages/web/src/tests/pages/LoginPage.test.tsx` | LoginPage RTL tests |
| `packages/web/src/tests/pages/RegisterPage.test.tsx` | RegisterPage RTL tests |
| `packages/web/vitest.config.ts` | Vitest config with jsdom environment |

---

### Task 1: Package scaffold — package.json, tsconfig, vite.config, index.html

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/index.html`

- [ ] **Step 1: Create `packages/web/package.json`**

```json
{
  "name": "@a-matter/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.8.3",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
```

- [ ] **Step 4: Create `packages/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
})
```

- [ ] **Step 5: Create `packages/web/src/tests/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Create `packages/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A-Matter</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Install dependencies**

```bash
cd packages/web && npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/web/package.json packages/web/tsconfig.json packages/web/vite.config.ts packages/web/vitest.config.ts packages/web/src/tests/setup.ts packages/web/index.html
git commit -m "feat(web): scaffold @a-matter/web package with Vite + React + TS"
```

---

### Task 2: CSS globals

**Files:**
- Create: `packages/web/src/styles/globals.css`

- [ ] **Step 1: Write the failing test**

No test for CSS globals — skip to implementation.

- [ ] **Step 2: Create `packages/web/src/styles/globals.css`**

```css
/* Fonts */
:root {
  --font-mono: 'Space Mono', monospace;
  --font-ui: 'Syne', sans-serif;

  /* Colors */
  --bg: #0d0d0f;
  --panel-bg: #17171a;
  --border: #2a2a30;
  --text: #e8e8ec;
  --text-muted: #6b6b7a;

  --tile-bg: #1e1e24;
  --tile-border: #3a3a45;
  --tile-text: #f0f0f4;

  --green: #4ade80;
  --green-dim: #1a4a2e;
  --gold: #f0b429;
  --gold-dim: #3d2e0a;
  --red: #f87171;
  --red-dim: #4a1a1a;
  --blue: #60a5fa;

  /* Bonus square colors */
  --bonus-3eq: #3b2a5a;   /* 3× EQ — purple */
  --bonus-2eq: #1a2a4a;   /* 2× EQ — blue */
  --bonus-3pc: #3b1a1a;   /* 3× PC — red */
  --bonus-2pc: #1a3b1a;   /* 2× PC — green */

  /* Spacing */
  --radius: 6px;
  --radius-sm: 3px;
}

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

button {
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  border: none;
  background: none;
}

input, textarea, select {
  font-family: inherit;
  font-size: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/styles/globals.css
git commit -m "feat(web): CSS globals — variables, reset, fonts"
```

---

### Task 3: Utility modules (token, format, board)

**Files:**
- Create: `packages/web/src/utils/token.ts`
- Create: `packages/web/src/utils/format.ts`
- Create: `packages/web/src/utils/board.ts`
- Create: `packages/web/src/tests/utils/token.test.ts`
- Create: `packages/web/src/tests/utils/board.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/web/src/tests/utils/token.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getJwt, setJwt, clearJwt,
  getGuestToken, generateGuestToken, setGuestToken,
  getToken,
} from '../../utils/token'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('getJwt / setJwt / clearJwt', () => {
  it('returns null when nothing stored', () => {
    expect(getJwt()).toBeNull()
  })
  it('stores and retrieves JWT', () => {
    setJwt('abc')
    expect(getJwt()).toBe('abc')
  })
  it('clears JWT', () => {
    setJwt('abc')
    clearJwt()
    expect(getJwt()).toBeNull()
  })
})

describe('generateGuestToken', () => {
  it('returns 64 hex chars', () => {
    const token = generateGuestToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })
  it('returns unique values each call', () => {
    expect(generateGuestToken()).not.toBe(generateGuestToken())
  })
})

describe('getToken', () => {
  it('prefers JWT over guest token', () => {
    setJwt('jwt-token')
    setGuestToken('guest-token')
    expect(getToken()).toBe('jwt-token')
  })
  it('falls back to guest token when no JWT', () => {
    setGuestToken('guest-token')
    expect(getToken()).toBe('guest-token')
  })
  it('returns null when nothing stored', () => {
    expect(getToken()).toBeNull()
  })
})
```

Create `packages/web/src/tests/utils/board.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makePendingKey, parsePendingKey } from '../../utils/board'

describe('makePendingKey', () => {
  it('formats row,col as "r,c"', () => {
    expect(makePendingKey(0, 0)).toBe('0,0')
    expect(makePendingKey(7, 14)).toBe('7,14')
  })
})

describe('parsePendingKey', () => {
  it('parses "r,c" into [row, col]', () => {
    expect(parsePendingKey('0,0')).toEqual([0, 0])
    expect(parsePendingKey('7,14')).toEqual([7, 14])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/utils/token.test.ts src/tests/utils/board.test.ts
```

Expected: FAIL with module not found errors.

- [ ] **Step 3: Create `packages/web/src/utils/token.ts`**

```ts
// JWT — persists across sessions
export function getJwt(): string | null { return localStorage.getItem('token') }
export function setJwt(token: string): void { localStorage.setItem('token', token) }
export function clearJwt(): void { localStorage.removeItem('token') }

// Guest — dies on tab close
export function getGuestToken(): string | null { return sessionStorage.getItem('guestToken') }
export function generateGuestToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}
export function setGuestToken(token: string): void { sessionStorage.setItem('guestToken', token) }

export function getToken(): string | null { return getJwt() ?? getGuestToken() }
```

- [ ] **Step 4: Create `packages/web/src/utils/format.ts`**

```ts
/** Convert milliseconds to "MM:SS" display string */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Format an integer score with commas */
export function formatScore(score: number): string {
  return score.toLocaleString()
}
```

- [ ] **Step 5: Create `packages/web/src/utils/board.ts`**

```ts
/** Encode board coordinates as a string key for pendingPlacements */
export function makePendingKey(row: number, col: number): string {
  return `${row},${col}`
}

/** Decode a pendingPlacements key back to [row, col] */
export function parsePendingKey(key: string): [number, number] {
  const [r, c] = key.split(',').map(Number)
  return [r as number, c as number]
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/utils/token.test.ts src/tests/utils/board.test.ts
```

Expected: PASS (all tests).

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/utils/ packages/web/src/tests/utils/
git commit -m "feat(web): token, format, and board utility modules"
```

---

### Task 4: Type definitions (api.ts, game.ts)

**Files:**
- Create: `packages/web/src/types/api.ts`
- Create: `packages/web/src/types/game.ts`

No tests — pure type declarations.

- [ ] **Step 1: Create `packages/web/src/types/api.ts`**

```ts
// Auth
export interface AuthUser {
  id: string
  username: string
  display_name: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// User profile
export interface UserProfile {
  id: string
  username: string
  display_name: string
  country: string | null
  rating: number
  rating_deviation: number
  games_played: number
  games_won: number
  created_at: string
}

// Match history entry
export interface MatchEntry {
  id: string
  mode: 'ranked' | 'quickplay' | 'private'
  status: 'active' | 'completed' | 'abandoned'
  created_at: string
  completed_at: string | null
  opponent: {
    id: string
    display_name: string
    username: string | null
  }
  my_score: number
  opponent_score: number
  result: 'win' | 'loss' | 'draw' | null
}

export interface MatchHistoryResponse {
  games: MatchEntry[]
  limit: number
  offset: number
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  username: string
  rating: number
  games_played: number
  games_won: number
  country: string | null
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  total: number
  page: number
}

// Rooms
export interface RoomResponse {
  game_id: string
  invite_code: string
}

// Admin
export interface ActiveGame {
  id: string
  mode: string
  created_at: string
  players: Array<{ display_name: string; score: number }>
}

// API error shape
export interface ApiErrorBody {
  error: string
  message?: string
}
```

- [ ] **Step 2: Create `packages/web/src/types/game.ts`**

```ts
// Mirror server game types for client consumption

export interface BoardCellPayload {
  value: string
  owner: string | null  // player_id; resolve display via owner === myPlayerId
  is_bonus: boolean
  bonus_type: 'b3eq' | 'b2eq' | 'b3pc' | 'b2pc' | null
}

export interface RackTilePayload {
  value: string
  points: number
}

export interface PlayerStatePayload {
  player_id: string
  display_name: string
  score: number
  time_remaining_ms: number
  consecutive_passes: number
  tiles_remaining: number
}

export interface GameStatePayload {
  seq?: number
  game_id: string
  mode: 'ranked' | 'quickplay' | 'private'
  board: (BoardCellPayload | null)[][]
  rack: (RackTilePayload | null)[]
  bag: number
  turn_number: number
  current_turn_player_id: string
  players: PlayerStatePayload[]
  my_player_id: string
}

export interface PlacedTilePayload {
  value: string
  row: number
  col: number
  points: number
}

export interface MoveResultPayload {
  seq?: number
  type: 'place' | 'exchange' | 'pass'
  player_id: string
  score_delta: number
  board: (BoardCellPayload | null)[][]
  placed_tiles?: PlacedTilePayload[]
  expression?: string
  result?: number
  bag: number
  consecutive_passes: number
  turn_number: number
  current_turn_player_id: string
  players: PlayerStatePayload[]
}

export interface RackUpdatePayload {
  rack: (RackTilePayload | null)[]
}

export interface TimerSyncPayload {
  players: Array<{ player_id: string; time_remaining_ms: number }>
  timestamp: number
}

export interface GameOverPayload {
  reason: 'score' | 'timeout' | 'forfeit' | 'resign' | 'stalemate'
  winner_id: string | null
  final_scores: Array<{ player_id: string; score: number }>
}

export interface MoveLogEntry {
  seq: number
  type: 'place' | 'exchange' | 'pass'
  player_id: string
  display_name: string
  expression?: string
  result?: number
  score_delta: number
  turn_number: number
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/types/
git commit -m "feat(web): REST and game payload type definitions"
```

---

### Task 5: API client + auth module

**Files:**
- Create: `packages/web/src/api/client.ts`
- Create: `packages/web/src/api/auth.ts`
- Create: `packages/web/src/api/rooms.ts`
- Create: `packages/web/src/api/users.ts`
- Create: `packages/web/src/api/leaderboard.ts`
- Create: `packages/web/src/api/admin.ts`

- [ ] **Step 1: Create `packages/web/src/api/client.ts`**

```ts
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
```

- [ ] **Step 2: Create `packages/web/src/api/auth.ts`**

```ts
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
```

- [ ] **Step 3: Create `packages/web/src/api/rooms.ts`**

```ts
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
```

- [ ] **Step 4: Create `packages/web/src/api/users.ts`**

```ts
import { apiFetch } from './client'
import type { UserProfile, MatchHistoryResponse } from '../types/api'

export async function getProfile(username: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/users/${username}`)
}

export async function getMatches(userId: string, limit = 20, offset = 0): Promise<MatchHistoryResponse> {
  return apiFetch<MatchHistoryResponse>(`/api/users/${userId}/games?limit=${limit}&offset=${offset}`)
}
```

- [ ] **Step 5: Create `packages/web/src/api/leaderboard.ts`**

```ts
import { apiFetch } from './client'
import type { LeaderboardResponse } from '../types/api'

export async function getLeaderboard(page = 1, country?: string): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ page: String(page) })
  if (country) params.set('country', country)
  return apiFetch<LeaderboardResponse>(`/api/leaderboard?${params}`)
}
```

- [ ] **Step 6: Create `packages/web/src/api/admin.ts`**

```ts
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
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/api/
git commit -m "feat(web): API client with apiFetch wrapper and all api/ modules"
```

---

### Task 6: AuthContext + useAuth hook

**Files:**
- Create: `packages/web/src/contexts/AuthContext.tsx`
- Create: `packages/web/src/hooks/useAuth.ts`
- Test: `packages/web/src/tests/contexts/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/tests/contexts/AuthContext.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../contexts/AuthContext'
import { useAuth } from '../../hooks/useAuth'

// Helper component that exposes auth state
function AuthDisplay() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div>loading</div>
  if (!user) return <div>no user</div>
  return <div>user:{user.username}</div>
}

function LoginButton() {
  const { login } = useAuth()
  return <button onClick={() => login('alice', 'password')}>login</button>
}

function LogoutButton() {
  const { logout } = useAuth()
  return <button onClick={() => logout()}>logout</button>
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('AuthContext', () => {
  it('shows no user when localStorage is empty', () => {
    render(<AuthProvider><AuthDisplay /></AuthProvider>)
    expect(screen.getByText('no user')).toBeInTheDocument()
  })

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'alice', display_name: 'Alice' }))
    render(<AuthProvider><AuthDisplay /></AuthProvider>)
    expect(screen.getByText('user:alice')).toBeInTheDocument()
  })

  it('clears user and token on logout', async () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'alice', display_name: 'Alice' }))
    render(<AuthProvider><AuthDisplay /><LogoutButton /></AuthProvider>)

    await userEvent.click(screen.getByText('logout'))
    expect(screen.getByText('no user')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/web && npx vitest run src/tests/contexts/AuthContext.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AuthUser } from '../types/api'
import { login as apiLogin, register as apiRegister } from '../api/auth'
import { setJwt, clearJwt } from '../utils/token'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)
  const [isLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password)
    setJwt(res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    setUser(res.user)
  }, [])

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    const res = await apiRegister(username, password, displayName)
    setJwt(res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    clearJwt()
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>')
  return ctx
}
```

- [ ] **Step 4: Create `packages/web/src/hooks/useAuth.ts`**

```ts
export { useAuthContext as useAuth } from '../contexts/AuthContext'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/contexts/AuthContext.test.tsx
```

Expected: PASS (all 3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/contexts/ packages/web/src/hooks/
git commit -m "feat(web): AuthContext and useAuth hook"
```

---

### Task 7: Button primitive component

**Files:**
- Create: `packages/web/src/components/Button/Button.tsx`
- Create: `packages/web/src/components/Button/Button.module.css`

No test — simple presentational wrapper.

- [ ] **Step 1: Create `packages/web/src/components/Button/Button.module.css`**

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 14px;
  transition: opacity 0.15s, background 0.15s;
  white-space: nowrap;
}

.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Variants */
.primary {
  background: var(--green);
  color: #0d0d0f;
}
.primary:hover:not(:disabled) {
  opacity: 0.85;
}

.secondary {
  background: var(--panel-bg);
  color: var(--text);
  border: 1px solid var(--border);
}
.secondary:hover:not(:disabled) {
  background: var(--tile-bg);
}

.danger {
  background: var(--red-dim);
  color: var(--red);
  border: 1px solid var(--red);
}
.danger:hover:not(:disabled) {
  background: var(--red);
  color: #0d0d0f;
}

.ghost {
  background: transparent;
  color: var(--text-muted);
}
.ghost:hover:not(:disabled) {
  color: var(--text);
}

/* Sizes */
.sm {
  padding: 6px 14px;
  font-size: 12px;
}

.lg {
  padding: 14px 28px;
  font-size: 16px;
}

.full {
  width: 100%;
}
```

- [ ] **Step 2: Create `packages/web/src/components/Button/Button.tsx`**

```tsx
import styles from './Button.module.css'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    full ? styles.full : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/Button/
git commit -m "feat(web): Button primitive with variant and size props"
```

---

### Task 8: LoginPage

**Files:**
- Create: `packages/web/src/pages/LoginPage.tsx`
- Create: `packages/web/src/pages/LoginPage.module.css`
- Test: `packages/web/src/tests/pages/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/tests/pages/LoginPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import LoginPage from '../../pages/LoginPage'

// Mock the api/auth module
vi.mock('../../api/auth', () => ({
  login: vi.fn(),
}))

import * as authApi from '../../api/auth'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={<div>lobby</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renders username and password inputs', () => {
    renderLogin()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('calls login with form values on submit', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(authApi.login).toHaveBeenCalledWith('alice', 'password')
  })

  it('redirects to /lobby on successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('lobby')).toBeInTheDocument())
  })

  it('shows error message on failed login', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))
    renderLogin()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/web && npx vitest run src/tests/pages/LoginPage.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/pages/LoginPage.module.css`**

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.card {
  width: 380px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px;
}

.heading {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.subheading {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 32px;
}

.fieldset {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input {
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: var(--green);
}

.error {
  color: var(--red);
  font-size: 13px;
  margin-bottom: 16px;
}

.footer {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.link {
  color: var(--green);
  font-weight: 600;
}

.link:hover {
  opacity: 0.8;
}
```

- [ ] **Step 4: Create `packages/web/src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button/Button'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>A-Matter</h1>
        <p className={styles.subheading}>Sign in to play</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldset}>
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username</label>
              <input
                id="username"
                className={styles.input}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" full disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className={styles.footer}>
          No account?{' '}
          <Link to="/register" className={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/pages/LoginPage.test.tsx
```

Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/LoginPage.tsx packages/web/src/pages/LoginPage.module.css packages/web/src/tests/pages/LoginPage.test.tsx
git commit -m "feat(web): LoginPage with form, error handling, and redirect"
```

---

### Task 9: RegisterPage

**Files:**
- Create: `packages/web/src/pages/RegisterPage.tsx`
- Create: `packages/web/src/pages/RegisterPage.module.css`
- Test: `packages/web/src/tests/pages/RegisterPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/tests/pages/RegisterPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import RegisterPage from '../../pages/RegisterPage'

vi.mock('../../api/auth', () => ({
  register: vi.fn(),
}))

import * as authApi from '../../api/auth'

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/lobby" element={<div>lobby</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('RegisterPage', () => {
  it('renders username, display_name, and password inputs', () => {
    renderRegister()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('calls register with form values on submit', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(authApi.register).toHaveBeenCalledWith('alice', 'password', 'Alice')
  })

  it('redirects to /lobby after registration', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.getByText('lobby')).toBeInTheDocument())
  })

  it('shows error on failed registration', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('Username taken'))
    renderRegister()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.getByText(/username taken/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/web && npx vitest run src/tests/pages/RegisterPage.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/pages/RegisterPage.module.css`**

Same layout as LoginPage — copy the same CSS with one addition:

```css
/* same as LoginPage.module.css */
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.card {
  width: 380px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px;
}

.heading {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.subheading {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 32px;
}

.fieldset {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input {
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: var(--green);
}

.error {
  color: var(--red);
  font-size: 13px;
  margin-bottom: 16px;
}

.footer {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.link {
  color: var(--green);
  font-weight: 600;
}

.link:hover {
  opacity: 0.8;
}
```

- [ ] **Step 4: Create `packages/web/src/pages/RegisterPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button/Button'
import styles from './RegisterPage.module.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(username, password, displayName)
      navigate('/lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>A-Matter</h1>
        <p className={styles.subheading}>Create your account</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldset}>
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username</label>
              <input
                id="username"
                className={styles.input}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="displayName" className={styles.label}>Display Name</label>
              <input
                id="displayName"
                className={styles.input}
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="nickname"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" full disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/pages/RegisterPage.test.tsx
```

Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/RegisterPage.tsx packages/web/src/pages/RegisterPage.module.css packages/web/src/tests/pages/RegisterPage.test.tsx
git commit -m "feat(web): RegisterPage with form, error handling, and redirect"
```

---

### Task 10: Route guards + App shell (main.tsx, App.tsx)

**Files:**
- Create: `packages/web/src/router/guards.tsx`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/main.tsx`

- [ ] **Step 1: Create `packages/web/src/router/guards.tsx`**

```tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getGuestToken } from '../utils/token'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** If true, also accepts a guest token (for /game/:gameId) */
  allowGuest?: boolean
}

export function RequireAuth({ children, allowGuest }: Props) {
  const { user } = useAuth()
  const location = useLocation()

  const hasAccess = user !== null || (allowGuest && getGuestToken() !== null)

  if (!hasAccess) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  // 'role' field may not be in the stored user yet — treat as non-admin
  const asAny = user as Record<string, unknown>
  if (asAny['role'] !== 'admin') {
    return <Navigate to="/lobby" replace />
  }
  return <>{children}</>
}
```

- [ ] **Step 2: Create `packages/web/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth, RequireAdmin } from './router/guards'
import { useAuth } from './hooks/useAuth'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Lazy placeholders — will be filled in Plan 6 and 7
const LobbyPage = () => <div>Lobby — coming soon</div>
const JoinPage = () => <div>Join — coming soon</div>
const GamePage = () => <div>Game — coming soon</div>
const ProfilePage = () => <div>Profile — coming soon</div>
const LeaderboardPage = () => <div>Leaderboard — coming soon</div>
const AdminPage = () => <div>Admin — coming soon</div>

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/lobby" replace /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/join/:inviteCode" element={<JoinPage />} />
            <Route
              path="/lobby"
              element={<RequireAuth><LobbyPage /></RequireAuth>}
            />
            <Route
              path="/game/:gameId"
              element={<RequireAuth allowGuest><GamePage /></RequireAuth>}
            />
            <Route
              path="/profile/:userId"
              element={<RequireAuth><ProfilePage /></RequireAuth>}
            />
            <Route
              path="/leaderboard"
              element={<RequireAuth><LeaderboardPage /></RequireAuth>}
            />
            <Route
              path="/admin"
              element={<RequireAdmin><AdminPage /></RequireAdmin>}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Create `packages/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('#root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Verify the app builds without errors**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 5: Run all web tests**

```bash
cd packages/web && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/router/ packages/web/src/App.tsx packages/web/src/main.tsx
git commit -m "feat(web): route guards, App shell, and main entry point"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered |
|-----------------|---------|
| Vite + React + TS package scaffold | Task 1 |
| CSS globals with all design variables | Task 2 |
| Space Mono + Syne fonts | Task 2 + index.html |
| `src/utils/token.ts` with JWT + guest helpers | Task 3 |
| `src/utils/format.ts` formatTime, formatScore | Task 3 |
| `src/utils/board.ts` makePendingKey, parsePendingKey | Task 3 |
| `src/types/api.ts` REST response shapes | Task 4 |
| `src/types/game.ts` payload types | Task 4 |
| `apiFetch` wrapper with auth header injection | Task 5 |
| `ApiError` class | Task 5 |
| All `api/` modules (auth, rooms, users, leaderboard, admin) | Task 5 |
| `AuthContext` with login, register, logout | Task 6 |
| `useAuth` hook | Task 6 |
| `<Button>` with variant and size props | Task 7 |
| `LoginPage` with form + error + redirect | Task 8 |
| `RegisterPage` with form + error + redirect | Task 9 |
| `<RequireAuth>` + `allowGuest` for `/game/:gameId` | Task 10 |
| `<RequireAdmin>` redirects non-admins to `/lobby` | Task 10 |
| Route table matching spec exactly | Task 10 |
| Root redirect: `/lobby` if JWT, `/login` otherwise | Task 10 |

**Placeholder scan:** None found.

**Type consistency:** `AuthUser` defined in `api.ts` Task 4, used in `AuthContext` Task 6. `AuthResponse` used in `auth.ts` Task 5. All consistent.
