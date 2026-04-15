import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button/Button'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const resUser = await login(username, password)
      if (resUser.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/lobby')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>A-Matter</h1>
        <p className={styles.subheading}>Sign in to play</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldset}>
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username</label>
              <input
                id="username"
                className={styles.input}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" full disabled={submitting}>
            {submitting ? 'Signing in\u2026' : 'Sign in'}
          </Button>
        </form>

        <p className={styles.footer}>
          No account?{' '}
          <Link to="/register" className={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
