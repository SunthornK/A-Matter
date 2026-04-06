# A-Matter — Project Context

> This file is the single source of truth for any AI agent or new contributor joining this project. Read this before touching any code.

---

## What Is A-Matter?

A-Matter is a **web-based, real-time multiplayer math strategy game** inspired by the physical board game A-Math. Players build valid mathematical equations on a **15×15 grid** using number and operator tiles — like Scrabble but with equations instead of words.

**Core experience:** Two players take turns placing tiles to form equations. The board accumulates equations that must all remain valid. Players race to score points using bonus squares (DL, TL, DW, TW) while managing a hand of 8 tiles drawn from a 100-tile bag.

**Why it exists:** To remove the geographic barrier of needing a physical board, and to solve the "skill gap" problem by matching players of equal ability using Glicko-2 rating.

---

## Project Goals

1. **Competitive Accessibility** — global real-time play with skill-based matchmaking
2. **Educational Engagement** — gamified arithmetic with instant equation feedback
3. **Technical Integrity** — server-authoritative validation, sub-second WebSocket sync

---

## Architecture Overview

```
A-Matter/                          ← npm workspace root
  packages/
    validator/                     ← ✅ DONE — pure TS equation validation
    server/                        ← 🔜 Node.js + Socket.IO game server
    client/                        ← 🔜 React + TypeScript frontend
  docs/
    superpowers/plans/             ← implementation plans (one per subsystem)
```

### Key Architectural Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| WebSocket library | Socket.IO | Reconnection, rooms, ACK callbacks out of box |
| State management | Server-authoritative | Client never trusts its own math; server validates all moves |
| Optimistic UI | None | Turn-based game; 50-100ms server round-trip is imperceptible |
| Rating system | Glicko-2 | Handles new-player uncertainty better than Elo |
| Matchmaking queue | In-memory | Redis only when horizontal scaling is needed |
| Auth | Stateless JWT (15min TTL) | Simple; `token_version` column allows forced logout |
| ORM | Prisma or Drizzle | Type-safe queries matching TypeScript codebase |
| Deployment | Docker Compose → Railway/Render | Managed Postgres + Redis add-ons |

---

## What Has Been Built

### `packages/validator` ✅ Complete

A **pure TypeScript module** (no I/O, no side effects) that is the single source of mathematical truth. Used by both the game server (authoritative validation) and the client (planning preview feedback).

**Public API:**
```typescript
import { validateMove } from '@a-matter/validator'

const result = validateMove({
  board,        // Board — 15×15 (BoardTile | null)[][]
  placements,   // Placement[] — tiles being placed this turn
  rack,         // BoardTile[] — acting player's current hand
  rackSizeBefore, // number — for bingo bonus check
  isFirstMove,  // boolean
})
// result: ValidationResult { is_valid, equations, total_score, error? }
```

**Internal modules:**
- `fraction.ts` — exact rational arithmetic (GCD reduction, no floats). Used everywhere math happens.
- `constants.ts` — 100-tile bag (exact counts, verified sum) + 15×15 bonus square layout
- `tokenizer.ts` — converts tile sequences to `Token[]`, handles multi-digit concat and negation detection
- `evaluator.ts` — PEMDAS evaluation of token sequences → `Fraction`
- `equationValidator.ts` — validates all math rules (one `=`, balance, no leading zeros, no -0, etc.)
- `moveStructure.ts` — validates physical placement rules (axis, contiguity, center, connection)
- `boardExtractor.ts` — extracts all affected tile sequences from board + placements
- `scorer.ts` — scores equations with bonus squares and bingo bonus
- `index.ts` — orchestrates all of the above into `validateMove()`

**Test coverage:** 92 tests across 10 files, all passing.

---

## What Comes Next (Build Order)

| # | Subsystem | Status |
|---|-----------|--------|
| 1 | Equation Validator | ✅ Done |
| 2 | Database & Schema (Prisma) | 🔜 Next |
| 3 | REST API + Auth (Express/Fastify + JWT) | 🔜 Planned |
| 4 | WebSocket Game Server (Socket.IO) | 🔜 Planned |
| 5 | Matchmaking (Glicko-2 + in-memory queue) | 🔜 Planned |
| 6 | Frontend (React + Zustand + board UI) | 🔜 Planned |

---

## Database Schema (PostgreSQL)

### `users`
Registered players. Stores Glicko-2 rating as three columns (rating, rd, volatility).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| username | varchar(30) | unique, lowercase alphanumeric + underscore |
| email | varchar(255) | unique |
| password_hash | varchar(255) | bcrypt |
| role | enum | 'user' \| 'admin' |
| display_name | varchar(50) | shown in-game |
| country | char(2) | ISO 3166-1 alpha-2, nullable |
| avatar_url | text | S3/MinIO path, nullable |
| glicko_rating | float | default 1500.0 |
| glicko_rd | float | default 350.0 (Rating Deviation) |
| glicko_volatility | float | default 0.06 |
| games_played | int | default 0 |
| games_won | int | default 0 |
| token_version | int | default 0 — increment to force logout all sessions |
| created_at | timestamp | |
| updated_at | timestamp | |

### `rooms`
A lobby that exists before and during a game. Private rooms use invite codes.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| creator_id | uuid FK→users | nullable (system-created for ranked) |
| invite_code | char(6) | unique, uppercase alphanumeric — private rooms only |
| type | enum | 'ranked' \| 'quickplay' \| 'private' |
| time_per_side_ms | int | default 1320000 (22 min) |
| status | enum | 'waiting' \| 'full' \| 'in_game' \| 'closed' |
| created_at | timestamp | |
| expires_at | timestamp | now() + 30min — auto-cleanup for abandoned rooms |

### `games`
One game per room. board_state and tile_bag are **derived projections** (cached for fast reads).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| room_id | uuid FK→rooms | |
| mode | enum | 'ranked' \| 'quickplay' \| 'private' |
| status | enum | 'active' \| 'finished' |
| board_state | jsonb | 15×15 grid — cache, derived from moves |
| tile_bag | jsonb | remaining tiles — cache, derived from moves |
| turn_number | int | default 1 |
| current_turn_player_id | uuid FK→game_players | |
| end_reason | enum | null \| 'completion' \| 'timeout' \| 'forfeit' \| 'stalemate' |
| started_at | timestamp | |
| finished_at | timestamp | nullable |

**Important:** `moves` table is the **single source of truth**. `board_state` and `tile_bag` are caches written atomically with each move in the same transaction. The function `replayGame(gameId)` reconstructs full state from moves (used for integrity checks and disaster recovery).

### `game_players`
Exactly 2 rows per game. Supports anonymous guests (no user_id).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| game_id | uuid FK→games | |
| user_id | uuid FK→users | nullable — null for guests |
| guest_token | varchar(64) | nullable — set for guests, null for registered users |
| seat | int | 1 or 2 — determines turn order |
| score | int | default 0 — running total (derived cache) |
| rack | jsonb | array of up to 8 tile objects (derived cache) |
| time_remaining_ms | int | initialized from rooms.time_per_side_ms |
| consecutive_passes | int | default 0 — reset on any non-pass action |
| tile_tracker | jsonb | '[]' — ranked: manual notes; unranked: auto-populated |
| last_exchange_at | timestamp | nullable — for 3s exchange debounce |

Constraints: CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL), UNIQUE (game_id, seat)

### `moves`
The authoritative log of every action in every game.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| game_id | uuid FK→games | |
| player_id | uuid FK→game_players | |
| turn_number | int | |
| action | enum | 'place' \| 'exchange' \| 'pass' |
| placements | jsonb | nullable — for 'place' action |
| equations | jsonb | nullable — validated equation results |
| exchanged_indices | jsonb | nullable — for 'exchange' action |
| score_earned | int | default 0 |
| time_spent_ms | int | |
| created_at | timestamp | |

---

## WebSocket Protocol Summary

Connection: `ws://host/game?token=<jwt>&game_id=<uuid>`
All events use format: `{ event, data, seq, timestamp }`

### Server → Client (broadcast to room unless noted)
| Event | When | Note |
|-------|------|------|
| `game:state` | connect / reconnect / state:request | Per-player (contains rack) |
| `move:result` | after any valid move | Broadcast — uses player_id UUIDs not "you/opponent" |
| `rack:update` | after place or exchange | Per-player only |
| `timer:sync` | every 10s | Broadcast |
| `game:over` | game ends | Broadcast |
| `error` | validation failure | Per-player |
| `player:disconnect` / `player:reconnect` | connection events | Broadcast |
| `server:ping` | every 30s | Heartbeat — client must respond with server:pong within 10s |

### Client → Server
| Event | Purpose |
|-------|---------|
| `move:place` | Submit tile placements |
| `move:exchange` | Exchange tiles from rack |
| `move:pass` | Pass turn |
| `state:request` | Request full resync (cheaper than reconnect) |
| `tile_tracker:update` | Ranked mode: manual tile tracking |
| `game:resign` | Forfeit immediately |
| `ping` | Latency measurement |
| `server:pong` | Heartbeat response |

**Key protocol decisions:**
- All server→client events use absolute `player_id` UUIDs (not relative "you/opponent")
- Server broadcasts one identical payload to both players via `room.emit()`
- Only `game:state` and `rack:update` are per-player (contain secret rack data)
- `seq` numbers allow gap detection; `state:request` triggers resync without reconnect

---

## Game Rules Summary

### Tile Distribution (100 tiles total)
- Numbers 0-3: 5 each × 1pt | Number 4: 5 × 2pts | Numbers 5-9: 4 each × 2pts
- Numbers 10,12: 3 each × 3pts | Number 20: 1 × 5pts | Numbers 11,14-16,18: 1 each × 4pts
- Numbers 13,17: 1 each × 6pts | Number 19: 1 × 7pts
- Operators +,-,×,÷: 4 each × 2pts | Dual +/-: 5 × 1pt | Dual ×/÷: 4 × 1pt
- Equals =: 11 × 1pt | Blank: 4 × 0pts

### Validation Rules
- All placed tiles must be in one row or one column
- Placed tiles + existing tiles form an unbroken line (no gaps)
- First move must cover center (7,7)
- Subsequent moves must connect to existing tiles
- Every sequence of 3+ tiles must form a valid equation
- Exactly one `=` per equation | PEMDAS operator precedence
- Exact fraction arithmetic (2÷4 = 4÷8 is legal)
- No leading zeros, no -0, no unary plus, no consecutive operators
- Results must be ≥ 0

### Scoring
1. Each tile: face value × DL(×2) or TL/center(×3) if newly placed on that square
2. Sum tile scores → apply DW(×2) or TW(×3) for any newly placed tile on those squares
3. Multiple word multipliers stack (two DW = ×4)
4. Bingo +40: only when rack had exactly 8 tiles before the move AND all 8 were played

### Endgame
| Condition | Trigger | Scoring |
|-----------|---------|---------|
| Completion | Player uses all tiles AND bag is empty | Winner gets opponent's remaining tile values × 2 (blanks = 0) |
| Stalemate | Both players pass 3 consecutive times each (6 total) | Each player subtracts their remaining tile values (no multiplier, blanks = 0) |
| Timeout | Clock hits 0 | Opponent wins. Scores freeze. |
| Forfeit / Resign | Disconnect 30s grace or resign event | Opponent wins. Scores freeze. No tile adjustments. |

---

## Authentication

### Registered users
- JWT (15min TTL), no refresh tokens, stateless
- JWT payload: `{ user_id, role, token_version, exp }`
- Logout: client clears token only
- Force logout: increment `token_version` in DB — invalidates future requests but does NOT kill active WebSocket connections (would forfeit in-progress ranked game)
- `admin:force_disconnect` is a separate server action for immediately closing a specific socket

### Anonymous guests
- Guest generates 64-char random `guest_token`, stored in `sessionStorage`
- Can only join **private** rooms (not ranked or quickplay)
- Server enforces: `POST /api/matchmaking/join` requires valid JWT, rejects guest tokens

---

## Matchmaking

### Ranked
- In-memory queue sorted by `glicko_rating`
- Runs every 2s, expanding search window: ±150 → ±300 (10s) → ±500 (30s) → ±1000 (60s) → anyone (120s)
- Rating updates use **Glicko-2** (rating + RD + volatility per player)
- Glicko-2 applied per-game (not batched per rating period — simplified but works)

### Quickplay
- Same as ranked but separate queue, no rating changes, window starts at ±500

---

## Conventions

- **Monorepo:** npm workspaces at root, packages in `packages/`
- **TypeScript:** strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Testing:** Vitest, TDD (write failing test first, then implement)
- **Commits:** conventional commits format (`feat:`, `fix:`, `chore:` etc.)
- **No Co-Author lines** in commits
- **Plans:** stored in `docs/superpowers/plans/YYYY-MM-DD-<name>.md`

---

## File Map (current state)

```
A-Matter/
  package.json                          ← workspace root
  CONTEXT.md                            ← this file
  docs/
    superpowers/plans/
      2026-04-06-equation-validator.md  ← Plan 1 (complete)
  packages/
    validator/                          ← @a-matter/validator (complete)
      src/
        types.ts
        fraction.ts
        constants.ts
        tokenizer.ts
        evaluator.ts
        equationValidator.ts
        moveStructure.ts
        boardExtractor.ts
        scorer.ts
        index.ts
      tests/                            ← 92 tests, all passing
```
