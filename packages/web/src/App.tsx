import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth, RequireAdmin } from './router/guards'
import { useAuth } from './hooks/useAuth'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GamePage from './pages/GamePage'
import LobbyPage from './pages/LobbyPage'
import JoinPage from './pages/JoinPage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import { MainLayout } from './components/MainLayout/MainLayout'

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
              path="/waiting/:inviteCode"
              element={<RequireAuth><WaitingRoomPage /></RequireAuth>}
            />
            <Route
              path="/game/:gameId"
              element={<RequireAuth allowGuest><GamePage /></RequireAuth>}
            />
            <Route element={<MainLayout />}>
              <Route
                path="/lobby"
                element={<RequireAuth><LobbyPage /></RequireAuth>}
              />
              <Route
                path="/profile/:username"
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
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
