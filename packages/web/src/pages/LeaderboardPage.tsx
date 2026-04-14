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
