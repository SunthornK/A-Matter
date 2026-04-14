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
