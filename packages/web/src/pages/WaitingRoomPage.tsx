import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getRoomStatus } from '../api/rooms'
import { Button } from '../components/Button/Button'
import styles from './WaitingRoomPage.module.css'

export default function WaitingRoomPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const { data: room } = useQuery({
    queryKey: ['room-status', inviteCode],
    queryFn: () => getRoomStatus(inviteCode!),
    refetchInterval: 2000,
    enabled: !!inviteCode,
  })

  useEffect(() => {
    if (room?.status === 'in_game' && room.game_id) {
      navigate(`/game/${room.game_id}`, { replace: true })
    }
  }, [room, navigate])

  const inviteLink = `${window.location.origin}/join/${inviteCode}`

  function copyCode() {
    navigator.clipboard.writeText(inviteCode ?? '').then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Waiting for opponent</h1>
        <p className={styles.sub}>Share your room code or link with a friend to start</p>

        <div className={styles.codeBlock}>
          <span className={styles.codeLabel}>Room Code</span>
          <span className={styles.code}>{inviteCode}</span>
        </div>

        <input
          className={styles.linkInput}
          readOnly
          value={inviteLink}
          onFocus={(e) => e.target.select()}
          aria-label="Invite link"
        />

        <div className={styles.copyButtons}>
          <Button variant="secondary" onClick={copyCode}>
            {copiedCode ? 'Copied!' : 'Copy Code'}
          </Button>
          <Button onClick={copyLink}>
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>

        <div className={styles.players}>
          <div className={styles.player}>
            <span className={styles.dot} data-ready="true" />
            <span>{user?.display_name ?? user?.username ?? 'You'}</span>
            <span className={styles.badge}>Host</span>
          </div>
          <div className={styles.player}>
            <span className={styles.dot} data-ready="false" />
            <span className={styles.waiting}>Waiting for opponent…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
