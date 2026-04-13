import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import LoginPage from '../../pages/LoginPage'

// Mock the api/auth module
vi.mock('../../api/auth', () => ({
  login: vi.fn(),
}))

import * as authApi from '../../api/auth'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={<div>lobby</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renders username and password inputs', () => {
    renderLogin()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('calls login with form values on submit', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(authApi.login).toHaveBeenCalledWith('alice', 'password')
  })

  it('redirects to /lobby on successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('lobby')).toBeInTheDocument())
  })

  it('shows error message on failed login', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))
    renderLogin()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument())
  })
})
