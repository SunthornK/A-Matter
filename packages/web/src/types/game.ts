// Mirror server game types for client consumption

export interface BoardCellPayload {
  value: string         // raw tile identity: 'blank', '+/-', etc.
  display_value: string // resolved symbol to display: the designation or chosen op
  owner: string | null  // player_id; resolve display via owner === myPlayerId
  is_bonus: boolean
  bonus_type: 'b3eq' | 'b2eq' | 'b3pc' | 'b2pc' | null
}

export interface RackTilePayload {
  tile_id: string
  value: string
  type: 'number' | 'operator' | 'equals' | 'dual_operator' | 'blank'
  points: number
  display_value: string
  is_blank: boolean
  blank_designation: string | null
  dual_choice: string | null
}

export interface PlayerStatePayload {
  player_id: string
  display_name: string
  score: number
  time_remaining_ms: number
  consecutive_passes: number
  tiles_remaining: number
}

export interface GameStatePayload {
  seq?: number
  game_id: string
  mode: 'ranked' | 'quickplay' | 'private'
  board: (BoardCellPayload | null)[][]
  rack: (RackTilePayload | null)[]
  bag: number
  turn_number: number
  current_turn_player_id: string
  players: PlayerStatePayload[]
  my_player_id: string
}

export interface PlacedTilePayload {
  value: string
  row: number
  col: number
  points: number
}

export interface MoveResultPayload {
  seq?: number
  type: 'place' | 'exchange' | 'pass'
  player_id: string
  score_delta: number
  board: (BoardCellPayload | null)[][]
  placed_tiles?: PlacedTilePayload[]
  expression?: string
  result?: number
  bag: number
  consecutive_passes: number
  turn_number: number
  current_turn_player_id: string
  players: PlayerStatePayload[]
}

export interface RackUpdatePayload {
  rack: (RackTilePayload | null)[]
}

export interface TimerSyncPayload {
  players: Array<{ player_id: string; time_remaining_ms: number }>
  timestamp: number
}

export interface GameOverPayload {
  reason: 'score' | 'timeout' | 'forfeit' | 'stalemate'
  winner_id: string | null
  final_scores: Array<{ player_id: string; score: number }>
}

export interface MoveLogEntry {
  seq: number
  type: 'place' | 'exchange' | 'pass'
  player_id: string
  display_name: string
  expression?: string
  result?: number
  score_delta: number
  turn_number: number
}
