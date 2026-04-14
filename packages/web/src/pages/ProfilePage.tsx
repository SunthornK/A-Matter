import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, skipToken } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getProfile, getMatches } from '../api/users'
import type { MatchEntry } from '../types/api'
import { Button } from '../components/Button/Button'
import styles from './ProfilePage.module.css'

const LIMIT = 20

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const [allMatches, setAllMatches] = useState<MatchEntry[]>([])

  // Reset pagination when navigating to a different profile
  useEffect(() => {
    setOffset(0)
    setAllMatches([])
  }, [username])

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: username ? () => getProfile(username) : skipToken,
  })

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ['matches', profile?.id, offset],
    queryFn: profile ? () => getMatches(profile.id, LIMIT, offset) : skipToken,
  })

  // Accumulate match pages in local state
  useEffect(() => {
    if (matchData) {
      setAllMatches(prev => offset === 0 ? matchData.games : [...prev, ...matchData.games])
    }
  }, [matchData, offset])

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

      {allMatches.length === 0 && matchLoading && <p className={styles.empty}>Loading matches…</p>}

      {allMatches.length === 0 && !matchLoading && !matchData?.games.length && (
        <p className={styles.empty}>No matches yet.</p>
      )}

      {allMatches.length > 0 && (
        <div className={styles.matchList}>
          {allMatches.map(match => (
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

      {matchData && matchData.games.length === LIMIT && (
        <div className={styles.loadMore}>
          <Button variant="secondary" size="sm" onClick={() => setOffset(o => o + LIMIT)} disabled={matchLoading}>
            {matchLoading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
