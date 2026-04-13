import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth, RequireAdmin } from './router/guards'
import { useAuth } from './hooks/useAuth'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GamePage from './pages/GamePage'

// Lazy placeholders — will be filled in Plan 6 and 7
const LobbyPage = () => <div>Lobby — coming soon</div>
const JoinPage = () => <div>Join — coming soon</div>
const ProfilePage = () => <div>Profile — coming soon</div>
const LeaderboardPage = () => <div>Leaderboard — coming soon</div>
const AdminPage = () => <div>Admin — coming soon</div>

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/lobby" replace /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/join/:inviteCode" element={<JoinPage />} />
            <Route
              path="/lobby"
              element={<RequireAuth><LobbyPage /></RequireAuth>}
            />
            <Route
              path="/game/:gameId"
              element={<RequireAuth allowGuest><GamePage /></RequireAuth>}
            />
            <Route
              path="/profile/:userId"
              element={<RequireAuth><ProfilePage /></RequireAuth>}
            />
            <Route
              path="/leaderboard"
              element={<RequireAuth><LeaderboardPage /></RequireAuth>}
            />
            <Route
              path="/admin"
              element={<RequireAdmin><AdminPage /></RequireAdmin>}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
