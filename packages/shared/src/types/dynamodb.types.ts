import type { BoardConfig, GameStatus } from './game.types.js';

// DynamoDB entity types (single table design)
export interface GameEntity {
  PK: `GAME#${string}`;
  SK: 'METADATA';
  code: string;
  status: GameStatus;
  creatorId: string;
  board: BoardConfig;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
  TTL?: number;
  GSI1PK: 'GAMES';
  GSI1SK: string;
}

export interface PlayerEntity {
  PK: `GAME#${string}`;
  SK: `PLAYER#${string}`;
  id: string;
  gameCode: string;
  name: string;
  color: string;
  position: number;
  connectionId?: string;
  isConnected: boolean;
  joinedAt: string;
  TTL?: number;
  GSI1PK: `PLAYER#${string}`;
  GSI1SK: string;
}

export interface ConnectionEntity {
  PK: `CONNECTION#${string}`;
  SK: 'METADATA';
  connectionId: string;
  playerId?: string;
  gameCode?: string;
  connectedAt: string;
  TTL?: number;
  GSI1PK?: `GAME#${string}`;
  GSI1SK?: string;
}

export interface MoveEntity {
  PK: `GAME#${string}`;
  SK: `MOVE#${string}`; // timestamp-based for ordering
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
  TTL?: number;
}

export type DynamoDBEntity = GameEntity | PlayerEntity | ConnectionEntity | MoveEntity;

// Helper functions for key generation
export const Keys = {
  game: (code: string) => ({
    PK: `GAME#${code}` as const,
    SK: 'METADATA' as const,
  }),

  player: (gameCode: string, playerId: string) => ({
    PK: `GAME#${gameCode}` as const,
    SK: `PLAYER#${playerId}` as const,
  }),

  connection: (connectionId: string) => ({
    PK: `CONNECTION#${connectionId}` as const,
    SK: 'METADATA' as const,
  }),

  move: (gameCode: string, moveId: string) => ({
    PK: `GAME#${gameCode}` as const,
    SK: `MOVE#${moveId}` as const,
  }),

  gamePlayersPrefix: (gameCode: string) => ({
    PK: `GAME#${gameCode}` as const,
    SK_PREFIX: 'PLAYER#' as const,
  }),

  gameMovesPrefix: (gameCode: string) => ({
    PK: `GAME#${gameCode}` as const,
    SK_PREFIX: 'MOVE#' as const,
  }),
} as const;
