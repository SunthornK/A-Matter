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
  const { user } = useAuth()
  const [joiningCode, setJoiningCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { queueState, queueType, join, cancel, error: queueError } = useMatchmaking()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: user ? () => getProfile(user.username) : skipToken,
  })

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
      navigate(`/waiting/${res.invite_code}`)
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
      <div className={styles.contentWrapper}>
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

        {error && <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 13, background: 'rgba(248, 113, 113, 0.1)', padding: 12, borderRadius: 8 }}>{error}</p>}
        {queueError && <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 13, background: 'rgba(248, 113, 113, 0.1)', padding: 12, borderRadius: 8 }}>{queueError}</p>}

        <div className={styles.cards}>
          <div className={`${styles.card} ${styles.heroCard}`}>
            <div className={styles.cardIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div className={styles.cardTitle}>Ranked Matchmaking</div>
            <p className={styles.cardDesc}>Compete for rating points. Our Glicko-2 engine will match you against players of identical skill levels globally.</p>
            {isQueued && queueType === 'ranked' ? (
              <>
                <p className={styles.queueStatus}>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                  </svg>
                  Searching for opponent…
                </p>
                <Button variant="secondary" onClick={cancel}>Cancel Search</Button>
              </>
            ) : (
              <div style={{ marginTop: 8 }}>
                <Button onClick={() => join('ranked')} disabled={isQueued || busy} full>Find Ranked Match</Button>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ color: 'var(--blue)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className={styles.cardTitle}>Quickplay</div>
            <p className={styles.cardDesc}>Casual games with no rating changes. Excellent for practicing.</p>
            {isQueued && queueType === 'quickplay' ? (
              <>
                <p className={styles.queueStatus} style={{ color: 'var(--blue)' }}>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                  </svg>
                  Searching…
                </p>
                <Button variant="secondary" onClick={cancel}>Cancel</Button>
              </>
            ) : (
              <Button onClick={() => join('quickplay')} disabled={isQueued || busy}>Play Casual</Button>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ color: 'var(--text)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className={styles.cardTitle}>Host a game</div>
            <p className={styles.cardDesc}>Get a 6-character invite link to share with a friend or guest.</p>
            <Button variant="secondary" onClick={handleCreateRoom} disabled={busy || isQueued}>
              {busy ? 'Creating…' : 'Create private room'}
            </Button>
          </div>

          <div className={styles.card} style={{ gridColumn: 'span 2' }}>
            <div className={styles.cardTitle}>Join Room</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                className={styles.joinInput}
                placeholder="ENTER INVITE CODE..."
                value={joiningCode}
                onChange={e => setJoiningCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                maxLength={6}
              />
              <Button onClick={handleJoinRoom} disabled={busy || isQueued || !joiningCode.trim()}>
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
