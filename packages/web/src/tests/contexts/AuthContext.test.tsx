import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../contexts/AuthContext'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))
import * as authApi from '../../api/auth'

// Helper component that exposes auth state
function AuthDisplay() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div>loading</div>
  if (!user) return <div>no user</div>
  return <div>user:{user.username}</div>
}

function LoginButton() {
  const { login } = useAuth()
  return <button onClick={() => login('alice', 'password')}>login</button>
}

function LogoutButton() {
  const { logout } = useAuth()
  return <button onClick={() => logout()}>logout</button>
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
})

describe('AuthContext', () => {
  it('shows no user when localStorage is empty', () => {
    render(<AuthProvider><AuthDisplay /></AuthProvider>)
    expect(screen.getByText('no user')).toBeInTheDocument()
  })

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'alice', display_name: 'Alice' }))
    render(<AuthProvider><AuthDisplay /></AuthProvider>)
    expect(screen.getByText('user:alice')).toBeInTheDocument()
  })

  it('clears user and token on logout', async () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'alice', display_name: 'Alice' }))
    render(<AuthProvider><AuthDisplay /><LogoutButton /></AuthProvider>)

    await userEvent.click(screen.getByText('logout'))
    expect(screen.getByText('no user')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('sets user and token after successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'new-tok',
      user: { id: '2', username: 'bob', display_name: 'Bob' },
    })
    render(<AuthProvider><AuthDisplay /><LoginButton /></AuthProvider>)
    expect(screen.getByText('no user')).toBeInTheDocument()

    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByText('user:bob')).toBeInTheDocument())
    expect(localStorage.getItem('token')).toBe('new-tok')
  })
})
