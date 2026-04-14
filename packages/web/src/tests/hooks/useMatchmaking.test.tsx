import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMatchmaking } from '../../hooks/useMatchmaking'

vi.mock('../../api/matchmaking', () => ({
  joinQueue: vi.fn(),
  leaveQueue: vi.fn(),
  getMatchStatus: vi.fn(),
}))

import * as mmApi from '../../api/matchmaking'

// Test component that exposes hook state + actions as DOM elements
function TestComponent() {
  const { queueState, queueType, join, cancel, error } = useMatchmaking()
  return (
    <div>
      <span data-testid="state">{queueState}</span>
      <span data-testid="type">{queueType ?? ''}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button onClick={() => join('ranked')}>join-ranked</button>
      <button onClick={() => join('quickplay')}>join-quickplay</button>
      <button onClick={() => cancel()}>cancel</button>
    </div>
  )
}

function renderHook() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route path="/lobby" element={<TestComponent />} />
          <Route path="/game/:gameId" element={<div data-testid="game-page">game</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(mmApi.joinQueue).mockResolvedValue(undefined)
  vi.mocked(mmApi.leaveQueue).mockResolvedValue(undefined)
  vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'not_queued' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useMatchmaking', () => {
  it('initial state is idle with no queueType', () => {
    renderHook()
    expect(screen.getByTestId('state').textContent).toBe('idle')
    expect(screen.getByTestId('type').textContent).toBe('')
  })

  it('join("ranked") calls joinQueue and sets state to queued', async () => {
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('queued'))
    expect(screen.getByTestId('type').textContent).toBe('ranked')
    expect(mmApi.joinQueue).toHaveBeenCalledWith('ranked')
  })

  it('join("quickplay") calls joinQueue with quickplay', async () => {
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-quickplay' }))
    await waitFor(() => expect(mmApi.joinQueue).toHaveBeenCalledWith('quickplay'))
  })

  it('navigates to /game/:gameId when status poll returns matched', async () => {
    vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'matched', game_id: 'g99' })
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('game-page')).toBeInTheDocument())
  })

  it('exposes error when joinQueue fails', async () => {
    vi.mocked(mmApi.joinQueue).mockRejectedValueOnce(new Error('Network error'))
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Network error'),
    )
    expect(screen.getByTestId('state').textContent).toBe('idle')
  })

  it('cancel calls leaveQueue and resets state to idle', async () => {
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('queued'))
    await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('idle'))
    expect(screen.getByTestId('type').textContent).toBe('')
    expect(mmApi.leaveQueue).toHaveBeenCalled()
  })

  it('stops polling after match is found', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(mmApi.getMatchStatus).mockResolvedValue({ status: 'matched', game_id: 'g99' })
    renderHook()
    await userEvent.click(screen.getByRole('button', { name: 'join-ranked' }))
    await waitFor(() => expect(screen.getByTestId('game-page')).toBeInTheDocument())
    const callCountAfterNav = vi.mocked(mmApi.getMatchStatus).mock.calls.length
    // Advance past two polling intervals (2 × 2500ms); call count must not increase
    vi.advanceTimersByTime(6000)
    await Promise.resolve()
    expect(vi.mocked(mmApi.getMatchStatus).mock.calls.length).toBe(callCountAfterNav)
    vi.useRealTimers()
  })
})
