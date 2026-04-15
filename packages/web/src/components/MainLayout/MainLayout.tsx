import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './MainLayout.module.css'

export function MainLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { name: 'Lobby', path: '/lobby', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    )},
    { name: 'Leaderboard', path: '/leaderboard', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    )},
    { name: 'Profile', path: `/profile/${user?.username}`, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    )}
  ]

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    )})
  }

  return (
    <div className={styles.layout}>
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.brand}>A-Matter</div>
          <nav className={styles.navLinks}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link key={item.name} to={item.path} className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
          <div className={styles.actions}>
            <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  )
}
