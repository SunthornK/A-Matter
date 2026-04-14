import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { joinRoom } from '../api/rooms'
import { generateGuestToken, setGuestToken } from '../utils/token'
import { Button } from '../components/Button/Button'
import styles from './JoinPage.module.css'

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isLoggedIn = user !== null

  async function handleJoin() {
    if (!inviteCode) return
    if (!isLoggedIn && !displayName.trim()) return
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
            : "You're joining as a guest. Enter a display name."}
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
