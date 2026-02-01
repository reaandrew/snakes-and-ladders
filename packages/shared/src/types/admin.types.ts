import type { Game, Player, Move } from './game.types.js';

export interface AdminGameSummary {
  code: string;
  status: Game['status'];
  playerCount: number;
  createdAt: string;
  leaderName: string | null;
  leaderPosition: number;
}

export interface AdminGamesResponse {
  games: AdminGameSummary[];
}

export interface AdminPlayerDetail extends Player {
  rank: number;
  distanceToWin: number;
}

export interface AdminGameDetailResponse {
  game: Game;
  players: AdminPlayerDetail[];
  moves: Move[];
}
