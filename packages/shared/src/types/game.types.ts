export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface SnakeOrLadder {
  start: number;
  end: number;
  type: 'snake' | 'ladder';
}

export interface BoardConfig {
  size: number;
  snakesAndLadders: SnakeOrLadder[];
}

export interface Game {
  code: string;
  status: GameStatus;
  creatorId: string;
  board: BoardConfig;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameRequest {
  creatorName: string;
}

export interface CreateGameResponse {
  game: Game;
  playerId: string;
}

export interface GetGameResponse {
  game: Game;
  players: Player[];
}

export interface Player {
  id: string;
  gameCode: string;
  name: string;
  color: string;
  position: number;
  isConnected: boolean;
  joinedAt: string;
}

export interface Move {
  id: string;
  gameCode: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  diceRoll: number;
  previousPosition: number;
  newPosition: number;
  effect?: { type: 'snake' | 'ladder'; from: number; to: number };
  timestamp: string;
}

// Re-export from the color utility for backward compatibility
export { PLAYER_COLORS, MAX_PLAYERS } from '../utils/player-colors.js';

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  size: 100,
  snakesAndLadders: [
    // Ladders
    { start: 2, end: 38, type: 'ladder' },
    { start: 7, end: 14, type: 'ladder' },
    { start: 8, end: 31, type: 'ladder' },
    { start: 15, end: 26, type: 'ladder' },
    { start: 21, end: 42, type: 'ladder' },
    { start: 28, end: 84, type: 'ladder' },
    { start: 36, end: 44, type: 'ladder' },
    { start: 51, end: 67, type: 'ladder' },
    { start: 71, end: 91, type: 'ladder' },
    { start: 78, end: 98, type: 'ladder' },
    // Snakes
    { start: 16, end: 6, type: 'snake' },
    { start: 46, end: 25, type: 'snake' },
    { start: 49, end: 11, type: 'snake' },
    { start: 62, end: 19, type: 'snake' },
    { start: 64, end: 60, type: 'snake' },
    { start: 74, end: 53, type: 'snake' },
    { start: 89, end: 68, type: 'snake' },
    { start: 92, end: 88, type: 'snake' },
    { start: 95, end: 75, type: 'snake' },
    { start: 99, end: 80, type: 'snake' },
  ],
};
