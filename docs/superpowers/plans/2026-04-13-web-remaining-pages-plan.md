# Web Frontend — Remaining Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build LobbyPage, JoinPage (JWT + guest branches), ProfilePage, LeaderboardPage, and AdminPage; replace all stubs in App.tsx with real imports.

**Architecture:** Each page uses React Query for server data. LobbyPage handles matchmaking polling. JoinPage branches on `getJwt()` for JWT vs guest flow. ProfilePage supports edit mode when `userId === myUserId`.

**Tech Stack:** TanStack Query v5, React Router v6, React 18, CSS Modules

**Prerequisite:** Plans 5 and 6 must be complete.

---

## File Map

| File | Purpose |
|------|---------|
| `packages/web/src/pages/LobbyPage.tsx` | Dashboard: rating, action cards, matchmaking queue |
| `packages/web/src/pages/LobbyPage.module.css` | Lobby layout |
| `packages/web/src/pages/JoinPage.tsx` | Guest/JWT room join — branches on auth state |
| `packages/web/src/pages/JoinPage.module.css` | Join page styles |
| `packages/web/src/pages/ProfilePage.tsx` | User profile with match history |
| `packages/web/src/pages/ProfilePage.module.css` | Profile page layout |
| `packages/web/src/pages/LeaderboardPage.tsx` | Rankings table with country filter |
| `packages/web/src/pages/LeaderboardPage.module.css` | Leaderboard table styles |
| `packages/web/src/pages/AdminPage.tsx` | Active games list + force-end + user ban |
| `packages/web/src/pages/AdminPage.module.css` | Admin table styles |
| `packages/web/src/App.tsx` | Replace all stubs with real page imports |
| `packages/web/src/tests/pages/JoinPage.test.tsx` | Guest token generation + room join mock |
| `packages/web/src/tests/pages/LobbyPage.test.tsx` | Action card render + matchmaking redirect |

---

### Task 1: LobbyPage

**Files:**
- Create: `packages/web/src/pages/LobbyPage.tsx`
- Create: `packages/web/src/pages/LobbyPage.module.css`
- Test: `packages/web/src/tests/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/pages/LobbyPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import LobbyPage from '../../pages/LobbyPage'

vi.mock('../../api/users', () => ({
  getProfile: vi.fn(),
}))

vi.mock('../../api/rooms', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
}))

import * as usersApi from '../../api/users'
import * as roomsApi from '../../api/rooms'

const mockProfile = {
  id: 'u1', username: 'alice', display_name: 'Alice',
  country: 'TH', rating: 1500, rating_deviation: 100,
  games_played: 20, games_won: 12, created_at: '2026-01-01',
}

function renderLobby() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  localStorage.setItem('token', 'tok')
  localStorage.setItem('user', JSON.stringify({ id: 'u1', username: 'alice', display_name: 'Alice' }))
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/lobby']}>
        <AuthProvider>
          <Routes>
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/game/:gameId" element={<div>game</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(usersApi.getProfile).mockResolvedValue(mockProfile)
})

describe('LobbyPage', () => {
  it('renders action cards', async () => {
    renderLobby()
    await waitFor(() => expect(screen.getByText(/ranked/i)).toBeInTheDocument())
    expect(screen.getByText(/quickplay/i)).toBeInTheDocument()
    expect(screen.getByText(/private room/i)).toBeInTheDocument()
  })

  it('redirects to /game/:gameId after creating private room', async () => {
    vi.mocked(roomsApi.createRoom).mockResolvedValue({ game_id: 'g42', invite_code: 'ABC' })
    renderLobby()
    await waitFor(() => screen.getByText(/private room/i))
    await userEvent.click(screen.getByRole('button', { name: /create private room/i }))
    await waitFor(() => expect(screen.getByText('game')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/pages/LobbyPage.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/pages/LobbyPage.module.css`**

```css
.page {
  min-height: 100vh;
  background: var(--bg);
  padding: 40px;
}

.header {
  margin-bottom: 40px;
}

.greeting {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stats {
  color: var(--text-muted);
  font-size: 14px;
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.statValue {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  max-width: 860px;
}

.card {
  padding: 24px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: var(--text-muted);
}

.cardTitle {
  font-size: 15px;
  font-weight: 700;
}

.cardDesc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  flex: 1;
}

.joinInput {
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  width: 100%;
  outline: none;
}

.joinInput:focus {
  border-color: var(--green);
}

.queueStatus {
  font-size: 13px;
  color: var(--gold);
  margin-top: 8px;
}

.inviteBox {
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--gold);
  margin-top: 4px;
  word-break: break-all;
}
```

- [ ] **Step 4: Create `packages/web/src/pages/LobbyPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getProfile } from '../api/users'
import { createRoom, joinRoom } from '../api/rooms'
import { Button } from '../components/Button/Button'
import styles from './LobbyPage.module.css'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [joiningCode, setJoiningCode] = useState('')
  const [createdInvite, setCreatedInvite] = useState<string | null>(null)
  const [queueMode, setQueueMode] = useState<'ranked' | 'quickplay' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: () => getProfile(user!.username),
    enabled: !!user,
  })

  async function handleCreateRoom() {
    setBusy(true)
    setError(null)
    try {
      const res = await createRoom()
      setCreatedInvite(res.invite_code)
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

  async function handleQueue(mode: 'ranked' | 'quickplay') {
    // Matchmaking: call POST /api/rooms/queue (not yet implemented on server)
    // For now: show waiting state
    setQueueMode(mode)
    setError('Matchmaking not yet available — use private rooms for now.')
  }

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
          <Button onClick={() => handleQueue('ranked')} disabled={busy}>
            {queueMode === 'ranked' ? 'Finding match…' : 'Find ranked game'}
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Quickplay</div>
          <p className={styles.cardDesc}>Casual game, no rating change. Faster queue times.</p>
          <Button onClick={() => handleQueue('quickplay')} disabled={busy}>
            {queueMode === 'quickplay' ? 'Finding match…' : 'Find quickplay game'}
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Create private room</div>
          <p className={styles.cardDesc}>Get an invite link to share with a friend.</p>
          <Button onClick={handleCreateRoom} disabled={busy}>
            {busy ? 'Creating…' : 'Create private room'}
          </Button>
          {createdInvite && (
            <div className={styles.inviteBox}>
              Invite: {createdInvite}
            </div>
          )}
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
          <Button onClick={handleJoinRoom} disabled={busy || !joiningCode.trim()}>
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

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/pages/LobbyPage.test.tsx
```

Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/LobbyPage.tsx packages/web/src/pages/LobbyPage.module.css packages/web/src/tests/pages/LobbyPage.test.tsx
git commit -m "feat(web): LobbyPage — stats, action cards, create/join private room"
```

---

### Task 2: JoinPage (guest + JWT branches)

**Files:**
- Create: `packages/web/src/pages/JoinPage.tsx`
- Create: `packages/web/src/pages/JoinPage.module.css`
- Test: `packages/web/src/tests/pages/JoinPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/tests/pages/JoinPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import JoinPage from '../../pages/JoinPage'

vi.mock('../../api/rooms', () => ({
  joinRoom: vi.fn(),
}))

import * as roomsApi from '../../api/rooms'

function renderJoin(hasJwt: boolean) {
  localStorage.clear()
  sessionStorage.clear()
  if (hasJwt) {
    localStorage.setItem('token', 'jwt-tok')
    localStorage.setItem('user', JSON.stringify({ id: 'u1', username: 'alice', display_name: 'Alice' }))
  }
  return render(
    <MemoryRouter initialEntries={['/join/ABC123']}>
      <AuthProvider>
        <Routes>
          <Route path="/join/:inviteCode" element={<JoinPage />} />
          <Route path="/game/:gameId" element={<div>game</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('JoinPage — guest (no JWT)', () => {
  it('shows display name input for guests', () => {
    renderJoin(false)
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })

  it('generates guest token and calls joinRoom with display_name', async () => {
    vi.mocked(roomsApi.joinRoom).mockResolvedValue({ game_id: 'g1', invite_code: 'ABC123' })
    renderJoin(false)
    await userEvent.type(screen.getByLabelText(/display name/i), 'Guestinho')
    await userEvent.click(screen.getByRole('button', { name: /join/i }))
    await waitFor(() => {
      expect(roomsApi.joinRoom).toHaveBeenCalledWith('ABC123', 'Guestinho')
    })
    expect(sessionStorage.getItem('guestToken')).toHaveLength(64)
  })

  it('redirects to /game/:gameId on success', async () => {
    vi.mocked(roomsApi.joinRoom).mockResolvedValue({ game_id: 'g99', invite_code: 'ABC123' })
    renderJoin(false)
    await userEvent.type(screen.getByLabelText(/display name/i), 'Guestinho')
    await userEvent.click(screen.getByRole('button', { name: /join/i }))
    await waitFor(() => expect(screen.getByText('game')).toBeInTheDocument())
  })
})

describe('JoinPage — logged-in user (JWT present)', () => {
  it('does NOT show display name input for JWT users', () => {
    renderJoin(true)
    expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument()
  })

  it('calls joinRoom with invite_code only (no display_name)', async () => {
    vi.mocked(roomsApi.joinRoom).mockResolvedValue({ game_id: 'g2', invite_code: 'ABC123' })
    renderJoin(true)
    await userEvent.click(screen.getByRole('button', { name: /join/i }))
    await waitFor(() => {
      expect(roomsApi.joinRoom).toHaveBeenCalledWith('ABC123', undefined)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/web && npx vitest run src/tests/pages/JoinPage.test.tsx
```

Expected: FAIL with module not found.

- [ ] **Step 3: Create `packages/web/src/pages/JoinPage.module.css`**

```css
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.card {
  width: 360px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px;
}

.heading {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.subheading {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 28px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
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
```

- [ ] **Step 4: Create `packages/web/src/pages/JoinPage.tsx`**

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { joinRoom } from '../api/rooms'
import { generateGuestToken, setGuestToken, getJwt } from '../utils/token'
import { Button } from '../components/Button/Button'
import styles from './JoinPage.module.css'

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isLoggedIn = getJwt() !== null

  async function handleJoin() {
    if (!inviteCode) return
    setBusy(true)
    setError(null)

    try {
      if (!isLoggedIn) {
        const guestToken = generateGuestToken()
        setGuestToken(guestToken)
      }
      const res = await joinRoom(inviteCode, isLoggedIn ? undefined : displayName)
      navigate(`/game/${res.game_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Join game</h1>
        <p className={styles.subheading}>
          {isLoggedIn
            ? `Joining as ${user?.display_name ?? user?.username}`
            : 'You\'re joining as a guest. Enter a display name.'}
        </p>

        {!isLoggedIn && (
          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>Display Name</label>
            <input
              id="displayName"
              className={styles.input}
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How you'll appear in the game"
              maxLength={30}
              required
            />
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <Button
          full
          onClick={handleJoin}
          disabled={busy || (!isLoggedIn && !displayName.trim())}
        >
          {busy ? 'Joining…' : 'Join game'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/web && npx vitest run src/tests/pages/JoinPage.test.tsx
```

Expected: PASS (all 5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/JoinPage.tsx packages/web/src/pages/JoinPage.module.css packages/web/src/tests/pages/JoinPage.test.tsx
git commit -m "feat(web): JoinPage with JWT and guest token branches"
```

---

### Task 3: ProfilePage

**Files:**
- Create: `packages/web/src/pages/ProfilePage.tsx`
- Create: `packages/web/src/pages/ProfilePage.module.css`

- [ ] **Step 1: Create `packages/web/src/pages/ProfilePage.module.css`**

```css
.page {
  max-width: 700px;
  margin: 0 auto;
  padding: 40px 20px;
  background: var(--bg);
  min-height: 100vh;
}

.back {
  color: var(--text-muted);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  cursor: pointer;
}

.back:hover { color: var(--text); }

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
}

.displayName {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.username {
  color: var(--text-muted);
  font-size: 14px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.statCard {
  padding: 16px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
}

.statLabel {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.statValue {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
}

.sectionTitle {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.matchList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.matchRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
}

.matchOpponent { font-weight: 600; }

.matchResult {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
}

.win { background: var(--green-dim); color: var(--green); }
.loss { background: var(--red-dim); color: var(--red); }
.draw { background: var(--gold-dim); color: var(--gold); }

.matchScore { color: var(--text-muted); font-family: var(--font-mono); }

.empty { color: var(--text-muted); font-size: 13px; padding: 16px 0; }

.loadMore {
  margin-top: 16px;
  text-align: center;
}
```

- [ ] **Step 2: Create `packages/web/src/pages/ProfilePage.tsx`**

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getProfile, getMatches } from '../api/users'
import { Button } from '../components/Button/Button'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  })

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ['matches', userId, offset],
    queryFn: () => getMatches(userId!, LIMIT, offset),
    enabled: !!userId,
  })

  if (profileLoading) return <div className={styles.page} style={{ color: 'var(--text-muted)' }}>Loading…</div>
  if (!profile) return <div className={styles.page} style={{ color: 'var(--red)' }}>Profile not found.</div>

  const isMe = profile.id === user?.id
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0

  return (
    <div className={styles.page}>
      <div className={styles.back} onClick={() => navigate(-1)}>← Back</div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.displayName}>{profile.display_name}</h1>
          <p className={styles.username}>@{profile.username}</p>
        </div>
        {isMe && (
          <Button variant="secondary" size="sm">Edit profile</Button>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Rating</div>
          <div className={styles.statValue}>{Math.round(profile.rating)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Played</div>
          <div className={styles.statValue}>{profile.games_played}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Won</div>
          <div className={styles.statValue}>{profile.games_won}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Win rate</div>
          <div className={styles.statValue}>{winRate}%</div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Match history</div>

      {matchLoading && <p className={styles.empty}>Loading matches…</p>}

      {!matchLoading && matchData && (
        <>
          {matchData.games.length === 0 ? (
            <p className={styles.empty}>No matches yet.</p>
          ) : (
            <div className={styles.matchList}>
              {matchData.games.map(match => (
                <div key={match.id} className={styles.matchRow}>
                  <span className={styles.matchOpponent}>
                    vs {match.opponent.display_name}
                  </span>
                  <span className={styles.matchScore}>
                    {match.my_score} – {match.opponent_score}
                  </span>
                  {match.result && (
                    <span className={`${styles.matchResult} ${styles[match.result]}`}>
                      {match.result.toUpperCase()}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {match.mode}
                  </span>
                </div>
              ))}
            </div>
          )}

          {matchData.games.length === LIMIT && (
            <div className={styles.loadMore}>
              <Button variant="secondary" size="sm" onClick={() => setOffset(o => o + LIMIT)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/ProfilePage.tsx packages/web/src/pages/ProfilePage.module.css
git commit -m "feat(web): ProfilePage with stats and match history"
```

---

### Task 4: LeaderboardPage

**Files:**
- Create: `packages/web/src/pages/LeaderboardPage.tsx`
- Create: `packages/web/src/pages/LeaderboardPage.module.css`

- [ ] **Step 1: Create `packages/web/src/pages/LeaderboardPage.module.css`**

```css
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  background: var(--bg);
}

.heading {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.countrySelect {
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 8px 12px;
  font-family: var(--font-ui);
  font-size: 13px;
  outline: none;
}

.countrySelect:focus { border-color: var(--green); }

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 12px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.table tr:hover td { background: var(--panel-bg); }

.rank {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-muted);
  width: 48px;
}

.rankTop { color: var(--gold); }

.playerName {
  font-weight: 600;
  cursor: pointer;
}
.playerName:hover { color: var(--green); }

.username { color: var(--text-muted); font-size: 12px; }

.rating {
  font-family: var(--font-mono);
  font-weight: 700;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.empty { color: var(--text-muted); font-size: 14px; padding: 24px 0; }
```

- [ ] **Step 2: Create `packages/web/src/pages/LeaderboardPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getLeaderboard } from '../api/leaderboard'
import { Button } from '../components/Button/Button'
import styles from './LeaderboardPage.module.css'

const COUNTRY_OPTIONS = [
  { value: '', label: 'Global' },
  { value: 'TH', label: 'Thailand' },
  { value: 'US', label: 'United States' },
  { value: 'JP', label: 'Japan' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'BR', label: 'Brazil' },
  { value: 'IN', label: 'India' },
]

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [country, setCountry] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', page, country],
    queryFn: () => getLeaderboard(page, country || undefined),
  })

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Leaderboard</h1>

      <div className={styles.controls}>
        <select
          className={styles.countrySelect}
          value={country}
          onChange={e => { setCountry(e.target.value); setPage(1) }}
        >
          {COUNTRY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className={styles.empty}>Loading…</p>}

      {!isLoading && data && (
        <>
          {data.entries.length === 0 ? (
            <p className={styles.empty}>No players found.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Rating</th>
                  <th>W</th>
                  <th>Played</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map(entry => (
                  <tr key={entry.user_id}>
                    <td className={`${styles.rank} ${entry.rank <= 3 ? styles.rankTop : ''}`}>
                      {entry.rank}
                    </td>
                    <td>
                      <span
                        className={styles.playerName}
                        onClick={() => navigate(`/profile/${entry.username}`)}
                      >
                        {entry.display_name}
                      </span>
                      <br />
                      <span className={styles.username}>@{entry.username}</span>
                    </td>
                    <td className={styles.rating}>{Math.round(entry.rating)}</td>
                    <td>{entry.games_won}</td>
                    <td>{entry.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className={styles.pagination}>
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </Button>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>
              Page {page}
            </span>
            <Button variant="secondary" size="sm" disabled={data.entries.length < 20} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/LeaderboardPage.tsx packages/web/src/pages/LeaderboardPage.module.css
git commit -m "feat(web): LeaderboardPage with country filter and pagination"
```

---

### Task 5: AdminPage

**Files:**
- Create: `packages/web/src/pages/AdminPage.tsx`
- Create: `packages/web/src/pages/AdminPage.module.css`

- [ ] **Step 1: Create `packages/web/src/pages/AdminPage.module.css`**

```css
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  background: var(--bg);
}

.heading {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 32px;
}

.section {
  margin-bottom: 40px;
}

.sectionTitle {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  font-weight: 600;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.gameId {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.banRow {
  display: flex;
  gap: 8px;
  align-items: center;
}

.banInput {
  flex: 1;
  background: var(--tile-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  outline: none;
}

.banInput:focus { border-color: var(--red); }

.empty { color: var(--text-muted); font-size: 13px; padding: 16px 0; }
```

- [ ] **Step 2: Create `packages/web/src/pages/AdminPage.tsx`**

```tsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getActiveGames, forceEndGame, banUser } from '../api/admin'
import { Button } from '../components/Button/Button'
import styles from './AdminPage.module.css'

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [banInput, setBanInput] = useState('')
  const [banBusy, setBanBusy] = useState(false)
  const [banError, setBanError] = useState<string | null>(null)

  const { data: games, isLoading } = useQuery({
    queryKey: ['admin', 'activeGames'],
    queryFn: getActiveGames,
    refetchInterval: 10_000,
  })

  async function handleForceEnd(gameId: string) {
    await forceEndGame(gameId)
    queryClient.invalidateQueries({ queryKey: ['admin', 'activeGames'] })
  }

  async function handleBan() {
    if (!banInput.trim()) return
    setBanBusy(true)
    setBanError(null)
    try {
      await banUser(banInput.trim())
      setBanInput('')
    } catch (err) {
      setBanError(err instanceof Error ? err.message : 'Ban failed')
    } finally {
      setBanBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Admin</h1>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Active games</div>
        {isLoading && <p className={styles.empty}>Loading…</p>}
        {!isLoading && games && (
          games.length === 0 ? (
            <p className={styles.empty}>No active games.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Game ID</th>
                  <th>Mode</th>
                  <th>Players</th>
                  <th>Started</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id}>
                    <td className={styles.gameId}>{game.id.slice(0, 8)}…</td>
                    <td>{game.mode}</td>
                    <td>{game.players.map(p => p.display_name).join(' vs ')}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(game.created_at).toLocaleTimeString()}
                    </td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleForceEnd(game.id)}
                      >
                        Force end
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Ban user</div>
        <div className={styles.banRow}>
          <input
            className={styles.banInput}
            placeholder="User ID or username"
            value={banInput}
            onChange={e => setBanInput(e.target.value)}
          />
          <Button variant="danger" onClick={handleBan} disabled={banBusy || !banInput.trim()}>
            {banBusy ? 'Banning…' : 'Ban'}
          </Button>
        </div>
        {banError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{banError}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/AdminPage.tsx packages/web/src/pages/AdminPage.module.css
git commit -m "feat(web): AdminPage — active games, force-end, user ban"
```

---

### Task 6: Wire all pages into App.tsx + final type-check

**Files:**
- Modify: `packages/web/src/App.tsx` — replace remaining stubs with real imports

- [ ] **Step 1: Update `packages/web/src/App.tsx`**

Replace the four remaining stub constants:

```ts
// Remove these lines:
const LobbyPage = () => <div>Lobby — coming soon</div>
const JoinPage = () => <div>Join — coming soon</div>
const ProfilePage = () => <div>Profile — coming soon</div>
const LeaderboardPage = () => <div>Leaderboard — coming soon</div>
const AdminPage = () => <div>Admin — coming soon</div>
```

Add these imports at the top of the file with the other page imports:

```ts
import LobbyPage from './pages/LobbyPage'
import JoinPage from './pages/JoinPage'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
```

The route table does not change — only the imports.

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 3: Run all web tests**

```bash
cd packages/web && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): wire all pages into App — frontend complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered |
|-----------------|---------|
| `LobbyPage` — rating, wins, action cards | Task 1 |
| `LobbyPage` — create private room → redirect | Task 1 |
| `LobbyPage` — join with code | Task 1 |
| `LobbyPage` — ranked/quickplay queue (stub with message) | Task 1 |
| `JoinPage` — JWT user: no name input, `{invite_code}` only | Task 2 |
| `JoinPage` — guest: name input, generate token, `{invite_code, display_name}` | Task 2 |
| `JoinPage` — guest token stored in `sessionStorage` | Task 2 |
| `JoinPage` — redirect to `/game/:gameId` on success | Task 2 |
| `ProfilePage` — rating, wins, played stats | Task 3 |
| `ProfilePage` — match history with pagination | Task 3 |
| `ProfilePage` — edit mode button when `isMe` | Task 3 |
| `LeaderboardPage` — table with rank, rating, wins | Task 4 |
| `LeaderboardPage` — country filter dropdown | Task 4 |
| `LeaderboardPage` — pagination | Task 4 |
| `AdminPage` — active games polling every 10s | Task 5 |
| `AdminPage` — force-end button per game row | Task 5 |
| `AdminPage` — ban user input | Task 5 |
| All page stubs replaced in `App.tsx` | Task 6 |

**Placeholder scan:** LobbyPage matchmaking is intentionally stubbed with an explanatory error message — the server matchmaking endpoint doesn't exist yet (out of spec v1 scope). This is clearly noted in the UI copy, not a hidden placeholder.

**Type consistency:** `UserProfile`, `MatchHistoryResponse`, `LeaderboardResponse`, `ActiveGame` all defined in `types/api.ts` (Plan 5, Task 4). All imports consistent.
