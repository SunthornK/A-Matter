import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { joinQueue, leaveQueue, getMatchStatus } from '../api/matchmaking'

type QueueState = 'idle' | 'queued' | 'matched'

export function useMatchmaking() {
  const navigate = useNavigate()
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [queueType, setQueueType] = useState<'ranked' | 'quickplay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: statusData } = useQuery({
    queryKey: ['matchmaking', 'status'],
    queryFn: getMatchStatus,
    refetchInterval: 2500,
    enabled: queueState === 'queued',
  })

  useEffect(() => {
    if (queueState === 'queued' && statusData?.status === 'matched' && statusData.game_id) {
      setQueueState('matched')
      navigate(`/game/${statusData.game_id}`)
    }
  }, [statusData, navigate, queueState])

  const join = useCallback(async (type: 'ranked' | 'quickplay') => {
    setError(null)
    try {
      await joinQueue(type)
      setQueueType(type)
      setQueueState('queued')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join queue')
    }
  }, [])

  const cancel = useCallback(async () => {
    if (queueState === 'idle') return
    await leaveQueue()
    setQueueState('idle')
    setQueueType(null)
  }, [queueState])

  return { queueState, queueType, join, cancel, error }
}
