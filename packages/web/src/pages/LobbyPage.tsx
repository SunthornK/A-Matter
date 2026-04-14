import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, skipToken } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getProfile } from '../api/users'
import { createRoom, joinRoom } from '../api/rooms'
import { Button } from '../components/Button/Button'
import styles from './LobbyPage.module.css'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [joiningCode, setJoiningCode] = useState('')
  const [queueMode, setQueueMode] = useState<'ranked' | 'quickplay' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: user ? () => getProfile(user.username) : skipToken,
  })

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

  async function handleQueue(mode: 'ranked' | 'quickplay') {
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
            {queueMode === 'ranked' ? 'Finding match…' : 'Play now'}
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Quickplay</div>
          <p className={styles.cardDesc}>Casual game, no rating change. Faster queue times.</p>
          <Button onClick={() => handleQueue('quickplay')} disabled={busy}>
            {queueMode === 'quickplay' ? 'Finding match…' : 'Play now'}
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Host a game</div>
          <p className={styles.cardDesc}>Get an invite link to share with a friend.</p>
          <Button onClick={handleCreateRoom} disabled={busy}>
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
