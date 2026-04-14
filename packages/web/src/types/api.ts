// Auth
export interface AuthUser {
  id: string
  username: string
  display_name: string
  role?: 'admin' | 'user'
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// User profile
export interface UserProfile {
  id: string
  username: string
  display_name: string
  country: string | null
  rating: number
  rating_deviation: number
  games_played: number
  games_won: number
  created_at: string
}

// Match history entry
export interface MatchEntry {
  id: string
  mode: 'ranked' | 'quickplay' | 'private'
  status: 'active' | 'completed' | 'abandoned'
  created_at: string
  completed_at: string | null
  opponent: {
    id: string
    display_name: string
    username: string | null
  }
  my_score: number
  opponent_score: number
  result: 'win' | 'loss' | 'draw' | null
}

export interface MatchHistoryResponse {
  games: MatchEntry[]
  limit: number
  offset: number
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  username: string
  rating: number
  games_played: number
  games_won: number
  country: string | null
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  total: number
  page: number
}

// Rooms
export interface RoomResponse {
  game_id: string
  invite_code: string
}

// Admin
export interface ActiveGame {
  id: string
  mode: string
  created_at: string
  players: Array<{ display_name: string; score: number }>
}

// Matchmaking
export interface MatchStatusResponse {
  status: 'matched' | 'queued' | 'not_queued'
  game_id?: string
  queue_type?: 'ranked' | 'quickplay'
}

// API error shape
export interface ApiErrorBody {
  error: string
  message?: string
}
