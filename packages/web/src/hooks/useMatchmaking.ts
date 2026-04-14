import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { joinQueue, leaveQueue, getMatchStatus } from '../api/matchmaking'

type QueueState = 'idle' | 'queued' | 'matched'

export function useMatchmaking() {
  const navigate = useNavigate()
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [queueType, setQueueType] = useState<'ranked' | 'quickplay' | null>(null)

  const { data: statusData } = useQuery({
    queryKey: ['matchmaking', 'status'],
    queryFn: getMatchStatus,
    refetchInterval: 2500,
    enabled: queueState === 'queued',
  })

  useEffect(() => {
    if (statusData?.status === 'matched' && statusData.game_id) {
      setQueueState('matched')
      navigate(`/game/${statusData.game_id}`)
    }
  }, [statusData, navigate])

  const join = useCallback(async (type: 'ranked' | 'quickplay') => {
    await joinQueue(type)
    setQueueType(type)
    setQueueState('queued')
  }, [])

  const cancel = useCallback(async () => {
    await leaveQueue()
    setQueueState('idle')
    setQueueType(null)
  }, [])

  return { queueState, queueType, join, cancel }
}
