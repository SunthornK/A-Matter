# A-Matter — Online A-Math Game Platform
## Project Description

A-Matter is a real-time multiplayer online implementation of **A-Math** — a mathematical tile-placement board game played on a 15×15 grid. Players take turns building valid arithmetic equations (e.g. `7+6=10+3=13`) on the board by placing numbered and operator tiles, earning points based on tile face values and bonus squares. The platform supports ranked matchmaking with Glicko-2 ratings, private invite rooms, guest play without an account, a global leaderboard, and an admin control panel.

---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                         │
│   React 18 · TypeScript · Vite · Zustand · TanStack Query    │
│   Pages: Lobby · Game · Leaderboard · Profile · Admin        │
└─────────────────────┬────────────────────────────────────────┘
                      │  HTTP (REST)  /  WebSocket (Socket.IO)
┌─────────────────────▼────────────────────────────────────────┐
│                   API + Game Server                           │
│   Fastify (REST routes) + Socket.IO (real-time game events)  │
│   Routes: auth · rooms · matchmaking · leaderboard · admin   │
│   Game engine: place · pass · exchange · resign · timer      │
└─────────────────────┬────────────────────────────────────────┘
                      │  Prisma ORM
┌─────────────────────▼────────────────────────────────────────┐
│                   PostgreSQL Database                         │
│   users · rooms · games · game_players · moves               │
└──────────────────────────────────────────────────────────────┘

Shared internal packages
  @a-matter/validator  — pure-TS move validation & scoring engine
  @a-matter/db         — Prisma client & schema
```

---

## User Roles & Permissions

| Feature                      | Guest | Registered User | Admin |
|------------------------------|:-----:|:---------------:|:-----:|
| Join private game via link   | ✅    | ✅              | ✅    |
| Play ranked / quickplay      | ❌    | ✅              | ✅    |
| Create private room          | ❌    | ✅              | ✅    |
| View leaderboard             | ❌    | ✅              | ✅    |
| View own profile & history   | ❌    | ✅              | ✅    |
| View all active games        | ❌    | ❌              | ✅    |
| Force-end any game           | ❌    | ❌              | ✅    |
| Ban users                    | ❌    | ❌              | ✅    |

**Authentication:** JWT Bearer tokens (7-day TTL) with server-side `tokenVersion` revocation. Tokens are auto-refreshed 1 minute before expiry as long as the browser tab is open. Guests use a cryptographically random 64-character hex token scoped to a single game session (`sessionStorage`).

---

## Technology Stack

| Layer            | Technology                                        |
|------------------|---------------------------------------------------|
| Frontend         | React 18, TypeScript, Vite                        |
| State management | Zustand (game state), TanStack Query (REST cache) |
| Routing          | React Router v6                                   |
| Real-time        | Socket.IO v4 (WebSocket)                          |
| Backend          | Node.js, Fastify v4, TypeScript                   |
| Database         | PostgreSQL 15, Prisma ORM v5                      |
| Game validation  | `@a-matter/validator` (custom pure-TS package)    |
| Authentication   | bcryptjs (passwords), jsonwebtoken (JWT)          |
| Testing          | Vitest, React Testing Library, socket.io-client   |
| Monorepo         | npm workspaces                                    |

---

## Installation & Setup

**Prerequisites:** Node.js ≥ 18, PostgreSQL 15

```bash
# 1. Clone the repository
git clone <repo-url>
cd a-matter

# 2. Install all dependencies (all packages)
npm install

# 3. Configure environment variables
cp packages/server/.env.example packages/server/.env
# Open packages/server/.env and set:
#   DATABASE_URL=postgresql://user:password@localhost:5432/amatter
#   JWT_SECRET=your-secret-key

# 4. Apply database migrations
cd packages/db
npx prisma migrate deploy

# 5. (Optional) Seed the database with test data
npx prisma db seed
```

---

## How to Run

Open two terminals from the project root:

```bash
# Terminal 1 — API + Game server (http://localhost:3000)
cd packages/server
npm run dev

# Terminal 2 — Web frontend (http://localhost:5173)
cd packages/web
npm run dev
```

Open `http://localhost:5173` in your browser.

**Run all tests across every package:**
```bash
npm test
```

**Run tests for a specific package:**
```bash
cd packages/validator && npx vitest run  
cd packages/server    && npx vitest run  
cd packages/web       && npx vitest run  
```

---

## Screenshots

