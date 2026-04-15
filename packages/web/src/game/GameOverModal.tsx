import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'
import { formatScore } from '../utils/format'
import styles from './GameOverModal.module.css'

const REASON_LABELS: Record<string, string> = {
  score: 'Game over',
  timeout: 'Time ran out',
  forfeit: 'Game forfeited',
  stalemate: 'Stalemate',
}

export function GameOverModal() {
  const navigate = useNavigate()
  const result = useGameStore(s => s.gameOverResult)
  const myPlayerId = useGameStore(s => s.myPlayerId)
  const players = useGameStore(s => s.players)

  if (!result) return null

  const isWin = result.winner_id === myPlayerId
  const isDraw = result.winner_id === null
  const resultText = isDraw ? 'Draw' : isWin ? 'You win' : 'You lose'
  const resultClass = isDraw ? styles.draw : isWin ? styles.win : styles.loss

  return (
    <Modal
      title=""
      body={
        <>
          <p className={styles.reason}>{REASON_LABELS[result.reason] ?? result.reason}</p>
          <p className={`${styles.result} ${resultClass}`}>{resultText}</p>
          <div className={styles.scores}>
            {result.final_scores.map(({ player_id, score }) => {
              const player = players.find(p => p.playerId === player_id)
              return (
                <div key={player_id} className={styles.scoreRow}>
                  <span>{player?.displayName ?? player_id}</span>
                  <span className={styles.scoreValue}>{formatScore(score)}</span>
                </div>
              )
            })}
          </div>
        </>
      }
      actions={
        <Button variant="primary" onClick={() => navigate('/lobby')}>
          Back to lobby
        </Button>
      }
    />
  )
}
