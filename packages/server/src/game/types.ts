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
  io: Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>
  socket: Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>
  prisma: PrismaClient
}

// BoardTile on the board, extended with who placed it
export interface BoardCellEntry extends BoardTile {
  owner: string | null  // GamePlayer.id, null if tile predates owner tracking
}

export interface PlayerStateEntry {
  player_id: string
  user_id: string | null
  display_name: string
  seat: number
  score: number
  time_remaining_ms: number
  consecutive_passes: number
  tiles_remaining: number
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
  seq: number
  game_id: string
  mode: 'ranked' | 'quickplay' | 'private'
  board: (BoardCellEntry | null)[][]
  rack: BoardTile[]
  bag: number
  turn_number: number
  current_turn_player_id: string
  players: PlayerStateEntry[]
  my_player_id: string
  status: 'active' | 'finished'
  timestamp: number
}

export interface MoveResultPayload {
  seq: number
  type: 'place' | 'exchange' | 'pass'
  player_id: string
  score_delta: number
  board: (BoardCellEntry | null)[][]
  placed_tiles?: Array<{ value: string; row: number; col: number; points: number }>
  expression?: string
  result?: number
  bag: number
  consecutive_passes: number
  turn_number: number
  current_turn_player_id: string
  players: PlayerStateEntry[]
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
  reason: 'score' | 'timeout' | 'forfeit' | 'stalemate'
  winner_id: string | null
  final_scores: Array<{ player_id: string; score: number }>
  timestamp: number
}
