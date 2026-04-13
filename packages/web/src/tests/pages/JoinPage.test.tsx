import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import JoinPage from '../../pages/JoinPage'

vi.mock('../../api/rooms', () => ({
  joinRoom: vi.fn(),
}))

import * as roomsApi from '../../api/rooms'

function renderJoin(hasJwt: boolean) {
  localStorage.clear()
  sessionStorage.clear()
  if (hasJwt) {
    localStorage.setItem('token', 'jwt-tok')
    localStorage.setItem('user', JSON.stringify({ id: 'u1', username: 'alice', display_name: 'Alice' }))
  }
  return render(
    <MemoryRouter initialEntries={['/join/ABC123']}>
      <AuthProvider>
        <Routes>
          <Route path="/join/:inviteCode" element={<JoinPage />} />
          <Route path="/game/:gameId" element={<div>game</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('JoinPage — guest (no JWT)', () => {
  it('shows display name input for guests', () => {
    renderJoin(false)
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })

  it('generates guest token and calls joinRoom with display_name', async () => {
    vi.mocked(roomsApi.joinRoom).mockResolvedValue({ game_id: 'g1', invite_code: 'ABC123' })
    renderJoin(false)
    await userEvent.type(screen.getByLabelText(/display name/i), 'Guestinho')
    await userEvent.click(screen.getByRole('button', { name: /join/i }))
    await waitFor(() => {
      expect(roomsApi.joinRoom).toHaveBeenCalledWith('ABC123', 'Guestinho')
    })
    expect(sessionStorage.getItem('guestToken')).toHaveLength(64)
  })

  it('redirects to /game/:gameId on success', async () => {
    vi.mocked(roomsApi.joinRoom).mockResolvedValue({ game_id: 'g99', invite_code: 'ABC123' })
    renderJoin(false)
    await userEvent.type(screen.getByLabelText(/display name/i), 'Guestinho')
    await userEvent.click(screen.getByRole('button', { name: /join/i }))
    await waitFor(() => expect(screen.getByText('game')).toBeInTheDocument())
  })
})

describe('JoinPage — logged-in user (JWT present)', () => {
  it('does NOT show display name input for JWT users', () => {
    renderJoin(true)
    expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument()
  })

  it('calls joinRoom with invite_code only (no display_name)', async () => {
    vi.mocked(roomsApi.joinRoom).mockResolvedValue({ game_id: 'g2', invite_code: 'ABC123' })
    renderJoin(true)
    await userEvent.click(screen.getByRole('button', { name: /join/i }))
    await waitFor(() => {
      expect(roomsApi.joinRoom).toHaveBeenCalledWith('ABC123', undefined)
    })
  })
})
