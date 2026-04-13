import { useParams } from 'react-router-dom'
import { useGameSocket } from '../hooks/useGameSocket'
import { useGameStore } from '../store/gameStore'
import { getToken } from '../utils/token'
import { Board } from '../game/Board'
import { Rack } from '../game/Rack'
import { TileTracker } from '../game/TileTracker'
import { InfoPanel } from '../game/InfoPanel'
import { ActionButtons } from '../game/ActionButtons'
import { DisconnectBanner } from '../game/DisconnectBanner'
import { GameOverModal } from '../game/GameOverModal'
import styles from './GamePage.module.css'

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const token = getToken() ?? ''
  const status = useGameStore(s => s.status)
  const gameOverResult = useGameStore(s => s.gameOverResult)

  const emit = useGameSocket(gameId ?? '', token)

  if (!gameId) return <div className={styles.connecting}>Invalid game link.</div>

  if (status === 'connecting' || status === 'idle') {
    return <div className={styles.connecting}>Connecting…</div>
  }

  return (
    <div className={styles.page}>
      <DisconnectBanner />
      <TileTracker />
      <div className={styles.center}>
        <div className={styles.boardWrap}>
          <Board />
        </div>
        <div className={styles.rackWrap}>
          <Rack />
        </div>
        <ActionButtons emit={emit} />
      </div>
      <InfoPanel emit={emit} />
      {gameOverResult && <GameOverModal />}
    </div>
  )
}
