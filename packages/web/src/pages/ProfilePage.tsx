import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, skipToken } from '@tanstack/react-query'
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
    queryFn: userId ? () => getProfile(userId) : skipToken,
  })

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ['matches', userId, offset],
    queryFn: userId ? () => getMatches(userId, LIMIT, offset) : skipToken,
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
