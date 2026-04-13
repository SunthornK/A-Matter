import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import LobbyPage from '../../pages/LobbyPage'

vi.mock('../../api/users', () => ({
  getProfile: vi.fn(),
}))

vi.mock('../../api/rooms', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
}))

import * as usersApi from '../../api/users'
import * as roomsApi from '../../api/rooms'

const mockProfile = {
  id: 'u1', username: 'alice', display_name: 'Alice',
  country: 'TH', rating: 1500, rating_deviation: 100,
  games_played: 20, games_won: 12, created_at: '2026-01-01',
}

function renderLobby() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  localStorage.setItem('token', 'tok')
  localStorage.setItem('user', JSON.stringify({ id: 'u1', username: 'alice', display_name: 'Alice' }))
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/lobby']}>
        <AuthProvider>
          <Routes>
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/game/:gameId" element={<div>game</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(usersApi.getProfile).mockResolvedValue(mockProfile)
})

describe('LobbyPage', () => {
  it('renders action cards', async () => {
    renderLobby()
    await waitFor(() => expect(screen.getByText(/ranked/i)).toBeInTheDocument())
    expect(screen.getByText(/quickplay/i)).toBeInTheDocument()
    expect(screen.getByText(/private room/i)).toBeInTheDocument()
  })

  it('redirects to /game/:gameId after creating private room', async () => {
    vi.mocked(roomsApi.createRoom).mockResolvedValue({ game_id: 'g42', invite_code: 'ABC' })
    renderLobby()
    await waitFor(() => screen.getByText(/private room/i))
    await userEvent.click(screen.getByRole('button', { name: /create private room/i }))
    await waitFor(() => expect(screen.getByText('game')).toBeInTheDocument())
  })
})
