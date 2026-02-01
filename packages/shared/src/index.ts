// Game types
export type {
  Game,
  GameStatus,
  Player,
  Move,
  BoardConfig,
  SnakeOrLadder,
  CreateGameRequest,
  CreateGameResponse,
  GetGameResponse,
} from './types/game.types.js';

export { PLAYER_COLORS, DEFAULT_BOARD_CONFIG } from './types/game.types.js';

// Message types
export type {
  ClientMessage,
  ClientMessageType,
  JoinGameMessage,
  RejoinGameMessage,
  RollDiceMessage,
  StartGameMessage,
  PingMessage,
  ServerMessage,
  ServerMessageType,
  GameStateMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  PlayerMovedMessage,
  GameStartedMessage,
  GameEndedMessage,
  ErrorMessage,
  PongMessage,
  JoinedGameMessage,
  MoveEffect,
  ErrorCode,
} from './types/message.types.js';

export { ErrorCodes } from './types/message.types.js';

// DynamoDB types
export type {
  GameEntity,
  PlayerEntity,
  ConnectionEntity,
  MoveEntity,
  DynamoDBEntity,
} from './types/dynamodb.types.js';

export { Keys } from './types/dynamodb.types.js';

// Admin types
export type {
  AdminGameSummary,
  AdminGamesResponse,
  AdminPlayerDetail,
  AdminGameDetailResponse,
} from './types/admin.types.js';
