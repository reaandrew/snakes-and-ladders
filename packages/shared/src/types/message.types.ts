import type { Game, Player } from './game.types.js';

// Client -> Server messages
export type ClientMessageType = 'joinGame' | 'rollDice' | 'startGame' | 'ping';

export interface JoinGameMessage {
  action: 'joinGame';
  gameCode: string;
  playerName: string;
}

export interface RollDiceMessage {
  action: 'rollDice';
  gameCode: string;
  playerId: string;
}

export interface StartGameMessage {
  action: 'startGame';
  gameCode: string;
  playerId: string;
}

export interface PingMessage {
  action: 'ping';
}

export type ClientMessage = JoinGameMessage | RollDiceMessage | StartGameMessage | PingMessage;

// Server -> Client messages
export type ServerMessageType =
  | 'gameState'
  | 'playerJoined'
  | 'playerLeft'
  | 'playerMoved'
  | 'gameStarted'
  | 'gameEnded'
  | 'error'
  | 'pong'
  | 'joinedGame';

export interface GameStateMessage {
  type: 'gameState';
  game: Game;
  players: Player[];
}

export interface PlayerJoinedMessage {
  type: 'playerJoined';
  player: Player;
}

export interface PlayerLeftMessage {
  type: 'playerLeft';
  playerId: string;
  playerName: string;
}

export interface MoveEffect {
  type: 'snake' | 'ladder';
  from: number;
  to: number;
}

export interface PlayerMovedMessage {
  type: 'playerMoved';
  playerId: string;
  playerName: string;
  diceRoll: number;
  previousPosition: number;
  newPosition: number;
  effect?: MoveEffect;
}

export interface GameStartedMessage {
  type: 'gameStarted';
  game: Game;
}

export interface GameEndedMessage {
  type: 'gameEnded';
  winnerId: string;
  winnerName: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface PongMessage {
  type: 'pong';
}

export interface JoinedGameMessage {
  type: 'joinedGame';
  playerId: string;
  game: Game;
  players: Player[];
}

export type ServerMessage =
  | GameStateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerMovedMessage
  | GameStartedMessage
  | GameEndedMessage
  | ErrorMessage
  | PongMessage
  | JoinedGameMessage;

// Error codes
export const ErrorCodes = {
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_FULL: 'GAME_FULL',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  NOT_GAME_CREATOR: 'NOT_GAME_CREATOR',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
