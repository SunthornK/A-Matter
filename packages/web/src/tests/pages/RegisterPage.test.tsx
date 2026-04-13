import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import RegisterPage from '../../pages/RegisterPage'

vi.mock('../../api/auth', () => ({
  register: vi.fn(),
}))

import * as authApi from '../../api/auth'

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
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

describe('RegisterPage', () => {
  it('renders username, display_name, and password inputs', () => {
    renderRegister()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('calls register with form values on submit', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(authApi.register).toHaveBeenCalledWith('alice', 'password', 'Alice')
  })

  it('redirects to /lobby after registration', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      token: 'tok',
      user: { id: '1', username: 'alice', display_name: 'Alice' },
    })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.getByText('lobby')).toBeInTheDocument())
  })

  it('shows error on failed registration', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('Username taken'))
    renderRegister()

    await userEvent.type(screen.getByLabelText(/username/i), 'alice')
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/password/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.getByText(/username taken/i)).toBeInTheDocument())
  })
})
