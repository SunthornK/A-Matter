# Web Frontend Design Spec

**Date:** 2026-04-13  
**Package:** `packages/web`  
**Status:** Approved for implementation planning

---

## Goal

Build the React web frontend for A-Matter: a real-time two-player math tile game. Connects to the existing Fastify REST API and Socket.IO game server. Desktop-first, dark theme. Reference design: `prototype/game-board.html`.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Bundler | Vite |
| Framework | React 18 + TypeScript |
| Routing | React Router v6 |
| Global game state | Zustand |
| Server data / caching | React Query (TanStack Query v5) |
| Socket.IO | `socket.io-client` v4 |
| Styling | CSS Modules (no CSS-in-JS, no Tailwind) |
| Fonts | Space Mono (monospace), Syne (UI) — via Google Fonts |
| Testing | Vitest + React Testing Library |

---

## Architecture

### Package layout

```
packages/web/
  src/
    api/              — REST client functions
      client.ts       — base fetch wrapper with auth header injection
      auth.ts         — register, login, logout
      rooms.ts        — create, join, matchmaking
      users.ts        — profile, update, change password
      leaderboard.ts  — global + country-filtered
      admin.ts        — active games, force-end, ban
    components/       — shared, stateless UI primitives
      Tile/           — board tile, rack tile (shared logic)
      Timer/          — countdown display, color states
      Avatar/         — user avatar with fallback
      Modal/          — base modal wrapper
      Button/         — styled button variants
    contexts/
      AuthContext.tsx  — current user, token, login/logout helpers
    hooks/
      useAuth.ts       — reads AuthContext
      useGameSocket.ts — Socket.IO lifecycle only; pipes events into gameStore
    store/
      gameStore.ts     — Zustand store (see Store Shape section)
    pages/
      LoginPage.tsx
      RegisterPage.tsx
      LobbyPage.tsx
      JoinPage.tsx     — /join/:inviteCode guest entry
      GamePage.tsx
      ProfilePage.tsx
      LeaderboardPage.tsx
      AdminPage.tsx
    game/              — game screen sub-components
      Board.tsx
      Cell.tsx
      Rack.tsx
      RackTile.tsx
      InfoPanel.tsx
      ActionButtons.tsx
      TileTracker.tsx
      RecentMoves.tsx
      DisconnectBanner.tsx
      GameOverModal.tsx
      ExchangeModal.tsx
      ResignModal.tsx
    utils/
      board.ts         — parsePendingKey, makePendingKey, board helpers
      token.ts         — guest token generation (crypto.getRandomValues)
      format.ts        — formatTime, formatScore
    types/
      api.ts           — REST response shapes
      game.ts          — mirrors server game types (GameStatePayload, etc.)
  index.html
  vite.config.ts
  tsconfig.json
```

### State ownership

| State | Owner | Reason |
|-------|-------|--------|
| Auth (user, token) | `AuthContext` | Read infrequently; doesn't change during a session |
| REST data (profile, leaderboard) | React Query | Caching, background refetch, loading/error states |
| Live game state | Zustand `gameStore` | Selective subscriptions — prevents full tree re-renders on every socket event |
| Socket.IO lifecycle | `useGameSocket` hook | Connects/disconnects with component; pipes events into store |

---

## Routing

```
/                    → redirect: /lobby if JWT present, /login otherwise
/login               → LoginPage
/register            → RegisterPage
/lobby               → LobbyPage          [RequireAuth — JWT only]
/join/:inviteCode    → JoinPage            [public — guest entry point]
/game/:gameId        → GamePage            [RequireAuth or guest token in sessionStorage]
/profile/:userId     → ProfilePage         [RequireAuth]
/leaderboard         → LeaderboardPage     [RequireAuth]
/admin               → AdminPage           [RequireAdmin]
```

### Route guards

- **`<RequireAuth>`** — checks `AuthContext` for valid JWT. If missing, redirects to `/login`. Also accepts a guest token in `sessionStorage` for the `/game/:gameId` route only.
- **`<RequireAdmin>`** — additionally checks `user.role === 'admin'`. Redirects to `/lobby` otherwise.

### Guest flow

1. User receives a private room invite link: `https://app.amatter.io/join/ABC123`
2. `/join/:inviteCode` renders a name-entry form — no login required
3. On submit: generate 64-char token via `crypto.getRandomValues`, store in `sessionStorage` as `guestToken`
4. Call `POST /api/rooms/join` with `{ invite_code, display_name }` and `Authorization: Bearer <guestToken>`
5. On success: redirect to `/game/:gameId`
6. Guest token dies when the tab closes — no persistence, no account

Guests cannot access `/lobby`, `/profile`, `/leaderboard`, or `/admin`. The server enforces 401 on matchmaking endpoints for guest tokens.

---

## Zustand Game Store

```ts
// src/store/gameStore.ts

interface BoardCell {
  value: string
  owner: string | null   // player_id of who placed it; resolve display via owner === myPlayerId
  isBonus: boolean
  bonusType: 'b3eq' | 'b2eq' | 'b3pc' | 'b2pc' | null
}

interface RackTile {
  value: string
  points: number
}

interface PendingTile {
  value: string
  rackIndex: number
}

interface PlayerState {
  playerId: string
  displayName: string
  score: number
  timeRemainingMs: number
  consecutivePasses: number
  tilesRemaining: number
}

interface GameStore {
  // connection
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

  // game metadata
  gameId: string | null
  mode: 'ranked' | 'quickplay' | 'private' | null

  // board + tiles
  board: (BoardCell | null)[][]                    // 15×15
  rack: (RackTile | null)[]                        // 8 slots, null = empty
  pendingPlacements: Record<string, PendingTile>   // key = "r,c"
  bag: number

  // turn
  turnNumber: number
  currentTurnPlayerId: string | null

  // players
  players: PlayerState[]
  myPlayerId: string | null

  // tile tracker — tileValue → count seen so far
  tileTracker: Record<string, number>

  // end state
  gameOverResult: GameOverPayload | null

  // ui state (client-only)
  selectedRackIndex: number | null
  rackFlipped: Record<number, boolean>             // rackIndex → face-down
  opponentDisconnected: boolean
  opponentDisconnectedAt: number | null

  // actions
  applyGameState: (payload: GameStatePayload) => void
  applyMoveResult: (payload: MoveResultPayload) => void  // auto-populates tileTracker if mode !== 'ranked'
  applyRackUpdate: (payload: RackUpdatePayload) => void
  applyTimerSync: (payload: TimerSyncPayload) => void
  applyGameOver: (payload: GameOverPayload) => void      // sets gameOverResult
  placeTile: (rackIndex: number, row: number, col: number) => void  // clears rackFlipped[rackIndex]
  returnTile: (key: string) => void
  clearPending: () => void
  selectRackTile: (index: number | null) => void
  toggleRackFlip: (index: number) => void
  setOpponentDisconnected: (disconnected: boolean) => void
  reorderRack: (fromIndex: number, toIndex: number) => void
  toggleTileTracked: (value: string) => void   // ranked mode: manual tile tracker toggle
  resetGame: () => void

  // derived / log
  recentMoves: MoveLogEntry[]                  // appended by applyMoveResult
}
```

### Key action behaviours

- **`applyMoveResult`**: If `mode !== 'ranked'`, automatically increments `tileTracker[tile.value]` for each tile placed. In ranked mode, `tileTracker` is only updated via `toggleTileTracked` (manual).
- **`placeTile`**: Moves tile from `rack[rackIndex]` to `pendingPlacements["r,c"]`, sets `rack[rackIndex] = null`, clears `rackFlipped[rackIndex]`, clears `selectedRackIndex`.
- **`returnTile`**: Removes from `pendingPlacements`, restores to `rack[rackIndex]`.
- **`applyTimerSync`**: Updates `players[*].timeRemainingMs` — only `<Timer>` components re-render.
- **`resetGame`**: Returns store to initial state — called when leaving `/game/:gameId`.

---

## `useGameSocket` Hook

Lives in `src/hooks/useGameSocket.ts`. Manages Socket.IO connection only — no state.

Return type is `(event: string, data?: unknown) => void` — a stable emit function `ActionButtons` uses to fire moves.

```ts
function useGameSocket(
  gameId: string,
  token: string,
): (event: string, data?: unknown) => void {
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  useEffect(() => {
    const socket = io(WS_URL, {
      path: '/ws',
      query: { token, game_id: gameId },
      transports: ['websocket'],
    })
    socketRef.current = socket

    gameStore.setState({ status: 'connecting' })

    let lastSeq = -1

    // All listeners call getState() inside the callback — no stale closure risk
    socket.on('connect', () => gameStore.setState({ status: 'connected' }))
    socket.on('disconnect', () => gameStore.setState({ status: 'disconnected' }))
    socket.on('game:state', (payload) => {
      lastSeq = payload.seq ?? lastSeq
      gameStore.getState().applyGameState(payload)
    })
    socket.on('move:result', (payload) => {
      if (payload.seq != null && payload.seq !== lastSeq + 1) {
        socket.emit('state:request')  // gap detected — resync
      }
      lastSeq = payload.seq ?? lastSeq
      gameStore.getState().applyMoveResult(payload)
    })
    socket.on('rack:update', (payload) => gameStore.getState().applyRackUpdate(payload))
    socket.on('timer:sync', (payload) => gameStore.getState().applyTimerSync(payload))
    socket.on('game:over', (payload) => gameStore.getState().applyGameOver(payload))
    socket.on('player:disconnect', ({ player_id }) => {
      if (player_id !== gameStore.getState().myPlayerId) {
        gameStore.getState().setOpponentDisconnected(true)
      }
    })
    socket.on('player:reconnect', ({ player_id }) => {
      if (player_id !== gameStore.getState().myPlayerId) {
        gameStore.getState().setOpponentDisconnected(false)
      }
    })
    socket.on('server:ping', () => socket.emit('server:pong'))

    return () => {
      socket.disconnect()
      socketRef.current = null
      gameStore.getState().resetGame()
    }
  }, [gameId, token])

  return useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])
}
```

`<ActionButtons>` receives the returned `emit` function as a prop and calls e.g. `emit('move:pass')`, `emit('move:place', data)`.

---

## Game Screen Component Tree

```
GamePage
  DisconnectBanner          — reads opponentDisconnected, opponentDisconnectedAt
  <layout>
    TileTracker             — reads tileTracker, mode
    <center>
      Board                 — reads board, pendingPlacements, selectedRackIndex
        Cell (×225)         — reads single cell; onClick → placeTile or returnTile
      Rack                  — reads rack, selectedRackIndex, rackFlipped
        RackTile (×8)       — onClick → selectRackTile; dblClick → toggleRackFlip
    InfoPanel               — reads players, myPlayerId, currentTurnPlayerId, bag
      Timer (×2)            — reads players[*].timeRemainingMs only
      RecentMoves           — reads from local move log (built from applyMoveResult)
      ActionButtons         — emits socket events; reads selectedRackIndex, pendingPlacements
        ExchangeModal       — reads rack, bag; emits move:exchange (disabled when bag < 5)
        ResignModal         — emits game:resign
  GameOverModal             — reads gameOverResult; shown when non-null
```

Each component subscribes to only the Zustand slice it needs via selector:
```ts
// Timer only re-renders when this player's time changes
const timeMs = useGameStore(s => s.players.find(p => p.playerId === id)?.timeRemainingMs)
```

---

## Board Interaction Model

**No validity feedback while placing.** Tiles are placed freely with no color cues. Only on Play (submit) does the server validate.

- **Invalid move**: Placed tiles flash red briefly, move rejected, tiles remain on board for adjustment.
- **Valid move**: Tiles lock in place (no animation needed for v1). New tiles drawn to rack.

**Two placement modes:**
1. **Click-to-place**: Click rack tile to select (highlights green), click empty board cell to place. Click placed pending tile to return to rack.
2. **Drag-to-place**: Drag rack tile onto board cell. Drag ghost follows cursor. Drop on occupied cell is a no-op.

**Rack reorder**: Drag rack tiles within the rack to reorder (updates `rack` array in store).

**Face-down tiles**: Double-click rack tile to toggle `rackFlipped[index]`. Hides the value visually — planning aid, client-only.

---

## API Client

`src/api/client.ts` — thin wrapper around `fetch`:

```ts
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()  // reads JWT from localStorage or guest from sessionStorage
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, await res.json())
  return res.json()
}
```

`getToken()` checks `localStorage` for JWT first, then `sessionStorage` for guest token.

All React Query calls go through typed wrappers in the `api/` directory — no raw `fetch` calls in components.

---

## Pages

### LobbyPage (`/lobby`)
- Shows user's rating, wins, recent match preview (last 3)
- Four action cards: Ranked Queue, Quickplay Queue, Create Private Room, Join Private Room (invite code input)
- Ranked/quickplay: call matchmaking endpoint → show waiting state → on game ready, redirect to `/game/:gameId`
- React Query for user profile data

### JoinPage (`/join/:inviteCode`)
Two branches based on auth state:

**Logged-in user (JWT present):**
- No name input shown — their account is used directly
- Calls `POST /api/rooms/join` with `{ invite_code }` + `Authorization: Bearer <jwt>`
- Redirects to `/game/:gameId` on success

**Guest (no JWT):**
- Shows a single display name input
- On submit: generate 64-char token via `generateGuestToken()`, store in `sessionStorage`
- Calls `POST /api/rooms/join` with `{ invite_code, display_name }` + `Authorization: Bearer <guestToken>`
- Redirects to `/game/:gameId` on success

The page detects which path to take via `getJwt() !== null` in `AuthContext`.

### GamePage (`/game/:gameId`)
- Mounts `useGameSocket(gameId, token)`
- Renders the full game board layout from prototype
- On `gameOverResult` becoming non-null: show `<GameOverModal>`
- On unmount: `resetGame()` cleans up store

### ProfilePage (`/profile/:userId`)
- React Query for `GET /api/users/:id` and `GET /api/users/:id/matches`
- Match history: paginated list (opponent, result W/L, scores, date, mode)
- Edit mode if `userId === myUserId`

### LeaderboardPage (`/leaderboard`)
- React Query for `GET /api/leaderboard?page=1&country=XX`
- Country filter dropdown (uses `country` from user profile for default)

### AdminPage (`/admin`)
- React Query for `GET /api/admin/games/active` (polling every 10s)
- Force-end button per game row
- User search + ban button

---

## Token Utilities

`src/utils/token.ts`:

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

---

## Styling Approach

- CSS Modules per component — no global styles except `src/styles/globals.css` (CSS variables, reset, fonts)
- CSS variables defined in globals match the prototype: `--bg`, `--panel-bg`, `--border`, `--tile-bg`, `--green`, `--gold`, `--red`, etc.
- No utility class framework — spacing/layout written directly in module files
- Timer color states (`warn` at <5min, `crit` at <1min with pulse animation) handled via className switching

---

## Testing

- **Unit tests**: Zustand store actions (`gameStore.test.ts`) — test each action with mock payloads
- **Component tests**: React Testing Library for interactive components (Rack, Board cell placement, ActionButtons)
- **Integration**: `JoinPage` flow (guest token generation + room join mock)
- No E2E tests in scope for v1

---

## Out of Scope (v1)

- Email verification / password reset (needs email infrastructure — separate plan)
- Match history endpoint (`GET /api/users/:id/matches`) — needs backend work first (Plan 5)
- Country leaderboard filter (`?country=XX`) — needs backend work first (Plan 5)
- Admin endpoints — needs backend work first (Plan 5)
- Mobile layout / pinch-to-zoom — defer until desktop is stable
- Tile placement slide-in animation
- PWA / offline support
