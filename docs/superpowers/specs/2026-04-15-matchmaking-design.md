# Matchmaking Design

**Goal:** Let registered users find ranked and quickplay games automatically, replacing the current stub error on LobbyPage.

**Scope:** Server-side matching loop + status endpoint + client polling hook + LobbyPage queue UX. Guest users cannot join matchmaking (they are limited to private rooms).

---

## Architecture

### Server

**In-memory queue** (`matchmaking.queue.ts`) — already exists with `addToQueue`, `removeFromQueue`, `getQueue`, `isInQueue`. Extend with a matched-games map:

```
matchedGames: Map<userId, { gameId, matchedAt }>
```

Entries expire after 5 minutes (checked lazily on read). Expose three new functions: `recordMatch(userId, gameId)`, `getMatch(userId)`, `clearMatch(userId)`.

**Matching loop** (`matchmaking.loop.ts`) — a `setInterval` that runs every 2 seconds. Processes ranked and quickplay queues independently. For each queue, iterates entries sorted by `joinedAt` (oldest first) and finds the first eligible pair:

- **Quickplay**: any two players eligible — no rating constraint.
- **Ranked**: players are eligible if their Glicko rating windows overlap. A player's window starts at ±150 and widens by +50 for every 30 seconds waited, capping at ±400.

When a pair is found:
1. Remove both from the queue.
2. Create a `Room` (type=ranked/quickplay, status=in_game, no inviteCode) + `Game` (mode=ranked/quickplay, status=active, empty board, shuffled tile bag) + two `GamePlayer` rows (seat 1 and 2, rack of 8 tiles each, `currentTurnPlayerId` = seat 1 player).
3. Call `recordMatch(userId, gameId)` for both players.

The loop is started once during server boot, after Prisma is connected.

**Status endpoint** — `GET /api/matchmaking/status` (authenticated). Returns:
- `{ status: 'matched', game_id }` — if `getMatch(userId)` has an entry (clears it on read)
- `{ status: 'queued', queue_type: 'ranked' | 'quickplay' }` — if `isInQueue(userId)`
- `{ status: 'not_queued' }` — otherwise

### Client

**API module** (`api/matchmaking.ts`):
- `joinQueue(type: 'ranked' | 'quickplay'): Promise<void>` — `POST /api/matchmaking/join`
- `leaveQueue(): Promise<void>` — `DELETE /api/matchmaking/leave`
- `getMatchStatus(): Promise<MatchStatusResponse>` — `GET /api/matchmaking/status`

**Hook** (`hooks/useMatchmaking.ts`):
```ts
function useMatchmaking(): {
  queueState: 'idle' | 'queued' | 'matched'
  queueType: 'ranked' | 'quickplay' | null
  join: (type: 'ranked' | 'quickplay') => Promise<void>
  cancel: () => Promise<void>
}
```

- Calls `joinQueue(type)` → sets `queueState = 'queued'`
- Polls `GET /api/matchmaking/status` every 2.5 seconds via `useQuery` with `refetchInterval`
- When status is `matched`: sets `queueState = 'matched'`, navigates to `/game/:gameId`, stops polling
- `cancel()`: calls `leaveQueue()`, sets `queueState = 'idle'`, stops polling
- Polling is enabled only when `queueState === 'queued'`

**LobbyPage** — replaces the `handleQueue` stub with `useMatchmaking()`. When `queueState === 'queued'`, the active card shows "Searching… Cancel" button. When `queueState === 'idle'` both queue buttons are enabled.

---

## API Contract

### POST /api/matchmaking/join
**Auth:** JWT required  
**Body:** `{ type: 'ranked' | 'quickplay' }`  
**Response 202:** `{ status: 'queued', queue_type: 'ranked' | 'quickplay' }`  
**Idempotent:** re-queues with fresh `joinedAt` if already in queue.

### DELETE /api/matchmaking/leave
**Auth:** JWT required  
**Response 200:** `{ status: 'left' }`  
**No-op if not in queue.**

### GET /api/matchmaking/status
**Auth:** JWT required  
**Response 200:** one of:
```json
{ "status": "matched", "game_id": "<uuid>" }
{ "status": "queued",  "queue_type": "ranked" | "quickplay" }
{ "status": "not_queued" }
```

---

## Matching Algorithm Detail

```
function matchQueue(queue: QueueEntry[], type: 'ranked' | 'quickplay'):
  for i = 0 to queue.length - 1:
    a = queue[i]
    windowA = ratingWindow(a)        // only used for ranked
    for j = i+1 to queue.length - 1:
      b = queue[j]
      if type === 'quickplay' OR ratingsOverlap(a, b, windowA):
        remove a and b from queue
        createGame(a.userId, b.userId, type)
        recordMatch(a.userId, gameId)
        recordMatch(b.userId, gameId)
        return   // one match per tick per queue; restart next tick

function ratingWindow(entry):
  waitedSeconds = (now - entry.joinedAt) / 1000
  expansion = floor(waitedSeconds / 30) * 50
  return min(150 + expansion, 400)

function ratingsOverlap(a, b, windowA):
  windowB = ratingWindow(b)
  return abs(a.glickoRating - b.glickoRating) <= max(windowA, windowB)
```

One match is made per queue per tick. This avoids modifying the array while iterating and keeps the loop simple.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| User already queued, calls `join` again | Idempotent re-queue — fresh `joinedAt`, same slot |
| Server restarts | In-memory queue lost; client polling gets `not_queued`; LobbyPage returns to idle state |
| Match created but client never polls the result | `matchedGames` entry expires after 5 min; game stays in DB accessible by direct URL |
| DB error during game creation | Log error, do not call `recordMatch` — both users stay in queue and will be re-matched next tick |
| User navigates away while queued | LobbyPage `useEffect` cleanup calls `leaveQueue()` on unmount |

---

## Schema Changes

None. `Room.type` and `Game.mode` already support `ranked` and `quickplay`. `Room.inviteCode` is nullable so matchmade rooms simply have no invite code.

---

## Testing

### Server unit tests (`matchmaking.loop.test.ts`)
- Quickplay: pairs any two players regardless of rating difference
- Ranked: pairs players whose windows overlap; does not pair players outside window
- Ranked: window widens correctly — after 30s at ±150, after 60s at ±200, caps at ±400
- Both players removed from queue after match
- Only one match made per tick (first eligible pair wins)
- DB error during `createGame`: neither player removed from queue

### Server unit tests (`matchmaking.queue.test.ts`)
- `recordMatch` / `getMatch` / `clearMatch` round-trip
- `getMatch` returns null after 5-minute expiry
- `getMatch` clears the entry on first read

### Server integration test (`GET /api/matchmaking/status`)
- Returns `matched` when match exists in map
- Returns `queued` when in queue but no match yet
- Returns `not_queued` when neither

### Client unit tests (`useMatchmaking.test.ts`)
- `join('ranked')` → status becomes `queued`, polling starts
- Status poll returns `matched` → navigates to `/game/:gameId`, polling stops
- `cancel()` → calls `leaveQueue`, status returns to `idle`, polling stops
