# Matchmaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "not available" stub on LobbyPage with working ranked and quickplay matchmaking backed by a server-side matching loop and client polling.

**Architecture:** The server extends its in-memory queue service with a matched-games map, adds a 2-second matching loop that creates Room+Game+GamePlayers when two compatible players are found, and exposes a `GET /api/matchmaking/status` polling endpoint. The client adds a `useMatchmaking` hook that polls every 2.5 seconds and navigates to `/game/:gameId` on match. LobbyPage replaces its stub with this hook.

**Tech Stack:** Fastify, Prisma, Socket.IO (server); TanStack Query v5, React Router v6, CSS Modules (web); Vitest (both)

---

## File Map

| File | Change |
|------|--------|
| `packages/server/src/services/matchmaking.queue.ts` | Add `matchedGames` map + `recordMatch`, `getMatch`, `clearMatch` |
| `packages/server/src/services/matchmaking.loop.ts` | New — matching algorithm + `createMatchedGame` + `startMatchLoop` |
| `packages/server/src/routes/matchmaking.ts` | Add `GET /api/matchmaking/status` |
| `packages/server/src/server.ts` | Call `startMatchLoop(prisma)` after listen |
| `packages/server/tests/matchmaking.queue.test.ts` | New — unit tests for matched map |
| `packages/server/tests/matchmaking.loop.test.ts` | New — unit tests for algorithm |
| `packages/server/tests/matchmaking.test.ts` | Add status endpoint integration tests + `aliceId` capture |
| `packages/web/src/types/api.ts` | Add `MatchStatusResponse` interface |
| `packages/web/src/api/matchmaking.ts` | New — `joinQueue`, `leaveQueue`, `getMatchStatus` |
| `packages/web/src/hooks/useMatchmaking.ts` | New — polling hook |
| `packages/web/src/tests/hooks/useMatchmaking.test.tsx` | New — hook tests |
| `packages/web/src/pages/LobbyPage.tsx` | Wire `useMatchmaking`, replace stub |
| `packages/web/src/pages/LobbyPage.module.css` | Add `.queueStatus` back |
| `packages/web/src/tests/pages/LobbyPage.test.tsx` | Add matchmaking tests |

---

### Task 1: Extend matchmaking.queue.ts with matched map

**Files:**
- Modify: `packages/server/src/services/matchmaking.queue.ts`
- Create: `packages/server/tests/matchmaking.queue.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/server/tests/matchmaking.queue.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  addToQueue, removeFromQueue, isInQueue,
  recordMatch, getMatch, clearMatch,
} from '../src/services/matchmaking.queue'

beforeEach(() => {
  removeFromQueue('user-1')
  removeFromQueue('user-2')
  clearMatch('user-1')
  clearMatch('user-2')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('recordMatch / getMatch / clearMatch', () => {
  it('getMatch returns gameId after recordMatch', () => {
    recordMatch('user-1', 'game-abc')
    expect(getMatch('user-1')).toBe('game-abc')
  })

  it('getMatch clears the entry on first read — second call returns null', () => {
    recordMatch('user-1', 'game-abc')
    getMatch('user-1')
    expect(getMatch('user-1')).toBeNull()
  })

  it('getMatch returns null after 5-minute expiry', () => {
    vi.useFakeTimers()
    recordMatch('user-1', 'game-abc')
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    expect(getMatch('user-1')).toBeNull()
  })

  it('clearMatch removes entry before it is read', () => {
    recordMatch('user-1', 'game-abc')
    clearMatch('user-1')
    expect(getMatch('user-1')).toBeNull()
  })

  it('getMatch returns null for an unknown userId', () => {
    expect(getMatch('nobody')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && npx vitest run tests/matchmaking.queue.test.ts 2>&1 | tail -10
```

Expected: FAIL — `recordMatch is not a function`.

- [ ] **Step 3: Add matched map to matchmaking.queue.ts**

Append to the end of `packages/server/src/services/matchmaking.queue.ts` (after the existing exports):

```ts
// ── Matched-games map ──────────────────────────────────────────────────────

interface MatchedEntry {
  gameId: string
  matchedAt: number
}

const MATCH_EXPIRY_MS = 5 * 60 * 1000

const matchedGames = new Map<string, MatchedEntry>()

export function recordMatch(userId: string, gameId: string): void {
  matchedGames.set(userId, { gameId, matchedAt: Date.now() })
}

/** Returns the gameId and clears the entry on first read. Returns null if not found or expired. */
export function getMatch(userId: string): string | null {
  const entry = matchedGames.get(userId)
  if (!entry) return null
  if (Date.now() - entry.matchedAt > MATCH_EXPIRY_MS) {
    matchedGames.delete(userId)
    return null
  }
  matchedGames.delete(userId)
  return entry.gameId
}

export function clearMatch(userId: string): void {
  matchedGames.delete(userId)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && npx vitest run tests/matchmaking.queue.test.ts 2>&1 | tail -10
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/matchmaking.queue.ts packages/server/tests/matchmaking.queue.test.ts
git commit -m "feat(server): matched-games map in matchmaking queue"
```

---

### Task 2: Matching loop — algorithm + game creation

**Files:**
- Create: `packages/server/src/services/matchmaking.loop.ts`
- Create: `packages/server/tests/matchmaking.loop.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/server/tests/matchmaking.loop.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  addToQueue, removeFromQueue, isInQueue, getMatch, clearMatch,
} from '../src/services/matchmaking.queue'
import { runMatchLoop, ratingWindow, ratingsOverlap } from '../src/services/matchmaking.loop'
import type { QueueEntry } from '../src/services/matchmaking.queue'

// Minimal prisma mock — only the methods createMatchedGame calls
const mockPrisma = {
  room: { create: vi.fn() },
  game: { create: vi.fn(), update: vi.fn() },
  gamePlayer: { create: vi.fn() },
} as unknown as PrismaClient

const USER_IDS = ['user-1', 'user-2', 'user-3']

beforeEach(() => {
  vi.clearAllMocks()
  for (const id of USER_IDS) {
    removeFromQueue(id)
    clearMatch(id)
  }
  mockPrisma.room.create = vi.fn().mockResolvedValue({ id: 'room-1' })
  mockPrisma.game.create = vi.fn().mockResolvedValue({ id: 'game-1' })
  mockPrisma.game.update = vi.fn().mockResolvedValue({})
  // player-1 for seat 1, player-2 for seat 2
  ;(mockPrisma.gamePlayer.create as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ id: 'player-1', seat: 1 })
    .mockResolvedValueOnce({ id: 'player-2', seat: 2 })
})

describe('ratingWindow', () => {
  it('returns 150 for a freshly queued player', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() }
    expect(ratingWindow(e)).toBe(150)
  })

  it('returns 200 after 30 seconds', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 30_000) }
    expect(ratingWindow(e)).toBe(200)
  })

  it('returns 250 after 60 seconds', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 60_000) }
    expect(ratingWindow(e)).toBe(250)
  })

  it('caps at 400 after 5+ minutes', () => {
    const e: QueueEntry = { userId: 'u', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 300_000) }
    expect(ratingWindow(e)).toBe(400)
  })
})

describe('ratingsOverlap', () => {
  it('returns true when difference is within the fresh window of 150', () => {
    const a: QueueEntry = { userId: 'u1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() }
    const b: QueueEntry = { userId: 'u2', glickoRating: 1600, queueType: 'ranked', joinedAt: new Date() }
    // |1500 - 1600| = 100 ≤ 150
    expect(ratingsOverlap(a, b)).toBe(true)
  })

  it('returns false when difference exceeds both windows', () => {
    const a: QueueEntry = { userId: 'u1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() }
    const b: QueueEntry = { userId: 'u2', glickoRating: 1800, queueType: 'ranked', joinedAt: new Date() }
    // |1500 - 1800| = 300 > 150
    expect(ratingsOverlap(a, b)).toBe(false)
  })

  it('uses the wider of the two windows', () => {
    // a has waited 60s → window 250; b is fresh → window 150; diff = 175
    const a: QueueEntry = { userId: 'u1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date(Date.now() - 60_000) }
    const b: QueueEntry = { userId: 'u2', glickoRating: 1675, queueType: 'ranked', joinedAt: new Date() }
    // max(250, 150) = 250 ≥ 175 → overlap
    expect(ratingsOverlap(a, b)).toBe(true)
  })
})

describe('runMatchLoop', () => {
  it('quickplay: pairs any two players regardless of rating', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1000, queueType: 'quickplay', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 2000, queueType: 'quickplay', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(getMatch('user-1')).toBe('game-1')
    expect(getMatch('user-2')).toBe('game-1')
  })

  it('ranked: pairs players within rating window', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1600, queueType: 'ranked', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(getMatch('user-1')).toBe('game-1')
    expect(getMatch('user-2')).toBe('game-1')
  })

  it('ranked: does not pair players outside rating window', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'ranked', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1800, queueType: 'ranked', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(getMatch('user-1')).toBeNull()
    expect(getMatch('user-2')).toBeNull()
  })

  it('both players are removed from queue after a successful match', async () => {
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(isInQueue('user-1')).toBe(false)
    expect(isInQueue('user-2')).toBe(false)
  })

  it('keeps players in queue if DB game creation fails', async () => {
    mockPrisma.room.create = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    addToQueue({ userId: 'user-1', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    addToQueue({ userId: 'user-2', glickoRating: 1500, queueType: 'quickplay', joinedAt: new Date() })
    await runMatchLoop(mockPrisma)
    expect(isInQueue('user-1')).toBe(true)
    expect(isInQueue('user-2')).toBe(true)
    expect(getMatch('user-1')).toBeNull()
    expect(getMatch('user-2')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && npx vitest run tests/matchmaking.loop.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../src/services/matchmaking.loop'`.

- [ ] **Step 3: Create `packages/server/src/services/matchmaking.loop.ts`**

```ts
import type { PrismaClient } from '@prisma/client'
import { createTileBag } from '@a-matter/validator/src/constants'
import { getQueue, removeFromQueue, recordMatch } from './matchmaking.queue'
import type { QueueEntry } from './matchmaking.queue'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function ratingWindow(entry: QueueEntry): number {
  const waitedSeconds = (Date.now() - entry.joinedAt.getTime()) / 1000
  const expansion = Math.floor(waitedSeconds / 30) * 50
  return Math.min(150 + expansion, 400)
}

export function ratingsOverlap(a: QueueEntry, b: QueueEntry): boolean {
  const window = Math.max(ratingWindow(a), ratingWindow(b))
  return Math.abs(a.glickoRating - b.glickoRating) <= window
}

async function createMatchedGame(
  userId1: string,
  userId2: string,
  type: 'ranked' | 'quickplay',
  prisma: PrismaClient,
): Promise<string> {
  const emptyBoard = { cells: Array.from({ length: 15 }, () => Array(15).fill(null)) }
  const bag = shuffle(createTileBag())
  const rack1 = bag.slice(0, 8)
  const rack2 = bag.slice(8, 16)
  const remainingBag = bag.slice(16)

  const room = await prisma.room.create({
    data: {
      type,
      timePerSideMs: 1320000,
      status: 'in_game',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  const game = await prisma.game.create({
    data: {
      roomId: room.id,
      mode: type,
      status: 'active',
      boardState: emptyBoard as unknown as never,
      tileBag: remainingBag as unknown as never,
    },
  })

  const player1 = await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      userId: userId1,
      seat: 1,
      rack: rack1 as unknown as never,
      timeRemainingMs: 1320000,
    },
  })

  await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      userId: userId2,
      seat: 2,
      rack: rack2 as unknown as never,
      timeRemainingMs: 1320000,
    },
  })

  await prisma.game.update({
    where: { id: game.id },
    data: { currentTurnPlayerId: player1.id },
  })

  return game.id
}

async function matchQueue(
  type: 'ranked' | 'quickplay',
  prisma: PrismaClient,
): Promise<void> {
  const queue = [...getQueue(type)] as QueueEntry[]
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i]!
    for (let j = i + 1; j < queue.length; j++) {
      const b = queue[j]!
      const eligible = type === 'quickplay' || ratingsOverlap(a, b)
      if (eligible) {
        try {
          const gameId = await createMatchedGame(a.userId, b.userId, type, prisma)
          removeFromQueue(a.userId)
          removeFromQueue(b.userId)
          recordMatch(a.userId, gameId)
          recordMatch(b.userId, gameId)
        } catch (err) {
          console.error('matchmaking: failed to create game', err)
          // Both users remain in queue — will be retried next tick
        }
        return // one match per tick per queue
      }
    }
  }
}

export async function runMatchLoop(prisma: PrismaClient): Promise<void> {
  await matchQueue('ranked', prisma)
  await matchQueue('quickplay', prisma)
}

export function startMatchLoop(prisma: PrismaClient): ReturnType<typeof setInterval> {
  return setInterval(() => {
    runMatchLoop(prisma).catch(err => console.error('matchmaking loop error:', err))
  }, 2000)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && npx vitest run tests/matchmaking.loop.test.ts 2>&1 | tail -10
```

Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/matchmaking.loop.ts packages/server/tests/matchmaking.loop.test.ts
git commit -m "feat(server): matchmaking loop — algorithm, rating window, game creation"
```

---

### Task 3: Status endpoint + start loop in server.ts

**Files:**
- Modify: `packages/server/src/routes/matchmaking.ts`
- Modify: `packages/server/src/server.ts`
- Modify: `packages/server/tests/matchmaking.test.ts`

- [ ] **Step 1: Write the failing status endpoint tests**

The existing `matchmaking.test.ts` captures `aliceToken` but not `aliceId`. Update the `beforeAll` and add new `describe` block.

Replace the top of `packages/server/tests/matchmaking.test.ts` (lines 1–30) with:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/app'
import { prisma } from '@a-matter/db'
import { recordMatch, clearMatch } from '../src/services/matchmaking.queue'

let aliceToken: string
let aliceId: string
let bobToken: string
const ts = Date.now()

beforeAll(async () => {
  const app = await buildApp()

  const aRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `alice_mm_${ts}`, email: `alice_mm_${ts}@test.com`, password: 'Password123!', display_name: 'Alice MM' },
  })
  const aBody = JSON.parse(aRes.body)
  aliceToken = aBody.token
  aliceId = aBody.user.id

  const bRes = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { username: `bob_mm_${ts}`, email: `bob_mm_${ts}@test.com`, password: 'Password123!', display_name: 'Bob MM' },
  })
  bobToken = JSON.parse(bRes.body).token

  await app.close()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [`alice_mm_${ts}`, `bob_mm_${ts}`] } } })
  await prisma.$disconnect()
})
```

Then append this new `describe` block at the end of the file (after the existing `DELETE /api/matchmaking/leave` tests):

```ts
describe('GET /api/matchmaking/status', () => {
  it('returns not_queued when user is not in queue', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'not_queued' })
    await app.close()
  })

  it('returns queued with queue_type when user is in queue', async () => {
    const app = await buildApp()
    await app.inject({
      method: 'POST', url: '/api/matchmaking/join',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { type: 'ranked' },
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ status: 'queued', queue_type: 'ranked' })
    // clean up
    await app.inject({ method: 'DELETE', url: '/api/matchmaking/leave', headers: { authorization: `Bearer ${aliceToken}` } })
    await app.close()
  })

  it('returns matched with game_id when match has been recorded', async () => {
    const app = await buildApp()
    recordMatch(aliceId, 'game-test-xyz')
    const res = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('matched')
    expect(body.game_id).toBe('game-test-xyz')
    // getMatch cleared it on read — confirm second call returns not_queued
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/matchmaking/status',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    expect(JSON.parse(res2.body).status).toBe('not_queued')
    await app.close()
  })

  it('requires authentication', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/matchmaking/status' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/server && npx vitest run tests/matchmaking.test.ts 2>&1 | tail -15
```

Expected: FAIL — status endpoint tests return 404.

- [ ] **Step 3: Add status endpoint to matchmaking.ts**

Add this route inside `matchmakingRoutes` in `packages/server/src/routes/matchmaking.ts`, after the `DELETE /api/matchmaking/leave` block:

```ts
  // GET /api/matchmaking/status
  app.get(
    '/api/matchmaking/status',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as { user_id: string }

      const gameId = getMatch(user.user_id)
      if (gameId) {
        return reply.send({ status: 'matched', game_id: gameId })
      }

      if (isInQueue(user.user_id)) {
        const allQueued = [...getQueue('ranked'), ...getQueue('quickplay')]
        const entry = allQueued.find(e => e.userId === user.user_id)
        return reply.send({ status: 'queued', queue_type: entry?.queueType ?? null })
      }

      return reply.send({ status: 'not_queued' })
    },
  )
```

Also update the imports at the top of `packages/server/src/routes/matchmaking.ts`:

```ts
import type { FastifyInstance } from 'fastify'
import { addToQueue, removeFromQueue, getQueue, isInQueue, getMatch } from '../services/matchmaking.queue'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/server && npx vitest run tests/matchmaking.test.ts 2>&1 | tail -10
```

Expected: PASS (all tests, including 4 new status tests).

- [ ] **Step 5: Start the loop in server.ts**

Replace the contents of `packages/server/src/server.ts` with:

```ts
import { buildApp } from './app'
import { config } from './config'
import { createSocketServer } from './socket'
import { prisma } from '@a-matter/db'
import { startMatchLoop } from './services/matchmaking.loop'

const app = await buildApp()

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  createSocketServer(app.server, prisma)
  startMatchLoop(prisma)
  console.log(`Server running on port ${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

- [ ] **Step 6: Run all server tests**

```bash
cd packages/server && npx vitest run 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/routes/matchmaking.ts packages/server/src/server.ts packages/server/tests/matchmaking.test.ts
git commit -m "feat(server): GET /api/matchmaking/status endpoint + start loop on boot"
```

---

### Task 4: Web — types + API module

**Files:**
- Modify: `packages/web/src/types/api.ts`
- Create: `packages/web/src/api/matchmaking.ts`

- [ ] **Step 1: Add MatchStatusResponse to types/api.ts**

Append to `packages/web/src/types/api.ts` (after the existing `RoomResponse` block):

```ts
// Matchmaking
export interface MatchStatusResponse {
  status: 'matched' | 'queued' | 'not_queued'
  game_id?: string
  queue_type?: 'ranked' | 'quickplay'
}
```

- [ ] **Step 2: Create `packages/web/src/api/matchmaking.ts`**

```ts
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
```

- [ ] **Step 3: TypeScript check**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | grep -v "^$" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/types/api.ts packages/web/src/api/matchmaking.ts
git commit -m "feat(web): MatchStatusResponse type + matchmaking API module"
```

---

### Task 5: useMatchmaking hook + tests

**Files:**
- Create: `packages/web/src/hooks/useMatchmaking.ts`
- Create: `packages/web/src/tests/hooks/useMatchmaking.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/hooks/useMatchmaking.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMatchmaking } from '../../hooks/useMatchmaking'

vi.mock('../../api/matchmaking', () => ({
  joinQueue: vi.fn(),
  leaveQueue: vi.fn(),
  getMatchStatus: vi.fn(),
}))

import * as mmApi from '../../api/matchmaking'

// Test component that exposes hook state + actions as DOM elements
function TestComponent() {
  const { queueState, queueType, join, cancel } = useMatchmaking()
  return (
    <div>
      <span data-testid="state">{queueState}</span>
      <span data-testid="type">{queueType ?? ''}</span>
      <button onClick={() => join('ranked')}>join-ranked</button>
      <button onClick={() => join('quickplay')}>join-quickplay</button>
      <button onClick={() => cancel()}>cancel</button>
    </div>
  )
}

function renderHook() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route path="/lobby" element={<TestComponent />} />
          <Route path="/game/:gameId" element={<div data-testid="game-page">game</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(mmApi.joinQueue).mockResolvedValue(undefined)
  vi.mocked(mmApi.leaveQueue).mockResolvedValue(undefined)
  vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'not_queued' })
})

describe('useMatchmaking', () => {
  it('initial state is idle with no queueType', () => {
    renderHook()
    expect(screen.getByTestId('state').textContent).toBe('idle')
    expect(screen.getByTestId('type').textContent).toBe('')
  })

  it('join("ranked") calls joinQueue and sets state to queued', async () => {
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('queued'))
    expect(screen.getByTestId('type').textContent).toBe('ranked')
    expect(mmApi.joinQueue).toHaveBeenCalledWith('ranked')
  })

  it('join("quickplay") calls joinQueue with quickplay', async () => {
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-quickplay' }))
    await waitFor(() => expect(mmApi.joinQueue).toHaveBeenCalledWith('quickplay'))
  })

  it('navigates to /game/:gameId when status poll returns matched', async () => {
    vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'matched', game_id: 'g99' })
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('game-page')).toBeInTheDocument())
  })

  it('cancel calls leaveQueue and resets state to idle', async () => {
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('queued'))
    await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('idle'))
    expect(screen.getByTestId('type').textContent).toBe('')
    expect(mmApi.leaveQueue).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/hooks/useMatchmaking.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../../hooks/useMatchmaking'`.

- [ ] **Step 3: Create `packages/web/src/hooks/useMatchmaking.ts`**

```ts
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { joinQueue, leaveQueue, getMatchStatus } from '../api/matchmaking'

type QueueState = 'idle' | 'queued' | 'matched'

export function useMatchmaking() {
  const navigate = useNavigate()
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [queueType, setQueueType] = useState<'ranked' | 'quickplay' | null>(null)

  const { data: statusData } = useQuery({
    queryKey: ['matchmaking', 'status'],
    queryFn: getMatchStatus,
    refetchInterval: 2500,
    enabled: queueState === 'queued',
  })

  useEffect(() => {
    if (statusData?.status === 'matched' && statusData.game_id) {
      setQueueState('matched')
      navigate(`/game/${statusData.game_id}`)
    }
  }, [statusData, navigate])

  const join = useCallback(async (type: 'ranked' | 'quickplay') => {
    await joinQueue(type)
    setQueueType(type)
    setQueueState('queued')
  }, [])

  const cancel = useCallback(async () => {
    await leaveQueue()
    setQueueState('idle')
    setQueueType(null)
  }, [])

  return { queueState, queueType, join, cancel }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/hooks/useMatchmaking.test.tsx 2>&1 | tail -10
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useMatchmaking.ts packages/web/src/tests/hooks/useMatchmaking.test.tsx
git commit -m "feat(web): useMatchmaking hook — join queue, poll status, navigate on match"
```

---

### Task 6: LobbyPage integration

**Files:**
- Modify: `packages/web/src/pages/LobbyPage.tsx`
- Modify: `packages/web/src/pages/LobbyPage.module.css`
- Modify: `packages/web/src/tests/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Write the new LobbyPage tests**

Add to `packages/web/src/tests/pages/LobbyPage.test.tsx` after the existing mocks and imports:

```tsx
vi.mock('../../api/matchmaking', () => ({
  joinQueue: vi.fn(),
  leaveQueue: vi.fn(),
  getMatchStatus: vi.fn(),
}))

import * as mmApi from '../../api/matchmaking'
```

Add these two tests inside the existing `describe('LobbyPage', ...)` block, after the existing two tests:

```tsx
  it('clicking Play now on Ranked calls joinQueue("ranked") and shows cancel button', async () => {
    vi.mocked(mmApi.joinQueue).mockResolvedValue(undefined)
    vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'queued', queue_type: 'ranked' })
    renderLobby()
    const playButtons = await screen.findAllByRole('button', { name: /play now/i })
    await userEvent.click(playButtons[0]!)
    await waitFor(() => expect(mmApi.joinQueue).toHaveBeenCalledWith('ranked'))
    await waitFor(() => expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument())
  })

  it('navigates to /game/:gameId when match is found via polling', async () => {
    vi.mocked(mmApi.joinQueue).mockResolvedValue(undefined)
    vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'matched', game_id: 'g55' })
    renderLobby()
    const playButtons = await screen.findAllByRole('button', { name: /play now/i })
    await userEvent.click(playButtons[0]!)
    await waitFor(() => expect(screen.getByText('game')).toBeInTheDocument())
  })
```

Also add `mmApi` mock setup to `beforeEach`:

```tsx
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(usersApi.getProfile).mockResolvedValue(mockProfile)
  vi.mocked(mmApi.joinQueue).mockResolvedValue(undefined)
  vi.mocked(mmApi.leaveQueue).mockResolvedValue(undefined)
  vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'not_queued' })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/pages/LobbyPage.test.tsx 2>&1 | tail -15
```

Expected: FAIL — new tests fail, existing tests still pass.

- [ ] **Step 3: Add .queueStatus to LobbyPage.module.css**

Append to `packages/web/src/pages/LobbyPage.module.css`:

```css
.queueStatus {
  font-size: 13px;
  color: var(--gold);
  margin-top: 4px;
}
```

- [ ] **Step 4: Update LobbyPage.tsx**

Replace the entire contents of `packages/web/src/pages/LobbyPage.tsx` with:

```tsx
import { useEffect } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, skipToken } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useMatchmaking } from '../hooks/useMatchmaking'
import { getProfile } from '../api/users'
import { createRoom, joinRoom } from '../api/rooms'
import { Button } from '../components/Button/Button'
import styles from './LobbyPage.module.css'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [joiningCode, setJoiningCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { queueState, queueType, join, cancel } = useMatchmaking()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: user ? () => getProfile(user.username) : skipToken,
  })

  // Cancel queue on unmount if still searching
  useEffect(() => {
    return () => {
      cancel().catch(() => {})
    }
  }, [cancel])

  async function handleCreateRoom() {
    setBusy(true)
    setError(null)
    try {
      const res = await createRoom()
      navigate(`/game/${res.game_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinRoom() {
    if (!joiningCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await joinRoom(joiningCode.trim())
      navigate(`/game/${res.game_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setBusy(false)
    }
  }

  const isQueued = queueState === 'queued'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.greeting}>
          Hey, {user?.display_name ?? user?.username}
        </h1>
        {profile && (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{Math.round(profile.rating)}</span>
              <span>rating</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{profile.games_won}</span>
              <span>wins</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{profile.games_played}</span>
              <span>played</span>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>{error}</p>}

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Ranked</div>
          <p className={styles.cardDesc}>Compete for rating. Matched against players near your skill.</p>
          {isQueued && queueType === 'ranked' ? (
            <>
              <p className={styles.queueStatus}>Searching for opponent…</p>
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => join('ranked')} disabled={isQueued || busy}>Play now</Button>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Quickplay</div>
          <p className={styles.cardDesc}>Casual game, no rating change. Faster queue times.</p>
          {isQueued && queueType === 'quickplay' ? (
            <>
              <p className={styles.queueStatus}>Searching for opponent…</p>
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => join('quickplay')} disabled={isQueued || busy}>Play now</Button>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Host a game</div>
          <p className={styles.cardDesc}>Get an invite link to share with a friend.</p>
          <Button onClick={handleCreateRoom} disabled={busy || isQueued}>
            {busy ? 'Creating…' : 'Create private room'}
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Join with code</div>
          <p className={styles.cardDesc}>Enter a room invite code from a friend.</p>
          <input
            className={styles.joinInput}
            placeholder="Enter invite code"
            value={joiningCode}
            onChange={e => setJoiningCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
          />
          <Button onClick={handleJoinRoom} disabled={busy || isQueued || !joiningCode.trim()}>
            Join
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run all LobbyPage tests**

```bash
cd packages/web && npx vitest run src/tests/pages/LobbyPage.test.tsx 2>&1 | tail -15
```

Expected: PASS (all 4 tests).

- [ ] **Step 6: Run full web test suite**

```bash
cd packages/web && npx vitest run 2>&1 | tail -10
```

Expected: all tests pass (64 tests across 12 test files).

- [ ] **Step 7: TypeScript check**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | grep -v "^$" | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/pages/LobbyPage.tsx packages/web/src/pages/LobbyPage.module.css packages/web/src/tests/pages/LobbyPage.test.tsx
git commit -m "feat(web): LobbyPage — real matchmaking queue UX replaces stub"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| `recordMatch`, `getMatch`, `clearMatch` with 5-min expiry | Task 1 |
| `getMatch` clears on read | Task 1 |
| Matching loop runs every 2 seconds | Task 2 |
| Quickplay: any two players | Task 2 |
| Ranked: ±150 window, +50 per 30s, cap 400 | Task 2 |
| One match per tick per queue | Task 2 |
| DB error: players stay in queue | Task 2 |
| `GET /api/matchmaking/status` → matched/queued/not_queued | Task 3 |
| Loop started on server boot | Task 3 |
| `MatchStatusResponse` type | Task 4 |
| `joinQueue`, `leaveQueue`, `getMatchStatus` API | Task 4 |
| `useMatchmaking` hook: join → poll → navigate | Task 5 |
| `cancel` calls `leaveQueue`, resets idle | Task 5 |
| LobbyPage: real queue UX, cancel button, cleanup on unmount | Task 6 |

**Placeholder scan:** None found.

**Type consistency:** `QueueEntry` imported from `matchmaking.queue` in both loop and loop tests. `MatchStatusResponse` used in `api/matchmaking.ts` and `useMatchmaking.ts`. `queueState` / `queueType` names consistent across hook and LobbyPage.
