// packages/server/src/game/types.ts
import type { BoardTile } from '@a-matter/validator'
import type { Server, Socket } from 'socket.io'
import type { PrismaClient } from '@prisma/client'

export interface SocketData {
  userId: string | null
  guestToken: string | null
  gameId: string
  playerId: string      // GamePlayer.id
  seat: number
  displayName: string
}

export interface GameContext {
  io: Server
  socket: Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>
  prisma: PrismaClient
}

// Client → Server events
export interface ClientEvents {
  'move:place': (data: { placements: PlacementInput[] }) => void
  'move:exchange': (data: { indices: number[] }) => void
  'move:pass': () => void
  'game:resign': () => void
  'state:request': () => void
  'tile_tracker:update': (data: { tracker: unknown[] }) => void
  'server:pong': () => void
}

// Server → Client events
export interface ServerEvents {
  'game:state': (data: GameStatePayload) => void
  'move:result': (data: MoveResultPayload) => void
  'rack:update': (data: RackUpdatePayload) => void
  'timer:sync': (data: TimerSyncPayload) => void
  'game:over': (data: GameOverPayload) => void
  'error': (data: { code: string; message: string }) => void
  'player:disconnect': (data: { player_id: string }) => void
  'player:reconnect': (data: { player_id: string }) => void
  'server:ping': () => void
}

export interface PlacementInput {
  tile_id: string
  rack_index: number
  row: number
  col: number
  dual_choice: '+' | '-' | '×' | '÷' | null
  blank_designation: string | null
}

export interface GameStatePayload {
  game_id: string
  board: (BoardTile | null)[][]
  turn_number: number
  current_turn_player_id: string
  players: PlayerStateEntry[]
  my_rack: BoardTile[]
  my_player_id: string
  status: 'active' | 'finished'
  timestamp: number
}

export interface PlayerStateEntry {
  player_id: string
  user_id: string | null
  display_name: string
  seat: number
  score: number
  time_remaining_ms: number
  rack_count: number
}

export interface MoveResultPayload {
  player_id: string
  turn_number: number
  action: 'place' | 'exchange' | 'pass'
  placements?: PlacementInput[]
  score_earned: number
  new_score: number
  next_player_id: string
  timestamp: number
}

export interface RackUpdatePayload {
  rack: BoardTile[]
  timestamp: number
}

export interface TimerSyncPayload {
  players: Array<{ player_id: string; time_remaining_ms: number }>
  timestamp: number
}

export interface GameOverPayload {
  reason: 'completion' | 'timeout' | 'forfeit' | 'stalemate'
  winner_player_id: string | null
  final_scores: Array<{ player_id: string; score: number }>
  timestamp: number
}
